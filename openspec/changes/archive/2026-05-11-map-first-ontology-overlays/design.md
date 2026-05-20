# Design

## Product Model

TWFoundry becomes a map-first ontology operations dashboard.

```text
source adapters
  -> normalized observations
  -> ontology objects
  -> overlay registry
  -> MapLibre renderers
  -> selected-object voxel detail
```

The map is the primary spatial context. Voxel art is a detail renderer that helps explain an ontology object after selection, such as a station body, sensor module, or weather cell.

## Overlay Registry Direction

Use product-facing overlays instead of renderer-facing layers as the main abstraction.

Initial categories:

- `moving`: estimated trains and future vehicle tracks
- `station`: MRT, bus, YouBike, and sensor stations
- `route`: MRT routes, roads, and bike paths
- `environment`: rainfall, PM2.5, weather stations
- `incident`: operational alerts and disruptions
- `analytics`: H3/grid or choropleth-style computed layers

Each overlay should declare:

- id
- title
- category
- default visibility
- data dependencies
- timeline awareness
- optional controls
- renderer module

## Frontend Shell

The default route renders:

- a full-screen interactive MapLibre map
- a left overlay sidebar
- a right ontology object inspector
- a bottom timeline control
- optional debug/alignment panels

The hidden MapLibre texture/catalog path may remain temporarily while map-derived payload experiments are removed or replaced.

## Voxel Detail

Voxel modules remain reusable renderers keyed by object type, kind, or `renderModule`, not by place name.

Examples:

- Station object -> station voxel detail
- PM2.5 sensor -> sensor voxel detail
- Rain cell -> weather volume detail

The main map must not depend on voxel chunks, terrain cells, or a diorama base.

## Design System

The visual style should retain TWFoundry's soft, high-legibility panel system and Sakura/Kohbai accents. The map itself should feel like an intelligence map, not a miniature world.
