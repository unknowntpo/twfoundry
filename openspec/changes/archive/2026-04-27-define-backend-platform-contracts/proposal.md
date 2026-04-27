# Change: Define Backend Platform Contracts

## Why

The bootstrap change has delivered the frontend-first MRT dashboard foundation. The remaining Phase 1 backend and data platform decisions should move into a separate change so the bootstrap work can be completed without expanding its scope.

## What Changes

- Define `Redpanda/Kafka -> StarRocks` as the Phase 1 backend backbone direction.
- Define the backend MVP slice as MRT real-data flow visible from the web UI.
- Define the raw message envelope fields used by ingestion services, including `ingested_at` and `source`.
- Define source registry fields and a pluggable datasource connector interface.
- Define curated topic naming, ownership boundaries, and dead-letter handling.
- Define StarRocks Primary Key Table direction for latest-state tables.
- Add backend module skeletons for ingestion, streams, and API after the frontend contract is stable.
- Add local infrastructure notes or compose files for Kafka and StarRocks when backend work begins.

## Out of Scope

- Broad multi-source backend delivery before the MRT real-data slice is proven.
- Runtime Fluss adoption in this change.
- Replacing the mock MRT frontend data contract.

## Discussion Conclusion

**Decision**: Defer backend/platform contract details from `bootstrap-twfoundry-platform` into this follow-up change.

**Backbone direction**: Use `Redpanda/Kafka` as the event backbone and `StarRocks` as the serving and latest-state storage layer for Phase 1. Do not adopt Fluss as the primary runtime backbone in this change.

**Capture to**: `proposal.md`, `design.md`, `tasks.md`, and `specs/platform-foundation/spec.md`.
