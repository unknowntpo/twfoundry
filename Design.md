# TWFoundry Design Notes

## 目標

TWFoundry 是一個仿效 Palantir Foundry 思路的 operations cockpit 概念 demo。它不是單純地圖，而是接收各式各樣的資料流，將交通、天氣、感測器、事故與操作流程整理成可互動的 operational view。

TWFoundry 的第一個驗證場景聚焦臺灣公開資料，尤其是交通部 TDX 運輸資料流通服務。短期先以臺北作為小範圍驗證：臺北捷運、臺北地圖、雨量、PM2.5 與路況統計資料，會被投影到一個 Three.js 3D voxel 世界，讓使用者在 vivid voxel Taipei 裡觀看、探索、互動。

長期方向是把臺灣城市資料轉成可操作的 voxel digital twin。使用者可以在 voxel 世界裡選取 ontology object、查看即時狀況、執行 action，甚至讓場景中的角色走到某個位置時，由系統即時計算該位置的風險、交通狀態、環境暴露與附近事件。

這份文件先定義三個方向：

- Palantir Foundry 的公開概念如何啟發 TWFoundry。
- Overlay 與地圖資料點如何對應到 ontology object。
- Kafka Connect 若加入平台時，應該站在哪個資料邊界。
- 新版 Design System 改成 Three.js 3D voxel 風格時，視覺與互動應該如何延伸。

目前只做設計整理，不進行實作。

## Palantir Foundry Public Model

公開文件中，Palantir 將 Foundry 描述為 data operations platform。它的重點不是把資料做成靜態報表，而是把資料、邏輯、操作與治理放到同一個 operational system 裡。

### Data Layer + Object Layer

Foundry 的操作模式可以先理解成兩層：

- Data layer：整合 datasets、models、virtual tables 與外部資料來源。
- Object layer / Ontology：把資料映射成真實世界的 objects、properties、links 與 actions。

這個 object layer 是 Foundry 的核心。它不是一般資料 catalog，而是把企業或組織中的「人可以理解並操作的世界」建出來。

對 TWFoundry 的啟發：

```text
TDX / weather / sensor / GIS / incident sources
  -> data layer
  -> observation layer
  -> ontology objects
  -> voxel operational world
  -> user actions / decisions
```

### Ontology as Digital Twin

Palantir Foundry 的 Ontology 公開文件將 ontology 定位成組織的 operational layer 或 digital twin。它包含：

- semantic elements：object types、properties、link types。
- kinetic elements：action types、functions、dynamic security。

也就是說，Ontology 不只描述「有哪些資料」，也描述「使用者可以對這些 object 做什麼」。

對 TWFoundry 而言：

```text
Train
Station
Route
Incident
Sensor
RainfallCell
RoadSegment
VoxelAvatar
RiskZone
```

這些都可以是 ontology object。每個 object 都可以有 properties、links、observations、actions 與 audit history。

### Object-aware Applications

Foundry 的應用不是只查表，而是圍繞 object 工作。公開文件提到的 Object Views、Object Explorer、Insight、Workshop 等，都是讓使用者從 object 出發，進行查詢、分析、決策與操作。

對 TWFoundry 而言，應用模式會是：

- 使用者在 voxel Taipei 點一台列車。
- 系統開啟 `Train T1005` 的 Object View。
- Object View 顯示 live metrics、下一站、關聯路線、附近事故、天氣暴露與歷史事件。
- 使用者可以進一步執行 action，例如標記異常、模擬延誤、派送通知或建立事件。

### Operational Applications and Writeback

Foundry 對 operational application 的定義重點在 decision-making 與 writeback。傳統 dashboard 偏向 read-only insight；operational application 讓使用者把決策寫回系統，並透過 action type 受控地修改 object data 或觸發外部流程。

對 TWFoundry 而言，這代表：

- 初期 demo 可以 read-only。
- 第二階段要加入 command / action。
- 每個 action 都要有 audit log。
- 使用者操作不應只改 UI state，而應產生 governed event。

範例：

```text
User action: dispatch inspection team
  target -> Incident I-237
  actor -> Operator A
  parameters -> team, ETA, priority
  result -> command event
  audit -> before / after / external response
```

### Security and Governance

Palantir 文件強調 Ontology resources、objects、links、actions 都可以做細緻權限控制。這對 TWFoundry 的長期方向很重要，因為交通、位置、風險與操作決策可能有不同資料敏感度。

TWFoundry 的初期 prototype 可以先不做完整權限系統，但資料模型要預留：

- source provenance
- actor
- action permission
- object visibility
- audit event
- confidence / freshness

## TWFoundry Product Positioning

TWFoundry 是 Taiwan public data first 的 voxel operations platform prototype。

它的核心不是重做 Palantir Foundry，而是把 Foundry 的幾個關鍵操作模式縮小到臺灣公共資料場景：

```text
public data streams
  -> semantic objects
  -> vivid voxel world
  -> operational awareness
  -> user interaction
  -> governed actions
```

第一階段資料範圍：

- TDX 臺北捷運路線、車站、班距、即時動態。
- 臺北地圖與行政 / GIS 空間資料。
- 雨量資料。
- PM2.5 / 空氣品質統計資料。
- 交通事故或路況事件。

第一階段體驗：

- 使用者看到微縮臺北。
- 捷運路線與列車在 voxel 世界裡移動。
- 雨量、PM2.5、事故以 voxel volume / marker / haze 呈現。
- 點擊 object 後開啟 object view。
- timeline playback 讓使用者看到狀態變化。

第二階段體驗：

- 使用者在 voxel 世界裡控制角色或觀察者。
- 角色走到某個位置時，系統計算該位置的即時狀況。
- 顯示附近捷運、道路、雨量、PM2.5、事故與風險分析。
- 使用者可以提出 action，例如建立巡檢、標記危險、模擬路線、推送通知。

### Voxel World as Operational Interface

Voxel world 不是美術皮膚，而是 TWFoundry 的主操作介面。

2D map 的主要限制是「看圖層」；voxel world 的目標是「進入一個可互動的微縮城市」。

```text
2D overlay
  -> 看資料在哪裡

3D voxel world
  -> 看到 object 如何互相影響
  -> 看到人或角色所在位置的 operational context
  -> 讓使用者對世界採取行動
```

這會讓 ontology object 更直覺：

- 車站不只是點，是可進入的節點。
- 列車不只是 marker，是移動中的 object。
- 雨量不只是 raster，是覆蓋城市的體積。
- PM2.5 不只是數字，是區域 haze。
- 事故不只是 pin，是會影響路線與風險的事件。

## Core Concepts

### Ontology Object

Ontology object 是穩定的業務實體。它代表使用者真正關心、可以追蹤、可以操作的對象。

範例：

- `Train T1005`
- `Station Yuanshan`
- `Route Tamsui-Xinyi`
- `Incident I-237`
- `AQMS Station AQ-Daan`
- `Rainfall Cell CWA-R-202603`

Ontology object 應該具備：

- 穩定 ID
- 類型
- 屬性
- 關聯
- 狀態
- 歷史事件
- 可執行 action

範例關係：

```text
Train T1005
  belongs_to -> Route Tamsui-Xinyi
  next_stop -> Station Yuanshan
  affected_by -> Rainfall Cell CWA-R-202603
  near -> Incident I-237
  has_observation -> GPS ping
  has_observation -> Headway measurement
  has_observation -> Platform load estimate
```

### Data Point

Data point 是來源系統產生的一筆原始或接近原始資料。它通常不是使用者直接操作的對象，而是 ontology object 的證據、狀態來源或觀測紀錄。

範例：

- 一筆列車 GPS ping
- 一筆 PM2.5 reading
- 一筆雨量雷達格點
- 一筆事故通報
- 一筆路段速度
- 一筆 headway measurement

多個 data point 可以對應到同一個 ontology object。

```text
GPS ping @ 16:30:05
Headway 129s @ 16:30:05
ETA 0.5 min @ 16:30:05
Platform load 72% @ 16:30:05
  -> Train T1005
```

### Observation

Observation 是被標準化、帶有時間、來源、信心值與空間語意的 data point。

Data point 比較接近「資料來源給了什麼」；observation 比較接近「平台理解到什麼」。

建議欄位：

```ts
type Observation = {
  id: string
  sourceId: string
  objectId?: string
  observedAt: string
  kind: 'position' | 'metric' | 'event' | 'status'
  value: unknown
  confidence?: number
  geometry?: Point | LineString | Polygon
}
```

### Overlay

Overlay 是使用者在 cockpit 上可以開關的資料層。它不是 ontology 本身，而是某類 objects / observations 的視覺投影。

範例：

- Taipei Metro
- Rainfall radar
- Air quality PM2.5
- Freeway speed segments
- Traffic incidents

Overlay 關掉時，應該隱藏該 overlay 的 visual features，但不代表 object 被刪除。

### Overlay Feature

Overlay feature 是地圖上的視覺單位，例如一個車輛點、一段路線、一個雨量區域、一個事故 marker。

建議模型：

```ts
type OverlayFeature = {
  id: string
  overlayId: 'metro' | 'rainfall' | 'pm25' | 'highways' | 'incidents'
  objectId?: string
  sourcePointIds: string[]
  geometry: Point | LineString | Polygon
  timestamp: string
  visualRole: 'vehicle' | 'station' | 'route' | 'sensor' | 'incident'
}
```

關係如下：

```text
Ontology Object
  <- many observations
  <- many data points
  -> many overlay features
```

也就是：

```text
source data
  -> data point
  -> observation
  -> ontology object state
  -> overlay feature
  -> cockpit rendering
```

## Demo Workflows

### Operations Cockpit

使用者在同一個 operational view 裡看到：

- 列車位置
- 路線狀態
- 事故
- 感測器
- 雨量
- PM2.5
- 道路速度

核心價值是跨 domain 的即時狀態感知。

使用者可以：

- 開關 overlay
- 點擊地圖上的 object
- 檢查 inspector
- scrub timeline
- 查看 metrics 是否隨時間變化

### Object Drill-down

使用者從地圖點選一台車，例如 `T1005`，進入 object view。

Object view 應顯示：

- live metrics
- 關聯路線
- 下一站
- 目前 headway
- ETA
- platform load
- 事件歷史
- 受哪些事故或天氣區域影響

Object drill-down 的重點是證明地圖上的 marker 不是孤立圖示，而是 ontology graph 的入口。

### What-if / Decision Workflow

事故發生後，使用者可以模擬：

- 延誤擴散
- 調整班距
- 派工
- 發送旅客通知
- 暫停部分路段

這類 action 不應該直接修改前端狀態，而應該產生 command / action event，後端再更新 object state 與 audit log。

### Cross-domain Correlation

平台應能回答跨 domain 問題：

- 雨量上升是否影響 headway？
- PM2.5 是否與道路速度或事故位置相關？
- 事故是否造成特定站點擁擠？
- freeway speed 是否與 metro demand 有同步變化？

這類功能需要 observations 保留時間與空間語意。

### Governed Writeback

使用者提交 action 後，所有 app 應看到一致狀態。

需要保留：

- command event
- action result
- actor
- timestamp
- before / after
- external system response
- audit log

第一版 demo 可以先只做 read-side；writeback 建議第二階段再加入。

## Kafka Connect Feasibility

Kafka Connect 適合扮演資料管線邊界層，不適合直接扮演 ontology runtime。

建議分工：

- Kafka Connect：外部資料匯入、CDC、HTTP polling、sink/writeback、audit export。
- Kafka topics：事件 backbone。
- Domain processor：raw event -> observation -> object event -> overlay feature。
- Ontology service：維護 object graph、關係、查詢與 action。
- Frontend：只接 API / WebSocket，不直接理解 Kafka。

建議 topic：

```text
source.*.raw.v1
twf.datapoints.v1
twf.observations.v1
twf.objects.events.v1
twf.overlay.features.v1
twf.commands.v1
twf.audit.events.v1
```

推薦第一版 pipeline：

```text
Mock External API / CSV / Postgres
  -> Kafka Connect Source
  -> source.demo.raw.v1
  -> normalizer service
  -> twf.observations.v1
  -> ontology projection service
  -> twf.overlay.features.v1
  -> PostGIS / API / WebSocket
  -> frontend cockpit
```

第一版先展示「外部資料進入 cockpit 後，ontology object 與 overlay feature 自動更新」。

先不要做：

- 完整 graph mutation system
- 雙向 writeback
- exactly-once workflow
- 複雜權限模型

主要風險：

- schema evolution
- at-least-once delivery
- connector offset / cursor
- API rate limit
- geospatial snapshot vs event stream
- idempotent object update
- audit 與治理

## 3D Voxel Design System

新版視覺方向改為 Three.js 3D voxel style。目標不是做玩具感，而是把 operations cockpit 轉成更具空間感的 digital twin。

### Visual Direction

關鍵詞：

- March cherry blossom
- Soft operational clarity
- Low-poly voxel city
- Tilted isometric map
- Blooming transit network
- Calm but alive

整體應避免過度遊戲化。Voxel 是資訊承載方式，不是裝飾。

### Color Palette

配色以三月櫻花盛開為主，但仍需保留 operational readability。

一般 3D design system 不應把每個視覺元素都定義成獨立 hex。更好的方式是選少數 hue families，替每個 family 建立 weight scale，再用 semantic token 指向這些 scale。這樣 Three.js material、UI panel、overlay、status 都可以共享同一套語意，而不是到處硬寫顏色。

本專案應該「更換」現有 design system 的視覺語言，而不是沿用目前 beige/warm dashboard 的 token 值。可以保留的是 token 架構：semantic family、weight level、CSS variable、component primitive；要替換的是 palette、材質、空間感與狀態語言。

Nippon Colors 可作為命名與選色來源。第一版不需要搬完整色庫，只挑 5 個主 hue families：

- `sakura`：主氛圍色，參考 桜 / 灰桜 / 桜鼠 / 紅藤。
- `fuji`：副色與 voxel 陰影，參考 藤 / 藤鼠 / 藤紫。
- `wak竹 / leaf`：自然與 safe / online 狀態，參考 若竹 / 裏柳 / 白緑。
- `sora / ai`：資訊、雨量、天空霧感，參考 空 / 水 / 藍。
- `sumi`：文字、輪廓、深陰影，參考 墨 / 鈍 / 銀鼠。

建議 token family：

```text
neutral.50 / 100 / 300 / 500 / 700 / 900
sakura.50 / 100 / 300 / 500 / 700
fuji.50 / 100 / 300 / 500 / 700
leaf.50 / 100 / 300 / 500 / 700
sora.50 / 100 / 300 / 500 / 700
warning.50 / 100 / 300 / 500 / 700
danger.50 / 100 / 300 / 500 / 700
metro.red / blue / green / gold / brown
```

Weight 使用規則：

```text
50 / 100
  scene fog、panel tint、voxel top face、subtle fills

300
  borders、grid lines、unselected station、inactive route

500
  primary accents、selected object、interactive control、active voxel face

700
  hover / pressed state、route depth side face、strong status

900
  text、high-contrast icon、critical outlines
```

Semantic token 範例：

```text
scene.sky              -> sora.50
scene.fog              -> sakura.50
scene.ground           -> neutral.100
scene.voxel.top        -> neutral.50
scene.voxel.side       -> fuji.100
scene.voxel.shadow     -> sumi / neutral.700 with alpha

panel.surface          -> neutral.50 with translucency
panel.border           -> neutral.300
text.primary           -> neutral.900
text.muted             -> neutral.500

accent.primary         -> sakura.500
accent.secondary       -> fuji.500
status.online          -> leaf.500
status.info            -> sora.500
status.warning         -> warning.500
status.danger          -> danger.500
```

使用原則：

- 櫻花粉用於 ambience、highlight、selection，不作為所有主要 UI 的單一主色。
- Metro route color 仍保留紅、藍、綠、棕、橘等辨識色。
- Alert 不使用純紅閃爍，改用暖紅加 voxel pulse。
- 地形與建築使用低飽和 neutral / fuji / sora tint。
- 3D voxel 的立體感優先由 material、light、shadow、face shade 產生，不靠新增大量 hue。
- UI token 與 Three.js material token 必須共用語意命名，但可以有不同輸出格式：CSS variable 與 Three.js material config。

### Design Token Implementation Rules

TWFoundry 會替換目前視覺系統，但保留「token 驅動」的工程架構。

規則：

- 不把 Nippon Colors 當完整 palette 直接匯入。
- 不在 Vue component 或 Three.js scene 裡硬寫任意 hex。
- 色彩先進入 source palette，再映射成 semantic tokens。
- UI CSS variables 與 Three.js materials 必須由同一份 token source 產生或人工保持同步。
- Figma 設計稿若提供具體色值，實作時要先對應到現有 semantic token；只有設計系統缺少語意時才新增 token。

建議 token 層級：

```text
source palette
  nippon.sakura
  nippon.haizakura
  nippon.sakuranezumi
  nippon.fuji
  nippon.wakatake
  nippon.sora
  nippon.sumi

scale tokens
  sakura.50..700
  fuji.50..700
  leaf.50..700
  sora.50..700
  neutral.50..900

semantic tokens
  scene.*
  panel.*
  text.*
  accent.*
  status.*
  overlay.*
  material.*
```

Figma-to-code rule：

```text
Figma color
  -> nearest source palette / scale token
  -> semantic token
  -> CSS variable or Three.js material
```

例如：

```text
桜 / Sakura inspiration
  -> sakura.100 / sakura.500
  -> accent.primary / scene.fog / selected.object
  -> var(--twf-accent-primary) / MeshStandardMaterial.color
```

### Voxel Map Language

地圖從 2D base map 轉為 3D voxel operational field。

物件映射：

```text
Station
  -> low-height voxel node
  -> muted route color
  -> small top highlight

Train
  -> brighter moving voxel bead / capsule
  -> route color
  -> subtle directional notch

Route
  -> raised voxel rail / tube
  -> route color with soft bloom

Incident
  -> stacked warning voxel marker
  -> warm alert color
  -> vertical pulse

Sensor
  -> small voxel tower
  -> metric-dependent height

Rainfall
  -> translucent voxel cloud / volume
  -> blue-lavender density blocks

PM2.5
  -> soft particle haze / voxel fog
  -> amber-pink density gradient
```

### Interaction Model

Three.js 場景應支援：

- orbit / pan / zoom
- hover object highlight
- click select object
- overlay visibility toggle
- timeline playback
- timeline drag / scrub
- playback speed control
- live stream mode
- object drill-down
- scenario switching

滑鼠 hover 時：

- object 上方浮出 compact label
- 相關 route / station / incident 稍微 brighten
- inspector 同步顯示 preview

點擊時：

- object 進 selected state
- camera 可輕微 focus
- inspector 顯示 object graph
- timeline 可定位到最近 observation

### Timeline and Live Mode

TWFoundry 必須提供 Timeline。Timeline 不是裝飾性的底部進度條，而是整個 voxel world 的時間控制器。

Timeline 需要支援：

- 拖曳 scrubber 回到過去任一時間點。
- 自動播放歷史資料。
- 暫停播放。
- 多種倍速，例如 `1x`、`15x`、`60x`、`300x`。
- 顯示事件 marker，例如事故、雨量峰值、PM2.5 警示、班距異常。
- 顯示目前時間與情境，例如 `16:30 CST · afternoon storm cell`。
- `Live` 模式，回到即時資料流。

Timeline 的模式建議分成三種：

```text
historical playback
  使用已知 observation / overlay feature snapshot，允許拖曳與倍速播放。

scenario playback
  使用 demo 或模擬資料，讓使用者觀察特定事件如何影響 voxel world。

live mode
  接收即時資料流，持續更新 ontology object 與 overlay feature。
```

Live mode 規則：

- `Live` 開啟時，timeline cursor 應貼近最新資料時間。
- 新 observation 到達時，voxel scene 自動更新。
- 若使用者手動拖曳到過去，系統應離開 live mode，進入 historical playback。
- Live mode 必須顯示資料新鮮度，例如 `live · 12s ago` 或 `stale · 2m ago`。
- 即時資料中斷時，不可假裝仍為 live；應轉為 stale / reconnecting 狀態。

資料模型上，Timeline 不應直接控制 raw data。它應該選擇某個 `worldTime`，再由 projection layer 查詢或重建該時間點的 world state。

```text
timeline cursor
  -> worldTime
  -> observation window
  -> ontology object state at time
  -> overlay feature state at time
  -> voxel scene projection
```

Three.js 場景中的 train、rainfall、PM2.5、incident pulse 都必須以 `worldTime` 為準，而不是各自擁有獨立時間來源。

這讓使用者可以：

- 回看事故發生前後的城市狀態。
- 用倍速觀察延誤如何擴散。
- 回到 Live 接收即時資料流。
- 對比不同 overlay 在同一時間點的關係。

### UI Layout

整體仍維持 operations cockpit 結構：

```text
topbar
left overlay/sidebar
center 3D voxel scene
right inspector/object panel
bottom timeline
```

但視覺語言從平面表格轉成「soft glass + voxel field」。

注意：

- Sidebar 不應變成大卡片堆疊。
- Inspector 要保留資訊密度。
- Timeline 要保留可 scrub 的 operational affordance。
- 3D 場景是主體，不要被裝飾性 panel 壓過。

### Motion

動效應該服務資料狀態：

- train 沿 route 移動
- live status light breathing
- rainfall voxel volume 隨 timeline 變化
- PM2.5 haze density 緩慢變化
- incident pulse 表示 active severity
- selected object 有穩定 highlight，不要一直閃

避免：

- 大量無意義粒子
- 過強 bloom
- camera 自動亂轉
- 讓使用者失去 spatial orientation

### Data Binding

Voxel scene 不應直接綁 raw data point。它應該吃 overlay feature 與 ontology object summary。

建議前端資料流：

```text
API / WebSocket
  -> observations / overlay feature updates
  -> frontend store
  -> scene projection layer
  -> Three.js meshes / instanced meshes
```

3D entity 建議保留反查：

```ts
type VoxelEntity = {
  meshId: string
  overlayFeatureId: string
  objectId?: string
  visualRole: 'vehicle' | 'station' | 'route' | 'sensor' | 'incident' | 'weather'
}
```

這樣 hover / click 才能從 mesh 回到 ontology object。

## Recommended Next Step

先不要一次把整個 demo 改成 3D。建議分三步：

1. 定義 `OverlayFeature`、`Observation`、`OntologyObjectSummary` 的 frontend contract。
2. 做一個獨立 Three.js voxel scene prototype，只顯示 metro route、stations、trains。
3. 再把 rainfall、PM2.5、incident 與 object drill-down 接進去。

第一個 3D slice 應該只證明：

- overlay 關掉時，相關 voxel entities 消失。
- train voxel 沿 route 移動。
- hover train 可以看到 object detail。
- click train 可以打開 object drill-down。

這樣可以先驗證 ontology + overlay + 3D scene 的核心關係，再決定是否全面替換 design system。

## Public References

Palantir Foundry / Ontology:

- Palantir Foundry platform overview：Foundry 是 data operations platform，和 AIP、Apollo 一起構成 Palantir platform。  
  https://www.palantir.com/docs/foundry/platform-overview
- Palantir Ontology overview：Ontology 位於 datasets、virtual tables、models 之上，將資料連到真實世界 objects，並包含 objects、properties、links、actions、functions、security。  
  https://www.palantir.com/docs/foundry/ontology/overview
- Palantir Ontology core concepts：object type、property、link type、action type 是 ontology 的核心建模單位。  
  https://www.palantir.com/docs/foundry/ontology/core-concepts
- Palantir ontology-aware applications：Object Views、Object Explorer、Insight、Workshop 等應用圍繞 ontology objects 工作。  
  https://www.palantir.com/docs/foundry/ontology/applications
- Palantir operational applications：operational app 不只是 read-only dashboard，而是支援 decision-making 與 governed writeback。  
  https://www.palantir.com/docs/foundry/app-building/operational-apps
- Palantir object permissioning：Ontology resources、objects、links、actions 可以有細緻權限控制。  
  https://www.palantir.com/docs/foundry/object-permissioning/overview

TDX / Taiwan public data:

- TDX 運輸資料流通服務是臺灣交通部提供的運輸資料開放平臺。
- TDX 以 Open API 方式整合公共運輸、路況、停車、GIS 圖資、觀光等跨領域運輸資料。
- TWFoundry 第一階段只取其中一小段：臺北捷運、臺北地圖、雨量、PM2.5、事故與路況統計。
- TDX 官方入口：  
  https://tdx.transportdata.tw/application/
- TDX 新手上路指引：  
  https://motc-ptx.gitbook.io/tdx-xin-shou-zhi-yin
