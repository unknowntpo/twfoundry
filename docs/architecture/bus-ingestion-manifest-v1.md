# bus-ingestion-manifest.v1

最後更新：2026-06-17

狀態：Phase 1 設計（支撐 Airflow reconciliation 兜底）

相關決策：`docs/architecture/technical-decisions-log.md`

## 目的

Manifest 是 **slot 級索引**，回答：

- 哪個 5 分鐘 slot 已成功 ingest？
- 最後一次成功是 live 還是 backfill？
- （資訊用）該次 ingest 產生了幾筆 normalized 訊息？

**不是**車輛級資料倉庫；車輛明細在 Kafka `normalized.*` 與 Iceberg。

**不能取代** Kafka message key / lake merge key；兩者解決不同問題（見下方「與 Kafka dedup 的關係」）。

## 生命週期

### 何時寫入 / 更新

```text
ingest_slot(slot_key, mode)
    ├─ 1. TDX 抓取
    ├─ 2. normalize
    ├─ 3. produce → Kafka（整批 flush / ack 成功）
    └─ 4. upsert manifest 條目          ← 唯一寫入點
```

| 事件 | Manifest 動作 |
|---|---|
| Kafka produce **全部成功** | upsert → `status=complete` |
| TDX / normalize / Kafka **任一步失敗** | 可選寫 `status=failed` + `lastError` |
| Slot 尚未 ingest | **不寫**；Airflow 以 `expected − complete` 推斷 `missing` |
| 同一 slot 再次 ingest（backfill 蓋 live、failover 重跑） | **覆寫**同一 `slotKey` 條目 |

**順序**：先 Kafka，後 manifest。Manifest 是 slot 級 **commit marker**，不是 ingest 開始信號。

### 誰寫入

**決策**：僅 **`ingest_slot()` 所在服務**在成功後更新 manifest（非 poller 直接寫、非 Kafka consumer 統計）。

| 角色 | 職責 |
|---|---|
| Ingest 服務 | 執行業務邏輯並**寫 manifest**；內建 poller 迴圈（leader） |
| Airflow reconciliation | **HTTP** `POST /ingest/slots`（`force=false`） |
| `bus-lake-archiver` | **不寫** manifest |

### 存在哪裡

```text
R2: bus/ingestion/manifest.json
或 homelab 等價路徑（如 data/bus/ingestion/manifest.json）
```

Phase 1 建議 **單一全域 JSON**；按日分片留待筆數成長後再評估。

## 與現有 POC manifest 的關係

現有 `bus/projections/manifest.json`（Cloudflare ingestor）追蹤 **projection 檔案**路徑。

新架構 manifest 追蹤 **ingest 完成度**；可並存過渡，最終以 `bus-ingestion-manifest` 為 Airflow / 補洞權威來源。

## 與 Kafka dedup 的關係

| 機制 | 解決什麼 | 粒度 |
|---|---|---|
| Kafka key / lake merge key | 同一觀測重複寫入，最終只留一份 | `(slot_key, vehicle_id, route_uid, direction)` |
| Manifest | 這個 slot 的 ingest **任務是否算完成** | slot 級 |

Poller failover 或 backfill 重跑時，**Kafka 可能出現同 key 的重複訊息**（設計上可接受）；`bus-lake-archiver` 以 merge key 收斂至 Iceberg 單列。

Manifest **不**保證 Kafka log 無重複；只宣告「某次 `ingest_slot()` 整批走完」。

### Failover 與 manifest 覆寫

```text
old primary：produce 200 筆 → manifest complete, recordCount=200
new primary：同一 slot 再跑 → 覆寫 → recordCount=200（非累加 400）
```

- Manifest 採 **覆寫語意**；`recordCount` 為**最後一次成功 ingest** 的批次筆數。
- Kafka 內同 key 訊息可能多於 `recordCount`（dup 或 partial failover）；不影響 reconciliation。
- Manifest upsert 應帶 **`fencingToken`**：僅當 `fencingToken >= 現有條目` 時才覆寫 `complete`，避免 stale leader 污染索引（見 schema）。

## Schema

```json
{
  "schema": "twfoundry.bus.ingestion-manifest.v1",
  "city": "Taipei",
  "intervalMinutes": 5,
  "generatedAt": "2026-06-17T12:00:00.000Z",
  "latestCompleteSlotKey": "2026-06-17T11:55+08:00",
  "snapshots": [
    {
      "slotKey": "2026-06-17T10:05+08:00",
      "serviceDate": "2026-06-17",
      "timeLabel": "10:05",
      "status": "complete",
      "ingestMode": "live",
      "fencingToken": 42,
      "recordCount": 203,
      "routeCount": 17,
      "capturedAt": "2026-06-17T02:05:12.345Z",
      "updatedAt": "2026-06-17T02:05:15.000Z",
      "lastError": null
    }
  ]
}
```

### `snapshots[]` 欄位

| 欄位 | 說明 |
|---|---|
| `slotKey` | `YYYY-MM-DDTHH:MM+08:00` |
| `serviceDate` | `YYYY-MM-DD` |
| `timeLabel` | `HH:MM` |
| `status` | `complete` \| `failed`（見下方狀態機） |
| `ingestMode` | `live` \| `backfill` |
| `fencingToken` | ingest 當下 leader token；upsert 時須 `>=` 現有條目才覆寫 |
| `recordCount` | **informational**：最後一次成功 ingest 的 normalized 訊息數（見下方） |
| `routeCount` | **informational**：涉及路線數 |
| `capturedAt` | ingest 完成時間 |
| `updatedAt` | manifest 條目最後更新 |
| `lastError` | 失敗時錯誤摘要；成功為 null |

### 狀態機（Phase 1）

```text
（無條目）     →  missing（由 Airflow 推斷，不寫入 manifest）
ingest 成功    →  complete
ingest 失敗    →  failed（可選寫入，供除錯）
backfill 成功  →  complete（ingestMode=backfill，覆蓋條目）
```

Phase 1 **不**在 manifest 存 `missing` 條目；missing = 預期 slot 集合 − complete 條目。

### `recordCount` 為 informational 的原因

Reconciliation **只**看 `status=complete` 的 `slotKey` 集合，**不用** `recordCount` 判斷缺洞。

1. 缺洞問題是「slot 有沒有 complete」，不是「有幾台車」。
2. 同一 slot 重跑時 `recordCount` 可能不同（TDX 在線車輛變動、`$top` 截斷、live vs backfill 分桶），不代表缺資料。
3. Failover 覆寫時 `recordCount` 反映**最後一批**，不會因 Kafka dup **累加偏大**；Kafka log 體積與 manifest count 無對帳關係。
4. 若需對帳，另做 data-quality audit（manifest vs Iceberg），不走 reconciliation 主路徑。

## Kafka 與 manifest 非原子提交（Phase 1）

Kafka produce 與 R2 manifest upsert 是 **兩次獨立 commit**，Phase 1 **不**做分散式交易。

```text
ingest_slot():
  1. Kafka produce（全部 ack）     ← commit #1
  2. R2 manifest upsert            ← commit #2
```

### Kafka 成功、manifest 失敗

| 層 | 狀態 |
|---|---|
| Kafka | 該 slot 資料已落地 |
| Manifest | 仍 missing / failed |
| Lake | merge key 收斂，資料最終正確 |
| Airflow | 判 missing → `ingest_slot(backfill)` |

`ingest_slot()` 應在 manifest 寫入失敗時 **回傳錯誤**（即使 Kafka 已成功），供 poller 告警；修復仍靠 Airflow reconciliation + 冪等重跑。

重跑會產生 Kafka 同 key 重複訊息（可接受）；manifest 在重跑成功後補上 `complete`。

### 未來升級：Outbox pattern

若需更強的 manifest 正確性，可改為：

```text
ingest_slot():
  1. Kafka produce（vehicle 觀測 + slot 完成 outbox 事件，同一 producer batch）
  2. 獨立 manifest writer 消費 outbox topic → upsert R2 manifest
```

Outbox topic 候選：`ops.ingestion.slot_status`（slot 級，非車輛級）。  
Phase 1 不實作；現行 **ingest 直寫 R2** 足夠，以 Airflow 兜底彌補 manifest 落後。

## 存取權限

| 角色 | manifest |
|---|---|
| Ingest 服務 | read + write（唯一寫入者） |
| Airflow reconciliation | read only |
| Ops / homelab scripts | read only |
| Poller、lake archiver、public edge | no access |

## Airflow reconciliation 用法

```text
1. 產生 service_date 的 expected slots（288 個 / 5min）
2. 讀 manifest，取 status=complete 的 slotKey
3. missing = expected - complete
4. 對 missing（且已過 grace period）`POST /ingest/slots`（`mode=backfill`, `force=false`）
5. 寫 reconciliation report
```

### Grace period（拍板）

見 `airflow-reconciliation-bus-v1.md`：**15 分鐘**（`slot_start + 15min > now` 的今天 slot 不列入 expected）。

## 未來：按路線抓取時的擴充

當改為按路線 API 時，在 slot 下增加路線子狀態（**Phase 1 不做**）：

```json
{
  "slotKey": "2026-06-17T10:05+08:00",
  "status": "partial",
  "routes": [
    { "routeUid": "TPE10181", "status": "complete", "recordCount": 12 },
    { "routeUid": "TPE10241", "status": "missing" }
  ]
}
```

此時 Airflow 可補「某 slot 的某路線」，而非整個 slot。

## Dashboard 建議（產品）

- 顯示 **資料截至**（`latestCompleteSlotKey` / `capturedAt`）
- 若有 incomplete slot 窗口，標示「部分時段資料補齊中」（避免空窗被誤讀為營運平穩）
