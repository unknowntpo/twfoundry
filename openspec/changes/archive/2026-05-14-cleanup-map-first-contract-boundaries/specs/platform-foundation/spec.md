## MODIFIED Requirements

### Requirement: Map Failure Fallback

TWFoundry SHALL handle MapLibre style or tile loading failure without a blank screen.

The fallback state SHALL preserve the map-first ontology model: available ontology objects,
overlay controls, freshness/completeness status, and selected-object detail remain inspectable.

Voxel detail MAY remain available for selected objects, but fallback behavior SHALL NOT require a
primary voxel diorama surface.

#### Scenario: Map tile provider is unavailable

- **GIVEN** the MapLibre style or tiles fail to load
- **WHEN** the dashboard renders
- **THEN** the user sees a recoverable map-source status message
- **AND** available ontology objects and overlay controls remain usable
- **AND** voxel rendering, if shown, is scoped to selected-object detail rather than replacing the
  map as the primary product surface

### Requirement: Backend-Computed World View Contract

TWFoundry MAY continue exposing backend-computed `WorldViewPayload` during the map-first migration.

`WorldViewPayload`, `chunks`, and `projections` are legacy-compatible implementation fields. New
product decisions SHALL treat them as compatibility inputs that feed ontology objects, map overlay
projections, selected-object details, freshness, and completeness.

The frontend SHALL NOT treat `WorldViewPayload` as proof that the primary dashboard must be a
voxel diorama.

#### Scenario: Frontend requests current world view

- **GIVEN** the frontend opens the operations dashboard
- **WHEN** it requests `GET /api/world/view?focusId=zhongshan-station&lod=city&time=live`
- **THEN** the backend may return `schemaVersion`, `request`, `focus`, `chunks`, `objects`,
  `projections`, `renderModules`, `freshness`, and `completeness`
- **AND** the frontend maps those fields into ontology objects, map overlays, and selected-object
  detail
- **AND** the user-facing product model remains map-first

#### Scenario: Partial payload identifies missing overlays

- **GIVEN** a non-critical source is stale or unavailable
- **WHEN** the backend can still generate part of the view
- **THEN** it returns completeness metadata such as `status`, `missingOverlays`, and `warnings`
- **AND** the frontend keeps available ontology objects inspectable

### Requirement: Diorama Chunk Is Product-Owned

TWFoundry SHALL treat `DioramaChunk` as a legacy-compatible internal render artifact during the
map-first migration.

`DioramaChunk` MAY continue carrying focus-local geometry, source references, ground features,
static features, or semantic zones for compatibility paths. It SHALL NOT be presented as the main
product unit in new user-facing UI or future product decisions.

#### Scenario: Compatibility chunk contains local render data

- **GIVEN** a compatibility payload contains `DioramaChunk` data
- **WHEN** a legacy renderer or object-detail path consumes it
- **THEN** source references and local geometry remain traceable
- **AND** the primary dashboard still presents map overlays and ontology object detail rather than
  chunk-first navigation

#### Scenario: Source-derived geometry remains traceable

- **GIVEN** static map or OSM-like fixture data contributes geometry
- **WHEN** the compatibility payload includes that geometry
- **THEN** source refs and source geometry remain available for diagnostics and trust
- **AND** renderer code does not invent source truth

### Requirement: Chunk Projection Bridges Object To Local Render Module

TWFoundry MAY continue using `ChunkProjection` as a legacy-compatible bridge from ontology objects
to render modules.

New map-first work SHOULD prefer generic overlay projection and object detail contracts. If
`ChunkProjection` is consumed, it SHALL be treated as an input to compatibility rendering or
selected-object detail, not as the product-level projection model.

#### Scenario: Compatibility projection resolves to ontology object

- **GIVEN** a compatibility projection references an ontology object
- **WHEN** the frontend consumes the projection
- **THEN** selection resolves to the canonical ontology object
- **AND** overlay visibility hides the projection without deleting ontology state

#### Scenario: New overlay work remains product-facing

- **GIVEN** a new operational domain is exposed on the map
- **WHEN** its renderer is implemented
- **THEN** the product identity is registered through overlay metadata
- **AND** renderer code does not define overlay identity by itself

### Requirement: Debug Geo Data Is Explicitly Diagnostic

TWFoundry SHALL keep raw or normalized debug geo data separate from the production product surface.

Debug payloads MAY include normalized `GeoFeature` records, source references, projection checks,
geometry alignment diagnostics, and provider timings. These diagnostics SHALL be available only
through debug, design-system, test, or operator surfaces unless explicitly promoted by a future
product requirement.

#### Scenario: Debug geo features are requested

- **GIVEN** a debug or design-system surface requests diagnostic geo data
- **WHEN** the backend or frontend returns diagnostic metadata
- **THEN** raw or normalized debug features may appear in diagnostics
- **AND** the primary dashboard remains governed by map overlays and ontology object detail
- **AND** map alignment diagnostics do not appear as normal user-facing product controls
