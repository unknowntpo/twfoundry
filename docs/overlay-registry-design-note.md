# Overlay Registry Design Note

## Context

This note defines a frontend-facing overlay model for TWFoundry map products.

The goal is to separate:

- `datasource`: where data comes from
- `domain model`: normalized product data
- `overlay`: a map-facing product module
- `layer`: a renderer-specific drawing unit

This direction is informed by the architecture patterns visible in [mini-taiwan-pulse](https://github.com/ianlkl11234s/mini-taiwan-pulse), especially:

- declarative overlay registration
- timeline-aware data semantics
- map-first layer sidebar and mobile panel structure

## Terminology

### Datasource

An external or internal source of records.

Examples:

- `tdx.mrt.liveboard`
- `tdx.bike.station_availability`
- `tdx.metro.shape`

### Overlay

A product-facing map module.

An overlay may:

- depend on one or more datasources
- have one or more renderers
- expose visibility and controls
- participate in timeline playback

Examples:

- `MrtStationOverlay`
- `MrtRouteOverlay`
- `EstimatedTrainOverlay`
- `YouBikeOverlay`

### Layer

A renderer-facing drawing unit.

Examples:

- MapLibre marker collection
- MapLibre `line` layer
- MapLibre `circle` layer
- Three.js custom layer

## Core Principle

Use `overlay` as the product abstraction.

Use `layer` only inside renderer implementations.

```text
datasource(s)
  -> domain model
  -> overlay
  -> one or more renderer layers
```

## Overlay Registry

The registry should be a declarative list of overlays, not map logic spread across one large component.

Illustrative TypeScript contract:

```ts
export type OverlayId =
  | "mrt-routes"
  | "mrt-stations"
  | "mrt-estimated-trains"
  | "timeline"
  | "youbike";

export type OverlayCategory =
  | "moving"
  | "station"
  | "route"
  | "time"
  | "mobility";

export interface OverlayVisibility {
  defaultVisible: boolean;
  supportsToggle: boolean;
}

export interface OverlayDataDependency {
  sourceId: string;
  datasetId: string;
  required: boolean;
}

export interface OverlayControl {
  id: string;
  label: string;
  kind: "toggle" | "slider" | "select";
}

export interface OverlayDescriptor {
  id: OverlayId;
  title: string;
  category: OverlayCategory;
  description: string;
  zIndex: number;
  visibility: OverlayVisibility;
  dataDependencies: OverlayDataDependency[];
  controls: OverlayControl[];
  timelineAware: boolean;
}
```

Recommended registry shape:

```ts
export const overlayRegistry: OverlayDescriptor[] = [
  {
    id: "mrt-routes",
    title: "MRT Routes",
    category: "route",
    description: "Static MRT route geometry and line color presentation.",
    zIndex: 10,
    visibility: { defaultVisible: true, supportsToggle: true },
    dataDependencies: [
      { sourceId: "tdx", datasetId: "metro_shape", required: false },
    ],
    controls: [],
    timelineAware: false,
  },
  {
    id: "mrt-stations",
    title: "MRT Stations",
    category: "station",
    description: "Station markers, selection state, and station-level interaction.",
    zIndex: 20,
    visibility: { defaultVisible: true, supportsToggle: true },
    dataDependencies: [
      { sourceId: "tdx", datasetId: "metro_station", required: false },
    ],
    controls: [],
    timelineAware: false,
  },
  {
    id: "mrt-estimated-trains",
    title: "Estimated MRT Trains",
    category: "moving",
    description: "Train circles derived from station LiveBoard and route geometry.",
    zIndex: 30,
    visibility: { defaultVisible: true, supportsToggle: true },
    dataDependencies: [
      { sourceId: "tdx", datasetId: "mrt_liveboard", required: true },
    ],
    controls: [
      { id: "show-trains", label: "Train", kind: "toggle" },
    ],
    timelineAware: true,
  },
  {
    id: "timeline",
    title: "Timeline",
    category: "time",
    description: "Playback cursor, play/pause state, and historical replay surface.",
    zIndex: 100,
    visibility: { defaultVisible: true, supportsToggle: false },
    dataDependencies: [],
    controls: [
      { id: "playback-mode", label: "Playback", kind: "select" },
    ],
    timelineAware: true,
  },
];
```

## Renderer Boundary

The registry must not know MapLibre implementation details.

Renderer-specific logic should be behind a renderer contract.

```ts
export interface OverlayRenderContext {
  mapProvider: "maplibre" | "mock";
  selectedStationId?: string;
  visibleLineIds: string[];
  timelineTime?: string;
}

export interface OverlayRenderer {
  mount(context: OverlayRenderContext): void | Promise<void>;
  update(context: OverlayRenderContext): void | Promise<void>;
  unmount(): void | Promise<void>;
}
```

If needed later, one overlay can own multiple renderer implementations:

```ts
export interface OverlayRendererFactory {
  maplibre?: () => OverlayRenderer;
  mock?: () => OverlayRenderer;
}
```

## Recommended MRT Overlay Set

Phase 1 MRT should be split into four overlays.

### `MrtRouteOverlay`

Responsibility:

- render route geometry
- expose route visibility
- own line color semantics

Datasource inputs:

- static fixtures now
- later `tdx.metro.shape`

### `MrtStationOverlay`

Responsibility:

- render station markers
- station selection
- selected-state highlight

Datasource inputs:

- static fixtures now
- later `tdx.metro.station`

### `EstimatedTrainOverlay`

Responsibility:

- render train circles
- consume liveboard-derived train estimates
- later interpolate movement on route geometry

Datasource inputs:

- `tdx.mrt.liveboard`
- route geometry

Important:

- this is `estimated`, not official TRTC real-time position

### `TimelineOverlay`

Responsibility:

- playback cursor
- play/pause
- timeline drag
- time window display

Datasource inputs:

- none directly
- consumes timeline-aware overlay state

## Datasource vs Overlay

Do not make datasource and overlay one-to-one by default.

Correct relationship:

```text
multiple datasources
  -> one domain model
  -> one overlay
```

For MRT:

```text
tdx.mrt.liveboard
+ tdx.metro.station
+ tdx.metro.shape
  -> MRT domain model
  -> MRT overlays
```

For YouBike:

```text
tdx.bike.station
+ tdx.bike.availability
  -> YouBike domain model
  -> YouBike overlay
```

## Sidebar / Mobile Panel Mapping

The layer sidebar should operate at `overlay` level, not renderer layer level.

Recommended UI mapping:

- sidebar toggle unit = overlay
- mobile panel unit = overlay
- parameter group owner = overlay

Examples:

- `EstimatedTrainOverlay`
  - show train circles
  - train size
  - future trail mode

- `MrtRouteOverlay`
  - route on/off
  - 2D / 3D track mode

This keeps the UI stable even if the renderer changes later.

## What TWFoundry Has Today

Current state:

- `MrtDashboard.vue` already has a good layer sidebar and mobile panel shell
- `MrtMap.vue` still mixes multiple overlays inline
- train circles exist, but as direct component logic
- overlay registry is not yet extracted

So the next refactor target is:

1. extract `overlayRegistry`
2. split `MrtMap.vue` into overlay renderers
3. move sidebar toggles to registry-driven state
4. let timeline own playback state instead of ad hoc component state

## Recommendation

Do this incrementally.

Phase 1 refactor order:

1. extract `MrtRouteOverlay`
2. extract `MrtStationOverlay`
3. extract `EstimatedTrainOverlay`
4. add `TimelineOverlay` state model
5. keep MapLibre renderer behind overlay renderers

Do not switch map engine yet just to get the overlay architecture right.
