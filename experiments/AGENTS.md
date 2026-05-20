# TWFoundry Experiment Agent Rules

這個目錄給不同 agent 並行做 TWFoundry 設計實驗。所有 agent 必須遵守本文件，避免污染主 app 或互相覆蓋。

## Shared Source of Truth

所有 agent 只能把下列文件視為共同設計依據：

- `../Design.md`
- `../DesignResearch.md`
- `../docs/twfoundry-color-capture.html`

不要依賴口頭上下文或其他 agent 的未整理想法。若你需要引入新想法，請寫進自己的 experiment README。

## Directory Ownership

每個 agent 只能寫自己的 experiment directory。

命名格式：

```text
experiments/<agent-family>-<topic>-v<N>/
```

建議：

```text
experiments/codex-visual-diorama-v1/
experiments/claude-visual-diorama-v1/
experiments/codex-timeline-live-v1/
experiments/claude-object-view-v1/
```

`agent-family` 可用：

- `codex`
- `claude`
- `cursor`
- `manual`
- 其他清楚可辨識的 agent 名稱

## Hard Boundaries

禁止：

- 修改 `../frontend/`
- 修改 repo root app config
- 修改其他 agent 的 experiment directory
- 直接改 `../Design.md`，除非 human 明確要求
- 直接改 `../DesignResearch.md`，除非 human 明確要求
- 把 experiment 需要的 assets 混入主 app assets
- 在 root 安裝依賴或改 root lockfile

允許：

- 讀取 `../Design.md`
- 讀取 `../DesignResearch.md`
- 讀取 `../docs/twfoundry-color-capture.html`
- 在自己的 experiment directory 建立完整 frontend prototype
- 在自己的 experiment directory 建立 package.json / lockfile / screenshots / notes
- 使用 Vue / Three.js / Vite / Bun
- 使用 mock data

## Required Experiment Shape

每個 experiment directory 至少包含：

```text
README.md
package.json
index.html
src/
```

README 必須包含：

- Experiment goal
- What was built
- How to run
- What files were changed
- Screenshot path, if any
- Builder assumptions
- Design reasoning
- Known gaps
- Next experiment recommendation

## Judge Contract

正式分數只能由沒有產出該 experiment 的 judge agent 給出。Builder 可以寫 known gaps，但不要把 self-score 當成正式結果。

Judge 使用 `../DesignResearch.md` 的 100 分 rubric。

輸出格式：

```text
Score: <0-100>

Breakdown:
  Diorama RPG Fit: <0-20>
  Taiwan Data Truth: <0-15>
  Ontology Clarity: <0-15>
  Timeline / Live: <0-15>
  Visual Token Fit: <0-15>
  Interaction Legibility: <0-10>
  Implementation Scope: <0-10>

Keep:
  - ...

Change:
  - ...

Reject:
  - ...

Next experiment:
  - ...
```

## Design Direction

Do:

- Make the world feel like a palm-sized voxel diorama.
- Use isometric / three-quarter camera.
- Use a visible tabletop base with thickness and soft shadow.
- Use `/Users/unknowntpo/Downloads/taipei_voxel_v3.html` as the current visual north star when available.
- Use a large bright blue sky stage (`#D8EEF8`, `#78C8F8`) with soft sakura fog.
- Use soft pink city blocks (`#FFD2DC`, `#FCB4C3`, `#F58CA5`) as the main miniature-city body.
- Use low-saturation gray/lavender massing (`#D2C3C3`) for hills and background buildings.
- Use floating small square/short petal particles to express sakura-season air.
- Keep HUD translucent pink glass (`rgba(255,245,248,0.90)`) with soft rose borders.
- Make UI feel like RPG HUD.
- Keep ontology object interaction visible.
- Keep timeline / live mode visible in prototypes unless your experiment explicitly scopes them out.

Avoid:

- Enterprise dashboard look.
- Flat map look.
- Full-screen GIS look.
- Pink-only theme.
- Beige/cream design-system page look.
- Overly natural green/yellow palette that loses the spring-blue/sakura atmosphere.
- Overloaded labels.
- Random particles that do not encode data.
- Hidden or fake state.

## Coordination With Main Agent

The main agent will compare experiments using:

- independent judge score
- visual screenshots
- runnable demo quality
- adherence to `Design.md`
- isolation from main app

If your experiment needs a design change, propose it in README. Do not edit shared design docs yourself unless instructed.
