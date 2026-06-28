# Design

## Specification Shape

The root `SPEC.md` follows the same architectural pattern as Symphony's language-agnostic
specification:

- normative language
- problem statement
- goals and non-goals
- component overview
- abstraction levels
- core domain model
- configuration rules
- observability and diagnostics
- legacy compatibility
- conformance checklist

The goal is not to describe every current file. The goal is to stabilize the product/system
boundary so future implementation changes have one contract to target.

## Layer Model

TWFoundry should use this layer split:

```text
Product Policy
  -> Configuration
  -> Source Integration
  -> Ontology
  -> Projection
  -> Rendering
  -> Observability
```

This maps the current codebase as follows:

- `Source Integration`: backend TDX/static/OSM/CWA/EPA adapters and fixtures.
- `Ontology`: backend payload objects and frontend normalized UI objects.
- `Projection`: overlay features, map-derived payloads, selected-object detail payloads.
- `Rendering`: MapLibre components and voxel detail modules.
- `Observability`: freshness, completeness, fallback, and diagnostics.

## Legacy Terms

Current code still contains `WorldViewPayload`, `DioramaChunk`, and `ChunkProjection`. This change
does not remove them because they remain tied to backend tests and frontend payload validation.

Instead, the new spec marks them as migration-era compatibility terms:

- allowed internally
- not allowed as the main product UI model
- future replacements should use map-first names

## Future Migration

Recommended follow-up changes:

1. Rewrite `Design.md` so the old voxel world content moves into a Voxel Detail appendix.
2. Introduce explicit `MapViewPayload`, `OverlayProjection`, and `ObjectDetailPayload` names.
3. Move diagnostics such as map alignment into an operator/debug surface.
4. Convert source fixtures into adapter-owned fallback payloads.
