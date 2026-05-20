# 2026-05 Map-First Pivot

## Status

Accepted.

This decision supersedes the earlier voxel-first diorama direction as TWFoundry's primary product
surface. The old direction remains useful as historical design context and as input for selected
ontology object detail renderers.

## Previous Direction

TWFoundry previously explored a voxel-first operations cockpit:

- Three.js voxel district as the primary stage.
- `WorldViewPayload.chunks` / `DioramaChunk` as the visible world substrate.
- `ChunkProjection` as the bridge from ontology objects into chunk-local render modules.
- MapLibre as an in-scene map reference or alignment aid.
- Map alignment diagnostics used to verify source geometry against rendered voxel objects.

This direction produced useful work:

- backend-computed payload experiments
- source-derived static feature fixtures
- local Web Mercator projection tests
- reusable voxel station / landmark / sensor modules
- object identity tests across static features and projections

## Pivot

TWFoundry's primary surface is now a map-first ontology operations dashboard.

The user should first experience:

- an interactive MapLibre map
- product overlays for mobility, station, route, environment, incident, and analytics domains
- selectable ontology objects
- a right-side object inspector
- optional selected-object voxel detail

Voxel art is no longer the map substrate. It is a detail renderer for a selected ontology object.

## Why We Pivoted

The voxel-first direction made the product feel like a custom diorama renderer instead of an
operational map. It also let implementation concepts leak into product language:

- `DioramaChunk`
- `ChunkProjection`
- voxel terrain
- map alignment
- synthetic city fabric

Those concepts are useful implementation history, but they should not decide new product behavior.
The stable product contract is now `SPEC.md`.

## What Still Carries Forward

The following ideas remain valid:

- source-specific facts must enter through adapters, normalized payloads, or marked fixtures
- ontology object identity must be stable across overlays and renderers
- reusable voxel modules are useful for object detail
- source-derived geometry and source refs are important for trust
- freshness, completeness, and diagnostics remain important observability contracts

## What Must Not Govern New Decisions

The following old decisions are legacy-only:

- voxel terrain as the primary dashboard model
- map alignment as user-facing product UI
- chunk-first product language
- MapLibre as an in-scene texture plane for the main user surface
- random or filler city geometry as product truth
- treating `DioramaChunk` as the product-owned map unit

## Contract Rule

When old design documents, archived OpenSpec changes, screenshots, or implementation terms conflict
with `SPEC.md`, the map-first ontology contract in `SPEC.md` wins.

Future implementation may keep legacy names temporarily for compatibility, but new product decisions
must use map-first language:

- `OverlayDefinition`
- `OverlayFeature`
- `OntologyObject`
- `ObjectDetailPayload`
- `Freshness`
- `Completeness`
- `Diagnostics`

## Follow-Up

- Rewrite old design content into a Voxel Detail Renderer guide when object-detail work resumes.
- Rename backend payload contracts incrementally only after the map-first contract is stable.
- Keep diagnostics available for operators and tests, but out of primary product UI.
