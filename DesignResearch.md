# TWFoundry Design Autoresearch

## 目的

這份文件定義 TWFoundry 的設計迭代機制。它借鑑 Karpathy `autoresearch` 的概念：不要只靠一次主觀設計，而是讓 agents 在固定約束下反覆提出小改動、評分、保留勝出的方向。

TWFoundry 的目標不是優化模型 loss，而是優化「掌中方塊世界 RPG」是否真的成立。

## Autoresearch 映射

```text
autoresearch
  program.md      -> DesignResearch.md
  train.py        -> scoped demo / design slice
  val_bpb         -> design score
  5-minute run    -> fixed evaluation window
  git history     -> accepted design iterations
  results.tsv     -> design experiment log
```

## 不變約束

每次 agent 迭代必須遵守：

- 不改產品核心定位：TWFoundry 是臺灣公開資料的掌中方塊世界 RPG。
- 不回到企業 dashboard 或平面地圖風格。
- 不把櫻花粉當整個畫面的底色。
- 多用日本色圖鑑的大自然色：天空、水、嫩葉、陽光、藤、櫻。
- Three.js scene 是主角，UI 是 RPG HUD。
- Timeline / Live mode 是必要功能，不可省略。
- Ontology object / observation / relationship 必須能在互動裡被看見。

## 可迭代範圍

每次實驗只允許改一個 slice：

- `Design.md` 中某個章節
- 色票 preview
- 一個 frontend-only demo entry
- Three.js scene 的一個視覺子系統
- Timeline / Live mode 的一個互動子系統
- Object View 的一個資訊架構子系統

不要在同一次實驗中同時大改設計方向、資料模型與實作架構。

## Experiment Directory Rules

所有 subagent 的 code experiment 都必須放在獨立 sub directory，避免污染現有程式碼。

所有 agent 也必須遵守：

```text
experiments/AGENTS.md
```

Root：

```text
experiments/
```

命名：

```text
experiments/<agent-name>-<short-topic>/
```

範例：

```text
experiments/visual-diorama-v1/
experiments/interaction-timeline-v1/
experiments/ontology-object-view-v1/
```

每個 experiment directory 必須自成 root：

```text
experiments/<name>/
  README.md
  package.json
  src/
  index.html
```

規則：

- 不修改 `frontend/` 既有 app。
- 不修改 repo root app config。
- 不共用 hidden global state。
- 可以讀 `Design.md` 與 `DesignResearch.md`。
- 可以使用 Vue、Three.js、Vite/Bun，但依賴要寫在該 experiment 的 `package.json`。
- 每個 experiment 必須提供自己的執行方式。
- 每個 experiment 必須輸出評分與下一步建議。
- 若需要截圖，截圖放在該 experiment 內或 `/tmp`，不要混入 app assets。

## Multi-Agent Coordination

Codex subagents 與 Claude Code subagents 可以同時實驗，但必須使用不同 experiment directory。

Codex 建議目錄：

```text
experiments/codex-<topic>-v1/
```

Claude Code 建議目錄：

```text
experiments/claude-<topic>-v1/
```

範例：

```text
experiments/codex-visual-diorama-v1/
experiments/claude-visual-diorama-v1/
```

協作規則：

- 每個 agent 只寫自己的 experiment directory。
- 不改其他 agent 的 experiment。
- 不改 `frontend/` 既有 app。
- 不改 repo root build config。
- 可讀 `Design.md`、`DesignResearch.md`、`docs/twfoundry-color-capture.html`。
- 每個 experiment 必須有 README，說明目標、執行方式、builder assumptions、known gaps。
- 若需要新增依賴，寫在該 experiment 自己的 `package.json`。
- 評分一律使用本文件的 100 分 rubric。
- 主線比較時只看：分數、截圖、可執行性、是否符合 `Design.md`。

Claude Code subagent prompt 建議：

```text
請先讀 Design.md、DesignResearch.md、experiments/AGENTS.md，然後在 experiments/claude-visual-diorama-v1/ 建立獨立 frontend experiment。
不要修改 frontend/、repo root config、或其他 experiments。
目標是做一個掌中方塊世界 / Sakura-season Japanese nature palette / cute voxel RPG diorama prototype。
完成後在 README.md 寫 builder assumptions、design reasoning、known gaps、建議下一步。不要把自評當正式分數；正式分數會由另一個 judge agent 產生。
```

## Builder vs Judge

正式評分必須由不同 agent 執行，不應由產出 experiment 的 builder 自評決定。

原因：

- `autoresearch` 的精神是固定外部評測，而不是讓產出者自己宣布結果。
- builder 容易高估自己的方向。
- judge agent 可以專注在缺陷、對照 rubric、比較多個 experiment。
- human 最後決策時，需要看到 builder intent 與 independent judge score 的差距。

角色分工：

```text
Builder agent
  -> 產出 experiment
  -> 寫 assumptions / design reasoning / known gaps
  -> 可提供 non-binding self notes
  -> 不提供正式分數

Judge agent
  -> 不修改 experiment code
  -> 讀 Design.md / DesignResearch.md / experiment README / screenshots
  -> 用 rubric 評分
  -> 寫 judge report

Human / main agent
  -> 比較多個 judge report
  -> 決定 keep / revise / reject
```

每個 experiment 至少需要：

- 1 個 builder README
- 1 個 independent judge report

重要方向應使用 2-4 個 judge reports。

## 評分標準

每個 independent judge report 使用 100 分制。80 分以上才可考慮保留；90 分以上才可視為強候選。

| 指標 | 分數 | 說明 |
|---|---:|---|
| Diorama RPG Fit | 20 | 是否像掌中方塊世界、桌上立體模型、可愛 RPG，而不是 dashboard / GIS。 |
| Taiwan Data Truth | 15 | 是否清楚承載 TDX、臺北捷運、雨量、PM2.5、事故等真實資料語意。 |
| Ontology Clarity | 15 | 是否能看出 observation -> object -> relationship -> interaction。 |
| Timeline / Live | 15 | 是否支援 scrub、play/pause、倍速、Live mode、freshness / stale。 |
| Visual Token Fit | 15 | 是否使用日本自然色，平衡天空、水、嫩葉、陽光、藤、櫻，不被粉色壟斷。 |
| Interaction Legibility | 10 | hover、click、layer toggle、object view 是否直覺且可讀。 |
| Implementation Scope | 10 | 是否保持 frontend-only、feature-scoped、可驗證、沒有污染既有 app。 |

## 評分輸出格式

Judge agent 必須輸出：

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

Top findings:
  1. ...
  2. ...
  3. ...

Keep:
  - ...

Change:
  - ...

Reject:
  - ...

Next experiment:
  - one scoped experiment recommendation
```

## 實驗流程

1. Human updates `Design.md` or selects a demo slice.
2. Main agent creates / updates one scoped artifact.
3. Builder writes README with intent, implementation notes, and known gaps.
4. 2-4 judge agents independently score it using this rubric.
5. Main agent compares judge scores and extracts common failure points.
6. If judge average is below 80, revise or reject.
7. If judge average is 80-89, keep only if direction is clearly useful.
8. If judge average is 90+, consider it a candidate baseline.
9. Accepted iteration should be committed.

## Suggested Agent Roles

### Visual Judge

Focus:

- palm-sized diorama feeling
- cute voxel RPG style
- Japanese nature palette
- visual hierarchy

Do not focus on backend architecture.

### Interaction Judge

Focus:

- timeline
- Live mode
- hover / click
- layer toggle
- object drill-down
- avatar local context

Do not judge color unless it blocks interaction.

### Ontology Judge

Focus:

- observation
- ontology object
- relationship
- data layer
- object view
- future action/writeback clarity

Do not judge visual polish unless it hides object semantics.

### Implementation Judge

Focus:

- Vue / Three.js feasibility
- feature-scoped files
- frontend-only constraints
- build / check / screenshot evidence
- maintainability

Do not redesign product direction.

## Experiment Log Template

```text
Date:
Experiment:
Artifact:
Agents:
Scores:
Average:
Decision: keep / revise / reject
Why:
Next:
```

## Current Baseline

Baseline artifacts:

- `Design.md`
- `docs/twfoundry-color-capture.html`
- `frontend/design-validation-demo.html`

Initial research question:

> Does `Design.md` produce a frontend demo that feels like a palm-sized Sakura-season voxel RPG world while preserving TWFoundry data/ontology/timeline requirements?

First evaluation should score:

- current `Design.md`
- current color capture page
- current design-validation demo generated by a subagent

## References

- https://github.com/karpathy/autoresearch
- https://github.com/karpathy/autoresearch/blob/master/README.md
