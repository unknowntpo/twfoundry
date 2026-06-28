# Bus Oversight — Data Serving & Freshness

最後更新：2026-06-26

相關：`homelab-olap-runtime.md`、`cloudflare-edge-serving-boundary.md`、`technical-decisions-log.md`

來源：2026-06-26 與使用者的設計討論（dashboard 為何只顯示 05-20、speed/batch 合併邏輯、信任度、未來無限歷史 timeline）。

## 問題

Prod `bus-oversight` dashboard 的實質內容（reliability index、monitored routes、route density、watchlist、route evidence、7 天 timeline）全部停在 **2026-05-20**，但今天是 06-26。這讓 dashboard 失去信任度。

## 三層資料現況

| 層 | 來源 | prod 實際 | 新鮮度 |
|---|---|---|---|
| Live 訊號（gap/bunching 數字） | Flink speed layer → R2 → `/api/online/bus-route-signals` | 06-26（即時） | ✅ |
| Batch 分析（dashboard 實質內容） | dashboard 讀 `/data/analytics/bus/*`（**Pages 靜態檔，baked in dist，repo `frontend/public/` 內 committed**，非 R2） | **05-20**（`clickhouse-static-snapshot`, published 06-11） | ❌ 凍結 |
| Rolling batch（靜態 fixture，dev 用） | `/data/analytics-rolling/bus/*`（baked 靜態，repo committed） | 06-21（`clickhouse-rolling`） | 🟡 |
| **Rolling batch（R2 Function，prod 該接的）** | `/api/analytics/bus/*`（**Pages Function → R2**，`_routes.json` 僅 `/api/*` 走 Function） | **06-25**，自動更新 | ✅ |

`frontend/public/data/` 底下 commit 了兩份**靜態** batch fixture：舊 `analytics/bus`（05-20）與 `analytics-rolling/bus`（06-21，dev 用）。真正新鮮且自動更新的是 **R2-backed `/api/analytics/bus/*`（06-25）**——4 個檔（manifest/bunching/data-freshness/route-density）皆由 Function 供應。

## 前端取資料邏輯

```
analyticsUrl(file):
  base = VITE_TWFOUNDRY_ANALYTICS_BASE   // build 時注入；prod 目前未設
  base ? `${base}/${file}` : `/data/analytics/bus/${file}`   // 未設 → 落到舊 static 05-20
loadAnalytics() → fetchJson × 4: manifest / bunching / data-freshness / route-density
fetchJson(path) = fetch(path).then(r => r.json())   // 純 fetch 相對路徑，無 R2 SDK
```

- batch、route-context 走 **Pages 靜態檔**（`/data/...`，baked in dist）。
- live 訊號（prod）走 **Pages Function → R2**（`/api/online/...`，真 live）。

## 根因 + 症狀機制

- **根因**：prod build 未設 `VITE_TWFOUNDRY_ANALYTICS_BASE` → batch 接到舊 static（05-20）。
- **症狀機制**：`buildBusOversightModel` 的 Lambda serving merge：

```
mergeSpeed = batchServiceDate && speedLatestDate
          && daysBetween(batchServiceDate, speedLatestDate) <= LOOKBACK(7)
```

batch=05-20、live=06-26 → 相差 ~37 天 > 7 → `mergeSpeed = false`：
- live 事件被丟掉（`effectiveSpeedEvents = []`），不進 timeline。
- 窗口**重新錨定到 batch**（`serviceDate = batchServiceDate = 05-20`），timeline = 05-14…05-20。

固定 7 天窗口（`buildTimelineSlots`）裝不下 37 天跨度，故系統選擇「complete-but-stale（錨 batch、丟 live）」而非「fresh-but-empty（錨 live、batch 全在窗外 → 整片空白）」。這也是為何 KPI 的 gap/bunching 數字是新的（走另一條 `liveCounts` 直讀 live bundle），但 timeline/route evidence 卡在 05-20。

## Watermark = 信任邊界（best practice）

目標服務模型（使用者提案，正解）：

> speed 與 batch 產出**同一 metric 契約**；serving 層 merge 成單一 timeline；**watermark 是「信任邊界」而非「資料有無邊界」**——≤ watermark = batch 已定稿（confirmed），> watermark = speed 暫定（provisional），兩者都顯示但後者標記為「估算/未定稿」。batch 追上後 watermark 前移，provisional 被權威值取代（eventual accuracy，數字可能微調）。

現在做不到的原因：**契約不對等**——speed 只吐 gap/bunching（schema `bus_route_signal_bundle.v1`），batch 才吐完整 metric 群。`provisional` flag（watermark 後的 slot）已是此機制雛形。

## 未來方向：無限歷史 timeline

現在的「固定 7 天窗口 + 單一 baked 快照」是權宜版。目標：
1. **資料供應**：OLAP/lake（ClickHouse/Iceberg）可**按日期區間查**，經 R2 artifact / API 供應，而非單一 baked JSON。
2. **窗口化/分頁**：timeline 可選/可捲動範圍 + 按需抓（virtualized），不一次載全部。
3. **merge 一般化**：live 只疊在「現在」edge；歷史視窗為純 batch。明確選窗 → 現有 `daysBetween ≤ 7` 脆弱守門不再需要。
4. **契約**：analytics manifest/payload schema 增加時間分區/區間維度，擴充 SPEC.md 的 analytics 契約。

此方向與「batch 改走 R2 動態供應」同源。

## 修復順序（獨立、可分批）

| # | 範圍 | 內容 | 規模 | 狀態 |
|---|---|---|---|---|
| ① | 新鮮度（止血） | prod build 接 **R2 Function base**（`VITE_TWFOUNDRY_ANALYTICS_BASE=/api/analytics/bus`，`bun run build:prod`），batch 05-20 → 06-25，merge 恢復 `true`，且**自動更新免重部署** | 最小 | ✅ 完成（2026-06-26，prod+staging 驗證） |
| ② | serving 統一 | Flink 補齊 metric 契約 + 前端讀 merged timeline + provisional 樣式 + 收斂標示 | 中（動契約） | 待規劃（本文件） |
| ③ | batch 完整度 | 覆蓋路線數偏低（05-20 batch 僅 21；06-25 已升到 52）→ ingestion/reconcile 持續補（Airflow 兜底那條） | 獨立資料工程 | 待辦 |

注意：② 能讓 dashboard 顯示「當下最佳可得 + 誠實信任標示」，大幅救信任度，但**不會自動修好 ③ 底層 batch 覆蓋**——兩件事分開做。

## ① 實作結果（2026-06-26）

- 改用 `/api/analytics/bus`（R2 Function，06-25、自動更新）而非 `/data/analytics-rolling`（靜態 06-21、需重部署）。等於把「③ 的 R2 read path」一次到位。
- 新增 `frontend/package.json` script `build:prod`（注入 `VITE_TWFOUNDRY_ANALYTICS_BASE=/api/analytics/bus`）。**不動 default `build`**——`/api` 在本地 vite 無 Function，改 default 會弄壞 CI 的 e2e preview。
- 部署路徑：local `build:prod` → staging `twfoundry-poc` 驗證 → prod `twfoundry`。兩站皆驗證 dashboard 只剩 06-26 日期、`mergeSpeed=true`、無 analytics/online 失敗請求。
- prod 部署指令：`bun run build:prod && bunx wrangler pages deploy dist --project-name twfoundry --branch main`。

## 已知佐證（管線健康度）

- rolling manifest `generatedAt = 2026-06-25T19:31:30Z` → batch 管線（ClickHouse + publish）昨天有正常產出。
- live bundle `generatedAt = 2026-06-26` → 串流（ingestion→Kafka→Flink）現在活著。
- 故 05-20 非 Airflow 掛掉，而是 build 接線問題。Airflow 行程本身的 DAG run 狀態需連 homelab Airflow UI 確認。
