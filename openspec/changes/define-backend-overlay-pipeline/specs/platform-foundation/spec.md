## ADDED Requirements

### Requirement: Backend Overlay Pipeline Classification

TWFoundry SHALL classify backend overlay data pipelines by freshness and route only streaming-worthy data through Kafka.

#### Scenario: Overlay source is classified

- **GIVEN** an overlay source is introduced
- **WHEN** the backend pipeline is designed
- **THEN** the source is classified as static reference, periodic snapshot, near-real-time event, or operator/user overlay
- **AND** Kafka is required for near-real-time event and audit-worthy operator overlays
- **AND** static reference overlays can be imported directly into reference or serving storage
- **AND** periodic snapshot overlays can upsert latest-state storage directly unless replay, audit, analytics, or fan-out requirements justify Kafka

### Requirement: Kafka Raw Topic Fan-out Archive

TWFoundry SHALL publish near-real-time raw source records once to a production Kafka raw topic and SHALL archive raw history through an independent consumer.

#### Scenario: MRT vehicle raw record is ingested

- **GIVEN** the backend receives a raw MRT vehicle position record
- **WHEN** the ingestion job wraps it in a raw envelope
- **THEN** the ingestion job publishes the record to `source.tdx.mrt_vehicle.raw.v1`
- **AND** the ingestion job does not double-write the same raw record to historical storage
- **AND** a raw archive consumer can read the same Kafka raw topic and write the partitioned raw historical archive
- **AND** a stream processor can independently read the same Kafka raw topic for observation projection

### Requirement: Overlay Warehouse Current and History Projection

TWFoundry SHALL model overlay warehouse output as current and history projections derived from resolved observations.

#### Scenario: Vehicle observation is projected

- **GIVEN** a vehicle position observation is resolved as canonical
- **WHEN** the overlay projector materializes the result
- **THEN** the current projection stores the latest valid feature for the vehicle
- **AND** the history projection stores the event-time feature revision for timeline and replay use
- **AND** raw source candidates remain available separately from resolved warehouse state

### Requirement: Snapshot and Live Data Conflict Resolution

TWFoundry SHALL resolve data conflicts between snapshot and live/change data with explicit source authority, revision, confidence, and deterministic tie-breakers.

#### Scenario: Historical correction conflicts with live value

- **GIVEN** a live stream reports `AAPL` price at `2026-04-29T10:00:00Z` as `180.12`
- **AND** a historical snapshot later reports the same fact as `180.08` with a higher authority rank
- **WHEN** the resolver compares the candidates
- **THEN** the historical snapshot is promoted as the resolved canonical value
- **AND** the live value remains preserved as a raw candidate
- **AND** the supersession reason records that a higher-authority historical correction replaced the live value

#### Scenario: Equal-authority values conflict

- **GIVEN** two candidates have the same entity, metric, event time, authority rank, and revision
- **AND** the candidate values differ
- **WHEN** the resolver compares the candidates
- **THEN** it reports a conflict instead of silently overwriting the current resolved value

### Requirement: Replay Isolation

TWFoundry SHALL isolate historical replay and projector validation from production raw topics and production serving stores.

#### Scenario: Projector logic is recomputed

- **GIVEN** a maintainer wants to test a new projector version against historical MRT vehicle data
- **WHEN** the replay job reads archived raw history
- **THEN** it writes to an isolated replay topic or isolated projector input
- **AND** the replay projector writes to an isolated replay warehouse
- **AND** production current serving state is not modified until validation and cutover are explicitly accepted
