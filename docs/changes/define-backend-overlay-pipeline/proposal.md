## Why

TWFoundry is moving from a frontend-only cockpit demo toward backend overlay pipelines. Near-real-time sources such as MRT vehicle positions need a clear path through Kafka, archive fan-out, stream projection, and serving storage without overloading Kafka as a long-term historical store or making ingestion double-write raw data.

The backend also needs explicit rules for snapshot/change-stream merge behavior. Historical APIs can correct values that were previously observed from live streams, so current-state projection needs authority and revision semantics in addition to event-time ordering.

## What Changes

- Define the backend overlay pipeline boundary for static, snapshot, near-real-time, and operator overlays.
- Define Kafka topic naming for production raw streams, replay raw streams, observation topics, overlay event topics, and audit topics.
- Define raw archive fan-out as a Kafka consumer responsibility instead of an ingestion double-write.
- Add backend contracts for raw archive partitions, overlay features, fact observations, resolved facts, and conflicts.
- Add a deterministic fact resolver for source authority, revision, confidence, and data-conflict handling.
- Add focused tests proving topic names, archive partitioning, and conflict resolution behavior.

## Non-Goals

- Deploying Kafka, Airflow, StarRocks, PostGIS, or object storage.
- Implementing a production Kafka consumer or producer runtime.
- Replacing the existing MRT LiveBoard API path.
- Implementing frontend overlay rendering changes.
- Implementing a full Lambda serving merge layer.

## Capabilities

### New Capabilities

- `backend-overlay-pipeline`: Backend contracts for Kafka-backed overlay ingestion, raw archive fan-out, warehouse projection, replay, and data-conflict resolution.

### Modified Capabilities

- `platform-foundation`: Adds backend overlay pipeline requirements to the existing Phase 1 platform foundation.

## Impact

- `backend/common`: shared topic naming and overlay/fact/archive contracts.
- `backend/streams`: deterministic fact resolution policy for projector implementations.
- `openspec/changes/define-backend-overlay-pipeline`: proposal, design, tasks, and platform-foundation spec delta.
- Tests cover topic taxonomy, archive partition paths, and fact resolution decisions.
