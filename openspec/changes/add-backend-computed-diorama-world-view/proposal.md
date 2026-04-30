# Change: Add Backend-Computed Diorama World View

## Summary

Introduce a backend-computed `WorldViewPayload` contract for TWFoundry's diorama-first operations cockpit.

The backend will own geospatial normalization, chunk computation, ontology object assembly, and chunk-local projections. The frontend will own Three.js rendering, camera interaction, object selection UI, and animation.

## Why

The current frontend prototype proves the Sakura voxel visual direction, but it still performs too much world construction locally. As soon as TWFoundry expands beyond a small Taipei mock, frontend-side tile parsing, spatial joins, geometry clipping, cross-chunk event splitting, and timeline replay will become expensive and inconsistent.

Moving world computation behind a backend API gives us:

- Stable product-owned contracts independent of map tile providers.
- A single place to perform spatial indexing and cross-chunk event projection.
- Cacheable static chunks and low-latency dynamic projections.
- A clear separation between operational truth and visual rendering.
- A path to Java/JTS implementation first, with optional Go/Rust workers later only if profiling proves a need.

## Scope

- Define `WorldViewPayload` as the frontend-facing API contract.
- Define `WorldFocus`, `DioramaChunk`, `GeoFeature`, `OntologyObject`, `ChunkProjection`, `Relationship`, `Freshness`, and error formats.
- Define API endpoints for current view, object lookup, and optional debug geo references.
- Define cache and timeline semantics for static chunk data and dynamic operational projections.
- Require a first Java backend vertical slice that may use mock/static data.
- Require the frontend to render from `WorldViewPayload` and keep local mock fallback only as a development fallback.

## Non-Goals

- Do not implement full vector tile decoding in the first slice.
- Do not require MapLibre to be visible in the production cockpit.
- Do not make frontend render modules consume raw TDX/CWA/EPA rows.
- Do not make chunk boundaries become ontology identity boundaries.
- Do not introduce Go or Rust services before Java implementation is measured.

## Backend Language Direction

Use Java first because TWFoundry already has a JVM backend direction, Kafka/Spring integration, and can use JTS for geometry operations. Go or Rust can be introduced later as specialized workers for vector tile decoding or high-volume geometry pipelines only after profiling shows Java is insufficient.

## Rollout

1. Add the API contract and mock Java endpoint.
2. Add backend tests for cross-chunk event identity and projection generation.
3. Adapt frontend to request `WorldViewPayload` and render from payload data.
4. Keep frontend mock payload fallback for local/demo resilience.
5. Add timeline parameter support after the live view contract is stable.
6. Add real vector tile / PMTiles provider behind the same `GeoReferenceProvider` abstraction.
