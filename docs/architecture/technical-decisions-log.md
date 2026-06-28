# TWFoundry 技術決策紀錄（持續更新）

最後更新：2026-06-26

**架構文件索引**

| 文件 | 內容 |
|---|---|
| `technical-decisions-log.md` | 決策紀錄（本文件） |
|| `homelab-deployment-notes.md` | 本地 K8s 部署、infra 路徑、namespace |
| `normalized-bus-vehicle-position-v1.md` | Kafka normalized 契約 |
| `tdx-bus-ingestion-slot-bucketing.md` | Live/Historical 分桶、TDX API、fetch 單位 |
| `bus-ingestion-manifest-v1.md` | Slot 狀態、Airflow 兜底 |
| `ingestion-service-v1.md` | Ingestion service 模式、HTTP API、idempotency |
| `kafka-topics-bus-v1.md` | Bus Phase 1 Kafka topic 與 durability 設定 |
| `bus-lake-archiver-v1.md` | Flink → Iceberg on R2、HadoopCatalog、升級路徑 |
| `airflow-reconciliation-bus-v1.md` | Airflow 兜底 DAG、grace、限流 |
| `poller-lock-v1.md` | R2 lease、fencing、step-down（KISS） |

目的：
- 集中記錄本專案重要技術決策（包含與你討論後拍板、以及我基於風險/維運判斷做的實作決策）。
- 先求流程跑通，再逐步細化欄位與實作細節。

使用方式：
- 每次新增決策都加一段，包含：決策、原因、影響、後續。
- 若決策變更，不覆蓋舊內容，請新增「更新決策」條目並引用原條目日期。

---

## 決策清單

## 2026-06-17：先走最小可運作流程（MVP-first）

**決策**
- 先優先打通整體資料流程，不先卡在完整欄位設計。
- 資料欄位細節可在流程穩定後再擴充。

**原因**
- 目前最大風險是流程與責任邊界不清，不是欄位不夠多。
- 先有可跑可驗證的路徑，後續調整成本最低。

**影響**
- `normalized` topic 先採最小欄位集合。
- Flink/ClickHouse/Iceberg 欄位可採版本化演進。

**後續**
- ~~補 `normalized.tdx.bus_vehicle_position.v1` 最小 schema 草案。~~ → 已完成

---

## 2026-06-17：`ingest_slot()` 單一邏輯、多觸發來源

**決策**
- 所有 TDX 抓取 + normalize + 寫 Kafka 集中在 **`ingest_slot(slot_key, mode)`** 單一實作。
- **Poller** 內建於 **ingestion service**（非獨立 binary）；僅 lock holder 跑定時 live ingest。
- **Airflow** 透過 HTTP 觸發同一服務；**無獨立 backfill script**。
- 自動補洞不在 poller 內嵌第二套 TDX 邏輯。

**原因**
- 避免 poller / backfill / Flink 各自實作 TDX 清洗。
- Failover 與補洞共用同一 normalize 與 Kafka key 語意。

**影響**
- Ingestion service 持有 TDX 憑證；負責 manifest 寫入。
- Poller 負責 HA（lock/leader）；on-demand 補洞不需 poller lock。

**文件**
- `docs/architecture/ingestion-service-v1.md`

---

## 2026-06-17：Ingestion service HTTP — 同步回應與 idempotency

**決策**
- On-demand ingest 採 **`POST /ingest/slots` 同步回應**（Phase 1 不採 async job queue）。
- **Idempotency**：manifest 已 `complete` 且 `force=false` → 跳過，回 `skipped: true`。
- **`force=true`**：允許對已 complete 的 slot 強制重跑（覆寫 manifest；Kafka dup 可接受）。
- Poller live 路徑對當前 slot 每 5 min 定時抓，不套用 complete skip。

**原因**
- 同步 API 實作與 Airflow 編排最簡單。
- 明確 idempotency 避免 reconciliation 重複打 TDX；`force` 保留 ops 逃生口。

**文件**
- `docs/architecture/ingestion-service-v1.md`

---

**決策**
- Manifest 追蹤 **slot 級** ingest 完成度（非車輛級）。
- 狀態：`complete` | `failed`；`missing` 由 Airflow 用「預期 slot − complete」推斷，不寫入條目。
- **ingest 服務**在 `ingest_slot()` 成功後更新 manifest（非 Kafka consumer 統計）。

**原因**
- Airflow 兜底需要權威的 slot 完成索引。
- ingest 端最清楚整 slot 是否成功。

**文件**
- `docs/architecture/bus-ingestion-manifest-v1.md`

---

## 2026-06-17：Manifest 與 Kafka dedup 分離；`recordCount` 為 informational

**決策**
- Manifest 回答 slot **完成度**；Kafka merge key 回答 **vehicle-in-slot 去重**。互不取代。
- Failover / backfill 重跑可能產生 **Kafka 同 key 重複訊息**（可接受）；lake merge 收斂。
- Manifest 條目採 **覆寫語意**；`recordCount` / `routeCount` 僅供觀測，**不**參與 reconciliation。
- Manifest upsert 帶 `fencingToken`；僅 `fencingToken >= 現有條目` 時覆寫 `complete`。

**原因**
- Reconciliation 只需 `expected slotKeys − complete slotKeys`。
- 覆寫語意下 `recordCount` 為最後一批筆數，不會因 dup 累加；重跑時 count 差異來自 TDX 變動，非缺洞信號。

**文件**
- `docs/architecture/bus-ingestion-manifest-v1.md`（生命週期、failover、recordCount 專節）

---

## 2026-06-17：Kafka 與 manifest 非原子；Outbox 留作升級路徑

**決策**
- Phase 1：順序為 **Kafka produce → R2 manifest upsert**；兩步 **非原子**。
- Kafka 成功、manifest 失敗時：`ingest_slot()` 回傳錯誤；Airflow 以 missing 觸發 backfill；lake merge 保證資料正確。
- 若日後需更強 manifest 正確性，升級為 **outbox pattern**（slot 完成事件進 Kafka，獨立 writer 更新 manifest）。

**原因**
- Kafka + R2 無共用交易；Phase 1 避免額外元件。
- 車輛資料以 Kafka + lake merge 為準；manifest 落後可冪等重跑修復。

**文件**
- `docs/architecture/bus-ingestion-manifest-v1.md`（非原子提交、outbox 專節）

---

## 2026-06-17：Bus Phase 1 Kafka topics 與 durability

**決策**
- 主 topic：`normalized.tdx.bus_vehicle_position`；DLQ：`dlq.tdx.bus_vehicle_position`。
- Phase 1 不建 `raw.tdx.bus_*`。
- Topic：`cleanup.policy=delete`，`retention.ms=7d`，`num.partitions=6`。
- 三 broker：`replication.factor=3`，`min.insync.replicas=2`。
- Producer：`acks=all`，`enable.idempotence=true`。

**原因**
- Kafka 為 handoff 緩衝；Iceberg 為長期真相。
- `acks=all` + `min.isr=2` 避免 leader 複製中 crash 導致已 ack 資料遺失。

**文件**
- `docs/architecture/kafka-topics-bus-v1.md`

---

## 2026-06-17：Iceberg Phase 1 用 HadoopCatalog on R2

**決策**
- **`bus-lake-archiver`** 寫入 `bus.vehicle_observations`，catalog 為 **`HadoopCatalog`**（warehouse `s3://twfoundry-lake/`）。
- 無 Postgres / Polaris / 獨立 catalog pod；catalog 邏輯在 Flink 進程內。
- 分區：`service_date`（day）；merge key：`(slot_key, vehicle_id, route_uid, direction)`。
- Checkpoint **60s**；at-least-once + upsert。
- 升級路徑：**Polaris REST**（多引擎）或 **JdbcCatalog + Postgres**（見 `bus-lake-archiver-v1.md`）。

**原因**
- Homelab K8s 元件最少；單一 archiver writer 與 HadoopCatalog 匹配。
- Parquet 留在 R2；catalog 升級不需搬資料檔。

**文件**
- `docs/architecture/bus-lake-archiver-v1.md`

---

## 2026-06-17：Slot 分桶語意（Live vs Historical）

**決策**
- **Live**：`slot_key` 由 poll 時間 `taipeiSlot(now)` 決定；該次 API 全部車輛共用同一 slot。
- **Historical**：1 次抓整天 CSV，本地依每筆 `UpdateTime` 分桶；同 slot 同車牌只留最新。
- normalized 必須帶 `ingest_mode`，並保留 `gps_time` / `update_time`。

**文件**
- `docs/architecture/tdx-bus-ingestion-slot-bucketing.md`

---

## 2026-06-17：事件骨幹採 Kafka（非 Redpanda 專屬敘事）

**決策**
- 正式對外與對內主敘事使用 Kafka 作為事件骨幹。

**原因**
- 與目前專案/履歷敘事一致。
- 保持與 Kafka 生態（Connect/Flink/Iceberg）直接對齊。

**影響**
- 後續文件與實作優先以 Kafka 名稱與介面描述。
- Redpanda 可作為本地相容替代，但非主敘事中心。

**後續**
- 規劃 `infra/kafka/` 本地開發環境（KRaft）與對應文件。

---

## 2026-06-17：Poller 採 active-standby（雙實例 + 鎖），非雙 active

**決策**
- 兩個 poller instance，但同時間只允許一個 primary 抓 TDX。
- standby 透過 lock failover 接手，不做平行雙抓。

**原因**
- 避免重複抓取、重複寫入與額外 dedup 複雜度。
- 在可接受 gap 的前提下，這是維運與可靠性平衡點。

**影響**
- 需要 lease/lock、heartbeat、failover 機制。
- Fencing 主戰場在 **ingest produce 前**（step-down）；**不在** `bus-lake-archiver` 每次 write 查 token（見下方專節）。

**後續**
- ~~定義 lock record 格式與 heartbeat/failover 時序。~~ → `poller-lock-v1.md`
- ~~定義 fencing token 在 Kafka header 與 manifest `fencingToken` 的落點。~~ → `poller-lock-v1.md`（live manifest + 可選 Kafka header）

---

---

## 2026-06-17：Poller lock — R2 單檔 lease（KISS）

**決策**
- Lock 檔：`bus/ingestion/poller-lock.json`（R2）；**TTL 30s**，**renew 10s**。
- 僅 **lock holder** 跑 live poller；`fencingToken` 每次 **新 acquire +1**。
- Live ingest 前：**renew → holder 檢查 → step-down**；backfill **不**持鎖。
- Manifest：**live** 寫入帶 token 且須為 holder；**backfill** 不擋 lock（修缺口優先）。
- Kafka header `fencing_token`：可選 Phase 1；lake 不驗證。

**原因**
- KISS：無額外鎖服務；與 manifest 同用 R2。
- Token 防 stale leader 寫 manifest；dup 仍靠 lake merge。

**升級路徑**
- R2 CAS 不夠用 → K8s Lease 或 Postgres lease 表（見 `poller-lock-v1.md`）。

**文件**
- `docs/architecture/poller-lock-v1.md`

---

## 2026-06-17：允許短暫 gap，補洞先走簡化路線（Poller + Airflow 兜底）

**決策**
- 接受暫時資料缺口。
- **Phase 1 不做** eager gap watcher；先用 **Poller（primary/standby）+ Airflow 定時 reconciliation** 補洞。
- 若後續 SLA 或營運需求提高，再評估獨立 gap watcher。

**原因**
- 先降低元件數量，優先打通主流程。
- Lock failover 已能處理大部分「程序掛掉」情境。
- Airflow 適合做 hourly/daily 兜底，不適合做 5 分鐘熱路徑。

**影響**
- 補洞延遲以 Airflow schedule 為主（例如每小時），非分鐘級。
- 仍需 manifest / slot 狀態，供 Airflow 比對缺哪些 slot。
- Dashboard 仍建議顯示 last-updated，避免把短暫缺口誤讀成營運狀態。

**後續**
- ~~定義 Airflow reconciliation DAG：預期 slot vs manifest → 呼叫 `ingest_slot()` 補缺。~~ → `airflow-reconciliation-bus-v1.md`
- 若觀察到缺口影響過大，再升級為 watcher 快補。

---

---

## 2026-06-17：Airflow reconciliation DAG（bus Phase 1）

**決策**
- DAG `bus_ingestion_reconcile`；schedule **`15 * * * *`**（Asia/Taipei，每小時 :15）。
- Reconcile **今天 + 昨天**；今天僅 expected 已過 **grace** 的 slot。
- **`GRACE_MINUTES=15`**；**`MAX_BACKFILL_PER_RUN=12`**；backfill 並行 **2**。
- `failed` manifest 條目視同 missing；`POST /ingest/slots` `force=false`。
- Report 寫入 `bus/ingestion/reconciliation/{service_date}/{run_id}.json`。

**原因**
- 非熱路徑；避免與 poller 競態誤判 missing。
- 限流避免單次 DAG 對 TDX 發起全天 288 次 backfill。

**文件**
- `docs/architecture/airflow-reconciliation-bus-v1.md`

---

## 2026-06-17：Flink 拆兩個 job — `bus-lake-archiver` / `bus-route-sentinel`

**代號（後續溝通請用此名，不用 Job A/B）**

| 代號 | 角色 | 輸入 → 輸出 |
|---|---|---|
| **`bus-lake-archiver`** | 湖倉歸檔 | `normalized.*` → R2 Iceberg |
| **`bus-route-sentinel`** | 路線即時哨兵 | `normalized.*` → `online.*` topics |

**決策**
- 兩個 Flink job 分離部署，不合併為單一 job。
- **`bus-lake-archiver`** 寫入語意採 **merge/upsert**（不採 append-only + 查詢時 dedupe）。
- Dedup key 見下方「Lake 原子與 dedup key」專節。

**原因**
- 故障隔離：在線告警不應阻塞湖倉寫入，反之亦然。
- merge/upsert 與 failover 重複 Kafka 訊息策略一致；ClickHouse 查 lake 不必每次 dedupe。

**影響**
- `bus-lake-archiver` 不做告警、不查 fencing token；`bus-route-sentinel` 不寫 Iceberg。
- 需要共用 `normalized.*` 契約與版本管理。

**文件**
- `docs/architecture/bus-lake-archiver-v1.md`（Iceberg 表、catalog、Flink 參數）

**後續**
- 定義兩 job 的 SLO。

---

## 2026-06-17：Lake 原子與 dedup key（vehicle-in-slot）

**三層單位（勿混淆）**

| 層級 | 名稱 | 單位 | 用途 |
|---|---|---|---|
| TDX 原始 | raw observation | 一次車輛 GPS 更新（CSV 一列 / API 一筆） | 資料來源 |
| 營運 / 補洞 | slot | 5 分鐘時間桶（如 `2026-06-17T10:05+08:00`） | `ingest_slot()`、manifest、Airflow reconciliation |
| Lake 儲存 | **vehicle-in-slot** | 一輛車在某 slot 內的一筆代表觀測 | Iceberg row、`bus-lake-archiver` merge |

**說明**
- TDX 原子 ≠ Lake 原子。Historical 分 slot 時，同一 slot 同一車牌可能有多筆 raw 更新；現有腳本會保留 **UpdateTime 最新** 一筆再進 snapshot（見 `fetch-tdx-taipei-bus-history.mjs` `groupRowsBySlot`）。
- Backfill **觸發** 以 slot 為單位（補 `10:05` 整個快照），但 **寫入** lake 時一個 slot 仍對應 **多列**（約數百輛車），不是一列。
- 因此 dedup key 不能只用 `slot_key`；否則等於「全市一個 slot 只能存一列」，語意錯誤。

**為何 backfill 是 slot，key 卻要細到 vehicle / route / direction？**

```
Backfill 觸發：  「10:05 這個 slot 缺了」     → 營運單位
Lake 寫入：      「10:05 有 200 輛車 200 列」  → 儲存單位
Dedup 合併：     「同一輛車同一 slot 重複寫入」  → 需 per-row key
```

- `vehicle_id`：同一 slot 內區分不同車輛（主鍵必要）。
- `route_uid, direction`：與現有 ClickHouse 分析粒度一致；防極少數髒資料（同 slot 同車牌異常雙路線）；與 `docs/interview/clickhouse-bus-analytics.md` 建議一致。
- `gps_time` **不** 納入 key：屬觀測屬性；納入 key 可能在 GPS 卡住時錯誤合併不同 slot。

**決策（拍板）**
- **`bus-lake-archiver`** merge/upsert key：`(slot_key, vehicle_id, route_uid, direction)`。
- `gps_time`、`update_time`、`captured_at` 為一般欄位，供品質與回放分析。

**另：slot 級整批覆寫（未採）**
- 亦可採「每 slot 整批 overwrite partition」取代 row-level merge；Phase 1 不採，因 failover 與 streaming micro-batch 較適合 row merge。

---

## 2026-06-17：Lake 層不做 fencing 檢查，依賴 dedup 收斂

**決策**
- **`bus-lake-archiver`** 不在每次 write 時比對 latest fencing token。
- Failover 期間 primary/secondary 都曾 produce 到 Kafka **可接受**；dedup key 保證 Iceberg 最終每個觀測只有一份。
- Fencing 主戰場在 **ingest produce 前**（step-down）。

**原因**
- 每筆 lake write 比對全域 token 增加複雜度與延遲，Phase 1 效益不高。
- 目標是「資料正確一份」，不是「只有一個 writer 能進 Kafka」。

**影響**
- 可能仍有重複 TDX 抓取與重複 Kafka 訊息，但不應造成 lake 雙倍 row。

---

## 2026-06-17：引入 normalized topic 作為共用輸入契約

**決策**
- 在 poller/raw 之後加一層 `normalized.*` topic。
- **`bus-lake-archiver`** 與 **`bus-route-sentinel`** 都讀 `normalized.*`，不直接各自清洗 `raw.*`。

**原因**
- 避免兩個 job 各自做清洗而產生語意漂移。
- 把資料清洗與業務計算拆開，便於測試與版本演進。

**影響**
- 多一個 topic 與 schema 治理成本。
- 下游邏輯更單純，維護成本更低。

**後續**
- ~~產出 `normalized.tdx.bus_vehicle_position.v1` 最小欄位定義。~~ → 見 `docs/architecture/normalized-bus-vehicle-position-v1.md`

---

## 2026-06-17：`normalized.tdx.bus_vehicle_position.v1` 最小 schema（拍板）

**決策**
- Topic：`normalized.tdx.bus_vehicle_position`
- **一則 Kafka 訊息 = 一個 vehicle-in-slot**（非整包 slot 批次）。
- Phase 1 必要欄位：dedup key 四欄 + 經緯度 + `gps_time` / `update_time` / `ingested_at` + slot 欄位。
- **v1 不含** route projection 衍生欄位（`route_progress_ratio` 等）；留給 `bus-lake-archiver` 或未來 v2。
- Kafka message key：`{slot_key}|{vehicle_id}|{route_uid}|{direction}`。

**原因**
- 與 lake 原子、merge key、現有 `toBusMapFeature` 對齊。
- 下游 Flink job 可分區消費；failover 重複訊息可由 key merge。
- 先小後大，避免 normalized 層過早承擔投影邏輯。

**文件**
- 完整欄位表與範例：`docs/architecture/normalized-bus-vehicle-position-v1.md`

---

## 2026-06-17：Iceberg on R2 作為單一實體資料副本（目標架構）

**決策**
- 目標是 Kafka -> Iceberg(R2) 單一路徑寫入。
- ClickHouse 優先採「查詢湖上資料」而非再做一份完整歷史拷貝。

**原因**
- 降低重複儲存與雙重管線維護成本。
- 保留回放、長期留存與跨引擎讀取能力。

**影響**
- 需評估 ClickHouse 查 Iceberg 的查詢延遲與快取策略。
- 需補 lake writer commit、分區、compact、schema evolution 策略。

**後續**
- 定義 Iceberg partition spec、compaction policy、CH 查詢基準。

---

## 2026-06-17（未來）：TDX 可能改為按路線抓取（非全市一次）

**背景**
- 現況：`GET /Bus/RealTimeByFrequency/City/Taipei?$top=1200`，一次抓全市。
- 問題：資料量成長時可能觸及 `$top` 上限、回應過大、rate limit 壓力；現有 live ingestor 已設 `DEFAULT_TOP = 1200`。

**可能演進**
- 改為按 `RouteName` / `RouteUID` 分次抓取，再彙整成同一 `slot_key` 的多筆 normalized 事件。

**對架構的影響（預留，Phase 1 不實作）**

| 元件 | 變化 |
|---|---|
| **ingest 觸發** | 由 `ingest_slot(slot)` 可能演進為 `ingest_slot(slot)` 內部並行多路線，或 `ingest_slot_route(slot, route_uid)` |
| **manifest** | slot 級完成度需改為 **slot + route** 子狀態（partial / complete） |
| **Lake dedup key** | **`(slot_key, vehicle_id, route_uid, direction)` 仍適用**，不需因按路線抓取而改 key |
| **Lake 原子** | 仍是 vehicle-in-slot；僅 ingest 來源從「一次全市」變「多路線彙整」 |
| **Airflow 補洞** | 可細化為補「某 slot 的某路線」而非整個 slot |

**Phase 1 策略**
- 先維持全市單次抓取打通流程。
- normalized schema、manifest、dedup key **預留 `route_uid`**，避免未來按路線拆分時破壞下游。

---

## 待補（實作階段）

- ~~lock + fencing token~~ → `poller-lock-v1.md`
- ~~`infra/kafka/` 本地 KRaft compose + 與 topic 建立腳本~~ → 完成（2026-06-18）
- ~~`services/bus-lake-archiver/` Phase 1 dev 實作~~ → 完成（2026-06-18）
- ingestion service / Flink job 程式骨架

---

## 2026-06-18：`bus-lake-archiver` Phase 1 採 Node.js dev 實作先打通流程

**決策**
- Phase 1（當前）用 **Node.js dev archiver** (`services/bus-lake-archiver/`) 驗證 Kafka → lake e2e 流程。
- 在記憶體維持 merge table；每 60s checkpoint 一次輸出 JSONL 到 `data/lake/bus/vehicle_observations/YYYY-MM-DD.jsonl`。
- 加上 `archived_at` 時間戳（UTC）。
- Phase 2 正式升級為 **Flink + Iceberg on R2**（見 `bus-lake-archiver-v1.md` 中的 Flink job 規格）。

**原因**
- Flink 環境依賴較重（JVM、Iceberg 依賴、K8s deployment）；dev 版本用 Node.js + kafkajs + 本地 JSONL，快速驗證資料流。
- KISS：避免 Phase 1 卡在基礎設施，優先確保 normalized topic 完整性與 merge 邏輯正確。
- 本地開發與 homelab 測試更輕量；laptop 即可跑完整 e2e。

**實作詳情**
- Merge key：`(slot_key, vehicle_id, route_uid, direction)`；重複時保留 `update_time` 最新者（或 `ingested_at` 最新者）。
- Consumer group：`bus-lake-archiver`。
- Checkpoint interval：60s（可配置）。
- 包含單元測試驗證 merge/dedup 邏輯。
- 提供 `scripts/verify-archiver-e2e.sh` 端到端驗證腳本（啟動 Kafka → post 訊息 → run archiver → 檢查 JSONL 輸出）。

**升級不受影響的部分**
- Consumer group 名稱保持 `bus-lake-archiver`；Flink 版本也用同名。
- Merge key 與 dedup 邏輯**相同**；Flink `IcebergSink` equality-delete 實作相同語意。
- `normalized.tdx.bus_vehicle_position` 契約不變。
- Partition 仍為 `service_date`。

**Stub for prod（Flink 版本實作時）**
- Iceberg table 定義 + HadoopCatalog 初始化
- R2 warehouse path `s3://twfoundry-lake/`
- Parquet format + ZSTD 壓縮
- Flink parallelism ≤ 6（與 Kafka partition 數對齊）
- 錯誤訊息轉 DLQ topic `dlq.tdx.bus_vehicle_position`

**文件**
- `services/bus-lake-archiver/README.md` — dev 版本執行與 API
- `docs/architecture/bus-lake-archiver-v1.md` — 新增「Phase 1 dev 實作」序言

**後續**
- 驗證 normalized topic 生成品質後再投入 Flink 遷移。
- 轉 Flink 時複用現有 merge key、checkpoint 語意、partition 策略。

---

## 2026-06-26：移除 obsolete 前端路由/UI（route-geometry、legacy-voxel、operations-explorer alias）

**決策**
- 移除三條前端路由與對應 UI：
  - `/route-geometry`（`RouteGeometryConcept.vue`）+ OperationsExplorer 的 `View route` 連結（`routeMonitorHref`）。
  - `/legacy-voxel`（`App.vue`，舊 voxel 原型）。
  - `/operations-explorer`（與 `/` 重複的別名）。
- 保留 design-system 預覽路由（`/design-system`、`/design-system-contract`、`/minimum-design-system-contract`）與其 voxel preview 元件。
- 來源：2026-06-26 production UI/UX persona review（`docs/prod-uiux-persona-review-2026-06-26.md`）。

**原因**
- `/route-geometry` 在 prod 打 `/api/tdx/bus-delay-poc` 取得 `503`（Pages 無 TDX 憑證、也無對應 function），頁面卻降級顯示「目前無異常訊號／0 筆」，把後端失敗偽裝成「一切正常」——是整個 workflow 最傷信任的狀態。其職能已由 `/bus-oversight` 的路線 drilldown 取代。
- `/legacy-voxel` 已被 map-first `OperationsExplorer` 取代，無任何 UI 連到它。
- `/operations-explorer` 與 `/` 完全重複。

**影響**
- 刪除 `frontend/src/App.vue`、`frontend/src/RouteGeometryConcept.vue`。
- `busRouteGeometry.js` 保留（仍被 `OperationsExplorer` 共用）；voxel*.js 保留（design-system preview 仍用）。
- route-health watchlist 列由 `<a href>` 改為非導覽 `<div>`（移除死連結，保留資訊顯示）。
- 清除無用 i18n key `routeHealth.detail` / `routeHealth.selectedDetail`（EN+zh）。
- `scripts/check-product-copy-boundary.mjs` 移除對已刪 `RouteGeometryConcept.vue` 的引用。
- 未知路徑統一 fallback 到 `OperationsExplorer`（`routes[path] ?? OperationsExplorer`），故舊 `/route-geometry` 連結不再噴 503。

**驗證**
- `vite build` 通過；`bun tests/run.mjs` 10 suites 全過；copy-boundary check 通過。
- 本地 dev 確認：route-geometry fallback 正常、design-system 三路由正常、無 console error。

**後續**
- （選配）若確定不再需要，移除無對應 UI 的 `/api/tdx/bus-delay-poc` Pages function 測試與相關死碼。
- persona review 的 P1（live row 可點選聚焦路線、自動跳到最嚴重時段）尚未實作，屬獨立增強。

---

## 2026-06-26：KPI 載入狀態誠實（不得在資料 resolve 前顯示未確認的 0/—）

**決策**
- `BusOversightDashboard` 的 KPI 卡在批次/即時資料尚未 resolve 前，顯示 skeleton（shimmer）而非 `0`/`—`。
- 以 `batchReady`（`analytics.bunching !== null`）判定批次是否到位；即時卡（service gap / bunching）在 `liveCounts` 與批次皆無時才視為 loading。

**原因**
- persona review 指出首屏渲染會短暫顯示 `0`，被誤讀為「真的零事件」，而非載入中。

**影響**
- KPI 卡新增 `loading` 旗標、`is-loading` class 與 `aria-busy`；新增 skeleton CSS 與 `oversight.kpi.loading` i18n（EN+zh）。
- 尊重 `prefers-reduced-motion`（停用 shimmer 動畫）。

**後續**
- 同樣的 loading-state 原則可推廣到 timeline / route evidence 區塊。

---

## 2026-06-26：bus-oversight batch 接 R2 Function（修 05-20 stale + 移除 Spectra）

詳見 `bus-oversight-data-serving-and-freshness.md`。

**決策**
- prod/staging build 用新 script `build:prod`（`VITE_TWFOUNDRY_ANALYTICS_BASE=/api/analytics/bus`），dashboard batch 改讀 **R2-backed Pages Function**（`/api/analytics/bus/*`，06-25、自動更新），取代凍結的靜態 `/data/analytics/bus/`（05-20）。
- 不動 default `build`（保持靜態指向）：`/api/*` Function 在本地 `vite`/`vite preview` 不存在，CI e2e 預覽用 default build。
- 同時移除 Spectra（SDD 工具）：刪各 AI 工具的 spectra 指令/skill、`.spectra*`、`openspec` 工具；保留 `twfoundry-extensibility-judge`；openspec 的 75 個 .md 設計內容搬到 `docs/specs`、`docs/changes`；`AGENTS.md` 重寫為純治理。

**原因**
- 根因：prod build 未設 analytics base → batch 落到舊靜態 05-20；與 live 06-26 相差 37 天 > 7，觸發 `buildBusOversightModel` 的 merge 守門 → 退回 batch-only、整片凍 05-20，失去信任度。
- `/api/analytics/bus` R2 Function 已存在且供應全部 4 檔（06-25），直接接上等於免費取得 R2 read path（原 ③ 的一部分）。

**影響**
- batch 05-20 → 06-25（與 live 06-26 差 1 天 → `mergeSpeed=true`，timeline 延伸到今天、live 縫回）。
- 涵蓋路線 21 → 52（06-25 batch）。
- prod 部署改用 `bun run build:prod`（見 deploy memory）。

**驗證**
- local `build:prod` → staging `twfoundry-poc` 驗證（日期只剩 06-26、無 analytics/online 失敗）→ prod `twfoundry` 同樣驗證通過。

**後續**
- ②（serving 統一：Flink 補齊 metric 契約 + provisional 渲染）、③（batch 覆蓋完整度）見設計文件。
- 長期可考慮把 `/data/analytics/bus`（05-20 靜態）與 `/data/analytics-rolling`（06-21 靜態）淘汰，dev 也走 R2 或統一 fixture。

---
