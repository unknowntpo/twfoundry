# TDX 公車 Ingestion：Slot 分桶與 Fetch 單位

最後更新：2026-06-17

相關文件：
- `docs/architecture/normalized-bus-vehicle-position-v1.md`
- `docs/architecture/bus-ingestion-manifest-v1.md`
- `docs/tdx-bus-route-geometry-api.md`

## 共同規則

- 預設 `intervalMinutes = 5`
- `slot_key` 格式：`YYYY-MM-DDTHH:MM+08:00`（Asia/Taipei）
- 分桶概念：`slot_start = floor(時間, 5 分鐘)`
- 一天 24 小時 → `288` 個 slot

範例：

| 時間 | slot_key |
|---|---|
| 10:03 | `2026-06-17T10:00+08:00` |
| 10:07 | `2026-06-17T10:05+08:00` |
| 10:12 | `2026-06-17T10:10+08:00` |

---

## Live poll：用「抓取當下」分桶

**API**

```text
GET /Bus/RealTimeByFrequency/City/Taipei?$top=1200&$format=JSON
```

**Fetch 單位**：每 5 分鐘 **1 次 HTTP**，回傳全市車輛陣列。

**分桶邏輯**（`taipeiSlot(now)`，`cloudflare/ingestor-worker` / `fetch-tdx-taipei-bus-snapshot.mjs`）：

1. 以 poll 時間 `now` 做 5 分鐘 floor → 得到 `slot_key`
2. 該次 API 回傳的**所有車輛**都貼上**同一個** `slot_key`
3. **不**依每輛車的 `GPSTime` 分桶

```
poll @ 10:07:32  →  slot_key = 10:05
  ├─ 車A  GPSTime=10:04:49  →  slot 10:05
  ├─ 車B  GPSTime=10:06:12  →  slot 10:05
  └─ 車C  GPSTime=10:03:01  →  slot 10:05
```

**語意**：slot = 「我們在這個 5 分鐘窗口內抓到的全市快照」。

---

## Historical backfill：先抓整天，再本地分桶

**API**

```text
GET /Historical/Bus/RealTimeByFrequency/City/Taipei?Dates=YYYY-MM-DD&$top=500000&$format=CSV
```

**Fetch 單位**：**1 次 HTTP / 整天**（非每 slot 一次 API）。

**本地處理**（`fetch-tdx-taipei-bus-history.mjs`）：

### 步驟 1 — `groupRowsBySlot`

對每一列 CSV：

1. 取 `UpdateTime`（fallback `SrcUpdateTime` → `GPSTime`）
2. 用 `slotFromTaipeiTime(updateTime)` 分到 5 分鐘桶
3. 同 slot、同車牌只保留 **UpdateTime 最新** 一筆

```
車A UpdateTime=10:04:49  →  slot 10:00
車B UpdateTime=10:06:12  →  slot 10:05
```

### 步驟 2 — `buildCarryForwardSlots`（可選，預設 30 分鐘）

若某 slot 沒有直接觀測，在 carry-forward 窗口內沿用上一筆已知位置（標記 `tdx-historical-carried`）。

### 步驟 3 — 寫檔

每個有資料的 slot 寫一個 snapshot 檔：

```text
archive/2026-06-17/10-00.json
archive/2026-06-17/10-05.json
```

---

## Live vs Historical 對照

| | Live poll | Historical |
|---|---|---|
| Fetch 單位 | 1 次 / 5 min | **1 次 / 整天** |
| 分桶時機 | poll 當下 | **抓完後本地分桶** |
| 分桶依據 | poll 時間 `now` | 每筆 **UpdateTime** |
| 同 slot 同車 | 通常一筆 | 多筆 raw → 只留最新 |
| 空 slot | 沒 poll 就沒資料 | carry-forward 可填 |
| 語意 | 「我們何時抓的」 | 「車輛何時回報的」 |

**重要**：兩者 `slot_key` 格式相同，但**語意不完全一致**。normalized 訊息必須帶 `ingest_mode: live | backfill`，並保留 `gps_time` / `update_time`。

---

## TDX API：全市 vs 按路線

| | 全市 | 按路線 |
|---|---|---|
| URL | `.../City/Taipei` | `.../City/Taipei/{RouteName}` |
| 範圍 | 全市所有路線 | 單一路線 |
| 呼叫次數 | 1 / slot | N / slot（N = 路線數） |
| 回傳欄位 | 相同（RealTimeByFrequency） | 相同 |
| Phase 1 | **採用** | 未來演進 |

全市 API 風險：`$top=1200` 可能截斷。未來改按路線抓時，manifest 需追蹤 slot 內各路線完成度（見 `technical-decisions-log.md`）。

---

## TDX 原始欄位 vs Archive 存檔

### TDX API / CSV 常見欄位

`PlateNumb`, `RouteUID`, `RouteID`, `RouteName`, `SubRouteUID`, `SubRouteID`, `Direction`, `BusPosition.*`, `Speed`, `Azimuth`, `GPSTime`, `SrcUpdateTime`, `UpdateTime`, `TransTime`

### Archive `records[]` 實際保留（normalize 後）

TDX 欄位 + 衍生：`source`, `freshness`, `completeness`, `mode`, `age`, `x`, `y`

TDX 有但 archive 常未留：`RouteID`, `SubRouteUID`, `SubRouteID`, `SrcUpdateTime` 等。

詳見 `normalized-bus-vehicle-position-v1.md` 的欄位對照表。
