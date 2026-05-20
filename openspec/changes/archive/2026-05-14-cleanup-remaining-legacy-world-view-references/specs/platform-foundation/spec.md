## MODIFIED Requirements

### Requirement: Ontology Object Identity Is Independent Of Chunk Boundaries

TWFoundry SHALL keep canonical operational identity in `OntologyObject` records.

Map overlays, object detail renderers, compatibility chunks, and compatibility projections SHALL
NOT own event, train, station, sensor, or alert identity.

#### Scenario: Cross-area rain cell has one object

- **GIVEN** one rain cell covers multiple map areas, overlays, or compatibility chunks
- **WHEN** the backend computes the view
- **THEN** the `objects` collection contains exactly one `OntologyObject` for that rain cell
- **AND** any overlay features or compatibility projections reference the same object identity

#### Scenario: Projection click resolves to canonical object

- **GIVEN** the frontend user clicks a map overlay feature or compatibility projection
- **WHEN** the projection contains an object reference
- **THEN** the inspector resolves the selected object from the canonical `objects` collection
- **AND** all projections for that object share the same object detail view

#### Scenario: Static station feature maps to canonical station object

- **GIVEN** a static station feature is visible through a map overlay, object detail, or
  compatibility renderer
- **WHEN** it corresponds to a canonical station ontology object
- **THEN** the feature includes an ontology object reference
- **AND** clicking the station resolves to the canonical station object rather than a raw geo feature

### Requirement: Backend Owns Heavy Spatial Computation

TWFoundry SHALL perform heavy geospatial computation in the backend for production view contracts.

Heavy computation includes source feature normalization, spatial indexing, geometry simplification,
projection generation, map focus clipping, and compatibility local-geometry generation.

#### Scenario: Frontend receives precomputed projection geometry

- **GIVEN** a production view is returned
- **WHEN** the frontend receives map overlay or compatibility projection geometry
- **THEN** geometry is already normalized for the relevant renderer contract
- **AND** the frontend does not need to decode raw source tiles or perform authoritative source
  geometry placement

#### Scenario: Java is the initial compute runtime

- **GIVEN** the first backend view implementation is built
- **WHEN** view computation is implemented
- **THEN** it uses the existing Java backend stack
- **AND** Go or Rust workers are not required until profiling identifies a specific compute
  bottleneck

### Requirement: Geo Source Providers Are Replaceable

TWFoundry SHALL keep geospatial source providers replaceable behind backend source adapter or
geospatial provider abstractions.

The map-first product contract SHALL NOT depend directly on OpenFreeMap, PMTiles, OpenMapTiles,
MapLibre style JSON, or any single tile provider.

#### Scenario: Mock provider backs first vertical slice

- **GIVEN** the first backend-computed view is implemented
- **WHEN** real vector tile ingestion is not ready
- **THEN** a mock, static, or fixture provider can supply normalized source features
- **AND** the frontend consumes the same map overlay, ontology, freshness, and object detail
  contracts

#### Scenario: Provider can change without frontend contract change

- **GIVEN** the backend replaces a mock provider with PMTiles, OpenMapTiles, OSM-derived fixtures, or
  another source
- **WHEN** the frontend requests the view
- **THEN** the product contract remains stable
- **AND** frontend render modules do not need provider-specific logic

### Requirement: World View Freshness And Replay Are Explicit

TWFoundry SHALL include freshness and replay metadata in every production view contract.

Freshness metadata SHALL identify live/replay mode, generated time, source lag, and per-source
status. This metadata MAY be carried by legacy `WorldViewPayload` during migration.

#### Scenario: Live view reports source lag

- **GIVEN** the frontend requests `time=live`
- **WHEN** the backend returns a production or compatibility view payload
- **THEN** freshness metadata reports live mode
- **AND** maximum source lag is present
- **AND** source-level freshness is present

#### Scenario: Replay payload is deterministic

- **GIVEN** the frontend requests a specific replay timestamp
- **WHEN** the same request is repeated
- **THEN** the backend returns deterministic object and projection state for that timestamp unless
  source data has been explicitly reprocessed
