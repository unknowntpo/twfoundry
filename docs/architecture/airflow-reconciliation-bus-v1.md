# Airflow reconciliation — bus ingestion (Phase 1)

最後更新：2026-06-17

狀態：Phase 1 設計

相關：`bus-ingestion-manifest-v1.md`、`ingestion-service-v1.md`、`tdx-bus-ingestion-slot-bucketing.md`

## 目的

Airflow DAG 為 **offline 兜底**：比對「應有的 slot」與 manifest 中 `complete` 的 slot，對缺口呼叫 ingestion service backfill。  
**不是** 5 分鐘熱路徑；補洞延遲以 DAG schedule 為主。

```text
R2 manifest (read)
        │
        ▼
  compute missing slots
        │
        ▼
  POST /ingest/slots  (backfill, force=false)
        │
        ▼
  reconciliation report
```

## DAG 概要

| 項目 | 值 |
|---|---|
| **DAG id** | `bus_ingestion_reconcile` |
| **Schedule** | `15 * * * *`（每小時第 15 分，Asia/Taipei） |
| **Catchup** | `false` |
| **Max active runs** | `1` |

每小時 `:15` 跑：留時間給 poller 完成上一個 5 分鐘窗口 + manifest 寫入。

##  reconcile 哪些日期

| `service_date` | Expected slots |
|---|---|
| **今天**（Asia/Taipei） | `00:00` 起至「現在」的所有 5 分鐘桶，且已過 grace |
| **昨天** | 全天 **288** 個 slot |

不 reconcile **明天**或未來 slot。  
昨天納入：捕捉跨日漏寫、manifest 寫入失敗、晚間 outage。

## Expected slots 演算法

```python
# Pseudocode — timezone Asia/Taipei, interval_minutes=5

def expected_slot_keys(service_date: date, now: datetime) -> list[str]:
    slots = []
    day_start = datetime(service_date, tz=TAIPEI).replace(hour=0, minute=0)
    for i in range(288):
        slot_start = day_start + timedelta(minutes=5 * i)
        if service_date == today(TAIPEI):
            if slot_start + timedelta(minutes=GRACE_MINUTES) > now:
                continue  # grace: poller may still be running
        if slot_start.date() > service_date:
            break
        slots.append(format_slot_key(slot_start))  # YYYY-MM-DDTHH:MM+08:00
    return slots
```

對齊 `tdx-bus-ingestion-slot-bucketing.md`：`floor(time, 5min)` → `slot_key`。

## Complete slots 來源

1. 從 R2 讀 `bus/ingestion/manifest.json`（**read-only** 憑證）。
2. 取 `snapshots[]` 中 `status == "complete"` 的 `slotKey` 集合。
3. 可選：同一 DAG run 內 cache manifest；不重試寫 manifest。

### `failed` 的處理

| manifest `status` | Reconciliation |
|---|---|
| `complete` | 不算 missing |
| `failed` | **算 missing**（與無條目相同）→ 觸發 backfill |
| 無條目 | missing |

`force=false`；ingest API 對非 complete 會執行 backfill。

## Missing 與 grace period

```text
missing = expected_slot_keys(service_date) − complete_slot_keys
```

### Grace period（拍板）

| 參數 | 值 | 說明 |
|---|---|---|
| `GRACE_MINUTES` | **15** | `slot_start + 15min > now` 的 slot **不**列入 expected（今天） |

理由：
- Poller 每 5 min 抓一次，manifest 在 Kafka 之後寫入。
- 15 min 涵蓋一輪 poller 延遲 + failover 窗口，避免誤判「剛過去的 slot」為 missing。

昨天全天 288 slot 不受 grace 限制（皆已過去）。

## 呼叫 ingestion service

對每個 `missing` slot（見下方限流）：

```http
POST http://ingestion-service:8081/ingest/slots
Content-Type: application/json

{
  "slotKey": "2026-06-17T10:05+08:00",
  "mode": "backfill",
  "force": false
}
```

- **Sync** 等待回應（與 `ingestion-service-v1.md` 一致）。
- `200` + `skipped: true` → 計入 report 為 `already_complete`（race with poller）。
- `5xx` / timeout → 計入 `failed`，下輪 DAG 重試。

### 限流（拍板）

| 參數 | 值 | 說明 |
|---|---|---|
| `MAX_BACKFILL_PER_RUN` | **12** | 單次 DAG 最多觸發 12 個 backfill |

理由：避免一次補整天 288 slot 打爆 TDX；剩餘 missing 下小時繼續。

優先順序：**最舊的 missing slot 先補**（`slot_key` 升序）。

並行度：**2**（同時最多 2 個 `POST`），可調。

## DAG 任務結構

```text
bus_ingestion_reconcile
│
├─ load_manifest          # R2 → JSON
├─ compute_missing        # today + yesterday → missing lists
├─ backfill_slots         # dynamic map, max 12, parallelism 2
└─ write_report           # R2 or Airflow XCom + log
```

Phase 1 可用單一 PythonOperator + TaskFlow API；不必過度拆分。

## Reconciliation report

寫入 R2（與 manifest 同 bucket 前綴）：

```text
bus/ingestion/reconciliation/{service_date}/{run_id}.json
```

`run_id` = Airflow `run_id` 或 UTC timestamp。

### Schema（建議）

```json
{
  "schema": "twfoundry.bus.ingestion-reconciliation.v1",
  "dagRunId": "scheduled__2026-06-17T08:15:00+08:00",
  "ranAt": "2026-06-17T08:15:03.000Z",
  "city": "Taipei",
  "graceMinutes": 15,
  "maxBackfillPerRun": 12,
  "dates": [
    {
      "serviceDate": "2026-06-17",
      "expectedCount": 97,
      "completeCount": 95,
      "missingCount": 2,
      "backfillAttempted": 2,
      "backfillSucceeded": 2,
      "backfillFailed": 0,
      "backfillSkipped": 0,
      "missingSlotKeys": ["2026-06-17T07:05+08:00"],
      "remainingMissing": []
    }
  ]
}
```

`remainingMissing`：本輪因 `MAX_BACKFILL_PER_RUN` 未處理的 slot。

## 設定（Airflow Variables / env）

| 變數 | 範例 | 說明 |
|---|---|---|
| `BUS_INGEST_URL` | `http://ingestion-service.twfoundry-data.svc:8081` | |
| `BUS_MANIFEST_R2_BUCKET` | `twfoundry` | |
| `BUS_MANIFEST_R2_KEY` | `bus/ingestion/manifest.json` | |
| `BUS_CITY` | `Taipei` | |
| `BUS_GRACE_MINUTES` | `15` | |
| `BUS_MAX_BACKFILL_PER_RUN` | `12` | |
| `BUS_RECONCILE_TIMEZONE` | `Asia/Taipei` | |

R2 憑證：K8s Secret 掛給 Airflow worker（**read** manifest + **write** report）。

## 與其他元件的邊界

| 元件 | 本 DAG |
|---|---|
| Ingestion poller | 不控制；live 仍每 5 min |
| Ingestion HTTP | 僅 `POST /ingest/slots` backfill |
| Manifest | 只讀 |
| `bus-lake-archiver` | 不呼叫；backfill → Kafka → archiver 自動跟上 |
| Dashboard | 不讀 reconciliation report（Phase 1）；可讀 manifest `latestCompleteSlotKey` |

## 手動營運

| 操作 | 方式 |
|---|---|
| 強制重跑某 slot | `POST /ingest/slots` + `force: true`（curl / ops script） |
| 立即 reconcile | Airflow UI **Trigger DAG** |
| 補特定日 | 後續可加 DAG param `service_date`；Phase 1 固定 today+yesterday |

## Phase 1 不做的

- 分鐘級 gap watcher
- 按路線 partial slot 補洞
- 自動調整 `MAX_BACKFILL` based on TDX rate limit headers
- PagerDuty / alert（僅 report + log）

## 失敗情境

| 情境 | 行為 |
|---|---|
| 讀不到 manifest | DAG task **fail**；下輪重試 |
| 部分 backfill 5xx | 記入 report；slot 仍 missing；下輪重試 |
| Ingest `skipped`（已 complete） | 正常；race with poller |
| 單日 missing > 12 | 每小時補 12 個，直到清空 |
