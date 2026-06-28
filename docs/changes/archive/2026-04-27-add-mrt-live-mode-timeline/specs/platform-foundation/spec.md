# platform-foundation Spec

## ADDED Requirements

### Requirement: MRT Live Snapshot Persistence

TWFoundry SHALL persist normalized MRT liveboard snapshots so recent operator replay does not depend on an in-memory frontend session.

#### Scenario: Latest MRT fetch is written as a replayable snapshot

- **GIVEN** the backend fetches MRT liveboard rows from TDX
- **WHEN** the backend normalizes the liveboard response
- **THEN** the backend persists the normalized snapshot before returning the response
- **AND** the persisted snapshot can later be queried for timeline replay

#### Scenario: Replay persistence does not hard-code one storage engine into service logic

- **GIVEN** TWFoundry Phase 1 uses `StarRocks` as the serving and latest-state platform direction
- **WHEN** MRT timeline persistence is implemented for the local slice
- **THEN** replay service logic depends on a persistence abstraction instead of a hard-coded storage engine
- **AND** the persistence implementation can later be replaced by a `StarRocks`-backed adapter without changing the replay API contract

### Requirement: MRT Timeline Replay API

TWFoundry SHALL expose a backend MRT timeline API that returns recent persisted snapshots in replay order.

#### Scenario: Recent persisted snapshots are queryable

- **GIVEN** MRT liveboard snapshots have been persisted
- **WHEN** the frontend requests MRT timeline history
- **THEN** the backend returns recent snapshots ordered from oldest to newest
- **AND** each snapshot contains the normalized liveboard rows needed to replay dashboard state

### Requirement: Timeline Drag Replay

TWFoundry SHALL let the operator drag the MRT timeline to inspect persisted snapshots.

#### Scenario: Dragging the timeline changes the displayed snapshot

- **GIVEN** the MRT dashboard has loaded persisted timeline snapshots
- **WHEN** the operator drags the timeline away from the latest point
- **THEN** the dashboard enters `paused` mode
- **AND** the selected persisted snapshot becomes the source of truth for rendered MRT liveboard data
- **AND** pressing `Now` returns the dashboard to the latest live snapshot

### Requirement: Snapshot-Driven Train Position Replay

TWFoundry SHALL recompute train positions from the selected timeline snapshot.

#### Scenario: Train positions move when replay position changes

- **GIVEN** two or more persisted MRT snapshots contain different liveboard timing states
- **WHEN** the operator drags the timeline to another snapshot
- **THEN** inferred train marker positions update according to the selected snapshot rows
- **AND** sidebar train rows and station panel arrivals remain consistent with the same snapshot

### Requirement: Train-Centric Replay Selection

TWFoundry SHALL keep train-centric selection behavior during replay.

#### Scenario: Replay keeps selection centered on the train

- **GIVEN** the operator has selected a train from the map or sidebar
- **WHEN** the timeline moves to another persisted snapshot
- **THEN** the dashboard keeps `selectedTrainId` as the train-centric identity while that train exists in the selected snapshot
- **AND** the selection is cleared only if the selected snapshot no longer contains that train
