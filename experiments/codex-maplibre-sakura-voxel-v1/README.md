# MapLibre-ready Sakura Voxel Taiwan/Taipei

## Experiment Goal

建立一個純前端 TWFoundry prototype，接近 `/Users/unknowntpo/Downloads/taipei_voxel_v3.html` 的 bright blue sky、柔粉 voxel city、櫻花粒子與粉色 RPG HUD，同時把未來 MapLibre 接入方式表達成可互動的 mock geospatial pipeline。

## Builder Assumptions

- 這是 frontend-only experiment，不接真實 MapLibre、TDX、CWA、EPA API。
- MapLibre 角色以 mock viewport tile/chunk grid 呈現：`MapLibre tiles -> visible chunks -> observations -> ontology objects -> voxel entities`。
- Three.js scene 是主角，HUD 只作為 RPG-style control surface，不做 enterprise dashboard。
- 互動優先展示產品概念：layer toggle、timeline/live、pipeline focus、ontology object selection。

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

## How To Run

```bash
cd experiments/codex-maplibre-sakura-voxel-v1
bun install
bun run dev
```

預設 Vite port 通常是 `5173`，若被占用會自動換下一個 port。若要避開既有 Vite app，可固定使用：

```bash
bun run dev -- --port 5220 --strictPort
```

## Changed Files

- `README.md`
- `package.json`
- `vite.config.js`
- `index.html`
- `src/main.js`
- `src/App.vue`
- `src/styles.css`
- `src/mockData.js`
- `src/voxelWorld.js`
- `bun.lock`
- `screenshots/desktop/screenshot.png`
- `screenshots/mobile/screenshot.png`
- `screenshots/interaction-rain-toggle/screenshot.png`
- `dist/`（`bun run build` 產物）

## Design Reasoning

- 視覺 north star 取自 `taipei_voxel_v3.html`：藍天、粉色 city blocks、透明粉 HUD、底部 timeline、櫻花 petal field。
- MapLibre 不作為背景圖，而是作為 viewport/tile/chunk 的資料骨架。畫面中可點 chunk，HUD pipeline 也可切換 focus，避免變成純 3D 地圖 clone。
- Ontology 先於 rendering：右側 object view 顯示 observation 聚合後的 object properties 與 relationships，例如 Train R22 affected_by Rain Cell、near Incident。
- 資料層保留可愛 RPG readable form：路線是模型軌道、列車是 voxel capsule、雨量是透明水藍體積、PM2.5 是金色 haze、incident 是柔紫/櫻色堆疊 marker。
- Timeline 使用唯一 `worldMinutes` 驅動 train/rain/petal/lighting，而不是每個 layer 自己假裝即時。

## Known Gaps

- 未接 MapLibre GL JS、PMTiles、vector tile decoder；chunk grid 目前是 mock。
- 未使用真實臺北座標、真實 TDX station geometry 或即時 train feed。
- Raycast 可選 MRT station/train/rain/PM2.5/incident/chunk，但還沒有 hover tooltip 與 relationship path highlight。
- Rainfall / PM2.5 / incident 數值是固定 mock，只有時間動畫，不是 observation window replay。
- Mobile 版隱藏右側 inspector，仍需第二輪設計 compact object drawer。
- 目前 crystal/glass 主要靠透明 physical material 與 emissive，尚未加入環境貼圖、real refraction 或 per-voxel bevel；水晶邊緣仍可再強化。
- Playwright 截圖時 Chromium 會回報 WebGL `ReadPixels` GPU stall performance warning；頁面無 console error / page error / failed request。

## Screenshot Path

- Desktop：`screenshots/desktop/screenshot.png`
- Mobile：`screenshots/mobile/screenshot.png`
- Interaction check：`screenshots/interaction-rain-toggle/screenshot.png`
- Playwright summary：`screenshots/desktop/summary.json`、`screenshots/mobile/summary.json`
- 截圖驗證與交付 dev server 使用 `http://localhost:5220/`。

## Verification

```bash
bun run build
bun /Users/unknowntpo/.codex/skills/frontend-feedback-loop/scripts/observe-page.js --url http://localhost:5220/ --out experiments/codex-maplibre-sakura-voxel-v1/screenshots/desktop
bun /Users/unknowntpo/.codex/skills/frontend-feedback-loop/scripts/observe-page.js --url http://localhost:5220/ --viewport 390x844 --out experiments/codex-maplibre-sakura-voxel-v1/screenshots/mobile
bun /Users/unknowntpo/.codex/skills/frontend-feedback-loop/scripts/observe-page.js --url http://localhost:5220/ --click "text=Rain cells" --wait 500 --out experiments/codex-maplibre-sakura-voxel-v1/screenshots/interaction-rain-toggle
```

## Next Experiment Recommendation

下一輪建議做「relationship highlight + object drill-down」：點選 Train R22 時，同步高亮 Route、next station、Rain Cell、Incident marker，並讓 timeline 顯示 observation history markers。正式分數留給 judge agent。
