# bus-lake-archiver.v1

最後更新：2026-06-17

狀態：Phase 1 設計

相關：`normalized-bus-vehicle-position-v1.md`、`kafka-topics-bus-v1.md`、`technical-decisions-log.md`

## 目的

Flink job **`bus-lake-archiver`** 消費 `normalized.tdx.bus_vehicle_position`，以 **merge/upsert** 寫入 R2 上的 Iceberg 表。  
Iceberg 為公車觀測的 **長期物理歸檔**；Kafka 為 handoff 緩衝。

### Phase 1 dev 實作

現階段（Phase 1）先用 **Node.js dev archiver** (`services/bus-lake-archiver/`) 驗證 Kafka → lake 的 e2e 流程：
- 消費 `normalized.tdx.bus_vehicle_position` 訊息
- 以 merge key `(slot_key, vehicle_id, route_uid, direction)` 在記憶體去重與更新
- 每 60 秒 checkpoint 一次，寫出 JSONL 檔案到 `data/lake/bus/vehicle_observations/YYYY-MM-DD.jsonl`
- 加上 `archived_at` 時間戳

**最小可行**：在 homelab laptop 驗證資料流，無需 Flink / Iceberg / R2；後續升級見下文「Flink job」。

```text
normalized.tdx.bus_vehicle_position
        │
        ▼
  bus-lake-archiver (Flink)
        │
        ▼
  Iceberg: bus.vehicle_observations  (HadoopCatalog → R2)
        │
        ▼
  ClickHouse 等查詢引擎（in-place，後續接線）
```

**不做**：manifest 寫入、fencing 檢查、告警（屬 `bus-route-sentinel`，Phase 2）。

## Iceberg catalog：Phase 1 用 HadoopCatalog

### 什麼是 HadoopCatalog

**不是**在 K8s 跑 Hadoop 叢集。  
`HadoopCatalog` = Iceberg **metadata 與 Parquet 都放在 R2 warehouse 目錄**；catalog 邏輯在 **Flink 進程內**（library），無獨立 catalog pod。

```text
┌─────────────────────────────────────┐
│  Flink pod (bus-lake-archiver)      │
│    Iceberg HadoopCatalog (in-proc)  │
└──────────────┬──────────────────────┘
               │ S3 API
               ▼
R2: s3://twfoundry-lake/
      bus/vehicle_observations/
        metadata/     ← snapshots, manifests
        data/         ← Parquet
```

### 為何 Phase 1 選它

| 優點 | 說明 |
|---|---|
| 元件最少 | 無 Postgres、無 Polaris |
| 單一 writer | 與「僅 archiver 寫 lake」一致 |
| Homelab 友好 | R2 S3 相容 endpoint + access key 即可 |
| 先打通 pipeline | 符合 MVP-first |

### Phase 1 限制（可接受）

- 無中央 REST catalog；各查詢引擎需自配 warehouse 路徑
- 多 writer 不建議；升級 catalog 前維持單一 archiver job
- 無 catalog 層 RBAC；靠 R2 API token 前綴權限

## R2 路徑佈局

與 **ingestion manifest** 分開（不同生命週期與權限）：

```text
r2://twfoundry/
  bus/ingestion/manifest.json          ← ops 索引（ingest 寫）
  lake/                                ← Iceberg warehouse root
    bus/
      vehicle_observations/
        metadata/
        data/
```

## 表定義

| 項目 | 值 |
|---|---|
| **Catalog** | `HadoopCatalog` |
| **Warehouse** | `s3://twfoundry-lake/` |
| **Table identifier** | `bus.vehicle_observations` |
| **Format** | Parquet + ZSTD（建議） |

### 分區

| 項目 | 值 | 說明 |
|---|---|---|
| **Partition** | `service_date`（`day`） | 與 ClickHouse `PARTITION BY toYYYYMM(service_date)` 對齊語意；日分區利於 prune |
| **不採** | `slot_key` 分區 | 288 slot/天 → 分區過碎 |

### Merge / identity key（拍板）

```text
(slot_key, vehicle_id, route_uid, direction)
```

與 Kafka message key、normalized v1 一致。Failover / backfill 重複訊息 → upsert 收斂為單列。

`gps_time`、`update_time` 為一般欄位，**不**納入 merge key。

### 欄位（Phase 1）

對齊 `normalized.tdx.bus_vehicle_position.v1`，另加 lake 寫入時間：

| 欄位 | 來源 |
|---|---|
| `slot_key`, `service_date`, `slot_label`, `city` | normalized |
| `vehicle_id`, `route_uid`, `route_name`, `direction` | normalized |
| `longitude`, `latitude`, `speed_kph`, `azimuth_deg` | normalized |
| `gps_time`, `update_time`, `freshness`, `completeness` | normalized |
| `ingest_mode`, `ingested_at` | normalized |
| `archived_at` | Flink 寫入 Iceberg 時間（UTC） |

**Phase 1 不含** projection 欄位（`route_progress_ratio` 等）— 與 normalized v1 相同邊界。

對齊現有 ClickHouse：`infra/clickhouse/sql/schema.sql` `twfoundry.bus_vehicle_observations`（projection 欄位可 NULL / 後續 enrichment job）。

## Flink job

### 資料流

```text
KafkaSource(normalized.tdx.bus_vehicle_position)
  → deserialize + validate normalized v1
  → map to Iceberg row
  → IcebergSink (equality-delete upsert on merge key)
  → checkpoint → metadata commit on R2
```

### 執行參數（建議）

| 設定 | 值 | 說明 |
|---|---|---|
| **Consumer group** | `bus-lake-archiver` | |
| **Parallelism** | 3–6 | ≤ Kafka partition 數（6） |
| **Checkpoint interval** | 60s | 平衡延遲與小檔案數量 |
| **Delivery** | at-least-once + upsert | Kafka dup 可接受 |
| **Starting offset** | `earliest`（首次）；之後 `committed` | |
| **DLQ** | `dlq.tdx.bus_vehicle_position` | 反序列化 / 驗證失敗 |

### 語意說明

- **不是**「一個 Flink batch = 一個 5 分鐘 slot」；為連續 stream + 定期 checkpoint commit。
- `slot_key` 是資料欄位，不是 Flink window 邊界。

### HadoopCatalog 設定（概念）

```properties
catalog-impl    = org.apache.iceberg.hadoop.HadoopCatalog
warehouse       = s3://twfoundry-lake/
io-impl         = org.apache.iceberg.aws.s3.S3FileIO
s3.endpoint     = https://<accountid>.r2.cloudflarestorage.com
s3.access-key-id     = <from K8s Secret>
s3.secret-access-key = <from K8s Secret>
```

表路徑：`{warehouse}/bus/vehicle_observations/`。

## 維護（Phase 1 可手動，後續 Airflow）

| 作業 | 目的 | Phase 1 |
|---|---|---|
| **Compaction** | 合併小 Parquet | 手動或週期 Airflow |
| **Expire snapshots** | 控制 metadata 成長 | 保留 30–90 天 snapshot |
| **Remove orphan files** | 清理失敗寫入殘檔 | 低頻手動 |

頻繁 60s checkpoint 會產生小檔；資料量小時可延後 compaction，量起來再排程。

## Catalog 升級路徑

Phase 1 **HadoopCatalog** 刻意最簡；以下為演進路徑，**非 Phase 1 實作**。

### 何時升級

| 信號 | 建議方向 |
|---|---|
| 僅 Flink 寫、單表 | 維持 HadoopCatalog |
| ClickHouse + Trino + Spark 都要讀同一 registry | → **Polaris REST** |
| 要多 writer 但不想跑 REST 服務 | → **JdbcCatalog + Postgres** |
| 要 branch / experiment on lake | → **Nessie**（另議） |

### 路徑 A：HadoopCatalog → Apache Polaris（REST）

**目標**：多引擎共用 REST catalog；K8s homelab 可部署 Polaris Helm + Postgres。

```text
Before:
  Flink ──HadoopCatalog──► R2 lake/

After:
  Flink ──RESTCatalog──► Polaris ──► Postgres (app DB)
                              │
                              └──► R2 lake/   (同 warehouse 路徑)
  ClickHouse / Trino ──RESTCatalog──► Polaris
```

**遷移步驟（高層）**

1. 部署 Polaris + Postgres；設定 R2 storage configuration（S3 相容 endpoint）。
2. 在 Polaris 註冊 catalog，`warehouse` 指向**現有** `s3://twfoundry-lake/`。
3. 以 Iceberg **register table** 或 metadata 遷移工具，將 `bus.vehicle_observations` 註冊到 Polaris（**不搬 Parquet**，只登記 metadata 位置）。
4. 切換 `bus-lake-archiver` catalog 實作為 `RESTCatalog`；驗證讀寫。
5. 下線 Flink 內 HadoopCatalog 設定。

**注意**：R2 上可能需 static access key；Polaris credential vending 以 AWS IAM 最完整，homelab 可先靜態 key。

### 路徑 B：HadoopCatalog → JdbcCatalog + Postgres

**目標**：中央 metadata DB，仍無 REST 服務。

```text
Flink ──JdbcCatalog──► Postgres (iceberg metadata)
           │
           └──► R2 lake/  (data files 不變)
```

**遷移步驟（高層）**

1. 部署 Postgres（可與其他服務共用實例，建議獨立 DB）。
2. 使用 Iceberg `migrate` / snapshot export 或 `JdbcCatalog` 初始化腳本，將表 metadata 匯入 JDBC catalog。
3. 切換 Flink `catalog-impl` 為 `org.apache.iceberg.jdbc.JdbcCatalog`。
4. 其他引擎各自配置 JdbcCatalog（無 REST 統一入口）。

**取捨**：比 Polaris 少一個服務；多引擎設定較分散。

### 路徑 C：維持 R2 檔案、雙 catalog 過渡（不建議長期）

短暫並行僅用於驗證；避免兩個 catalog 同時寫同一表。

### 升級不影響的部分

| 項目 | 說明 |
|---|---|
| Parquet 檔案位置 | 仍在 `lake/bus/vehicle_observations/` |
| Merge key | 不變 |
| Kafka topic / normalized schema | 不變 |
| Ingestion manifest | 與 catalog 無關 |

## K8s homelab（Phase 1 最小）

```text
namespace: twfoundry-data

  kafka
  ingestion-service
  flink-deployment (bus-lake-archiver)    ← HadoopCatalog in-process
  airflow                                   ← reconciliation（另文件）

external:
  cloudflare R2 (lake/ + bus/ingestion/)
```

**Phase 1 不部署**：Polaris、Postgres（僅為 Iceberg catalog）、Hive Metastore。

## 相關決策摘要

- Merge upsert key：`(slot_key, vehicle_id, route_uid, direction)`
- Lake 層不查 fencing token
- Kafka 7d retention；真相在 Iceberg
- Catalog Phase 1：`HadoopCatalog`；升級見上文
