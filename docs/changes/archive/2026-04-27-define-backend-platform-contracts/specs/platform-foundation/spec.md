# platform-foundation Spec

## ADDED Requirements

### Requirement: Backend Platform Contracts

TWFoundry SHALL define backend and data-platform contracts before implementing Phase 1 ingestion, streaming, storage, or API runtime flows.

#### Scenario: Backend work is planned after frontend bootstrap

- **GIVEN** the MRT-first frontend dashboard contract exists
- **WHEN** backend platform implementation is planned
- **THEN** raw envelope fields, source registry fields, pluggable datasource connector contracts, topic naming, latest-state storage schemas, backend module boundaries, and local infrastructure entrypoints are defined in a follow-up change

### Requirement: Backend Scope Isolation

TWFoundry SHALL keep backend platform contract work separate from the completed frontend bootstrap slice.

#### Scenario: Bootstrap is completed

- **GIVEN** `bootstrap-twfoundry-platform` has completed the frontend-first dashboard foundation
- **WHEN** backend contract tasks remain
- **THEN** those tasks are tracked by `define-backend-platform-contracts` instead of expanding the bootstrap change

### Requirement: Phase 1 Backbone Direction

TWFoundry SHALL use `Redpanda/Kafka -> Stream Processing -> StarRocks` as the Phase 1 backend backbone direction.

#### Scenario: Backbone technology is selected

- **GIVEN** the project needs a production-oriented backend direction for Phase 1 source ingestion and serving
- **WHEN** the backend platform contracts are defined
- **THEN** the change documents `Redpanda` or `Kafka` as the event backbone and `StarRocks` as the latest-state serving store
- **AND** the change does not require Fluss as the primary Phase 1 backbone

### Requirement: Source Registry Contract

TWFoundry SHALL define a source registry contract so datasource onboarding is configuration-driven instead of spread through source-specific branching logic.

#### Scenario: A new datasource is introduced

- **GIVEN** a maintainer wants to add a new datasource such as TDX, YouBike, Civil IoT, or MRT static GTFS
- **WHEN** the source is registered
- **THEN** the registry captures source identity, dataset identity, ingestion method, auth strategy, cadence, schema version, and raw topic mapping

### Requirement: Pluggable Datasource Connector Interface

TWFoundry SHALL define a pluggable datasource connector interface that allows different ingestion methods to publish a common raw envelope into the event backbone.

#### Scenario: Poll-based source is added

- **GIVEN** a datasource such as TDX MRT LiveBoard uses scheduled polling
- **WHEN** its connector is implemented
- **THEN** the datasource contract describes the source dataset
- **AND** a pull capability can fetch source records and return common raw envelope records for shared publication

#### Scenario: File-based source is added

- **GIVEN** a datasource such as MRT static GTFS uses file ingestion
- **WHEN** its connector is implemented
- **THEN** a push capability can ingest source artifacts and return common raw envelope records without changing the shared publisher contract

### Requirement: Raw Envelope Contract

TWFoundry SHALL define a shared raw record envelope for all datasource connectors.

#### Scenario: A connector publishes a raw record

- **GIVEN** any datasource connector emits source-owned data
- **WHEN** it publishes to a raw topic
- **THEN** the record includes at least `event_id`, `source`, `dataset`, `domain`, `ingestion_method`, `ingested_at`, `schema_version`, `content_type`, and `payload`

### Requirement: Topic Taxonomy

TWFoundry SHALL define topic families that separate raw ingestion, normalized events, latest-state projections, and dead-letter handling.

#### Scenario: Raw ingestion is routed

- **GIVEN** a datasource connector emits a raw record
- **WHEN** the record is published
- **THEN** it is sent to a topic named `raw.<domain>.<source>.<dataset>`

#### Scenario: Processing failures are isolated

- **GIVEN** a record cannot be processed or published successfully after retry policy is exhausted
- **WHEN** the failure is classified as terminal for the current attempt
- **THEN** the record is routed to `dlq.<domain>.<source>.<dataset>` instead of being silently dropped

### Requirement: Latest-State Storage Direction

TWFoundry SHALL use StarRocks Primary Key Table design for Phase 1 latest-state serving tables where entity state is updated in place.

#### Scenario: Current station state is served

- **GIVEN** stream processing has normalized source records into entity state updates
- **WHEN** the platform materializes current operational state
- **THEN** StarRocks stores the latest row by entity key for dashboard and API reads

### Requirement: MRT Backend MVP Slice

TWFoundry SHALL define the first backend MVP as an MRT real-data slice that can be viewed from the web UI.

#### Scenario: MRT real data is visible through the product

- **GIVEN** TDX MRT ingestion, backend processing, storage, and API paths are implemented
- **WHEN** a user opens the MRT dashboard in the web UI
- **THEN** the user can view MRT train positions and train information through the backend path instead of only mock frontend data
- **AND** the MRT timeline supports dragging so the user can inspect how trains move over time

### Requirement: Backend and Full-Stack End-to-End Coverage

TWFoundry SHALL require end-to-end coverage for the MRT backend MVP slice.

#### Scenario: Backend slice is verified

- **GIVEN** the MRT backend MVP exists
- **WHEN** automated backend validation runs
- **THEN** backend end-to-end tests verify ingestion trigger, raw publication, and backend-visible outcome for the MRT slice

#### Scenario: Full-stack MRT flow is verified

- **GIVEN** the MRT backend MVP exists
- **WHEN** automated product validation runs
- **THEN** frontend plus backend end-to-end tests verify that real MRT train positions and train information can be viewed from the web UI
- **AND** frontend plus backend end-to-end tests verify that the timeline can be dragged to inspect train movement over time

### Requirement: Map View Extensibility

TWFoundry SHALL keep the platform map model extensible for both 2D and 3D views.

#### Scenario: Map view requirements expand beyond MRT

- **GIVEN** the platform may later support additional moving-object domains such as flight data
- **WHEN** backend and frontend map-related contracts are defined
- **THEN** those contracts do not assume a strictly 2D-only view model
- **AND** the platform remains compatible with both 2D and 3D map presentation modes

#### Scenario: Frontend map contracts carry 3D-ready state

- **GIVEN** the frontend overlay renderer receives map context and coordinates
- **WHEN** a renderer chooses between 2D and 3D presentation
- **THEN** the render context exposes a `2d` or `3d` view mode
- **AND** coordinates can carry optional altitude without changing existing 2D MRT geometry

### Requirement: Frontend Overlay Registry Contract

TWFoundry SHALL define a frontend overlay registry contract so map-facing product modules are declared explicitly instead of being hard-coded inside one large map component.

#### Scenario: MRT map overlays are defined

- **GIVEN** the MRT dashboard needs route, station, train, and timeline presentation
- **WHEN** frontend map contracts are defined
- **THEN** the product-facing map modules are modeled as overlays rather than raw renderer layers
- **AND** the MRT MVP defines at least `MrtRouteOverlay`, `MrtStationOverlay`, `EstimatedTrainOverlay`, and `TimelineOverlay`

#### Scenario: Overlay controls drive the UI

- **GIVEN** the layer sidebar and mobile panel switcher expose map controls
- **WHEN** those controls are wired to map features
- **THEN** the UI addresses overlay identity, visibility, and controls
- **AND** it does not depend directly on renderer-specific layer names
