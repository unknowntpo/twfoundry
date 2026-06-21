# normalized.tdx.bus_vehicle_position.v1

最後更新：2026-06-17

狀態：Phase 1 最小契約（先打通流程）

相關決策：`docs/architecture/technical-decisions-log.md`

## 目的

- 在 `raw.tdx.*` 與下游 Flink job 之間，提供**單一、穩定**的公車車輛觀測契約。
- 消費者：`bus-lake-archiver`、`bus-route-sentinel`（Phase 2）。
- 一則 Kafka 訊息 = **一個 lake 原子（vehicle-in-slot）**，不是整個 slot 批次。

## 與其他單位的關係

| 層級 | 單位 | 本契約 |
|---|---|---|
| TDX raw | 一次 GPS 更新 | 上游；可能多筆 raw 彙整為一則 normalized |
| 營運 / manifest | slot（5 分鐘桶） | `slot_key` 欄位 |
| Lake row | vehicle-in-slot | **一則 Kafka message** |

## Topic

```text
normalized.tdx.bus_vehicle_position
```

### Kafka message key（建議）

```text
{slot_key}|{vehicle_id}|{route_uid}|{direction}
```

與 `bus-lake-archiver` merge key 對齊，利於分區與去重。

### Kafka headers（建議）

| Header | 說明 |
|---|---|
| `schema` | `twfoundry.kafka.normalized.tdx.bus_vehicle_position.v1` |
| `fencing_token` | 選填；ingest 當下 leader token |
| `ingest_mode` | `live` \| `backfill` |

## 欄位分層

### A. 必要（Phase 1 一定要有）

Dedup / lake merge key 與基本觀測：

| 欄位 | 型別 | 說明 |
|---|---|---|
| `schema` | string | 固定 `twfoundry.normalized.tdx.bus_vehicle_position.v1` |
| `slot_key` | string | 如 `2026-06-17T10:05+08:00` |
| `service_date` | string | `YYYY-MM-DD`，Asia/Taipei |
| `slot_label` | string | 如 `10:05` |
| `vehicle_id` | string | `PlateNumb` |
| `route_uid` | string | TDX `RouteUID` |
| `route_name` | string | 顯示用 |
| `direction` | int | `0` / `1` |
| `longitude` | float | WGS84 |
| `latitude` | float | WGS84 |
| `gps_time` | string | ISO8601，有時區 |
| `update_time` | string | ISO8601，有時區 |
| `ingested_at` | string | 寫入 Kafka 時間，ISO8601 UTC |

### B. 建議（Phase 1 有就帶，無則可 default）

| 欄位 | 型別 | 說明 |
|---|---|---|
| `city` | string | 如 `Taipei` |
| `speed_kph` | float \| null | |
| `azimuth_deg` | float \| null | |
| `freshness` | string | `fresh` \| `stale` \| `unknown` |
| `completeness` | float | `0.0`–`1.0` |
| `ingest_mode` | string | `live` \| `backfill` |
| `source_dataset` | string | 如 `Bus.RealTimeByFrequency.City` |

### C. Phase 1 刻意不做（留給下游或未來版本）

不在 normalized v1 計算/攜帶：

- `route_progress_ratio`、`distance_to_route_meters`、`nearest_stop_name` 等投影欄位
- 原因：需 route context；避免 normalized 層與 `bus-lake-archiver` / 未來 archiver 投影邏輯重複
- 未來若穩定可升級 `v2` 或由 archiver 寫入 Iceberg 時衍生

## 範例訊息

```json
{
  "schema": "twfoundry.normalized.tdx.bus_vehicle_position.v1",
  "slot_key": "2026-06-17T10:05+08:00",
  "service_date": "2026-06-17",
  "slot_label": "10:05",
  "city": "Taipei",
  "vehicle_id": "550-U5",
  "route_uid": "TPE10181",
  "route_name": "205",
  "direction": 0,
  "longitude": 121.508478,
  "latitude": 25.02442,
  "speed_kph": 20,
  "azimuth_deg": 224,
  "gps_time": "2026-06-17T10:04:49+08:00",
  "update_time": "2026-06-17T10:04:55+08:00",
  "freshness": "fresh",
  "completeness": 1.0,
  "ingest_mode": "live",
  "source_dataset": "Bus.RealTimeByFrequency.City",
  "ingested_at": "2026-06-17T02:05:12.345Z"
}
```

## 對齊現有 code

| 現有來源 | 對應 |
|---|---|
| `cloudflare/ingestor-worker` `taipeiSlot()` | `slot_key`, `service_date`, `slot_label` |
| `busProjectionContract.toBusMapFeature()` | `vehicle_id`, route, 經緯度, speed, freshness |
| `export-bus-observations-jsonl.mjs` | 除 projection 衍生欄位外的核心觀測欄位 |

## bus-lake-archiver 對應

Merge / upsert key（不變）：

```text
(slot_key, vehicle_id, route_uid, direction)
```

`gps_time` 寫入 Iceberg 欄位，但不參與 dedup key。

## Normalize 整理原則（訣竅）

ingest 服務負責 raw → normalized；Flink job **不**重複清洗 raw。

1. **對齊 lake 原子**：一則訊息 = 一輛車 × 一個 slot（vehicle-in-slot），不是整包 slot，也不是每筆 TDX CSV 列都獨立留著。
2. **只收穩定觀測事實**：車牌、路線、方向、經緯、時間、品質標記；不算 `route_progress`（需 route context）。
3. **抹平來源差異**：Live JSON 與 Historical CSV 輸出同一套 snake_case 欄位；`RouteName` 物件抽 `Zh_tw`。
4. **Slot 語意寫死 + 標 mode**：Live 用 poll 時間分桶；Historical 用 `UpdateTime` 分桶；兩者格式相同但語意不同 → 必帶 `ingest_mode`。
5. **Kafka key = merge key**：與 `bus-lake-archiver` dedup key 一致。
6. **不帶 UI 衍生**：不帶 `x`/`y` 百分比座標；不帶僅供地圖展示的欄位。

詳見 `docs/architecture/tdx-bus-ingestion-slot-bucketing.md`。

## Slot 分桶（摘要）

| 模式 | Fetch 單位 | 分桶依據 |
|---|---|---|
| **Live** | 1 次 HTTP / 5 min（全市） | poll 時間 `taipeiSlot(now)` |
| **Historical** | 1 次 HTTP / 整天 CSV | 每筆 `UpdateTime` 本地分桶 |

Historical 同 slot 同車牌只留 `UpdateTime` 最新一筆後再 normalize。

## TDX 欄位對照

### TDX API / CSV → normalized.v1

| TDX / archive | normalized.v1 |
|---|---|
| `PlateNumb` | `vehicle_id` |
| `RouteUID` | `route_uid` |
| `RouteName` | `route_name` |
| `Direction` | `direction` |
| `BusPosition.PositionLon/Lat` | `longitude`, `latitude` |
| `Speed` | `speed_kph` |
| `Azimuth` | `azimuth_deg` |
| `GPSTime` | `gps_time` |
| `UpdateTime` | `update_time` |
| slot envelope `slot.key` | `slot_key`, `service_date`, `slot_label` |
| （ingest 產生） | `ingested_at`, `ingest_mode`, `freshness`, `completeness` |

### TDX 有、archive 常未留、v1 可選

`RouteID`, `SubRouteUID`, `SubRouteID`, `SrcUpdateTime`, `TransTime` — Phase 1 可不進 normalized，未來 v2 按需加入。

## 版本演進

- `v1`：最小觀測 + slot 語意，無 route projection。
- 未來按路線抓取 TDX：仍用同一 schema；manifest 改追 slot 內各路線完成度，normalized 單筆不變。
- `v2`（若需要）：可選加入 projection 欄位或獨立 `normalized.tdx.bus_vehicle_position_enriched` topic。
