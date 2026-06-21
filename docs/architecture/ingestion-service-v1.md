# ingestion-service.v1

最後更新：2026-06-17

狀態：Phase 1 設計

相關決策：`docs/architecture/technical-decisions-log.md`  
相關契約：`normalized-bus-vehicle-position-v1.md`、`bus-ingestion-manifest-v1.md`

## 目的

單一 **ingestion service** 承載所有 TDX → normalize → Kafka → manifest 業務邏輯。  
Poller 不是獨立系統，而是本服務的一種運行模式。

## 運行模式

```text
┌────────────────────────────────────────────────────────────┐
│ ingestion service（單一 binary / 單一 codebase）           │
│                                                            │
│  shared core: ingest_slot(slot_key, mode, options)         │
│                                                            │
│  Mode 1 — Poller（僅 lock holder）                          │
│    每 5 min → ingest_slot(taipeiSlot(now), live)           │
│                                                            │
│  Mode 2 — On-demand（HTTP，Airflow / ops）                  │
│    POST /ingest/slots → ingest_slot(slot_key, backfill)    │
└────────────────────────────────────────────────────────────┘
```

| 模式 | 觸發 | `ingest_mode` | 需要 poller lock |
|---|---|---|---|
| Poller | 內建定時迴圈（leader） | `live` | 是 |
| On-demand | `POST /ingest/slots` | `backfill`（或 `live` 手動） | 否 |

**無獨立 backfill script**；Airflow 只負責算 missing slots 並呼叫 HTTP。

## 部署

```text
ingest-service replica A  ──┐
ingest-service replica B  ──┼── 皆暴露 HTTP（on-demand）
                            └── 僅 R2 lock holder 跑 poller 迴圈
```

建議單一 long-running 程序：`ingest serve` = HTTP server + background poller loop。

Poller HA / lock / fencing：`docs/architecture/poller-lock-v1.md`

## HTTP API（Phase 1）

### `POST /ingest/slots`

同步請求、同步回應（Phase 1 不採 async job queue）。

**Request**

```json
{
  "slotKey": "2026-06-17T10:05+08:00",
  "mode": "backfill",
  "force": false
}
```

| 欄位 | 必填 | 說明 |
|---|---|---|
| `slotKey` | 是 | `YYYY-MM-DDTHH:MM+08:00` |
| `mode` | 是 | `live` \| `backfill` |
| `force` | 否，預設 `false` | `true` 時即使 manifest 已 `complete` 仍重跑 |

**Response（200）**

```json
{
  "ok": true,
  "skipped": false,
  "slotKey": "2026-06-17T10:05+08:00",
  "mode": "backfill",
  "recordCount": 203,
  "manifestPath": "bus/ingestion/manifest.json",
  "capturedAt": "2026-06-17T02:05:15.000Z"
}
```

**Response（200，idempotent skip）**

```json
{
  "ok": true,
  "skipped": true,
  "reason": "slot_already_complete",
  "slotKey": "2026-06-17T10:05+08:00",
  "mode": "backfill"
}
```

**Response（5xx / 4xx）**

```json
{
  "ok": false,
  "slotKey": "2026-06-17T10:05+08:00",
  "mode": "backfill",
  "error": "kafka_produce_failed",
  "message": "..."
}
```

Kafka 成功但 manifest 失敗時回 **5xx**；呼叫方（Airflow）可重試。

### 健康檢查

```text
GET /health        → 200（程序存活）
GET /health/leader → 是否為 poller lock holder（可選，供 ops）
```

## Idempotency 規則

| 條件 | 行為 |
|---|---|
| manifest 無條目或 `status != complete` | 執行完整 `ingest_slot()` |
| manifest `status=complete` 且 `force=false` | **跳過**，回 `skipped: true` |
| manifest `status=complete` 且 `force=true` | 重跑 ingest；覆寫 manifest；Kafka 可能產生同 key dup（可接受） |
| 同一 slot 並行兩個請求 | 兩者皆可能跑完；manifest `fencingToken` 單調覆寫；lake merge 收斂 |

Poller `live` 路徑對**當前 slot** 不檢查 skip（每 5 min 定時抓）；歷史 slot 的 on-demand 才套用 complete skip。

## 與其他元件的邊界

| 元件 | 職責 |
|---|---|
| **Ingestion service** | TDX 憑證、`ingest_slot()`、Kafka produce、manifest 寫入 |
| Poller 迴圈（內建） | lock / leader、定時觸發 live ingest |
| Airflow | 讀 manifest、算 missing、呼叫 `POST /ingest/slots` |
| `bus-lake-archiver` | 消費 Kafka；不呼叫 ingest API |

## Airflow 用法（摘要）

```text
1. expected slots − manifest complete → missing
2. for slot in missing (past grace):
     POST /ingest/slots { slotKey, mode: "backfill", force: false }
3. reconciliation report
```

手動修復 / 強制重跑：`force: true`。
