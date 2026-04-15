## Discussion

- [x] Preserve the TWFoundry project brief in `docs/TWFoundry-project-brief.md`.
- [x] Recreate the `bootstrap-twfoundry-platform` Spectra change from the provided architecture text.
- [x] Capture Requirement: Phase 1 Layered Architecture in proposal and design artifacts.
- [x] Capture Requirement: Phase 1 Source Candidates for YouBike, MRT LiveBoard, Civil IoT, and MRT static GTFS.
- [x] Resolve Requirement: MRT-First Frontend Slice as MRT-only and frontend-first.
- [x] Resolve Requirement: Frontend Stack Direction as Bun, Vite, Vue 3, TypeScript, Pinia, Vue Router, Google Maps, scoped CSS, Vitest, and Playwright.
- [x] Resolve Requirement: Implementation Before Coding by deferring backend/data pipeline implementation until frontend contract exists.
- [ ] Resolve Requirement: Current-State Storage Direction as latest-state only or latest-state plus history.
- [x] Resolve Requirement: Dashboard Visualization Direction as MRT route, station markers, station selection, and LiveBoard side panel.
- [x] Choose Requirement: Initial MRT Mock Dataset lines and stations for mock/static data.

## Repository Bootstrap

- [x] Add root README after the SDD proposal is accepted.
- [x] Add frontend module skeleton for Bun + Vite + Vue 3 + TypeScript to implement Requirement: Frontend Stack Direction.
- [x] Add Pinia and Vue Router wiring.
- [x] Add MRT mock data types and fixtures for Red, Blue, and Green lines with three representative stations each to implement Requirement: Initial MRT Mock Dataset.
- [x] Add Vitest unit tests for MRT fixture shape and station lookup behavior to start Requirement: Small Tests Before E2E.
- [x] Add Vitest integration tests for selected station state and MRT layer toggles to continue Requirement: Small Tests Before E2E.
- [x] Add Google Maps provider using `VITE_GOOGLE_MAPS_API_KEY`.
- [x] Add mock map provider using `VITE_MAP_PROVIDER=mock`.
- [x] Add map provider boundary tests for `VITE_MAP_PROVIDER=google | mock`.
- [x] Add Playwright E2E smoke tests for dashboard load, station selection, and layer toggle after unit/integration tests are passing to implement Requirement: Deterministic Map E2E.
- [x] Add GitHub Actions CI for CI Strategy and Requirement: Frontend CI to run Bun install, frontend build/typecheck, Vitest, Playwright browser install, and Playwright E2E.
- [x] Choose Biome as the lint and formatting tool for Requirement: Frontend CI.
- [x] Add Biome lint and formatting CI check after the rule set is chosen.
- [ ] Add backend module skeletons for ingestion, streams, and API after the frontend contract is stable.
- [ ] Add local infrastructure notes or compose files for Kafka and StarRocks after backend work begins.

## Platform Foundation

- [ ] Define Requirement: Raw Topic Direction message envelope with `ingested_at` and `source`.
- [ ] Define curated Kafka Streams topic naming and ownership.
- [ ] Define StarRocks Primary Key Table schemas for current-state tables.
- [x] Define MRT dashboard API resource boundaries from the mock fixture contract.
- [x] Define frontend MRT map layers and dashboard controls.
