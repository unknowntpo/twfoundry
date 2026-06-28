# Design: Backend-Computed Diorama World View

## Principle

TWFoundry should follow:

```text
Backend computes world.
Frontend renders world.
```

The frontend should not parse map vector tiles, perform heavy spatial joins, clip cross-chunk geometries, or decide which chunks an event belongs to. It should receive a product-owned `WorldViewPayload` and instantiate render modules.

## Runtime Shape

```text
TDX / CWA / EPA / incident sources
Map / vector tile / PMTiles sources
Static MRT geometry
        |
        v
Backend GeoReferenceProvider
        |
        v
GeoFeature normalization
        |
        v
OntologyObject assembly
        |
        v
Spatial index + chunk intersection
        |
        v
DioramaChunk + ChunkProjection generation
        |
        v
WorldView API
        |
        v
Vue + Three.js render modules
```

## Core Boundary

Map tiles are replaceable geospatial inputs. Diorama chunks are TWFoundry-owned render artifacts. Ontology objects are TWFoundry-owned operational truth.

```text
Map tile feature != ontology object
Diorama chunk != map tile
Chunk projection != duplicated event
```

## API Endpoints

### Get Current World View

```http
GET /api/world/view?focusId=taipei-core&lod=city&time=live
```

Query parameters:

| Name | Required | Example | Meaning |
| --- | --- | --- | --- |
| `focusId` | yes | `taipei-core` | Named world focus. |
| `lod` | no | `city` | Level of detail: `city`, `district`, `station`. |
| `time` | no | `live` or ISO-8601 | Live mode or timeline replay timestamp. |
| `overlays` | no | `mrt,rain,pm25,incident` | Domain overlay filter. |
| `debugGeo` | no | `false` | Include raw/reference GeoFeature summaries for debug UI only. |

Response: `WorldViewPayload`.

### Get Object Detail

```http
GET /api/world/objects/{objectId}?time=live
```

Returns one `OntologyObject` plus relationship summaries. The frontend may use the object already embedded in `WorldViewPayload`; this endpoint is for drill-down refresh or lazy-loaded history.

### Get Projection Debug

```http
GET /api/world/debug/projections?objectId=rain-cell-R042&focusId=taipei-core
```

Debug-only endpoint for validating cross-chunk projection and geometry clipping. It must not be required by the production cockpit render path.

## Data Formats

### WorldViewPayload

```ts
type WorldViewPayload = {
  schemaVersion: "world-view.v1"
  request: WorldViewRequest
  focus: WorldFocus
  chunks: DioramaChunk[]
  objects: OntologyObject[]
  projections: ChunkProjection[]
  renderModules: RenderModuleDescriptor[]
  freshness: Freshness
  completeness: WorldViewCompleteness
  diagnostics?: WorldViewDiagnostics
}
```

Example:

```json
{
  "schemaVersion": "world-view.v1",
  "request": {
    "focusId": "taipei-core",
    "lod": "city",
    "time": "live",
    "overlays": ["mrt", "rain", "pm25", "incident"]
  },
  "focus": {
    "id": "taipei-core",
    "label": "Taipei Core",
    "center": [121.535, 25.049],
    "radiusKm": 8,
    "lod": "city",
    "worldTime": "live"
  },
  "chunks": [],
  "objects": [],
  "projections": [],
  "renderModules": [],
  "freshness": {
    "mode": "live",
    "generatedAt": "2026-04-30T12:02:15Z",
    "maxSourceLagSeconds": 18,
    "sources": []
  },
  "completeness": {
    "status": "complete",
    "missingOverlays": [],
    "warnings": []
  }
}
```

### WorldViewRequest

```ts
type WorldViewRequest = {
  focusId: string
  lod: "city" | "district" | "station"
  time: "live" | IsoDateTime
  overlays: DomainOverlayKey[]
}

type DomainOverlayKey =
  | "mrt"
  | "rain"
  | "pm25"
  | "incident"
  | "traffic"
  | "debug-geo"
```

Overlay filter semantics:

- `overlays` controls which `ChunkProjection` records are returned.
- If the query omits `overlays`, the backend uses the default set: `["mrt", "rain", "pm25", "incident"]`.
- `WorldViewPayload.request` is the normalized request after backend defaults are applied, not necessarily the raw query string.
- The backend may include referenced `OntologyObject` records for returned projections.
- The backend should not include unrelated objects for disabled overlays unless `debugGeo=true` or an object detail endpoint is requested.
- Disabling an overlay hides projections; it does not delete backend object truth.

Replay time semantics:

- `time=live` requests latest operational state.
- Replay requests must use ISO-8601 UTC, for example `2026-04-30T12:00:00Z`.
- If the backend buckets replay internally, it must report the exact bucket in `freshness.replayTime`.

### GeoJSONGeometry

All geographic geometry uses WGS84 longitude/latitude order. Altitude is not part of `world-view.v1`; height is represented through terrain cells, local geometry, or visual state.

```ts
type LngLat = [lng: number, lat: number]
type IsoDateTime = string

type GeoJSONGeometry =
  | { type: "Point"; coordinates: LngLat }
  | { type: "LineString"; coordinates: LngLat[] }
  | { type: "Polygon"; coordinates: LngLat[][] }
  | { type: "MultiPolygon"; coordinates: LngLat[][][] }
```

### WorldFocus

`WorldFocus` represents the real-world area currently materialized as a hand-scale diorama. Users move the world focus; they do not drag a visible 2D map as the main product surface.

```ts
type WorldFocus = {
  id: string
  label: string
  center: [lng: number, lat: number]
  radiusKm: number
  bounds?: GeoBounds
  lod: "city" | "district" | "station"
  worldTime: "live" | IsoDateTime
}
```

Example:

```json
{
  "id": "taipei-core",
  "label": "Taipei Core",
  "center": [121.535, 25.049],
  "radiusKm": 8,
  "bounds": {
    "west": 121.445,
    "south": 24.975,
    "east": 121.615,
    "north": 25.138
  },
  "lod": "city",
  "worldTime": "live"
}
```

### GeoBounds

```ts
type GeoBounds = {
  west: number
  south: number
  east: number
  north: number
}
```

### Local Geometry

The backend returns render geometry in chunk-local diorama coordinates. This keeps the frontend from doing heavy projection or clipping.

```ts
type LocalPoint = [x: number, z: number]

type LocalGeometry =
  | { type: "Point"; coordinates: LocalPoint }
  | { type: "LineString"; coordinates: LocalPoint[] }
  | { type: "Polygon"; coordinates: LocalPoint[][] }
  | { type: "MultiPolygon"; coordinates: LocalPoint[][][] }
```

Coordinate convention:

- `x` grows east.
- `z` grows south.
- Units are diorama grid units, not meters.
- Each chunk defines its own local coordinate system.
- Frontend places chunk-local geometry into the shared Three.js scene with each chunk's `localToScene` transform.
- Elevation in `world-view.v1` is not part of `LocalGeometry`; render modules should read terrain height or explicit `visualState.elevation` when vertical placement is required.

### GeoFeature

`GeoFeature` is a normalized static/reference geographic feature. It may come from vector tiles, PMTiles, OpenMapTiles, TDX static geometry, or mock fixtures. It is not operational truth by itself.

```ts
type GeoFeature = {
  id: string
  kind:
    | "rail"
    | "road"
    | "river"
    | "building"
    | "park"
    | "station"
    | "landmark"
    | "zone"
  source: string
  geometry: GeoJSONGeometry
  properties: Record<string, unknown>
}
```

Example MRT route reference:

```json
{
  "id": "geo-route-r",
  "kind": "rail",
  "source": "tdx-static-mrt",
  "geometry": {
    "type": "LineString",
    "coordinates": [
      [121.520, 25.087],
      [121.520, 25.062],
      [121.517, 25.046],
      [121.543, 25.033]
    ]
  },
  "properties": {
    "routeId": "R",
    "name": "Tamsui-Xinyi Line",
    "color": "#D94B55"
  }
}
```

Example vector tile-derived road:

```json
{
  "id": "geo-road-zhongxiao-east",
  "kind": "road",
  "source": "openmaptiles:z14/13625/6194",
  "geometry": {
    "type": "LineString",
    "coordinates": [
      [121.532, 25.041],
      [121.544, 25.041],
      [121.565, 25.041]
    ]
  },
  "properties": {
    "name": "Zhongxiao East Road",
    "class": "primary"
  }
}
```

### DioramaChunk

`DioramaChunk` is a product-owned world slice. It is not equivalent to one map tile.

```ts
type DioramaChunk = {
  id: string
  focusId: string
  lod: "city" | "district" | "station"
  bounds: GeoBounds
  sceneOrigin: LocalPoint
  cellSizeMeters?: number
  localToScene: {
    translate: LocalPoint
    scale: number
    rotationDegrees?: number
  }
  localBounds: {
    minX: number
    minZ: number
    maxX: number
    maxZ: number
  }
  terrain: TerrainCell[]
  staticFeatures: StaticFeatureProjection[]
  semanticZones: SemanticZone[]
  sourceRefs: SourceRef[]
}
```

Example:

```json
{
  "id": "chunk-taipei-core-a",
  "focusId": "taipei-core",
  "lod": "city",
  "bounds": {
    "west": 121.50,
    "south": 25.02,
    "east": 121.56,
    "north": 25.08
  },
  "sceneOrigin": [0, 0],
  "cellSizeMeters": 180,
  "localToScene": {
    "translate": [0, 0],
    "scale": 1,
    "rotationDegrees": 0
  },
  "localBounds": { "minX": 0, "minZ": 0, "maxX": 30, "maxZ": 30 },
  "terrain": [
    { "x": 0, "z": 0, "height": 1, "kind": "urban" },
    { "x": 1, "z": 0, "height": 2, "kind": "building" }
  ],
  "staticFeatures": [
    {
      "id": "static-route-r-a",
      "sourceFeatureId": "geo-route-r",
      "kind": "rail",
      "geometry": {
        "type": "LineString",
        "coordinates": [[4, 2], [6, 5], [8, 7]]
      },
      "style": { "color": "#D94B55", "width": 2 }
    }
  ],
  "semanticZones": [
    {
      "id": "zone-station-core",
      "kind": "station-district",
      "label": "Taipei Main Station area",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[10, 10], [16, 10], [16, 16], [10, 16], [10, 10]]]
      }
    }
  ],
  "sourceRefs": [
    { "source": "tdx-static-mrt", "ref": "route:R" },
    { "source": "openmaptiles", "ref": "z14/13625/6194" }
  ]
}
```

Multi-chunk scene assembly:

- Local geometry is expressed in each chunk's local coordinate system.
- `sceneOrigin` is the chunk's local `[0, 0]` position in shared Three.js scene coordinates.
- Frontend applies `localToScene` to place the chunk into the shared diorama scene.
- If both `sceneOrigin` and `localToScene.translate` are present, `localToScene` is authoritative; `sceneOrigin` is a convenience alias for the no-rotation, scale-1 case.
- Adjacent chunks must have compatible transforms so rails, roads, rivers, and cross-chunk projections continue visually across boundaries.

### TerrainCell

```ts
type TerrainCell = {
  x: number
  z: number
  height: number
  kind: "urban" | "building" | "road" | "rail" | "river" | "park" | "hill" | "empty"
  material?: "sakura-concrete" | "water" | "leaf" | "rail-bed" | "glass-debug"
}
```

### StaticFeatureProjection

Static features are chunk-local renderable references derived from `GeoFeature`.

```ts
type StaticFeatureProjection = {
  id: string
  sourceFeatureId: string
  ontologyObjectId?: string
  kind: GeoFeature["kind"]
  geometry: LocalGeometry
  style?: {
    color?: string
    width?: number
    height?: number
    opacity?: number
  }
}
```

Station identity rule:

- A `GeoFeature.kind = "station"` is a static/reference location.
- An `OntologyObject.type = "Station"` is canonical product identity.
- When a static station feature corresponds to a canonical station object, `StaticFeatureProjection.ontologyObjectId` must be set.
- Clickable station render modules should resolve to `ontologyObjectId` when present.

### SemanticZone

```ts
type SemanticZone = {
  id: string
  kind: "station-district" | "risk-zone" | "rain-band" | "operations-area"
  label: string
  geometry: LocalGeometry
}
```

### OntologyObject

`OntologyObject` owns identity, state, relationships, lifecycle, and operational truth. It may span many chunks.

```ts
type OntologyObject = {
  id: string
  type:
    | "Train"
    | "Station"
    | "Route"
    | "RainCell"
    | "PM25Sensor"
    | "Incident"
    | "Alert"
  source: string
  geometry?: GeoJSONGeometry
  state: Record<string, unknown>
  relationships: Relationship[]
  validTime?: {
    from: IsoDateTime
    to?: IsoDateTime
  }
  updatedAt: IsoDateTime
}
```

Example train:

```json
{
  "id": "train-R22",
  "type": "Train",
  "source": "tdx-liveboard",
  "geometry": {
    "type": "Point",
    "coordinates": [121.520, 25.052]
  },
  "state": {
    "routeId": "R",
    "direction": "southbound",
    "nextStopId": "R10",
    "etaMinutes": 2,
    "load": 0.67
  },
  "relationships": [
    { "type": "belongs_to", "targetId": "route-R" },
    { "type": "next_stop", "targetId": "station-R10" }
  ],
  "updatedAt": "2026-04-30T12:02:15Z"
}
```

Example cross-chunk rain event:

```json
{
  "id": "rain-cell-R042",
  "type": "RainCell",
  "source": "cwa-rainfall",
  "geometry": {
    "type": "Polygon",
    "coordinates": [[
      [121.500, 25.080],
      [121.560, 25.080],
      [121.570, 25.030],
      [121.510, 25.020],
      [121.500, 25.080]
    ]]
  },
  "state": {
    "intensityMmHr": 38,
    "trend": "rising",
    "severity": "warning",
    "confidence": 0.82
  },
  "relationships": [
    { "type": "affects", "targetId": "train-R22" },
    { "type": "near", "targetId": "station-R10" }
  ],
  "validTime": {
    "from": "2026-04-30T12:00:00Z"
  },
  "updatedAt": "2026-04-30T12:02:15Z"
}
```

### Relationship

```ts
type Relationship = {
  type:
    | "belongs_to"
    | "next_stop"
    | "near"
    | "affects"
    | "covers"
    | "observed_by"
    | "inside"
    | "correlates_with"
  targetId: string
  confidence?: number
  evidence?: string[]
}
```

### ChunkProjection

`ChunkProjection` is the bridge from canonical ontology object to chunk-local renderable object.

```ts
type ChunkProjection = {
  id: string
  objectId: string
  chunkId: string
  overlay: DomainOverlayKey
  renderModule:
    | "VoxelTrain"
    | "StationAnchor"
    | "RouteRail"
    | "RainVolume"
    | "PM25Haze"
    | "IncidentPulse"
    | "AlertField"
  geometry: LocalGeometry
  visualState: Record<string, unknown>
  zOrder?: number
}
```

Example train projection:

```json
{
  "id": "proj-train-R22-chunk-a",
  "objectId": "train-R22",
  "chunkId": "chunk-taipei-core-a",
  "overlay": "mrt",
  "renderModule": "VoxelTrain",
  "geometry": {
    "type": "Point",
    "coordinates": [12.4, 8.7]
  },
  "visualState": {
    "routeColor": "#D94B55",
    "directionDegrees": 128,
    "carCount": 4,
    "selected": false
  },
  "zOrder": 40
}
```

Example cross-chunk rain projections sharing one object:

```json
[
  {
    "id": "proj-rain-cell-R042-chunk-a",
    "objectId": "rain-cell-R042",
    "chunkId": "chunk-taipei-core-a",
    "overlay": "rain",
    "renderModule": "RainVolume",
    "geometry": {
      "type": "Polygon",
      "coordinates": [[[3, 4], [20, 4], [20, 18], [3, 18], [3, 4]]]
    },
    "visualState": {
      "severity": "warning",
      "opacity": 0.42,
      "pulse": true
    }
  },
  {
    "id": "proj-rain-cell-R042-chunk-b",
    "objectId": "rain-cell-R042",
    "chunkId": "chunk-taipei-core-b",
    "overlay": "rain",
    "renderModule": "RainVolume",
    "geometry": {
      "type": "Polygon",
      "coordinates": [[[0, 5], [9, 5], [9, 24], [0, 24], [0, 5]]]
    },
    "visualState": {
      "severity": "warning",
      "opacity": 0.28,
      "pulse": true
    }
  }
]
```

### RenderModuleDescriptor

The backend may include descriptors so the frontend can validate that all requested render modules are supported. It must not include raw rendering code.

```ts
type RenderModuleDescriptor = {
  key: ChunkProjection["renderModule"]
  objectTypes: OntologyObject["type"][]
  requiredVisualState?: string[]
}
```

Example:

```json
{
  "key": "VoxelTrain",
  "objectTypes": ["Train"],
  "requiredVisualState": ["routeColor", "directionDegrees", "carCount"]
}
```

### Freshness

```ts
type Freshness = {
  mode: "live" | "replay"
  generatedAt: IsoDateTime
  replayTime?: IsoDateTime
  maxSourceLagSeconds: number
  sources: SourceFreshness[]
}

type SourceFreshness = {
  source: string
  updatedAt: IsoDateTime
  lagSeconds: number
  status: "ok" | "stale" | "error"
}
```

### WorldViewCompleteness

The backend should prefer a partial but explicit payload over a blank world when non-critical sources are stale or unavailable.

```ts
type WorldViewCompleteness = {
  status: "complete" | "partial"
  missingOverlays: DomainOverlayKey[]
  warnings: {
    code: "SOURCE_STALE" | "SOURCE_UNAVAILABLE" | "PARTIAL_PROJECTIONS" | "LOD_DOWNGRADED"
    message: string
    source?: string
    overlay?: DomainOverlayKey
  }[]
}
```

Example:

```json
{
  "status": "partial",
  "missingOverlays": ["pm25"],
  "warnings": [
    {
      "code": "SOURCE_STALE",
      "message": "PM2.5 observations are older than the live freshness threshold.",
      "source": "epa-aqms",
      "overlay": "pm25"
    }
  ]
}
```

### SourceRef

```ts
type SourceRef = {
  source: string
  ref: string
}
```

### WorldViewDiagnostics

Diagnostics are debug-only and may be omitted in production responses. They are included only when `debugGeo=true` or a backend diagnostic mode is enabled.

```ts
type WorldViewDiagnostics = {
  geoFeatures?: GeoFeature[]
  sourceRefs?: SourceRef[]
  chunkIntersections?: {
    objectId: string
    chunkIds: string[]
    reason: "contains" | "intersects" | "nearby"
  }[]
  providerTimingsMs?: Record<string, number>
}
```

### Error Format

Use a structured error envelope for API failures.

```ts
type ApiError = {
  error: {
    code:
      | "WORLD_FOCUS_NOT_FOUND"
      | "UNSUPPORTED_LOD"
      | "WORLD_VIEW_UNAVAILABLE"
      | "SOURCE_STALE"
      | "INVALID_TIME"
    message: string
    details?: Record<string, unknown>
    retryAfterSeconds?: number
  }
}
```

Example:

```json
{
  "error": {
    "code": "WORLD_VIEW_UNAVAILABLE",
    "message": "World view could not be generated because required source data is unavailable.",
    "details": {
      "source": "tdx-liveboard",
      "focusId": "taipei-core"
    },
    "retryAfterSeconds": 15
  }
}
```

## Backend Service Boundaries

### GeoReferenceProvider

```ts
interface GeoReferenceProvider {
  getFeatures(bounds: GeoBounds, layers: string[]): Promise<GeoFeature[]>
  getTileRefs(bounds: GeoBounds, lod: string): Promise<SourceRef[]>
}
```

The Java implementation can expose this as interfaces/classes rather than TypeScript. The contract matters more than language syntax.

Initial providers:

- `MockGeoReferenceProvider`
- `TdxStaticMrtGeoProvider`
- later `OpenMapTilesProvider` or `PmTilesProvider`

### DioramaChunkService

Responsibilities:

- Resolve `WorldFocus`.
- Load normalized `GeoFeature`.
- Generate `DioramaChunk` terrain/static features/semantic zones.
- Cache static chunk payloads.

### OntologyObjectService

Responsibilities:

- Load live/replay domain objects.
- Normalize source-specific rows into `OntologyObject`.
- Preserve canonical identity and relationships.

### ChunkProjectionService

Responsibilities:

- Build or query spatial index.
- Find intersecting chunks for each object.
- Clip object geometry into chunk-local geometry.
- Assign render modules and visual state.

## Caching Model

Static chunk payload:

- Includes terrain, static features, semantic zones, and source refs.
- Cache key: `focusId + lod + chunkId + staticSourceVersion`.
- TTL: hours to days.

Dynamic projection payload:

- Includes live trains, rain cells, PM2.5, incidents, alerts.
- Cache key: `focusId + lod + timeBucket + overlaySet`.
- TTL: seconds for live mode.

Timeline snapshot:

- Uses replay timestamp or time bucket.
- Must return deterministic object/projection state for the same timestamp.

## Frontend Rules

- Frontend render modules consume `DioramaChunk`, `OntologyObject`, and `ChunkProjection`.
- Frontend must not consume raw TDX/CWA/EPA rows in the world renderer.
- Frontend may keep a local `WorldViewPayload` fixture only for dev fallback.
- Frontend selection always resolves projection click -> `objectId` -> `OntologyObject`.
- Turning off an overlay hides projections for that overlay but does not remove ontology objects from client state.

## First Vertical Slice

Use Java backend with mock/static data:

1. `GET /api/world/view?focusId=taipei-core&lod=city&time=live`
2. Return one or two chunks.
3. Return MRT route/station/train objects.
4. Return one rain cell crossing two chunks.
5. Return two `ChunkProjection` records for the same rain cell object.
6. Adapt frontend to render from the payload.

This validates the backend-compute/frontend-render boundary before investing in real vector tile parsing.
