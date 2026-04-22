## Discussion

- [ ] Resolve current-state storage direction as latest-state only or latest-state plus history.
- [x] Define Phase 1 backbone direction as `Redpanda/Kafka -> Stream Processing -> StarRocks`.
- [x] Define source registry fields and datasource onboarding contract.
- [x] Define pluggable datasource connector interface for poll, file, webhook, stream bridge, and backfill methods.
- [x] Define Requirement: raw envelope contract with `source`, `dataset`, `domain`, `ingested_at`, and `payload`.
- [x] Define raw, normalized, state, and dead-letter topic naming and ownership.
- [x] Define StarRocks Primary Key Table direction for latest-state tables.

## Backend Bootstrap

- [x] Define and document the MRT real-data backend MVP slice.
- [x] Add backend module skeletons for ingestion, streams, and API after the frontend contract is stable.
- [ ] Add local infrastructure notes or compose files for Kafka and StarRocks after backend work begins.
- [x] Add starter datasource registry and connector interfaces in code after this change is accepted.
- [x] Add backend E2E tests for the MRT real-data slice.
- [x] Add frontend + backend E2E tests proving MRT train positions, train information, and draggable timeline movement are visible in the web UI.
- [ ] Preserve backend and frontend contract extensibility for both 2D and 3D map views.
- [x] Define a frontend overlay registry contract for MRT route, station, estimated-train, and timeline overlays.
- [x] Implement registry-backed overlay state and overlay visibility toggles in the MRT frontend.
- [x] Run `spectra validate define-backend-platform-contracts`.
