# TWFoundry Service Specification

Status: Draft v1 (language-agnostic)

Purpose: Define TWFoundry as a map-first ontology operations dashboard for Taiwan public-data
systems.

## Normative Language

The key words `MUST`, `MUST NOT`, `REQUIRED`, `SHOULD`, `SHOULD NOT`, `RECOMMENDED`, `MAY`, and
`OPTIONAL` in this document are to be interpreted as described in RFC 2119.

`Implementation-defined` means the behavior is part of the implementation contract, but this
specification does not prescribe one universal policy. Implementations MUST document the selected
behavior.

## 1. Problem Statement

TWFoundry integrates public mobility, weather, air-quality, map, and operational-event data into a
single product surface where users can inspect stable ontology objects on an interactive map.

The system solves four product and engineering problems:

- It turns source-specific public data feeds into normalized observations and ontology objects.
- It keeps the map as the primary spatial interface rather than a custom voxel world.
- It lets users enable, disable, and inspect operational information through product overlays.
- It preserves voxel art as a selected-object detail renderer without making voxel terrain the main
  geospatial contract.

Important boundary:

- TWFoundry is a map-first ontology dashboard.
- Map overlays are product projections of observations and ontology state.
- Voxel renderers are detail modules for selected objects.
- Source adapters, ontology contracts, projections, renderers, and diagnostics MUST remain separate
  concerns.

## 2. Goals and Non-Goals

### 2.1 Goals

- Use an interactive map as the default dashboard surface.
- Normalize public-data source payloads before they reach product UI.
- Preserve stable ontology object identity across sources, overlays, and renderers.
- Render domain information through overlay contracts rather than source-specific UI branches.
- Support selected-object detail views, including voxel art modules, without coupling the main map
  to voxel chunks or terrain.
- Expose freshness, completeness, fallback, and diagnostic state in a controlled observability
  surface.
- Keep provider choices, fallback policy, and visual styles documented as implementation-defined
  decisions.

### 2.2 Non-Goals

- Do not define a general-purpose GIS platform.
- Do not make voxel terrain, diorama chunks, or miniature city rendering the main dashboard
  contract.
- Do not require one specific basemap provider, storage engine, streaming engine, or frontend
  framework in this language-agnostic specification.
- Do not let source-specific facts bypass adapters and directly control renderer logic.
- Do not expose internal geometry-alignment diagnostics as primary product UI.

## 3. System Overview

### 3.1 Main Components

1. `Source Adapter`
   - Reads one external source family, such as TDX, CWA, EPA, OSM, or operational incidents.
   - Converts source payloads into normalized observations or static map features.
   - Owns source-specific parsing, rate limits, credentials, pagination, and fallback fixtures.

2. `Observation Normalizer`
   - Converts adapter outputs into stable observation records.
   - Preserves source, timestamp, geometry, value, confidence, and freshness metadata.

3. `Ontology Runtime`
   - Builds and updates stable ontology objects.
   - Owns object IDs, types, properties, relationships, live state, and history references.

4. `Projection Builder`
   - Converts observations and ontology state into product-facing projections.
   - Produces map overlay features and selected-object detail payloads.
   - Does not render pixels or canvas elements.

5. `Overlay Registry`
   - Defines product overlays, categories, visibility defaults, data dependencies, timeline
     awareness, renderer metadata, and planned/live status.

6. `Map Renderer`
   - Renders map base and overlay projections using the active map implementation.
   - Consumes generic overlay contracts rather than source-specific payloads.

7. `Object Detail Renderer`
   - Renders selected ontology object details.
   - MAY use voxel art, charts, tables, timelines, or structured text.
   - MUST select renderers by object type, kind, capability, or render module, not by place name.

8. `Observability Surface`
   - Presents freshness, completeness, source lag, fallback mode, missing overlays, and diagnostics.
   - Keeps operator/debug diagnostics separate from the primary user map.

### 3.2 Abstraction Levels

TWFoundry is easiest to evolve when kept in these layers:

1. `Product Policy Layer`
   - Map-first ontology direction.
   - Voxel detail positioning.
   - User-facing overlay and object interaction rules.

2. `Configuration Layer`
   - Source registry.
   - Overlay registry.
   - Map style tokens.
   - Fallback and mock-data policy.

3. `Source Integration Layer`
   - TDX, CWA, EPA, OSM, incident, and future adapters.
   - Credentials, rate limits, source schemas, and ingestion mechanics.

4. `Ontology Layer`
   - Stable object identity.
   - Type system, properties, relationships, live state, and history references.

5. `Projection Layer`
   - Map overlays.
   - Selected-object detail payloads.
   - Timeline and replay projections.

6. `Rendering Layer`
   - MapLibre or other map renderers.
   - Object detail modules, including voxel art.
   - UI panels and controls.

7. `Observability Layer`
   - Freshness, completeness, fallback, source lag, and diagnostics.

## 4. Core Domain Model

### 4.1 Source Descriptor

Stable description of an external or internal data source.

Fields:

- `id` (string)
- `kind` (string)
- `provider` (string)
- `dataset` (string)
- `mode` (`live`, `fixture`, `mock`, `derived`, or implementation-defined)
- `freshness_sla_seconds` (integer or null)
- `credentials_required` (boolean)
- `status` (`available`, `degraded`, `missing`, `planned`, or implementation-defined)

### 4.2 Observation

Time-bound source fact normalized for ontology processing.

Fields:

- `id` (string)
- `source_id` (string)
- `observed_at` (timestamp)
- `received_at` (timestamp or null)
- `subject_ref` (string or null)
- `kind` (string)
- `value` (object)
- `geometry` (GeoJSON geometry or null)
- `confidence` (number or null)
- `freshness` (object)
- `raw_ref` (string or null)

Observations MUST NOT be rendered directly by product UI unless they first pass through a projection
contract.

### 4.3 Ontology Object

Stable product object users inspect and reason about.

Fields:

- `id` (string)
- `type` (string)
- `name` (string)
- `source_refs` (list of strings)
- `status` (string)
- `properties` (object)
- `relationships` (list of relationships)
- `state` (object)
- `history_ref` (string or null)
- `geometry` (GeoJSON geometry or null)

Object identity MUST be independent of map renderer, overlay visibility, and detail renderer choice.

### 4.4 Relationship

Typed edge between ontology objects.

Fields:

- `type` (string)
- `target_object_id` (string)
- `target_type` (string or null)
- `label` (string or null)
- `confidence` (number or null)
- `source_refs` (list of strings)

### 4.5 Overlay Definition

Product-facing layer users can enable, disable, and inspect.

Fields:

- `id` (string)
- `label` (string)
- `category` (string)
- `default_visible` (boolean)
- `data_dependencies` (list of source or ontology refs)
- `timeline_aware` (boolean)
- `renderer` (object)
- `status` (`live`, `planned`, `degraded`, or implementation-defined)
- `controls` (object or null)

Overlay definitions MUST describe product domains, not renderer implementation details.

### 4.6 Overlay Feature

Renderable map projection derived from observations or ontology state.

Fields:

- `id` (string)
- `overlay_id` (string)
- `object_id` (string or null)
- `geometry` (GeoJSON geometry)
- `properties` (object)
- `visual_state` (object)
- `interaction` (object)
- `source_refs` (list of strings)

Overlay features MUST be generic enough for different map renderers.

### 4.7 Object Detail Payload

Selected-object detail contract.

Fields:

- `object_id` (string)
- `sections` (list of structured sections)
- `live_board` (object or null)
- `history` (object or null)
- `actions` (list)
- `detail_modules` (list)

Voxel art MAY appear as one detail module. It MUST NOT be required for map comprehension.

### 4.8 Freshness and Completeness

Runtime data-quality metadata.

Fields:

- `mode` (`live`, `replay`, `fixture`, `mock`, or implementation-defined)
- `generated_at` (timestamp)
- `max_source_lag_seconds` (integer)
- `sources` (list of source freshness records)
- `missing_overlays` (list of overlay IDs)
- `warnings` (list of strings)

User-facing UI SHOULD show concise freshness and fallback state. Operator/debug surfaces MAY show
full diagnostics.

## 5. Product Surface Contract

### 5.1 Default Dashboard

The default dashboard MUST use an interactive map as the primary surface.

The default dashboard SHOULD contain:

- map base
- product overlay controls
- ontology object inspector
- timeline or live/replay control
- concise freshness/fallback status

The default dashboard MUST NOT require voxel terrain, voxel city chunks, or diorama alignment to
understand map state.

### 5.2 Overlay Interaction

Overlay toggles control projection visibility only.

Disabling an overlay MUST NOT delete ontology objects, observations, or source state. It only hides
the corresponding projection from the active map view.

### 5.3 Object Selection

Selecting a map marker, line, area, list item, or related object MUST select an ontology object when
an object ID is available.

The object inspector MUST render stable object properties and relationships before optional visual
detail modules.

### 5.4 Voxel Detail

Voxel art is a selected-object detail renderer.

Voxel modules SHOULD be reusable across object instances. Renderer selection SHOULD use object type,
kind, capability, or declared detail module. Renderer selection MUST NOT depend on a specific place
name such as one station, shop, or district.

## 6. Configuration Specification

### 6.1 Implementation-defined Decisions

Implementations MUST document these decisions:

- basemap provider and style source
- fallback payload policy
- mock and fixture source policy
- source freshness SLA
- overlay registry schema
- map style token source
- diagnostics visibility policy
- legacy contract compatibility policy

### 6.2 Source Registry

Source onboarding SHOULD be configuration-driven where practical.

Adding a new source SHOULD require:

- source descriptor
- adapter implementation or fixture
- normalization contract
- ontology mapping
- projection mapping
- freshness/completeness reporting

### 6.3 Overlay Registry

Adding a new overlay SHOULD require:

- overlay definition
- projection builder
- renderer metadata
- tests for visibility and registry consistency

The renderer MUST NOT be the only place where overlay identity is defined.

### 6.4 Map Style Tokens

TWFoundry SHOULD define map style tokens for base surfaces, roads, transit, water, green spaces,
labels, overlay halos, selected state, live state, stale state, and planned state.

The product may use a public basemap, but product-specific overlay styling SHOULD be owned by
TWFoundry.

## 7. Observability and Diagnostics

### 7.1 Freshness Surface

The system MUST expose source freshness and generated-at metadata.

The user-facing surface SHOULD summarize the most important status without showing raw diagnostics
by default.

### 7.2 Completeness Surface

The system MUST expose whether requested overlays are complete, partial, planned, or missing.

Missing overlays SHOULD degrade gracefully and keep available ontology objects inspectable.

### 7.3 Diagnostics Boundary

Diagnostics such as map feature extraction, geometry alignment, projection checks, and fixture
coverage MAY exist.

Diagnostics MUST NOT become primary product UI unless explicitly promoted through product policy.

## 8. Legacy Compatibility

Existing implementations may still contain `WorldViewPayload`, `DioramaChunk`, or
`ChunkProjection`.

Compatibility rule:

- These terms MAY remain as internal or legacy payload fields during migration.
- New product UI MUST NOT present voxel chunks or diorama alignment as the main model.
- New renderer work SHOULD prefer map-first names such as `MapViewPayload`, `OverlayProjection`, or
  `ObjectDetailPayload`.
- Migration SHOULD be incremental and tested because these contracts may still feed existing
  backend and frontend paths.

## 9. Historical Decisions

Historical design decisions are stored in `docs/decision-history/`.

The 2026-05 map-first pivot is documented in
`docs/decision-history/2026-05-map-first-pivot.md`.

Historical decisions MAY explain why old implementation terms exist. They MUST NOT override this
root specification unless this specification is explicitly revised.

## 10. Conformance Checklist

An implementation conforms to this draft when:

- The default dashboard is map-first.
- Source-specific parsing is isolated in adapters or fixtures.
- Ontology object IDs are stable across overlay visibility and renderer changes.
- Product overlays are registered outside renderer-only code.
- Map renderers consume generic overlay features.
- Voxel rendering is scoped to selected-object detail.
- Freshness, completeness, fallback, and diagnostics are exposed through explicit contracts.
- Implementation-defined decisions are documented.
