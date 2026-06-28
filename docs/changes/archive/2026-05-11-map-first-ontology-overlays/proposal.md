# Change: Move To Map-First Ontology Overlays

## Context

The current `payload-driven-diorama-chunks` direction made the Three.js voxel district the primary surface and used MapLibre as an in-scene reference plane. That proved the payload and ontology identity path, but it makes the main product feel like a custom diorama renderer instead of an operational map.

The next product direction is map-first: the main screen should behave like a Google Maps-style intelligence map with TWFoundry's design system, while voxel art becomes an ontology detail renderer for selected objects.

This direction is informed by Mini Taiwan Pulse's map product structure: declarative overlay categories, live moving objects, trails, infrastructure layers, analytics overlays, and timeline-aware controls.

## Goals

- Make MapLibre the primary interactive stage.
- Present MRT, YouBike, bus, weather, air, and incident information as map overlays.
- Keep ontology objects as the interaction target behind map markers, lines, and areas.
- Move voxel art out of the map base and into selected-object drill-down views.
- Preserve the existing TWFoundry visual language without cloning Mini Taiwan Pulse.
- Keep fallback/mock data clearly isolated from source adapters.

## Non-Goals

- Do not delete existing voxel render modules in this change.
- Do not migrate every source to live data before the map-first shell is stable.
- Do not add a new data platform dependency.
- Do not copy Mini Taiwan Pulse styling directly.

## Impact

- Supersedes the product premise of `payload-driven-diorama-chunks`.
- Keeps `WorldViewPayload.objects` and `projections` useful, but demotes `chunks` from the primary UI concept.
- Reuses MapLibre overlay work and object inspector work.
