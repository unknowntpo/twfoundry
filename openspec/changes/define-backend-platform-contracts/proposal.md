# Change: Define Backend Platform Contracts

## Why

The bootstrap change has delivered the frontend-first MRT dashboard foundation. The remaining Phase 1 backend and data platform decisions should move into a separate change so the bootstrap work can be completed without expanding its scope.

## What Changes

- Define the raw message envelope fields used by ingestion services, including `ingested_at` and `source`.
- Define curated Kafka Streams topic naming and ownership boundaries.
- Define StarRocks Primary Key Table direction for latest-state tables.
- Add backend module skeletons for ingestion, streams, and API after the frontend contract is stable.
- Add local infrastructure notes or compose files for Kafka and StarRocks when backend work begins.

## Out of Scope

- Changing the current Vue MRT dashboard behavior.
- Integrating TDX, YouBike, Civil IoT, or Kafka runtime flows in this change before contracts are accepted.
- Replacing the mock MRT frontend data contract.

## Discussion Conclusion

**Decision**: Defer backend/platform contract details from `bootstrap-twfoundry-platform` into this follow-up change.

**Capture to**: `proposal.md`, `design.md`, `tasks.md`, and `specs/platform-foundation/spec.md`.
