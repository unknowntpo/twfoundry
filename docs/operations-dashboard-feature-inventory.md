# Operations Dashboard Feature Inventory

Status: working inventory for migrating the current demo into a real service.

This document records behavior that currently exists in the frontend demo, plus
experimental ideas that should be evaluated before becoming product contract.
The goal is to prevent useful workflow decisions from being lost when the demo
is rewritten around real backend services.

## Product Principle

The dashboard is map-first:

- The map answers: where is this happening?
- The vehicle layer answers: what observations are active?
- The timeline answers: when are we looking?
- The inspector answers: what is this selected object?
- Derived signals must name their source and confidence.

For route operations, the dashboard should diagnose route-level service design
and control problems before individual vehicle delay. The first useful question
is not "which bus is late?", but "is this route delivering stable service at
this time?".

## Current Implemented Features

### TDX Bus Archive Timeline

Status: implemented in demo.

Current behavior:

- Reads local TDX bus archive manifest.
- Plays one service day in 5 minute slots.
- Supports playback speed: `1x`, `1.5x`, `2x`, `4x`.
- Hovering the timeline shows the selected date/time.
- Live update reloads the latest archive state.

Migration note:

- Backend should expose a service-day timeline manifest.
- Frontend should not know filesystem paths.
- Slot interval must be a manifest field, not a hard-coded assumption.

### Vehicle Position Layer

Status: implemented in demo.

Current behavior:

- Renders bus GPS positions as cyan map points.
- Clicking a point opens the inspector.
- Clicking empty map space clears the inspector.
- Hover hit area is larger than the visual point.
- Selected vehicle is highlighted in yellow.

Migration note:

- Normalized `VehicleObservation` should remain renderer-agnostic.
- Deck.gl / MapLibre are renderers, not data contracts.

### Progressive Location Context

Status: implemented in demo.

Current behavior:

- Dark basemap emphasizes roads, buildings, districts, and selected POI labels.
- Labels appear progressively by zoom level.
- POI uses a different visual grammar from vehicle points.

Migration note:

- Location context is platform-level, not bus-specific.
- Future Ubike, MRT, air quality, weather, or incident layers should share this map context.

### Route Filter

Status: implemented in demo.

Current behavior:

- Filters current vehicle observations by route name.
- Keeps the timeline and inspector in the same route context.

Migration note:

- Formal service should prefer stable route IDs / route UIDs.
- Route name can remain display text, but should not be the only key.

### Route Stop Location Overlay

Status: implemented in demo.

Current behavior:

- When a route is selected, the dashboard renders formal `StopOfRoute` stop locations from route context.
- These are route context points, not historical vehicle positions.
- Hovering a route stop shows the stop name, route, sequence, direction, and stop ID.
- The former yellow whole-day distribution overlay was removed from the primary UI because it competed with the current cyan vehicle sample.
- Stop display is not gated by route geometry audit. Audit gates derived signals such as route progress and delay, not basic location context.

Migration note:

- Backend should expose route geometry and stop locations as a stable route-context payload.
- Historical distribution can still be useful for analysis, but it should not be the default location-context layer.

### Route Geometry Quality Gate

Status: implemented as local audit and frontend gate.

Current behavior:

- `bun run audit:tdx-bus-route-quality` audits route shape vs stop-of-route geometry.
- Output manifest classifies route directions as `good`, `usable`, or `bad`.
- Route-aware overlays and progress use only signal-ready geometry.

Migration note:

- This should become a pipeline step after route context ingestion.
- `bad` geometry should be visible in diagnostics but excluded from delay inference.

### Selected Vehicle Route Progress

Status: implemented in demo inspector.

Current behavior:

- When a vehicle is selected, the frontend loads its route context.
- The GPS point is projected onto route shape.
- Inspector shows:
  - progress percentage
  - nearest stop
  - next stop
  - off-route distance
  - geometry quality

Migration note:

- Production should compute route progress in backend or a shared worker, not ad hoc in Vue component code.
- UI should consume a derived `RouteProgressObservation`.

### Ghost Trace

Status: experimental.

Current behavior:

- Inspector can toggle ghost trace.
- Current implementation reads same-route points from selected slot and adjacent slots.
- This is a visual exploration, not a delay signal.

Migration note:

- Ghost should eventually compare against multi-day baseline.
- Single-day ghost is not reliable if the whole day is abnormal.

## Route-Level Service Design Metrics

Status: product direction for the bus route dashboard.

These metrics are route-level signals. They are meant to help a manager find
dispatch, service-frequency, and headway-design problems. They should not be
presented as single-vehicle fault, driver fault, or passenger-facing arrival
delay.

### Vehicle Spacing / Headway Distribution

Product label: `車班間距分布`.

Meaning:

- Measure the time or route-progress distance between consecutive vehicles on
  the same route and same direction.
- Show whether spacing stays close to the planned or expected service interval.
- Help the user see whether service is stable across a selected time window.

Useful views:

- timeline histogram of observed headways
- route strip showing vehicle spacing along the route
- comparison against scheduled or target headway when available

### Service Gap

Product label: `大空窗`.

Meaning:

- A route segment or time window has no vehicle for much longer than the
  expected service interval.
- The signal belongs to the route and time window, not to one vehicle.
- It indicates that passengers may experience long waits and that dispatch or
  service frequency may need review.

Initial conservative rule:

- Flag only when observed headway is clearly larger than the baseline, such as
  `>= 2x` target headway, or when no baseline exists, larger than a documented
  product threshold.
- Mark the baseline source: schedule, headway table, historical baseline, or
  review threshold.

### Vehicle Bunching

Product label: `車輛群聚`.

Meaning:

- Two or more vehicles on the same route and direction are too close together.
- This often appears after a service gap: one long empty interval, followed by
  several vehicles arriving close together.
- The issue is unstable service spacing, not necessarily that one specific bus
  is delayed.

Initial conservative rule:

- Detect only among vehicles with reliable route progress.
- Flag when consecutive vehicles are much closer than the expected interval,
  such as `<= 0.5x` target headway, or within a documented small time/progress
  threshold when no baseline exists.
- Prefer showing it as `車輛群聚` in product UI. Keep `bunching` as an internal
  analytics term only.

### Out of Scope for This Dashboard Step

Do not claim:

- individual vehicle delay
- driver fault
- exact passenger waiting time
- schedule violation without timetable or ETA evidence
- root cause of the spacing problem

The dashboard can still show vehicle positions and selected-vehicle facts as
evidence, but the primary signal should stay route-level.

## Bus Route Service Control Page

Status: implemented in `frontend/src/BusOversightDashboard.vue` as the primary
dashboard route for `/` and `/bus-oversight`.

This page is the formal version of `frontend/public/oversight-demo.html`. It
keeps the demo's information architecture and interaction model, but replaces
mock values with the current analytics exports:

- `bunching.json` becomes route-level large service-gap or vehicle-bunching
  events through the shared signal taxonomy.
- `route-density.json` becomes low-capacity observations when vehicle count,
  speed, and stopped reports jointly indicate route pressure.
- `data-freshness.json` becomes latest-slot route quality observations when a
  route has enough location observations needing review.
- `route-context/<route>.json` provides stop locations for the route schematic.

### Reliability Index

The current score is intentionally simple and documented so it can be replaced
later by a historical baseline model:

```text
score = clamp(60, 100,
  100
  - service_gap_events * 0.7
  - bunching_events * 0.5
  - low_capacity_events * 0.5
)
```

The weights live in `RELIABILITY_WEIGHTS` inside
`frontend/src/busOversightData.js`. They are not a public product promise; they
are the first review formula for ranking route-service health.

### Timeline Data Policy

The UI always renders a seven-day, hourly timeline. Current local analytics only
contains one service day, so missing days and hours stay neutral instead of
being filled with mock severity. Once archive snapshots or daily hourly
aggregates exist, the same model can accept additional dates without changing
the page interaction.

### Route Schematic Decision

The first production implementation uses strategy A: true stop longitude and
latitude projected into the SVG canvas. It keeps each route's distinct shape and
only simplifies labels by showing terminals, affected stops, and a regular
sample of intermediate stops. A future straightened schematic can be introduced
behind the same `buildRouteSchematic` output if dense downtown routes require
more label control.

### Product-Copy Boundary

The page must remain user-facing:

- No raw provider field names, endpoint names, debug terms, or implementation
  notes in the primary UI.
- Chinese UI uses `預估到站` instead of `ETA` when arrival estimates are shown.
- Severity labels are fixed as `嚴重`, `注意`, `觀察`, `正常`.
- Problem labels are fixed as `大空窗`, `車輛群聚`, `運能不足`.
- Route-service observations must not imply single-vehicle fault, driver fault,
  or confirmed delay.

## Experimental Feature Backlog

### Route Progress Encoding On Map

Status: implemented as an experimental toggle, not product contract.

Purpose:

Help users see whether same-route vehicles are near the start, middle, or end of
the route without opening every inspector.

Current experimental behavior:

- Only available after a route is selected.
- Start of route: cooler / smaller point.
- Middle of route: normal cyan vehicle point.
- End of route: brighter point with a cyan halo.
- Uses current sample vehicles only, not the full-day route distribution points.

Why it is experimental:

- It may compete with selection color, POI symbols, and route distribution.
- It may imply service quality or delay even when we only know route progress.
- It may be useful for route overview, but noisy during full-day playback.

Decision rule:

Keep only if it helps users answer "where are vehicles along this selected
route?" faster than the current route distribution + inspector.

Do not use this encoding as a delay signal.

### Delay Signal Detection

Status: planned, not implemented.

Required before claiming delay:

- route progress per observation
- multi-day baseline or schedule / ETA source
- route geometry quality gate
- explicit confidence and evidence fields

Initial labels should stay conservative:

- `possible_delay`
- `headway_gap`
- `bunching_risk`
- `stopped_too_long`
- `data_missing`

## Migration Checklist

Before replacing demo data with formal backend services:

1. Keep map / overlay / timeline / inspector workflow intact.
2. Preserve renderer-agnostic observation contracts.
3. Move archive manifest loading behind backend API.
4. Move route context and route quality audit into ingestion pipeline.
5. Move route progress computation out of Vue component code.
6. Mark experimental layers separately from product-contract layers.
7. Record every derived field with source and confidence.
