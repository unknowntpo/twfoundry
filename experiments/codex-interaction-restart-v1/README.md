# TWFoundry Interaction Restart V1

## Experiment goal

建立一個獨立 Vue + Three.js / Vite experiment，優先驗證掌中方塊世界裡的互動系統是否成立：Timeline / Live、avatar local context、layer toggle、以及 train / incident 的 ontology relationship inspection。

## Builder assumptions

- 本輪是 restart，不參考任何舊 experiments。
- 視覺只做到足以支撐互動判讀：明確 diorama base、isometric camera、voxel station / train / sensor / incident / volume。
- 使用 mock data 模擬 TDX 捷運、雨量、PM2.5、sensor、incident observation。
- Builder 不提供正式分數；後續由 judge agent 依 `DesignResearch.md` 評分。

## What was built

- Three.js voxel diorama with thick base, rail nodes, stations, moving trains, rainfall volume, PM2.5 haze, sensors, incidents, and avatar.
- Vue HUD for avatar local context, ontology relationship inspection, timeline scrub, play / pause, speed, Live mode, and layer toggles.
- Mock ontology data and relationships scoped to this experiment only.

## Design reasoning

- 主畫面是可點擊的 Three.js 掌中方塊世界，UI 以 RPG HUD 壓在場景邊角，不做 dashboard grid。
- `worldTime` 影響 train position、rainfall volume、PM2.5 haze、sensor height、incident visibility / pulse。
- avatar 可點擊或用 HUD 按鈕切換 tile；HUD 即時重新計算附近 station / train / rainfall / PM2.5 / sensor / incident。
- 點選 train 或 incident 時，右側顯示 ontology relationships，讓 object graph 不是只存在於資料模型。
- layer toggle 會同時影響 3D entity visibility 與 avatar local context 文字，避免出現「畫面關了但 HUD 還在報數」的假狀態。

## How to run

```bash
cd experiments/codex-interaction-restart-v1
bun install
bun run dev
```

或使用 npm：

```bash
cd experiments/codex-interaction-restart-v1
npm install
npm run dev
```

## Files changed

- `README.md`
- `bun.lock`
- `package.json`
- `vite.config.js`
- `index.html`
- `src/main.js`
- `src/App.vue`
- `src/mockData.js`
- `src/styles.css`

Verification screenshots:

- `/tmp/twfoundry-codex-interaction-desktop/screenshot.png`
- `/tmp/twfoundry-codex-interaction-mobile/screenshot.png`
- `/tmp/twfoundry-codex-interaction-live-button/screenshot.png`

## Known gaps

- Rail geometry 仍是簡化節點段，未做真實臺北捷運線型或站距比例。
- Voxel world 的建築、地形與 route orientation 還偏 prototype，尚未成為完整城市微縮模型。
- Ontology relationships 目前是 mock graph，尚未把 observation freshness / confidence 展成完整資料 lineage。
- Avatar 移動是 tile jump，不是連續路徑或 RPG pathfinding。
- 未加入 hover label、keyboard control、mobile touch gesture refinement。

## Suggested next experiment

做一個更小的 `avatar-context-pathfinding-v1`：只研究 avatar 在 voxel tile 間移動時，如何用路徑、視野範圍、context radius 與 local risk summary 讓使用者理解「我站在這裡，所以這些資料與我有關」。
