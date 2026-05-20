# TWFoundry Design

`SPEC.md` is the highest-level product/system contract. This document describes product experience,
visual language, and historical design context. When old voxel/diorama sections conflict with
`SPEC.md`, the map-first ontology contract in `SPEC.md` takes precedence.

See `docs/decision-history/2026-05-map-first-pivot.md` for why the project pivoted away from a
voxel-first main surface.

## 2026-05-11 方向更新：Map-First Ontology

TWFoundry 的主介面改為互動地圖情報層，而不是 Three.js voxel diorama。地圖負責 Google Maps / Mapbox 類型的空間瀏覽、圖層開關、即時狀態、時間回放與 ontology selection。

Voxel Art 保留，但定位改為 selected ontology object 的 detail renderer。例如使用者點擊捷運站 ontology 時，可以在物件面板中看到 voxel station body / 月台 / 出入口資訊；它不再是主地圖底座、城市地表或全域世界模型。

本節 supersede 下方早期「掌中方塊世界 RPG」定位。舊內容已降級為 Legacy Appendix，只能作為 voxel detail renderer 的設計語彙參考，不能治理新的產品決策。

## 產品定位

TWFoundry 是一個以臺灣公開資料為核心的 map-first ontology operations dashboard。

它仿效 Palantir Foundry 的幾個核心概念：資料流進入平台後，不只被做成圖表，而是被整理成可理解、可查詢、可互動、可操作的 ontology objects。使用者不是在看靜態 dashboard，而是在互動地圖上理解狀態、探索關係、回看時間、接收即時資料，並在未來對物件執行 action。

第一階段聚焦臺北：

- TDX 臺北捷運資料
- 臺北地理與城市空間資料
- 雨量資料
- PM2.5 / 空氣品質資料
- 事故與路況事件

這些資料會被投影到互動地圖與 ontology object inspector。地圖承擔主要空間瀏覽、圖層控制與即時狀態理解；Voxel Art 僅在選取物件後作為 detail renderer。

## 設計邊界

本文件描述 TWFoundry 的產品體驗與視覺語言，但系統 contract 以 `SPEC.md` 為準。後續 demo、Figma 設計與實作應優先符合 map-first ontology interaction、timeline/live mode、overlay registry 與 selected-object detail renderer。

工程原則：

- Vue frontend
- MapLibre map surface
- semantic design tokens
- feature-scoped demo entry
- source/ontology/projection/rendering boundary first

## Foundry 啟發

Palantir Foundry 的公開資料顯示，它的重點是把資料、ontology、application、action、permission 與 governance 放在同一個 operational model 裡。

TWFoundry 採用這個方向，但縮小到臺灣公共資料與互動地圖情報層：

```text
public data streams
  -> observations
  -> ontology objects
  -> map overlays
  -> selected-object voxel detail
  -> user exploration
  -> future governed actions
```

## 核心概念

### Observation

Observation 是某個時間點的資料觀測。

範例：

- 一筆列車位置
- 一筆捷運班距
- 一筆 PM2.5 數值
- 一筆雨量資料
- 一筆事故事件
- 一筆道路速度

Observation 需要保留：

- source
- timestamp
- value
- location / geometry
- confidence
- freshness

### Ontology Object

Ontology object 是使用者真正理解與操作的對象。

範例：

- `Train T1005`
- `Station Yuanshan`
- `Route Tamsui-Xinyi`
- `Rainfall Cell`
- `AQMS Station`
- `Incident`
- `Risk Zone`
- `Voxel Avatar`

多個 observations 可以對應到同一個 ontology object。

```text
GPS position
headway
ETA
platform load
  -> Train T1005
```

Ontology object 需要支援：

- stable id
- type
- properties
- relationships
- live state
- history
- available actions

### Relationship

TWFoundry 的價值來自 object graph，而不是單一資料點。

範例：

```text
Train T1005
  belongs_to -> Route Tamsui-Xinyi
  next_stop -> Station Yuanshan
  near -> Incident I-237
  affected_by -> Rainfall Cell R-22
  observed_by -> TDX live feed
```

### Data Layer

資料層不直接控制畫面。資料先被整理成 observations，再投影成世界狀態。

```text
TDX / weather / sensor / incident source
  -> observation
  -> object state
  -> map overlay / selected-object detail
```

## Legacy Appendix: 3D Voxel World

Status: historical reference. This section is retained only as visual inspiration for selected-object
Voxel Detail modules. It is not the current product contract.

TWFoundry 的早期主介面曾被設計為 Three.js 掌中方塊世界。

設計目標：

- 使用者感覺自己在觀看一個放在桌上的微縮臺北。
- 世界有 diorama base：方形或圓角方形底座、可見厚度、邊緣、柔和陰影。
- 城市資料以 3D object、volume、motion、light、height、density 呈現。
- 每個可互動物件都能回到 ontology object。
- 3D 場景承載 operational meaning，但視覺上仍像輕鬆可愛的 RPG 場景。

### Diorama World Rules

世界必須像「掌中方塊世界」，而不是無邊界的 3D 地圖。

規則：

- 場景放在一塊可看見邊界的 voxel island / diorama base 上。
- Camera 預設是 isometric / three-quarter view。
- 地形是方塊格、階梯、低矮建築、樹、河道、道路與捷運路線。
- 捷運路線像鋪在模型上的彩色軌道。
- 車站像小型方塊節點或小站亭。
- 列車像沿軌道移動的可愛 voxel capsule。
- 雨量與 PM2.5 像覆蓋在 diorama 上方的柔和 volume / haze。
- UI panel 像 RPG HUD，不像企業報表。
- 文字資訊要克制，讓世界本身先說話。
- 場景可以有柔和 bloom / fog，但不能模糊到看不清資料。

### Voxel Entity Mapping

```text
Station
  -> low voxel node
  -> muted route color
  -> small top highlight

Train
  -> moving voxel bead / capsule
  -> route color
  -> brighter than stations
  -> directional notch

Route
  -> raised voxel rail
  -> route color
  -> slight emission / bloom only when active

Rainfall
  -> translucent voxel volume
  -> blue / fuji density blocks
  -> height and opacity reflect intensity

PM2.5
  -> soft voxel haze
  -> amber / sakura density gradient
  -> local exposure cue near avatar

Incident
  -> stacked warning voxel marker
  -> vertical pulse
  -> connected affected objects

Sensor
  -> small voxel tower
  -> height reflects metric value

Voxel Avatar
  -> user position in the city
  -> triggers local context analysis
```

### Avatar Context

未來使用者可以讓 avatar 在 voxel world 中移動。

當 avatar 走到某個位置時，系統應呈現該位置的即時 context：

- nearby stations
- nearby trains
- rainfall intensity
- PM2.5 exposure
- open incidents
- route disruption
- local risk summary
- recommended action

## Geospatial Backbone

TWFoundry 未來可以延伸到整個臺灣，甚至世界尺度，但使用者體驗上仍應維持「掌中世界」的感覺，而不是變成一般 GIS 系統。

實際地圖的角色是提供方向感與真實位置；voxel world 的角色是讓 operational objects 變得可理解、可互動、可探索。

### Actual Map Diorama Surface

```text
MapLibre actual map source
  -> Sakura-styled map surface
  -> diorama ground plate / chunk
  -> voxel train / station / sensor / weather entities growing from it
```

Actual map 應被視為 diorama 的地表來源，而不是全螢幕 2D 背景，也不是新的 domain layer。它可以開關、淡出、降低細節，但不應污染 TDX、Weather、PM2.5、Incident 等 domain source。

地圖與 voxel 世界不能分成「底下平面地圖」和「上方浮動 overlay」兩套互相漂移的視覺系統。正確方向是像 Pikmin 類型的掌中世界：目前 focus 的地理範圍被做成一塊可探索的小地表，路線、車站、列車、雨量、感測器與事故都像長在這塊地表上的物件。

當使用者改變 map focus 時，系統應延伸或替換 diorama 地表 chunk，而不是讓全螢幕底圖在 voxel 世界後方獨立平移。

視覺上：

- map 是 diorama ground material，不是主角，也不是全螢幕背景。
- map style 應接近櫻花季 voxel 世界：明亮、柔和、低噪音。
- MRT route / station 應像地表上的 raised rail / marker，而不是傳統 GIS overlay。
- train、station highlight、sensor、rain、incident 仍然維持可愛 voxel component。
- 使用者應感覺自己在真實臺北位置上觀看一個 mini operational world。

### Scale Modes

TWFoundry 需要支援不同地理尺度，但每個尺度呈現的 detail 不同。

#### Taipei Diorama

第一階段固定臺北小範圍。

重點：

- 明亮櫻花季 voxel Taipei
- 臺北捷運路線、站點、列車
- timeline / live playback
- object drill-down
- rainfall / PM2.5 / incident overlays

#### Taipei Map-backed

第二階段接 MapLibre / PMTiles / vector tiles。

重點：

- 真實臺北地理座標
- visible viewport voxelization
- OSM / OpenMapTiles 建物與道路
- TDX route / station / train 對齊真實位置
- DEM / hill terrain 可逐步加入

#### Taiwan Mode

縮放到臺灣尺度時，不顯示每棟建物。

重點：

- 城市級 voxel clusters
- 高鐵、台鐵、捷運、國道主幹
- 天氣、雨量、空品、事件熱區
- 區域風險與跨域 correlation

#### World Mode

世界尺度不追求微縮街區，而是 operational globe / miniature atlas。

重點：

- 國家、城市、港口、機場、航線
- global event hotspots
- supply / transport / weather relationships
- 點入城市後才 materialize 成 local voxel diorama

### Tile Feature To Ontology

真實世界資料不應直接變成畫面物件。它要先被正規化成 observation，再對應 ontology object。

```text
Map tile feature / TDX record / weather sample
  -> observation
  -> ontology object
  -> relationship graph
  -> voxel entity
```

範例：

```text
TDX train position T1005
  -> object: Train T1005
  -> belongs_to: Tamsui-Xinyi Line
  -> next_stop: Yuanshan Station
  -> near: Rain Cell R-042
  -> rendered_as: moving red voxel train
```

這讓 TWFoundry 不是 3D map clone，而是：

```text
geospatial tiles
  + public data streams
  + ontology objects
  + timeline state
  -> interactive voxel operational world
```

## Overlay / Data Layers

Overlay 是使用者可以開關的 domain visual layer。它不是 ontology object 本身，而是把一組 objects / observations 投影到 voxel world 的視覺層。

```text
observations / ontology objects
  -> overlay projection
  -> voxel entities / volumes / signals
```

使用者開關 overlay 時，是控制該 domain 的視覺投影是否顯示；不是刪除資料，也不是切換 MapLibre tile backbone。

第一階段 overlays：

- Taipei Metro
- Rainfall
- PM2.5
- Incidents
- Sensors
- Risk Zones

關閉資料層時：

- 相關 voxel entities 不顯示。
- ontology object 不刪除。
- inspector 若正在查看被隱藏 object，應顯示該 object 目前 layer hidden。

UI 規則：

- Overlay toggle 區塊必須明確標示 `OVERLAYS`。
- MapLibre tiles / chunks 屬於 geospatial backbone，不應出現在主要 overlay toggle 區塊裡。
- Tile / chunk debug 可以放在 pipeline 或 advanced diagnostic context，不應成為日常操作按鈕。
- 每個 overlay toggle 要清楚顯示 domain name、source shorthand 與 ON/OFF state。

## Timeline

TWFoundry 必須提供 Timeline。Timeline 是整個 voxel world 的時間控制器。

Timeline 支援：

- drag / scrub 回到過去時間點
- play / pause
- historical playback
- scenario playback
- Live mode
- 倍速：`1x`、`15x`、`60x`、`300x`
- event markers
- stale / reconnecting state

Timeline 必須控制唯一的 `worldTime`。

```text
timeline cursor
  -> worldTime
  -> observation window
  -> object state at time
  -> voxel entity projection
```

所有 Three.js 動態都以 `worldTime` 為準：

- train position
- rainfall volume
- PM2.5 haze
- incident pulse
- sensor tower height
- avatar context

### Live Mode

Live mode 代表系統正在接收最新資料流。

規則：

- `Live` 開啟時，timeline cursor 追隨最新 observation。
- 新 observation 到達時，world state 自動更新。
- 使用者拖曳 timeline 到過去時，自動離開 Live mode。
- Live mode 必須顯示資料新鮮度，例如 `live · 12s ago`。
- 資料中斷時，狀態改為 `stale` 或 `reconnecting`，不可假裝仍然 live。

## Interaction Model

Three.js scene 必須支援：

- orbit
- pan
- zoom
- hover highlight
- click select
- layer toggle
- timeline scrub
- playback speed
- Live mode
- object drill-down
- avatar local context

Hover：

- 顯示 compact label
- highlight related route / station / incident
- inspector 顯示 preview

Click：

- 選取 ontology object
- camera 輕微 focus
- inspector 開啟 object view
- timeline 可定位到最近 observations

## Object View

Object View 是 ontology object 的主要入口。

Train object 應顯示：

- train id
- route
- direction
- next stop
- ETA
- headway
- load
- current position
- related incidents
- affected weather / PM2.5
- observation history

Incident object 應顯示：

- severity
- location
- affected routes
- nearby stations
- weather context
- timeline history
- possible actions

Sensor object 應顯示：

- latest value
- trend
- freshness
- source
- nearby risks

## Visual Direction

關鍵詞：

- bright spring blue sky
- sakura petals in the air
- soft pink voxel Taipei
- clear tabletop miniature world
- cozy 3D voxel RPG
- palm-sized diorama
- tabletop miniature world
- miniature city
- bright / gentle / dreamy
- low-poly / voxel materiality

設計語言：

- 參考 `/Users/unknowntpo/Downloads/taipei_voxel_v3.html`。
- 明亮藍天是舞台，柔粉城市是主體，櫻花粒子是空氣感。
- 整體要像三月櫻花紛飛的臺北微縮模型：明亮、溫柔、乾淨、夢幻。
- 整體偏輕鬆可愛的 3D voxel RPG，而不是嚴肅企業 dashboard。
- 城市像掌中可探索的小型遊戲場景，但資料狀態仍清楚。
- 世界需要有可見底座與邊界，像立體模型被放在眼前。
- 3D material 產生層次
- UI panel 像遊戲 HUD：輕、圓、柔和、可讀。
- Panel / HUD 不應水晶化或琉璃化；它們要保持清楚、可讀、柔和，像 RPG 操作介面。
- Voxel city 的主體必須是實體方塊，不能大面積透明。實心量體讓臺北微縮模型更清楚、更像可觸摸的掌中世界。
- 半透明琉璃感 / 水晶感只適合少量用在資料 volume、雨量、PM2.5、selection halo、地圖 tile preview 等 overlay，不應套在整個城市、列車或站點上。
- 重要 operational state 保持高辨識度，不用恐怖或壓迫的警示色。

## Color System

不要使用大量獨立 hex。使用少數 hue families 加 weight scale。

色彩主參考是 `taipei_voxel_v3.html`。它的成功點不是色票多，而是比例清楚：

```text
大面積 bright sky blue
  -> 形成乾淨、開闊、春天戶外感

soft sakura / rose voxel city
  -> 形成櫻花季與可愛感

low-saturation grey / lavender buildings
  -> 提供城市量體，不搶主角

floating petal / pollen particles
  -> 形成「櫻花紛飛」空氣感

pink translucent HUD
  -> 像輕量 RPG UI，不像 dashboard
```

核心色票：

```text
sky.stage           #D8EEF8  main background
sky.day             #78C8F8  daytime sky
sky.noon            #50B0FF  vivid noon sky
fog.sakura          #EDD8E8  spring fog
light.ambient       #FFF0F5  sakura ambient light
light.sun           #FFFAF8  soft sun light
light.fill          #FFB0D0  sakura fill light

city.commercial     #F58CA5  high-rise / high activity
city.dense          #FCB4C3  dense urban
city.residential    #FFD2DC  residential / soft sakura blocks
city.hill           #D2C3C3  hills / neutral block mass
city.river          #B4D7F0  river / water blocks
city.park           #96CD8C  parks / green layer

hud.surface         rgba(255,245,248,0.90)
hud.border          rgba(240,180,200,0.50)
hud.text            #B04060
hud.title           #C05070
hud.active          #D06080

mrt.red             #E3002C
mrt.green           #008659
mrt.blue            #0070BD
mrt.brown           #C48A00
mrt.orange          #F59300
```

主色 families：

- `sky`：最大面積背景與時間氛圍。
- `sakura city`：城市主體、HUD、selection、櫻花空氣感。
- `neutral city`：山地、灰白建築、非焦點城市量體。
- `park / river`：自然地形與城市可讀性。
- `mrt`：真實捷運路線辨識色。

建議畫面比例：

```text
50% sky.stage / sky.day
30% sakura city blocks / sakura haze
10% neutral city blocks
5% park / river
5% MRT / incident / HUD emphasis
```

重點：粉色可以是城市主體，但不能變成整頁 UI 背景。天空必須保留大面積藍，才會有明亮、溫柔、春天戶外感。

Scale：

```text
50 / 100
  sakura fog, panel tint, voxel top face, sky gradient

300
  border, inactive entity, muted station, soft route base

500
  active object, primary control, selected state, main material

700
  pressed state, voxel side face, strong status, readable badge

900
  text, high-contrast icon, object outline
```

Semantic mapping：

```text
scene.sky             -> sky.stage / sky.day / sky.noon
scene.fog             -> fog.sakura
scene.ambient         -> light.ambient
scene.sun             -> light.sun
scene.fill            -> light.fill
scene.base            -> city.residential with low alpha / pale lavender
scene.petals          -> city.residential / city.park / warm yellow particles

panel.surface         -> hud.surface
panel.border          -> hud.border
text.primary          -> hud.text
text.title            -> hud.title
accent.primary        -> hud.active

terrain.commercial    -> city.commercial
terrain.dense         -> city.dense
terrain.residential   -> city.residential
terrain.hill          -> city.hill
terrain.river         -> city.river
terrain.park          -> city.park

material.train        -> metro route color with blossom highlight
material.station      -> muted metro route color
material.route        -> metro route color
material.rainfall     -> city.river / sky.day
material.pm25         -> city.park / warm yellow particles
material.incident     -> mrt.red / city.commercial
```

實作規則：

- 不在 Vue component 或 Three.js scene 任意硬寫 hex。
- Figma color 必須先對應到 semantic token。
- CSS variables 與 Three.js material config 共享同一組語意。
- 捷運路線色可保留獨立 `metro.*`，因為它們有真實世界辨識功能。
- Sakura `#FEDFE1` 主要用於空氣感與柔光，不作為主要 action button。
- Primary action 使用 Kohbai `#E16B8C`，比 Sakura 更清楚也更可點。
- 背景使用大面積 `#D8EEF8` / `#78C8F8`，不要改成米白或粉色。
- 城市使用 `#FFD2DC`、`#FCB4C3`、`#F58CA5` 的粉色階層。
- 建築與山地使用 `#D2C3C3` / 灰白低飽和色，提供量體但不搶戲。
- HUD 使用半透明 `rgba(255,245,248,0.90)` 和粉色邊框。
- 粒子是必要元素，用小方塊/短片營造櫻花紛飛，而不是裝飾噪音。

## Layout

TWFoundry 仍是營運主控台，但主體是 voxel world。

```text
top status bar
left data layer controls
center Three.js voxel world
right object view / inspector
bottom timeline
```

原則：

- 3D scene 是第一視覺主體。
- Panel 不可壓過世界感。
- Inspector 保持資訊密度。
- Timeline 必須可操作，不只是展示。
- Mobile 可以先降級為 scene + bottom sheet + timeline。

## Motion

Motion 必須服務資料狀態。

允許：

- train movement
- live status breathing
- rainfall volume changing with time
- PM2.5 haze density change
- incident pulse
- selected object stable glow
- avatar movement

避免：

- 無意義粒子
- 過強 bloom
- camera 自動亂轉
- 閃爍造成狀態誤判

Reduced motion：

- 停止非必要動畫。
- 保留資料狀態變更。
- 用文字與靜態標記補足 motion cue。

## Frontend Prototype Scope

第一個純前端 prototype 必須證明：

- Three.js voxel Taipei 可渲染。
- Taipei Metro route / station / train 可被投影到 voxel world。
- Train 會根據 `worldTime` 移動。
- Timeline 可 scrub、play、pause、調整倍速。
- Live mode 可切換，並顯示 freshness。
- Data layer 關閉後，相關 voxel entities 消失。
- Hover / click 可回到 ontology object。
- Object View 顯示 object relationships 與 live metrics。
- Object View 中選取 ontology object 時，3D voxel world 必須 focus 到對應 object。
- Camera / controls 必須允許滑鼠拖曳調整視角，不能固定在正中央。
- Timeline 改變 `worldTime` 時，世界光照與天空可以反映白天、黃昏與夜晚。

不需要在第一版完成：

- 真實 TDX API 串接
- Kafka Connect
- 完整權限系統
- 完整 action writeback
- 全臺灣資料

## Backend Compute / Frontend Render Direction

TWFoundry 的長期架構應採用 backend-computed world view，而不是讓前端自行解析地圖資料、計算 chunk、裁切跨區域事件。

```text
TDX / weather / sensor / incident sources
  -> ingestion
Map / vector tile / static route sources
  -> GeoFeature normalization
  -> OntologyObject assembly
  -> DioramaChunk generation
  -> ChunkProjection generation
  -> WorldViewPayload API
  -> frontend render modules
```

後端擁有：

- truth assembly
- geospatial normalization
- spatial index
- cross-chunk clipping
- chunk generation
- timeline snapshot / replay state

前端擁有：

- Three.js diorama rendering
- camera / selection / hover / inspector
- render module registry
- animation polish
- local fallback fixture for development

正式邊界：

```text
Backend computes world.
Frontend renders world.
```

第一版 backend compute 可以先使用 Java + mock/static data，重點是建立 `WorldViewPayload` contract。Kafka Connect 可作為 ingestion 邊界，但不應直接扮演 ontology runtime。Go / Rust 只在 profiling 證明 Java/JTS 幾何運算不足時，才作為專用 worker 引入。

## Public References

Palantir Foundry / Ontology:

- https://www.palantir.com/docs/foundry/platform-overview
- https://www.palantir.com/docs/foundry/ontology/overview
- https://www.palantir.com/docs/foundry/ontology/core-concepts
- https://www.palantir.com/docs/foundry/ontology/applications
- https://www.palantir.com/docs/foundry/app-building/operational-apps
- https://www.palantir.com/docs/foundry/object-permissioning/overview

TDX:

- https://tdx.transportdata.tw/application/
- https://motc-ptx.gitbook.io/tdx-xin-shou-zhi-yin

Nippon Colors:

- https://nipponcolors.com/
