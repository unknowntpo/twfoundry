# Change: Bootstrap TWFoundry Platform

## Why

TWFoundry needs a clear Phase 1 foundation before implementation begins. The project brief defines a Palantir Foundry-inspired Taiwan data operating system that integrates public transportation and civil IoT data into a unified dashboard. This change captures that direction as Spectra artifacts so the repository can be bootstrapped consistently.

## What Changes

- Establish TWFoundry as a `twfoundry` repository for a Taiwan data operating system.
- Define the Phase 1 architecture across data sources, ingestion, Kafka Streams processing, StarRocks storage, Spring Boot APIs, and a Vue + Google Maps dashboard.
- Capture the initial public data source candidates: YouBike, TDX Taipei MRT LiveBoard, Civil IoT SensorThings, and MRT static GTFS data.
- Set the first implementation slice as an MRT-only, frontend-first dashboard with mock/static data.
- Use Bun, Vite, Vue 3, TypeScript, Pinia, Vue Router, Google Maps JavaScript API, scoped CSS, and Playwright E2E.
- Use Figma as the visual design source of truth for dashboard layout, map interactions, station panels, and future UI iteration.
- Define the initial topic and table naming direction for raw data, current-state storage, and dashboard-facing APIs.
- Keep the first implementation scope simple and maintainable, with advanced analytics, alerting, and broader city coverage deferred.

## Out of Scope

- Implementing collectors, Kafka Streams processors, REST APIs, or Vue screens in this change.
- Provisioning production infrastructure.
- Finalizing every source-specific API contract.
- Building historical trend analysis, anomaly detection, advanced alerting, or operator workflow automation.
- Supporting data sources beyond the Phase 1 source candidates.
- Integrating YouBike or Civil IoT before the MRT end-to-end path is proven.
- Requiring pixel-perfect implementation parity with Figma before the first MRT dashboard loop is functional.

## Discussion Conclusion

**Decision**: Bootstrap TWFoundry as a simple Phase 1 data platform, but implement from the frontend first. The first demo is an MRT-only Google Maps dashboard that renders static/mock MRT routes, stations, and LiveBoard data before backend ingestion or storage is introduced.

**Rationale**: A frontend-first MRT slice produces a realistic product surface quickly, lets the team validate the dashboard interaction model, and creates a concrete API contract before building ingestion, Kafka Streams, StarRocks, or Spring Boot services.

**Capture to**: `proposal.md`, `design.md`, `tasks.md`, and `openspec/changes/bootstrap-twfoundry-platform/specs/platform-foundation/spec.md`.

## Open Questions

- Should Phase 1 persist only latest state in StarRocks Primary Key Tables, or also retain append-only raw and curated history?
- Which local development stack should be introduced first for Kafka and StarRocks?
- Which Taipei MRT lines and stations should be included in the first mock/static dataset?
