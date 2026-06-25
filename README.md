# TWFoundry

TWFoundry 是一個以台灣公共資料為核心的營運監控儀表板，聚焦即時交通、地圖圖層、資料品質與批次分析。

[線上展示](https://twfoundry.pages.dev) · [公車服務控制台](https://twfoundry.pages.dev/bus-oversight) · [系統規格](SPEC.md)

## 專案在做什麼

TWFoundry 把台灣公開交通資料轉成可操作的地圖產品：

- 即時台北公車地圖，資料來自真實 TDX API，不是靜態假資料。
- 公車服務控制台，觀察路線密度、資料新鮮度、服務空窗與車輛群聚訊號。
- Cloudflare Pages + Pages Functions 前端，透過 R2 讀取已發布的資料成果。
- Homelab 資料工程後端，用 Kafka、Airflow、ClickHouse、Kubernetes 處理 ingestion、批次分析與 backfill。
- Contract-first 架構，把原始來源 schema、normalized observation、product projection、UI rendering 分開治理。

## 系統架構

```text
TDX 台灣公共交通 API
  -> source adapters / ingestion workers
  -> Kafka normalized events
  -> lake archive + ClickHouse analytics
  -> Airflow batch orchestration
  -> Cloudflare R2 materialized artifacts
  -> Cloudflare Pages Functions
  -> Vue / MapLibre operations UI
```

公開網站由 Cloudflare 提供服務。Homelab 只負責資料處理與發布 materialized artifacts，公開流量不會直接打到私人機器。

## 目前狀態

| 區塊 | 狀態 |
|---|---|
| 線上展示 | 已上線：`twfoundry.pages.dev` |
| 即時公車投影 | 透過 Cloudflare R2 + Pages Functions 提供 production path |
| 公車服務控制台 | 已上線，可看路線服務與資料品質分析 |
| 批次分析 | Airflow DAG + ClickHouse rolling dataset |
| 串流骨幹 | Kafka normalized bus events |
| 產品契約 | `SPEC.md` + architecture docs |

## 技術棧

- Frontend：Vue 3、Vite、MapLibre GL、deck.gl、Three.js
- Edge serving：Cloudflare Pages、Pages Functions、R2
- Data pipeline：Kafka、Airflow、ClickHouse、Kubernetes/k0s
- Data contracts：normalized observation schema、projection manifest、OpenSpec/Spectra docs
- Tooling：Bun、Playwright、Wrangler

## 重要連結

- [線上展示](https://twfoundry.pages.dev)
- [公車服務控制台](https://twfoundry.pages.dev/bus-oversight)
- [Cloudflare edge serving boundary](docs/architecture/cloudflare-edge-serving-boundary.md)
- [Bus pipeline milestones](docs/architecture/bus-pipeline-e2e-milestones.md)
- [Normalized bus event contract](docs/architecture/normalized-bus-vehicle-position-v1.md)
- [Batch stack runbook](docs/m5-batch-stack-runbook.md)

## 本機啟動

```bash
cd frontend
bun install
bun run dev
```

開發時也可以直接接線上 API：

```bash
cd frontend
bun run dev:remote
```

## 設計原則

- 公共資料必須先 normalized，不能讓 raw source schema 直接進入產品 UI。
- 地圖圖層是 product projection，不是 renderer-specific demo。
- Source adapters、ontology contracts、projections、renderers、diagnostics 必須分層。
- 公開網站讀取可 replay 的 materialized artifacts，不把 public request path 接到私人 homelab。

## Repo 說明

最高層級的產品與系統契約在 [SPEC.md](SPEC.md)。架構文件與 runbook 放在 [docs/](docs/)，OpenSpec/Spectra change proposals 放在 [openspec/](openspec/)。
