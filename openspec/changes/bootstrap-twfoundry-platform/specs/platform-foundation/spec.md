# platform-foundation Spec

## ADDED Requirements

### Requirement: Phase 1 Layered Architecture

TWFoundry SHALL define a Phase 1 architecture with data source, ingestion, Kafka Streams, StarRocks storage, Spring Boot API, and Vue + Google Maps frontend layers.

#### Scenario: Stakeholder reviews the platform foundation

- **GIVEN** the TWFoundry project brief exists
- **WHEN** the `bootstrap-twfoundry-platform` change is reviewed
- **THEN** the proposal and design describe the Phase 1 layered architecture and each layer's responsibility

### Requirement: Phase 1 Source Candidates

TWFoundry SHALL include YouBike realtime station status, TDX Taipei MRT LiveBoard, Civil IoT SensorThings observations, and MRT static GTFS as Phase 1 source candidates.

#### Scenario: Source coverage is evaluated

- **GIVEN** Phase 1 source candidates are documented
- **WHEN** implementation scope is planned
- **THEN** each source candidate has a destination in the ingestion, streaming, storage, API, and dashboard architecture

### Requirement: MRT-First Frontend Slice

TWFoundry SHALL implement the first executable Phase 1 slice as an MRT-only frontend dashboard using mock/static data before backend ingestion, storage, or API services are required.

#### Scenario: First demo is built

- **GIVEN** the first implementation slice is planned
- **WHEN** the team starts application work
- **THEN** the frontend dashboard can render MRT routes, MRT station markers, station selection, and a LiveBoard panel from mock/static data

### Requirement: Initial MRT Mock Dataset

TWFoundry SHALL seed the first mock/static MRT dataset with Red, Blue, and Green line examples, using three representative stations per line.

#### Scenario: Mock fixtures are created

- **GIVEN** the MRT-first frontend slice is implemented
- **WHEN** mock MRT fixtures are added
- **THEN** the fixtures include Red Line stations Taipei Main Station, Daan, and Xiangshan; Blue Line stations Taipei Main Station, Zhongxiao Fuxing, and Taipei City Hall; and Green Line stations Ximen, Chiang Kai-shek Memorial Hall, and Nanjing Fuxing

### Requirement: Raw Topic Direction

TWFoundry SHALL define initial raw Kafka topic names for YouBike, MRT LiveBoard, Civil IoT, and MRT static data.

#### Scenario: Ingestion services publish source data

- **GIVEN** a Phase 1 ingestion service receives source API data
- **WHEN** it publishes the raw record
- **THEN** the record is sent to the appropriate raw topic and includes ingestion metadata such as `ingested_at` and `source`

### Requirement: Current-State Storage Direction

TWFoundry SHALL use StarRocks as the Phase 1 analytical storage layer and SHALL use Primary Key Table design for latest-state tables where records need to be updated.

#### Scenario: Dashboard reads latest operational state

- **GIVEN** normalized records have been processed from raw source data
- **WHEN** the dashboard requests current station or observation state
- **THEN** the API can read a latest-state representation from StarRocks

### Requirement: Frontend Stack Direction

TWFoundry SHALL use Bun, Vite, Vue 3, TypeScript, Pinia, Vue Router, Google Maps JavaScript API, Vue scoped CSS, Vitest, and Playwright for the first frontend implementation.

#### Scenario: Frontend project is scaffolded

- **GIVEN** the MRT-first dashboard is implemented
- **WHEN** dependencies and project structure are selected
- **THEN** the project uses the agreed frontend stack and does not require backend services to run the first mock dashboard

### Requirement: Small Tests Before E2E

TWFoundry SHALL cover the first frontend slice with unit and integration tests before relying on Playwright E2E.

#### Scenario: Frontend tests are introduced

- **GIVEN** MRT mock fixtures, station selection state, layer toggles, and map provider selection exist
- **WHEN** tests are added
- **THEN** Vitest covers fixture shape, station lookup behavior, selected station state, MRT layer toggles, and map provider boundary behavior before Playwright smoke tests are added

### Requirement: Dashboard Visualization Direction

TWFoundry SHALL use Vue 3, Pinia, and Google Maps JavaScript API for the Phase 1 dashboard.

#### Scenario: User opens the Phase 1 dashboard

- **GIVEN** MRT mock/static data exists
- **WHEN** the dashboard loads
- **THEN** it can display MRT route polylines, MRT station markers, and station LiveBoard information

### Requirement: Deterministic Map E2E

TWFoundry SHALL provide a mock map provider for Playwright E2E tests while preserving Google Maps JavaScript API for local/demo usage.

#### Scenario: E2E tests run

- **GIVEN** Playwright tests are executed
- **WHEN** `VITE_MAP_PROVIDER=mock` is configured
- **THEN** tests can verify dashboard load, station selection, and layer toggling without requiring Google Maps network access, quota, tile loading, or an API key

### Requirement: Implementation Before Coding

TWFoundry SHALL resolve or explicitly defer Phase 1 bootstrap questions before application implementation code is added.

#### Scenario: Developer starts repository work

- **GIVEN** the `bootstrap-twfoundry-platform` change has unresolved implementation-order questions
- **WHEN** implementation is requested
- **THEN** the unresolved questions are resolved or explicitly deferred before scaffolding application code
