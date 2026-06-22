# Kafka topics — bus Phase 1

最後更新：2026-06-17

狀態：Phase 1 設計

相關：`normalized-bus-vehicle-position-v1.md`、`technical-decisions-log.md`

## 設計原則

Kafka 是 **ingest → lake 的 streaming handoff**，不是長期歸檔。  
Retention 回答：「最慢 consumer 能 down 多久，而 Iceberg 仍已是真相？」

## Phase 1 topic 清單

| Topic | 用途 | Phase |
|---|---|---|
| `normalized.tdx.bus_vehicle_position` | 主資料流 | 1 |
| `dlq.tdx.bus_vehicle_position` | 無法處理的 poison message | 1 |
| `online.tdx.bus_route_signal` | `bus-route-sentinel` Flink live signal 輸出 | 2 |
| `ops.ingestion.slot_status` | Outbox manifest（未來） | 未建立 |

**Phase 1 不建立** `raw.tdx.bus_*`；ingest 內聯 normalize，長期 replay 走 Iceberg。

## `normalized.tdx.bus_vehicle_position`

### 命名

對齊 `TopicNames.normalized(domain, entity)` → `normalized.tdx.bus_vehicle_position`。

### Message key

```text
{slot_key}|{vehicle_id}|{route_uid}|{direction}
```

與 lake merge key 一致。Producer **必須**設定 key。

### Topic 設定（3-broker homelab / prod）

| 設定 | 值 | 說明 |
|---|---|---|
| `num.partitions` | `6` | 支援 Flink parallelism 3–6 |
| `replication.factor` | `3` | 三副本 |
| `min.insync.replicas` | `2` | 至少 2 副本 in-sync 才接受寫入 |
| `cleanup.policy` | `delete` | Phase 1 不 compaction |
| `retention.ms` | `604800000`（7 天） | consumer lag / 短期 replay 窗口 |
| `compression.type` | `lz4` | 可選 |

本地單 broker dev 可降為 `replication.factor=1`、`min.insync.replicas=1`。

### Producer（ingestion service）

| 設定 | 值 |
|---|---|
| `acks` | `all` |
| `enable.idempotence` | `true` |

`acks=all` + `min.insync.replicas=2`：leader 在 follower 複製完成前不回 OK，避免 leader crash 複製中資料遺失。

### Consumer groups

| Group | Job | Phase |
|---|---|---|
| `bus-lake-archiver` | Flink → Iceberg | 1 |
| `bus-route-sentinel` | Flink → `online.*` | 2 |

## `dlq.tdx.bus_vehicle_position`

| 設定 | 值 |
|---|---|
| `num.partitions` | `3` |
| `replication.factor` | `3` |
| `min.insync.replicas` | `2` |
| `retention.ms` | `2592000000`（30 天） |

路由條件：反序列化失敗、必填欄位缺失、archiver 重試耗盡。  
正常 failover duplicate **不**進 DLQ。

## 體積估算（台北市）

```text
~200 vehicles/slot × 288 slots/day ≈ 57k msgs/day
7 天 retention ≈ 400k msgs
```

體積小；retention 以維運恢復窗口為主，非容量驅動。

## 未採（Phase 1）

| 選項 | 原因 |
|---|---|
| `cleanup.policy=compact` | Iceberg merge 已去重；compaction 增加調參面 |
| 長 retention（>30d） | 真相在 Iceberg，非 Kafka |
| `raw.tdx.bus_*` | 增加一層無 Phase 1 必要 |
