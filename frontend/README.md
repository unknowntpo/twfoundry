# TWFoundry Frontend

## Product Direction

TWFoundry frontend 已切到 map-first operations workbench pivot。現階段先用 OpenDesign 匯出的 Kepler-style 操作流程，把 archive snapshot → normalized observation → overlay projection → inspector/detail 的前端互動跑通；後端接上前不得把 fixture 標成真實 live data。

Root route `/` 與 `/operations-explorer` 會開啟新的 pivot workflow；舊 voxel demo 保留在 `/legacy-voxel` 作為回歸參考。

## Builder Assumptions

- 目前是 frontend-only implementation；TDX 由本機 script 抓取並寫成 credential-free archive，瀏覽器不直接打 TDX API。
- `src/operationsWorkflowData.js` 是 archive/fixture adapter + normalized contract boundary；Vue component 不直接用 raw source fields 控制 UI。
- MapLibre + deck.gl 是主要操作面；overlay controls、route filter、stale hiding、5 分鐘 timeline、inspector、health drawer 先用 captured snapshot 跑順。
- Voxel detail 暫時不是主畫面；舊實驗保留在 `/legacy-voxel`。
- 已可用 `frontend/.env` 內的 TDX client credentials 產生 credential-free archive snapshot；key/token 不會寫入輸出檔。

## Bus Archive Workflow

TDX `Bus/RealTimeByFrequency/City/Taipei` 是即時車輛快照。前端 timeline 先讀本地 archive；要累積歷史資料時，用 collector 每 5 分鐘抓一次並按時間分組：

```bash
cd frontend
bun run fetch:tdx-bus       # 抓一次，寫入 public/data/tdx-bus/archive/YYYY-MM-DD/HH-mm.json
bun run fetch:tdx-bus-history -- --date 2026-05-20  # 從 TDX historical endpoint 抓一天，分桶成 5 分鐘 timeline
bun run collect:tdx-bus     # 持續每 5 分鐘抓一次，更新 manifest
bun run collect:tdx-bus:half-day  # 每 5 分鐘抓一次，抓滿 12 小時後停止，約 144 slots
bun run collect:tdx-bus:day       # 每 5 分鐘抓一次，抓滿 24 小時後停止，約 288 slots
```

前端讀取：

- Manifest: `public/data/tdx-bus/archive/manifest.json`
- Snapshot: `public/data/tdx-bus/archive/<date>/<HH-mm>.json`
- Runtime URL: `/data/tdx-bus/archive/manifest.json`

## What Was Built

- Vue + Three.js + Vite prototype。
- 掌中臺北 voxel diorama：厚底座、柔粉城市量體、水域、丘陵、公園、臺北 101-like 高塔、櫻花粒子。
- Mock tile/chunk backbone：4x4 viewport chunk grid，中間 chunks 代表 visible viewport。
- 可見資料層：MRT routes/trains、rain voxel volume、PM2.5 haze/sensors、incident markers。
- Ontology inspector：Train、Station、Rainfall Cell、AQMS Sensor、Incident 的 properties / relationships。
- Timeline/live HUD：play/pause、Live detach、scrub、1x/15x/60x/300x。

## Repair Changes

- 將 city voxel、diorama base、MRT、train、station、rain volume、PM2.5/sensor、incident marker、pipeline nodes 改為非金屬 `MeshPhysicalMaterial`，使用透明度、transmission、clearcoat、柔和 emissive 做 soft glass / crystal voxel。
- 調整 Three.js 預設相機：較遠三分之四視角、較低 target、`maxDistance` 從 96 放寬到 172，讓使用者可以 zoom out 更多。
- 新增 3D scene bottom safe area：desktop canvas 避開底部 timeline，mobile canvas 避開較高的 stacked timeline。
- Timeline HUD 變窄、下移且保留粉色 glass panel；HUD panel 增加內高光、白色邊緣與柔粉透明背景，文字仍使用深玫瑰色維持可讀性。
- 重新產出 desktop、mobile、rain toggle interaction screenshots，並確認 layer toggle / timeline / ontology inspector / mock pipeline 仍渲染。

## Interaction Repair Changes

- 依照新的設計回饋，HUD / inspector / timeline 改回柔和紙感粉色 panel，不再強調水晶或琉璃材質；水晶感只保留在 voxel 與資料 volume。
- 依照原始 `taipei_voxel_v3.html` 參考，城市、建築、列車、站點、路線與事件 marker 改回實體 voxel 材質；透明感只保留在雨量、PM2.5、tile preview 等資料 overlay。
- OrbitControls 明確啟用 pan、rotate、zoom，並把 `maxDistance` 放寬到 205，讓視角不被鎖在正中央。
- Camera controls 改成左鍵拖曳平移、右鍵拖曳旋轉、滾輪縮放，讓使用者可以把掌中世界往上、下、左、右移動，而不是只能繞中心旋轉。
- 長距離拖曳會被判定為 camera gesture，不再在 pointer release 後觸發 canvas click / object focus，避免拖動時突然跳到另一個物件。
- Timeline 的 `worldMinutes` 現在會驅動 Three.js 天空、霧、ambient light、hemisphere light、sun、rose fill 與 exposure，能呈現白天、黃昏與夜晚。
- 右側 Ontology Object 按鈕現在會呼叫 `focusObject(id)`，把 voxel world focus 到對應 train / station / rain cell / AQMS / incident anchor。
- 3D 物件建立時會註冊 object anchor，讓 panel selection 與 canvas click 可以雙向同步。
- 左右兩側 HUD panel 可折疊，收合後只保留 `Layers` / `Object` 小膠囊按鈕，減少遮擋 voxel world。
- 左側控制只把 `Taipei Metro`、`Rainfall cells`、`PM2.5 haze`、`Incidents` 放在 `OVERLAYS`。`Tile chunks` 是 MapLibre-ready tile preview，保留在 pipeline / diagnostic 語意裡，不作為日常 overlay toggle。

## How To Run

```bash
cd frontend
bun install
bun run fetch:tdx-bus
bun run dev
```

預設 Vite port 通常是 `5173`，若被占用會自動換下一個 port。若要避開既有 Vite app，可固定使用：

```bash
bun run dev -- --port 5220 --strictPort
```

入口：

- Pivot workflow: `http://localhost:5220/`
- Same workflow explicit route: `http://localhost:5220/operations-explorer`
- Legacy voxel demo: `http://localhost:5220/legacy-voxel`

## Changed Files

- `README.md`
- `src/main.js`
- `src/OperationsExplorer.vue`
- `src/operationsWorkflowData.js`
- `public/data/tdx-bus/archive/manifest.json`
- `public/data/tdx-bus/archive/YYYY-MM-DD/HH-mm.json`
- `src/BusDeckMap.vue`
- `scripts/fetch-tdx-taipei-bus-snapshot.mjs`
- `tests/operationsWorkflowData.test.mjs`
- `tests/run.mjs`
- `screenshots/operations-explorer/desktop/screenshot.png`
- `screenshots/operations-explorer/mobile/screenshot.png`
- `screenshots/operations-explorer/data-health/screenshot.png`

## Design Reasoning

- 視覺 north star 取自 OpenDesign 匯出的 dark geospatial workbench：dark map canvas、左側 layer controls、右側 inspector、底部 poll timeline。
- Workflow 先定義資料邊界：raw TDX-shaped fixture → normalized `VehicleObservation` → overlay point renderer → inspector evidence。
- TDX snapshot 標為 `tdx-captured`；fallback 假資料才標為 `fixture`，避免在未接後端前誤稱 live/connected。
- 互動優先順 workflow：sample tick、route filter、hide stale、layer visibility、point size/opacity、zoom、health drawer。
- 舊 voxel demo 仍可從 `/legacy-voxel` 開啟，暫作 selected-object detail 方向參考。

## Known Gaps

- Basemap 已改用 MapLibre raster map；正式版仍需決定 tile provider 與 attribution/policy。
- Captured adapter 尚未有 runtime schema validation；接 backend 前應補上 contract parser。
- Timeline 已讀本地 snapshot history；目前只有一個 captured slot，collector 跑久後會自然增加 slot。
- Health drawer 是狀態語言與 UI contract，尚未接真實 source health。
- Mobile inspector 目前用 stacked panel，下一輪應做成更明確的 drawer/sheet flow。
- MapLibre/deck.gl vendor chunk 仍偏大；正式版可依 route code splitting 再拆。

## Screenshot Path

- Desktop：`screenshots/operations-explorer/desktop/screenshot.png`
- Mobile：`screenshots/operations-explorer/mobile/screenshot.png`
- Data health interaction：`screenshots/operations-explorer/data-health/screenshot.png`
- Playwright summary：`screenshots/operations-explorer/*/summary.json`
- 截圖驗證與交付 dev server 使用 `http://localhost:5220/`。

## Verification

```bash
bun run fetch:tdx-bus
bun run test
bun run build
bun /Users/unknowntpo/.codex/skills/frontend-feedback-loop/scripts/observe-page.js --url http://localhost:5220/ --out screenshots/operations-explorer/desktop
bun /Users/unknowntpo/.codex/skills/frontend-feedback-loop/scripts/observe-page.js --url http://localhost:5220/ --viewport 390x844 --out screenshots/operations-explorer/mobile
bun /Users/unknowntpo/.codex/skills/frontend-feedback-loop/scripts/observe-page.js --url http://localhost:5220/ --click "text=Data health" --wait 500 --out screenshots/operations-explorer/data-health
```

## Next Experiment Recommendation

下一輪建議做「workflow state machine + backend adapter seam」：把 empty/error/loading/success 狀態接成可切換 fixture scenario，並定義真正 TDX adapter 回來時要餵給 `VehicleObservation` 的最小 schema。
