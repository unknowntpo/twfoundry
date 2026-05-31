# Claude Design Contract: Ingestion-First Overlay Explorer

Status: Draft for rapid Claude design work.

This contract supersedes citizen-simulation exploration. TWFoundry should first ingest real public-data sources, project them into map overlays, inspect the resulting visual patterns, and only then decide what higher-level ontology insights are justified.

## Product Direction

TWFoundry is a map-first public-data operations dashboard. The first useful design should feel closer to a Kepler.gl-style geospatial data workbench than a simulated city game.

The desired visual language is quiet, dark, and analytical: black/deep-blue map background, subdued panels, cyan/blue active states, and soft blue point or grid glow for observed data. Red is reserved for incidents, alerts, blocked service, or other emergency semantics.

The interface should help users answer:

- What data layers are available?
- Which layers are live, stale, fixture, or planned?
- What spatial patterns appear when the data is overlaid?
- Which objects or areas deserve deeper ontology inspection?
- What insight is supported by actual data, and what is still inference?

## Non-Goals

- Do not simulate citizens, crowd demand, or behavior as product truth.
- Do not create fake flow unless it is clearly labeled fixture/prototype.
- Do not make voxel terrain or city diorama the primary surface.
- Do not make renderer implementation details the product contract.
- Do not hide missing ingestion behind decorative visuals.

## Required Data Flow

All design and implementation must preserve this boundary:

```text
source adapter
  -> normalized observation
  -> ontology object or overlay projection
  -> map overlay feature / object detail payload
  -> renderer
```

Renderer choices such as Kepler.gl, deck.gl, MapLibre, or custom canvas must consume projection-shaped data. They must not invent domain facts.

## Initial Source Scope

First PoC source is locked to TDX MRT LiveBoard.

Prioritize sources that can produce useful overlays quickly:

- TDX MRT LiveBoard: station arrivals, route context, freshness. This is the first real ingestion target.
- TDX static MRT station/route geometry or existing fixture equivalent.
- YouBike availability: planned second source for spatial comparison.
- Weather/rainfall or PM2.5: planned environmental context.
- OSM/map features: context only, not ontology truth unless normalized into static features.

## Initial Overlay Scope

Design the overlay registry around product domains:

- `mrt-liveboard`: first PoC overlay; arrival/freshness observations by station.
- `mrt-routes`: route geometry and selected route context.
- `station-load-proxy`: derived from real rows only; label as proxy, not measured crowd.
- `youbike-availability`: planned.
- `rainfall-cells`: planned.
- `pm25-sensors`: planned.
- `incidents`: planned/manual fixture until source exists.

Every overlay must show:

- source
- freshness
- mode: `live`, `fixture`, `mock`, `derived`, `planned`, or `missing`
- completeness
- whether it supports timeline/replay

## Kepler-Style UX Contract

Claude design should use Kepler.gl as the visual reference for geospatial exploration:

- dark basemap with visible but low-contrast roads, rail lines, water, and administrative boundaries
- black/deep-blue application chrome, with calm cyan/blue accents
- soft blue points, hex bins, arcs, or grids for normal observations
- red only for emergency, incident, severe anomaly, or explicitly critical state
- layer list with clear source/mode/freshness badges
- map-first viewport with overlays as the main reading surface
- inspectable feature details on click/hover
- filter controls that expose data columns or projection properties
- time/timeline control only where data supports it
- legend and color scale for each active layer
- graceful empty/missing states

Kepler.gl is a design reference, not the default implementation dependency. It is not the ontology runtime and must not become the source of product truth.

## Kepler-Inspired Theme Boundary

Kepler.gl should be studied for its architecture, visual language, and geospatial exploration patterns. Do not introduce the Kepler.gl package into the Vue app by default.

Implementation boundary:

- Kepler.gl is React-based, while the current app direction is Vue. Avoid adding React runtime or Kepler internal state unless a later contract explicitly approves that integration cost.
- Copy the useful ideas: dark geospatial theme, layer panel structure, dataset/layer separation, filters, legends, timeline affordance, and map-first analytical layout.
- Implement the renderer with Vue-compatible surfaces such as MapLibre and deck.gl.
- The ingestion layer should export normalized observations and overlay features independent of Kepler config.
- Production decisions should remain renderer-agnostic: the same overlay projection should be renderable by deck.gl, MapLibre, Kepler-like UI, or a future renderer.

## Ontology Contract

Ontology should be introduced only where identity is stable:

- `Station`
- `Route`
- `TrainService` or `LiveBoardEntry`
- `BikeStation`
- `Sensor`
- `Incident`
- `AreaOfInterest`

Avoid creating ontology objects for simulated people. A future `CrowdPressure` or `DemandSignal` object is allowed only after the source/projection contract defines how it is derived and how confidence is represented.

## Insight Contract

An insight must state its evidence level:

- `observed`: directly present in normalized source observations
- `derived`: computed from observations by documented projection logic
- `hypothesis`: human/design interpretation, not system fact
- `missing`: expected but unavailable

Do not present hypotheses as live operational truth.

## Design Deliverables For Claude

Claude should produce:

- a map-first screen layout
- a layer/overlay panel
- a selected-feature inspector
- freshness/completeness states
- visual treatment for live/fixture/planned/missing data
- Kepler-style filter/legend/timeline controls
- a clear note showing where source data ends and interpretation begins
- a dark blue/black visual system inspired by Kepler.gl, not a marketing landing page
- calm blue normal-data rendering, with red reserved for incidents or critical states

Claude should not produce:

- fake citizen simulation as core UX
- decorative flow that cannot be traced to a source or marked fixture
- voxel world as the main map

## Contract Extension Rule

If the design needs a concept not covered by `SPEC.md`, propose a minimal contract extension before designing around it. The proposal must name:

- new source, observation, ontology object, overlay, projection, or renderer capability
- required fields
- freshness/completeness behavior
- whether it is live, fixture, derived, planned, or experimental
