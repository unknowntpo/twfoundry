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
