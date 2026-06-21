# Poller lock & fencing — Phase 1 (KISS)

最後更新：2026-06-17

狀態：Phase 1 設計

相關：`ingestion-service-v1.md`、`bus-ingestion-manifest-v1.md`

## 原則

- **KISS**：一個 R2 JSON 檔 = lease；無 etcd / Redis / 獨立 lock 服務。
- **夠用即可**：active-standby 雙實例；允許短暫 gap；Airflow 兜底。
- **延伸留後路**：若 R2 CAS 不夠用，再升級 Postgres lease 或分散式鎖。

## 要解決什麼

| 問題 | 解法 |
|---|---|
| 兩個 ingest replica 同時 poll TDX | 僅 **lock holder** 跑 poller 迴圈 |
| 舊 primary 未即時發現被取代 | **fencingToken** 單調遞增；step-down 後不 produce |
| stale leader 覆寫 manifest | manifest upsert 檢查 `fencingToken >= 現有` |

**不**在 lake / Kafka consumer 查 token（見 `technical-decisions-log.md`）。

## 單一 lock 檔案

```text
R2: bus/ingestion/poller-lock.json
```

與 `manifest.json` 同前綴；ingest 服務 **read + write**。

### Schema

```json
{
  "schema": "twfoundry.bus.poller-lock.v1",
  "holderId": "ingest-service-7d4f9b-abc12",
  "fencingToken": 42,
  "acquiredAt": "2026-06-17T10:05:00.000Z",
  "expiresAt": "2026-06-17T10:05:30.000Z",
  "renewedAt": "2026-06-17T10:05:10.000Z"
}
```

| 欄位 | 說明 |
|---|---|
| `holderId` | 實例 ID（建議 K8s `HOSTNAME` / pod name） |
| `fencingToken` | 單調遞增整數；**每次新取得 lease 時 +1** |
| `acquiredAt` | 首次取得 lease |
| `expiresAt` | lease 過期時刻（UTC） |
| `renewedAt` | 上次續約 |

## 時序（拍板）

| 參數 | 值 | 說明 |
|---|---|---|
| `LOCK_TTL_SEC` | **30** | lease 長度 |
| `RENEW_INTERVAL_SEC` | **10** | holder 每 10s 續約 |
| Poller tick | **5 min** | 對齊 slot；與 lock 獨立 |

```text
holder:  renew ──10s── renew ──10s── renew ...
         |←──────── 30s TTL ────────→|

standby: 每 10s 讀 lock；若 expiresAt < now → 嘗試搶鎖
```

## 狀態機（每個 ingest replica）

```text
                    ┌─────────────┐
         start ────►│  STANDBY    │◄──── renew 失敗 / 失去 holder
                    └──────┬──────┘
                           │ acquire lock (expired or empty)
                           ▼
                    ┌─────────────┐
                    │  LEADER     │──► 每 10s renew
                    │  (poller)   │──► 每 5 min ingest_slot(live)
                    └──────┬──────┘
                           │ 發現 fencingToken 已不是自己的 / renew CAS 失敗
                           ▼
                         STANDBY
```

- **STANDBY**：不跑 live poller；HTTP on-demand backfill **仍可**（不需 lock）。
- **LEADER**：背景 goroutine 續約 + 定時 live ingest。

## 搶鎖 / 續約（R2 read-compare-write）

Phase 1：**GET + conditional PUT（ETag）**。

### Acquire（STANDBY → LEADER）

```text
1. GET poller-lock.json
2. IF 無檔案 OR expiresAt < now:
     fencingToken = (舊 token 或 0) + 1
     PUT 新 lock（holderId=self, expiresAt=now+30s）
     IF ETag 衝突 → 搶鎖失敗，保持 STANDBY
   ELSE:
     保持 STANDBY
```

### Renew（LEADER）

```text
1. GET lock
2. IF holderId == self AND expiresAt > now:
     PUT 更新 expiresAt=now+30s, renewedAt=now（帶 If-Match ETag）
     IF 失敗 → 降級 STANDBY（可能已被搶）
3. ELSE → STANDBY
```

**KISS**：不實作複雜分散式共識；依 ETag + TTL 足夠 homelab 雙副本。

## Step-down（live ingest 前）

每次 **`ingest_slot(..., live)`** 前（含 poller 觸發）：

```text
1. renew lock（如上）
2. IF 不是 LEADER → skip live ingest（不呼叫 TDX）
3. IF LEADER → 繼續；帶 current fencingToken 寫 Kafka header（可選）與 manifest
```

**Backfill**（Airflow / `force`）**不**檢查 poller lock；仍寫 manifest 時帶當前實例持有的 token（若無 lock 則 token=0 或省略，manifest 規則見下）。

### Manifest 與 fencingToken

| 路徑 | `fencingToken` |
|---|---|
| **live**（leader） | lock 上的 token |
| **backfill** | 可不帶 lock；manifest upsert **僅當** `新 token >= 現有` 或現有無 token |

KISS backfill 規則：backfill 使用 `fencingToken: 0` 表示「非 leader 寫入」；**僅在該 slot 尚無 `complete` 條目時**允許寫入；已有 `complete` 則需 `force=true`（見 ingestion-service API）。

或更簡：**backfill 不遞增 token**；manifest 允許 `complete` 覆寫若現有非 live 或 slot 未完成。  
Phase 1 最簡：**manifest 對 backfill 一律允許 upsert `complete`**（backfill 修復缺口為主）；`fencingToken` 主要防 **stale live leader**。

拍板：

- **live**：必須 `fencingToken == lock.fencingToken` 且為 holder 才寫 manifest。
- **backfill**：不檢查 lock；manifest upsert **無 token 比較**（或 token 省略）。

這樣 Airflow 不被 lock 卡住。

## Failover 時間線（範例）

```text
T+0s   Leader A 持有 token=5，expires 30s
T+10s  A renew OK
T+25s  A 程序 hang（不再 renew）
T+31s  Lock 過期
T+32s  B acquire → token=6，成為 LEADER
T+33s  A 醒來，renew 失敗或 token 過期 → STANDBY
       A 若誤跑 live ingest → step-down，不 produce
```

## 與 Kafka dup 的關係

- Step-down 縮小雙寫窗口；**不能保證零 dup**。
- Dup 由 merge key + lake upsert 收斂（已接受）。

## 健康檢查

```text
GET /health/leader
→ { "leader": true|false, "holderId": "...", "fencingToken": 42 }
```

## 設定

| 變數 | 預設 |
|---|---|
| `POLLER_LOCK_R2_KEY` | `bus/ingestion/poller-lock.json` |
| `POLLER_LOCK_TTL_SEC` | `30` |
| `POLLER_LOCK_RENEW_SEC` | `10` |
| `INSTANCE_ID` | `$HOSTNAME` |

## Phase 1 不做的

- 獨立 fencing 服務
- Kafka consumer 側 token 驗證
- 按 slot 的細粒度鎖
- Redlock / 多 R2 物件 quorum

## 升級路徑（需要時）

| 痛點 | 升級 |
|---|---|
| R2 ETag CAS 競爭頻繁 / 不可靠 | Postgres `lease` 表 + `FOR UPDATE SKIP LOCKED` |
| 需要可觀測 leader 歷史 | 寫 audit 到 reconciliation report |
| 多 region | 集中鎖服務或 K8s Lease API（`coordination.k8s.io/Lease`） |

**K8s Lease** 可作 Phase 1.5 替代 R2 lock（仍在叢集內 KISS），無需新資料庫：

```text
ingest replicas → coordination.k8s.io Lease "bus-ingestion-poller"
```

若 homelab 已跑 K8s，Lease 往往比 R2 CAS 更簡；**現行拍板仍為 R2 單檔**（與 manifest 同儲存、無 K8s API 依賴）。實作時若 Lease 更順手可切換並更新本文件。

## 實作檢查清單

- [ ] `INSTANCE_ID` 每 pod 唯一
- [ ] LEADER 僅一個 poller 迴圈
- [ ] live ingest 前 renew + holder 檢查
- [ ] manifest live 寫入帶 `fencingToken`
- [ ] backfill 不持鎖可跑
- [ ] STANDBY 不呼叫 TDX live API
