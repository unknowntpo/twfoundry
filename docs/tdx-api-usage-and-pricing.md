# TDX API Usage & Pricing

最後更新：2026-06-27

目的：集中記錄 TDX（運輸資料流通服務）的**收費／點數規則**與**我們實際用到的 API**，方便隨時調整訂閱方案與 poll 頻率。

> ⚠️ 收費數字來源：官方 `pricing` 頁是 JS 動態渲染、抓不到純文字；以下點數規則來自 TDX 論壇/社群與新手指引（見 Sources），**請以官方頁面為準、定期校對**。QPS 與端點分類已用我們自己的金鑰實測確認。

## 收費模型（點數制）

- **點數即額度**：1 點 = NT$1。免費會員每月 3 點。
- **基礎服務（basic / 即時）**：很便宜。實測 ~0.3 點/天（每天 ~300 次 live poll、~16 MB）→ 大致 ~1,000 次/點等級。
- **🔴 進階服務（advanced / historical）= 按「資料傳輸量」計費，極貴**。**實測（2026-06-27 帳單）≈ ~50 點/GB**。社群流傳的「1 點 = 200 次」是**按次的誤解**，與實際帳單不符——進階是看 **GB**，不是看次數。
- **頻率限制（QPS）**：每來源 IP **50 次/秒**（與點數獨立）。
- **OAuth token**：`/auth/realms/TDXConnect/.../token` 取 access token，**不計點數**、可重複使用（有效期內快取即可）。

**我們的方案**：NT$200/月 = **200 點/月**。

## 我們用到的 API

| 用途 | Endpoint | 類別 | 點數成本 | 用在哪 |
|---|---|---|---|---|
| **Live 公車位置**（攝取主路徑） | `GET api/basic/v2/Bus/RealTimeByFrequency/City/{city}`（`$top`、`$format=JSON`） | **基礎** | 1 點/1,500 次 | `services/bus-ingestion`（`fetchTdxBusRows`，預設 `$top=1200`、每 5 分鐘一個 slot） |
| **歷史公車位置**（回填） | `GET api/historical/v2/Historical/Bus/RealTimeByFrequency/City/{city}?Dates=YYYY-MM-DD`（回 **NDJSON**） | **進階** | 🔴 **~50 點/GB**；一整天 ~3.6 GB ≈ **~180 點/天**（≈ 整個月方案！） | `services/bus-ingestion`（`/ingest/day`，**勿用**）；前端 `fetch-tdx-taipei-bus-history.mjs` |
| **OAuth token** | `POST /auth/realms/TDXConnect/protocol/openid-connect/token` | — | 免費 | 所有 TDX 呼叫前置 |
| 路線/站序 context | `api/basic/v2/Bus/...`（route context 抓取） | 基礎 | 1 點/1,500 次 | 前端 `fetch-tdx-taipei-bus-route-context.mjs`（偶爾跑） |

注意事項：
- **Live 與 Historical 是「同一資料集、不同 base」**：`api/basic`（即時）vs `api/historical`（過去，帶 `Dates=`）。
- **Historical 密度極高且無法分割**：實測整天 ~3.6 GB / ~6,000,000 行（每隔幾秒一筆，比所需 5 分鐘 slot 密 ~85×）。端點**忽略 `$skip` 與 `$filter`**、只認 `Dates` + `$top`，所以**無法分頁/篩選**——一旦抓就是整包 GB 級。
- **Batch pipeline（`bus-batch-job`）不打 TDX**：它讀 `/lake/*.jsonl`，TDX 成本為 0。

## 成本估算（已用實際帳單校正）

| 情境 | 量 | 點數 | ≈ 費用 |
|---|---|---|---|
| **Live poll 每 5 分鐘**（現況） | ~300 次 / ~16 MB / 天 | **~0.3 點/天 ≈ ~9 點/月** | ~NT$9/月 |
| Live poll 每 1 分鐘 | ~1,440 次 / ~80 MB / 天 | ~1.5 點/天 ≈ ~45 點/月 | ~NT$45/月 |
| **🔴 歷史回填 1 天** | ~3.6 GB | **~180 點** | **~NT$180** |
| **🔴 歷史回填 2 週** | ~50 GB | **~2,500 點** | **~NT$2,500** |
| 每日 DAG 批次 | 0（讀 lake） | 0 | 0 |

> **2026-06-27 真實帳單**：一天歷史測試 = 4.28 GB → **220.79 點**，把整月 200 點額度燒爆（227.6/200 = 114%，超過 105% 斷線門檻）。⚠️ 同一把金鑰 `twfoundry` 也供 live 用，超額會**連 prod live 一起停**。

## 可調整的旋鈕

| 想調什麼 | 在哪 | 影響 |
|---|---|---|
| Live poll 頻率 | `services/bus-ingestion` env `INGEST_INTERVAL_MINUTES` / `POLLER_TICK_SEC`（預設 5 分鐘 / 300 秒） | 頻率 ↑ → 點數線性 ↑（仍便宜）；要 1 分鐘真有意義需連 slot 粒度一起改，見 Linear UNK-41 |
| Live 每次抓幾筆 | env `TDX_TOP`（預設 1200） | 不影響成本（live 便宜）；越多車涵蓋越廣 |

## 決策摘要

- **🔴 不要用歷史 API 做 backfill**：按 GB 計費 + 資料 85× 過密 → 一天 ~NT$180、兩週 ~NT$2,500，且 `/ingest/day` 一跑就吃掉整月額度並可能拖停 live。歷史攝取程式雖然能跑（見 UNK-40），**但不該跑**。
- **要補早期資料就靠自然累積**：每日 DAG 用便宜的 live 資料每天 +1 天，dashboard 早期空 bar 一週內自己補上，成本 ~0。
- **真正的限制是「錢」**（per-GB），不是工程。基礎/live 怎麼用都便宜；進階/歷史一碰就貴。

## 實驗紀錄（2026-06-28）：br 壓縮

**資料格式**：`Content-Type: text/ndjson`（NDJSON，每行一個 JSON 物件）。一筆範例：
```json
{"PlateNumb":"EAL-2085","OperatorID":"100","OperatorNo":"1407","RouteUID":"TPE10132",
 "RouteID":"10132","RouteName":{"Zh_tw":"234","En":"234"},"SubRouteUID":"TPE101320",
 "Direction":1,"BusPosition":{"PositionLat":25.012133,"PositionLon":121.444643,"GeoHash":"wsqq79361"},
 "Speed":1,"Azimuth":72,"DutyStatus":2,"BusStatus":0,
 "GPSTime":"2026-06-08T09:40:00+00:00","SrcUpdateTime":"2026-06-08T09:40:10+00:00","UpdateTime":"2026-06-08T09:40:14+00:00"}
```

**壓縮**：端點支援 `br`。實測同一份 `$top=500000`：
- 未壓縮 ~**260 MB** → `Accept-Encoding: br` 壓縮後 wire **89.2 MB** → **壓縮比 ~2.9×**（公車資料高熵，壓縮率不高）。
- ⚠️ undici `fetch` 預設**不帶** `Accept-Encoding`，所以之前抓取都是未壓縮（也是 06-27 那麼貴的原因之一）。

**抓「一天」的參數與成本**：
```
GET api/historical/v2/Historical/Bus/RealTimeByFrequency/City/Taipei
    ?Dates=YYYY-MM-DD & $format=JSON & $top=10000000
    [Header] Accept-Encoding: br
```
| | 未壓縮 | 帶 br |
|---|---|---|
| 一天 wire 量 | ~3.6 GB | ~1.24 GB |
| 點數（**若按 wire 計費**，~50 點/GB） | **~180 點 ≈ NT$180** | **~60 點 ≈ NT$60** |
| 2 週（14 天） | ~2,500 點 | ~840 點 |

**✅ 已確認（2026-06-28 帳單）：計費按「壓縮後實際傳輸 bytes」。**
- 當天 3 次歷史呼叫皆帶 `Accept-Encoding: br`：2× `$top=500000`（各未壓縮 ~260 MB / 壓縮 wire ~89 MB）+ 1 次小樣本。
- 帳單顯示 **183 MB**（≈ 壓縮後 2×89MB），**不是** ~520 MB（未壓縮）→ 證實**按壓縮後 wire 計費**。
- 費率 **~52 點/GB(wire)**（06-27 未壓縮 4.28GB→220 點、06-28 壓縮 0.18GB→9.25 點，一致）。
- **結論：歷史抓取一律帶 `Accept-Encoding: br` → 省 ~2.9×**。一天從 ~180 點降到 **~65 點**；但仍貴，2 週 ~870 點。要回填仍建議只挑關鍵幾天。

## 公車 A1 端點參考（即時 / 歷史）

資料型別：**A1 = 車輛 GPS 動態定時**（`RealTimeByFrequency`）。TDX 另有 N1（到站 ETA）、A2（進離站事件），TWFoundry 未用。

**即時** — base `https://tdx.transportdata.tw/api/basic/v2`（基礎服務，便宜）
| Endpoint | 範圍 | 狀態 |
|---|---|---|
| `GET /Bus/RealTimeByFrequency/City/{City}` | 整城當下快照（批次更新） | ✅ live 攝取用此 |
| `GET /Bus/RealTimeByFrequency/City/{City}/{RouteName}` | 單一路線當下 | ✅ 可用（實測 200） |
| `GET /Bus/RealTimeByFrequency/Streaming/City/{City}[/{RouteName}]` | 逐筆更新 | 逐筆=UDP 來源，非可消費的 HTTP 串流 |

**歷史** — base `https://tdx.transportdata.tw/api/historical/v2`（進階服務，貴）
| Endpoint | 範圍 | 狀態 |
|---|---|---|
| `GET /Historical/Bus/RealTimeByFrequency/City/{City}?Dates=YYYY-MM-DD` | **整城整天**，回 NDJSON | ✅ 唯一可用；`$top` 認、`$skip`/`$filter` 忽略 |
| `GET /Historical/.../City/{City}/{RouteName}?Dates=...` | 想要單一路線 | ❌ **404，歷史不支援 route 層**（basic 同路線 200 → 非格式問題） |

**Auth**（共用，免點數）：`POST https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token`（client_credentials）。

## Sources

- [訂閱收費 - TDX](https://tdx.transportdata.tw/pricing)（官方，動態頁需手動看）
- [TDX 點數/進階服務說明（社群）](https://www.threads.com/@darrell_tw_/post/DC3ocjty016?hl=zh-tw)
- [關於未來 API 使用限制 - TDX 論壇](https://tdx.transportdata.tw/topic/detail/358ad884-2e3a-4ff2-9b85-4c4a7b9bb1ba)
- [資料使用常見問題 | TDX 新手上路指引](https://motc-ptx.gitbook.io/tdx-xin-shou-zhi-yin/api-shi-yong-shuo-ming/zi-liao-shi-yong-chang-jian-wen-ti)
