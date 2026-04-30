# platform-foundation Spec Delta

## ADDED Requirements

### Requirement: Backend-Computed World View Contract

TWFoundry SHALL expose a backend-computed `WorldViewPayload` for diorama rendering.

The `WorldViewPayload` SHALL include `schemaVersion`, `request`, `focus`, `chunks`, `objects`, `projections`, `renderModules`, `freshness`, and `completeness`.

The frontend SHALL render the operational diorama from `WorldViewPayload` rather than computing the complete world from raw source rows.

#### Scenario: Frontend requests current Taipei world view

- **GIVEN** the frontend opens the operations cockpit
- **WHEN** it requests `GET /api/world/view?focusId=taipei-core&lod=city&time=live`
- **THEN** the backend returns a `WorldViewPayload`
- **AND** the payload contains at least one `DioramaChunk`
- **AND** the payload contains `OntologyObject` records separately from chunk-local projections
- **AND** the frontend can render the world without parsing map vector tiles

#### Scenario: Payload version is explicit

- **GIVEN** the backend returns a world view response
- **WHEN** the frontend reads the response
- **THEN** `schemaVersion` is present
- **AND** the initial version is `world-view.v1`

#### Scenario: Partial payload identifies missing overlays

- **GIVEN** a non-critical source is stale or unavailable
- **WHEN** the backend can still generate part of the world view
- **THEN** it returns `WorldViewPayload.completeness.status` as `partial`
- **AND** `missingOverlays` identifies unavailable overlays
- **AND** `warnings` explains source or projection gaps

### Requirement: Diorama Chunk Is Product-Owned

TWFoundry SHALL model `DioramaChunk` as a product-owned render artifact, not as a direct map tile.

A `DioramaChunk` SHALL include chunk identity, focus identity, LOD, geographic bounds, local bounds, terrain cells, static feature projections, semantic zones, and source references.

A `DioramaChunk` SHALL include `sceneOrigin` and `localToScene` so the frontend can assemble multiple chunks into one Three.js scene.

#### Scenario: Chunk contains local render data

- **GIVEN** a `DioramaChunk` is returned in `WorldViewPayload`
- **WHEN** the frontend renders that chunk
- **THEN** terrain and static features are already represented in chunk-local diorama coordinates
- **AND** the frontend does not need to decode map tile coordinates

#### Scenario: Multiple chunks assemble into one scene

- **GIVEN** a world view response contains multiple chunks
- **WHEN** the frontend renders the shared diorama scene
- **THEN** each chunk can be placed using `localToScene`
- **AND** adjacent chunk features can visually continue across chunk boundaries

#### Scenario: Chunk references source inputs

- **GIVEN** a chunk is generated from map or static data
- **WHEN** diagnostics are inspected
- **THEN** the chunk contains `sourceRefs` that identify contributing source inputs such as TDX static geometry or vector tile references

### Requirement: Ontology Object Identity Is Independent Of Chunk Boundaries

TWFoundry SHALL keep canonical operational identity in `OntologyObject` records.

Chunks SHALL NOT own event, train, station, sensor, or alert identity.

#### Scenario: Cross-chunk rain cell has one object

- **GIVEN** one rain cell covers multiple diorama chunks
- **WHEN** the backend computes the world view
- **THEN** the `objects` array contains exactly one `OntologyObject` for that rain cell
- **AND** the `projections` array may contain multiple `ChunkProjection` records that reference the same `objectId`

#### Scenario: Projection click resolves to canonical object

- **GIVEN** the frontend user clicks a rendered chunk-local projection
- **WHEN** the projection contains `objectId`
- **THEN** the inspector resolves the selected object from the canonical `objects` collection
- **AND** all projections for that object share the same object detail view

#### Scenario: Static station feature maps to canonical station object

- **GIVEN** a static station feature is rendered in a chunk
- **WHEN** it corresponds to a canonical station ontology object
- **THEN** the static feature projection includes `ontologyObjectId`
- **AND** clicking the station resolves to the canonical station object rather than a raw geo feature

### Requirement: Chunk Projection Bridges Object To Local Render Module

TWFoundry SHALL use `ChunkProjection` records to bind ontology objects to chunk-local render modules.

Each `ChunkProjection` SHALL include `id`, `objectId`, `chunkId`, `overlay`, `renderModule`, `geometry`, and `visualState`.

#### Scenario: Train projection renders through VoxelTrain

- **GIVEN** a train ontology object is included in `WorldViewPayload`
- **WHEN** the backend computes projections for the visible chunks
- **THEN** at least one projection references the train object's `objectId`
- **AND** the projection uses `renderModule: "VoxelTrain"`
- **AND** the projection geometry is in chunk-local coordinates

#### Scenario: Overlay off hides projections

- **GIVEN** the frontend user disables a domain overlay such as `rain`
- **WHEN** projections are rendered
- **THEN** projections whose `overlay` is `rain` are hidden
- **AND** their referenced ontology objects are not deleted from client state

### Requirement: Backend Owns Heavy Spatial Computation

TWFoundry SHALL perform heavy geospatial computation in the backend for production world views.

Heavy computation includes vector tile decoding, feature normalization, spatial indexing, geometry simplification, cross-chunk clipping, chunk generation, and projection generation.

#### Scenario: Frontend receives precomputed local geometry

- **GIVEN** a production world view is returned
- **WHEN** the frontend receives `DioramaChunk` and `ChunkProjection` geometry
- **THEN** the geometry is already in local diorama coordinates
- **AND** the frontend does not need to intersect object geometry with chunk bounds

#### Scenario: Java is the initial compute runtime

- **GIVEN** the first backend world-view implementation is built
- **WHEN** world view computation is implemented
- **THEN** it uses the existing Java backend stack
- **AND** Go or Rust workers are not required until profiling identifies a specific compute bottleneck

### Requirement: Geo Source Providers Are Replaceable

TWFoundry SHALL keep geospatial source providers replaceable behind a backend `GeoReferenceProvider` abstraction.

The diorama world contract SHALL NOT depend directly on OpenFreeMap, PMTiles, OpenMapTiles, MapLibre style JSON, or any single tile provider.

#### Scenario: Mock provider backs first vertical slice

- **GIVEN** the first backend-computed world view is implemented
- **WHEN** real vector tile ingestion is not ready
- **THEN** a mock or static `GeoReferenceProvider` can supply normalized `GeoFeature` records
- **AND** the API contract remains the same

#### Scenario: Provider can change without frontend contract change

- **GIVEN** the backend replaces a mock provider with PMTiles or OpenMapTiles
- **WHEN** the frontend requests `WorldViewPayload`
- **THEN** the payload shape remains stable
- **AND** frontend render modules do not need provider-specific logic

### Requirement: World View Freshness And Replay Are Explicit

TWFoundry SHALL include freshness metadata in every `WorldViewPayload`.

Freshness metadata SHALL identify live/replay mode, generated time, source lag, and per-source status.

#### Scenario: Live payload reports source lag

- **GIVEN** the frontend requests `time=live`
- **WHEN** the backend returns `WorldViewPayload`
- **THEN** `freshness.mode` is `live`
- **AND** `freshness.maxSourceLagSeconds` is present
- **AND** `freshness.sources` reports source-level freshness

#### Scenario: Replay payload is deterministic

- **GIVEN** the frontend requests a specific replay timestamp
- **WHEN** the same request is repeated
- **THEN** the backend returns deterministic object and projection state for that timestamp unless source data has been explicitly reprocessed

### Requirement: World View API Errors Are Structured

TWFoundry SHALL return structured world-view API errors.

World-view errors SHALL include an error `code`, human-readable `message`, optional `details`, and optional `retryAfterSeconds`.

#### Scenario: Unknown focus id

- **GIVEN** the frontend requests an unknown `focusId`
- **WHEN** the backend cannot resolve the focus
- **THEN** it returns `WORLD_FOCUS_NOT_FOUND`
- **AND** the frontend can show a recoverable fallback state

#### Scenario: Source unavailable

- **GIVEN** required source data is unavailable
- **WHEN** the backend cannot generate a complete world view
- **THEN** it returns `WORLD_VIEW_UNAVAILABLE` or a partial payload with stale source freshness
- **AND** the response makes retry behavior explicit

### Requirement: Debug Geo Data Is Explicitly Diagnostic

TWFoundry SHALL keep raw or normalized debug geo data separate from the production render path.

When `debugGeo=true`, `WorldViewPayload.diagnostics` MAY include normalized `GeoFeature` records, source references, chunk intersection diagnostics, and provider timings.

#### Scenario: Debug geo features are requested

- **GIVEN** the frontend or design-system requests `debugGeo=true`
- **WHEN** the backend returns `WorldViewPayload`
- **THEN** debug-only `GeoFeature` records may appear under `diagnostics.geoFeatures`
- **AND** production rendering still uses `DioramaChunk` and `ChunkProjection`
