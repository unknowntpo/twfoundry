# platform-foundation Specification

## Purpose

Define TWFoundry's Phase 1 platform foundation: source candidates, frontend-first MRT dashboard scope, map provider boundaries, dashboard design source, and the high-level backend/data platform direction that later changes refine.

## Requirements

### Requirement: Phase 1 Layered Architecture

TWFoundry SHALL define a Phase 1 architecture with data source, ingestion, Kafka Streams, StarRocks storage, Spring Boot API, and Vue + MapLibre frontend layers.

#### Scenario: Stakeholder reviews the platform foundation

- **GIVEN** the TWFoundry project brief exists
- **WHEN** the `bootstrap-twfoundry-platform` change is reviewed
- **THEN** the proposal and design describe the Phase 1 layered architecture and each layer's responsibility


<!-- @trace
source: bootstrap-twfoundry-platform
updated: 2026-04-16
code:
  - frontend/src/features/mrt/data/mrt-fixtures.ts
  - .github/workflows/frontend-ci.yml
  - frontend/src/app/stores/mrt-dashboard.ts
  - frontend/vitest.config.ts
  - frontend/biome.json
  - frontend/src/features/mrt/components/MrtDashboard.vue
  - frontend/package.json
  - frontend/src/style.css
  - frontend/vite.config.ts
  - design/mrt-liveboard-mockup.html
  - frontend/playwright.config.ts
  - frontend/src/features/mrt/components/LayerControl.vue
  - frontend/bun.lockb
  - frontend/src/features/mrt/components/MrtMap.vue
  - frontend/src/app/router.ts
  - frontend/src/shared/config/env.ts
  - frontend/src/features/mrt/components/StationPanel.vue
tests:
  - frontend/src/features/mrt/__tests__/mrt-data.test.ts
-->

---
### Requirement: Phase 1 Source Candidates

TWFoundry SHALL include YouBike realtime station status, TDX Taipei MRT LiveBoard, Civil IoT SensorThings observations, and MRT static GTFS as Phase 1 source candidates.

#### Scenario: Source coverage is evaluated

- **GIVEN** Phase 1 source candidates are documented
- **WHEN** implementation scope is planned
- **THEN** each source candidate has a destination in the ingestion, streaming, storage, API, and dashboard architecture


<!-- @trace
source: bootstrap-twfoundry-platform
updated: 2026-04-16
code:
  - frontend/src/features/mrt/data/mrt-fixtures.ts
  - .github/workflows/frontend-ci.yml
  - frontend/src/app/stores/mrt-dashboard.ts
  - frontend/vitest.config.ts
  - frontend/biome.json
  - frontend/src/features/mrt/components/MrtDashboard.vue
  - frontend/package.json
  - frontend/src/style.css
  - frontend/vite.config.ts
  - design/mrt-liveboard-mockup.html
  - frontend/playwright.config.ts
  - frontend/src/features/mrt/components/LayerControl.vue
  - frontend/bun.lockb
  - frontend/src/features/mrt/components/MrtMap.vue
  - frontend/src/app/router.ts
  - frontend/src/shared/config/env.ts
  - frontend/src/features/mrt/components/StationPanel.vue
tests:
  - frontend/src/features/mrt/__tests__/mrt-data.test.ts
-->

---
### Requirement: MRT-First Frontend Slice

TWFoundry SHALL implement the first executable Phase 1 slice as an MRT-only frontend dashboard using mock/static data before backend ingestion, storage, or API services are required.

#### Scenario: First demo is built

- **GIVEN** the first implementation slice is planned
- **WHEN** the team starts application work
- **THEN** the frontend dashboard can render MRT routes, MRT station markers, station selection, and a LiveBoard panel from mock/static data


<!-- @trace
source: bootstrap-twfoundry-platform
updated: 2026-04-16
code:
  - frontend/src/features/mrt/data/mrt-fixtures.ts
  - .github/workflows/frontend-ci.yml
  - frontend/src/app/stores/mrt-dashboard.ts
  - frontend/vitest.config.ts
  - frontend/biome.json
  - frontend/src/features/mrt/components/MrtDashboard.vue
  - frontend/package.json
  - frontend/src/style.css
  - frontend/vite.config.ts
  - design/mrt-liveboard-mockup.html
  - frontend/playwright.config.ts
  - frontend/src/features/mrt/components/LayerControl.vue
  - frontend/bun.lockb
  - frontend/src/features/mrt/components/MrtMap.vue
  - frontend/src/app/router.ts
  - frontend/src/shared/config/env.ts
  - frontend/src/features/mrt/components/StationPanel.vue
tests:
  - frontend/src/features/mrt/__tests__/mrt-data.test.ts
-->

---
### Requirement: Initial MRT Mock Dataset

TWFoundry SHALL seed the first mock/static MRT dataset with Red, Blue, and Green line examples, using three representative stations per line.

#### Scenario: Mock fixtures are created

- **GIVEN** the MRT-first frontend slice is implemented
- **WHEN** mock MRT fixtures are added
- **THEN** the fixtures include Red Line stations Taipei Main Station, Daan, and Xiangshan; Blue Line stations Taipei Main Station, Zhongxiao Fuxing, and Taipei City Hall; and Green Line stations Ximen, Chiang Kai-shek Memorial Hall, and Nanjing Fuxing


<!-- @trace
source: bootstrap-twfoundry-platform
updated: 2026-04-16
code:
  - frontend/src/features/mrt/data/mrt-fixtures.ts
  - .github/workflows/frontend-ci.yml
  - frontend/src/app/stores/mrt-dashboard.ts
  - frontend/vitest.config.ts
  - frontend/biome.json
  - frontend/src/features/mrt/components/MrtDashboard.vue
  - frontend/package.json
  - frontend/src/style.css
  - frontend/vite.config.ts
  - design/mrt-liveboard-mockup.html
  - frontend/playwright.config.ts
  - frontend/src/features/mrt/components/LayerControl.vue
  - frontend/bun.lockb
  - frontend/src/features/mrt/components/MrtMap.vue
  - frontend/src/app/router.ts
  - frontend/src/shared/config/env.ts
  - frontend/src/features/mrt/components/StationPanel.vue
tests:
  - frontend/src/features/mrt/__tests__/mrt-data.test.ts
-->

---
### Requirement: Raw Topic Direction

TWFoundry SHALL define initial raw Kafka topic names for YouBike, MRT LiveBoard, Civil IoT, and MRT static data.

#### Scenario: Ingestion services publish source data

- **GIVEN** a Phase 1 ingestion service receives source API data
- **WHEN** it publishes the raw record
- **THEN** the record is sent to the appropriate raw topic and includes ingestion metadata such as `ingested_at` and `source`


<!-- @trace
source: bootstrap-twfoundry-platform
updated: 2026-04-16
code:
  - frontend/src/features/mrt/data/mrt-fixtures.ts
  - .github/workflows/frontend-ci.yml
  - frontend/src/app/stores/mrt-dashboard.ts
  - frontend/vitest.config.ts
  - frontend/biome.json
  - frontend/src/features/mrt/components/MrtDashboard.vue
  - frontend/package.json
  - frontend/src/style.css
  - frontend/vite.config.ts
  - design/mrt-liveboard-mockup.html
  - frontend/playwright.config.ts
  - frontend/src/features/mrt/components/LayerControl.vue
  - frontend/bun.lockb
  - frontend/src/features/mrt/components/MrtMap.vue
  - frontend/src/app/router.ts
  - frontend/src/shared/config/env.ts
  - frontend/src/features/mrt/components/StationPanel.vue
tests:
  - frontend/src/features/mrt/__tests__/mrt-data.test.ts
-->

---
### Requirement: Current-State Storage Direction

TWFoundry SHALL use StarRocks as the Phase 1 analytical storage layer and SHALL use Primary Key Table design for latest-state tables where records need to be updated.

#### Scenario: Dashboard reads latest operational state

- **GIVEN** normalized records have been processed from raw source data
- **WHEN** the dashboard requests current station or observation state
- **THEN** the API can read a latest-state representation from StarRocks

#### Scenario: Operator replays recent timeline history

- **GIVEN** a source requires short-window operational replay
- **WHEN** the dashboard requests recent historical state
- **THEN** the API can read bounded timeline snapshots through a storage boundary without replacing the latest-state serving contract


<!-- @trace
source: bootstrap-twfoundry-platform
updated: 2026-04-27
code:
  - frontend/src/features/mrt/data/mrt-fixtures.ts
  - .github/workflows/frontend-ci.yml
  - frontend/src/app/stores/mrt-dashboard.ts
  - frontend/vitest.config.ts
  - frontend/biome.json
  - frontend/src/features/mrt/components/MrtDashboard.vue
  - frontend/package.json
  - frontend/src/style.css
  - frontend/vite.config.ts
  - design/mrt-liveboard-mockup.html
  - frontend/playwright.config.ts
  - frontend/src/features/mrt/components/LayerControl.vue
  - frontend/bun.lockb
  - frontend/src/features/mrt/components/MrtMap.vue
  - frontend/src/app/router.ts
  - frontend/src/shared/config/env.ts
  - frontend/src/features/mrt/components/StationPanel.vue
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardTimelineStore.java
tests:
  - frontend/src/features/mrt/__tests__/mrt-data.test.ts
-->

---
### Requirement: Frontend Stack Direction

TWFoundry SHALL use Bun, Vite, Vue 3, TypeScript, Pinia, Vue Router, MapLibre GL, Vue scoped CSS, Vitest, and Playwright for the first frontend implementation.

#### Scenario: Frontend project is scaffolded

- **GIVEN** the MRT-first dashboard is implemented
- **WHEN** dependencies and project structure are selected
- **THEN** the project uses the agreed frontend stack and does not require backend services to run the first mock dashboard


<!-- @trace
source: bootstrap-twfoundry-platform
updated: 2026-04-16
code:
  - frontend/src/features/mrt/data/mrt-fixtures.ts
  - .github/workflows/frontend-ci.yml
  - frontend/src/app/stores/mrt-dashboard.ts
  - frontend/vitest.config.ts
  - frontend/biome.json
  - frontend/src/features/mrt/components/MrtDashboard.vue
  - frontend/package.json
  - frontend/src/style.css
  - frontend/vite.config.ts
  - design/mrt-liveboard-mockup.html
  - frontend/playwright.config.ts
  - frontend/src/features/mrt/components/LayerControl.vue
  - frontend/bun.lockb
  - frontend/src/features/mrt/components/MrtMap.vue
  - frontend/src/app/router.ts
  - frontend/src/shared/config/env.ts
  - frontend/src/features/mrt/components/StationPanel.vue
tests:
  - frontend/src/features/mrt/__tests__/mrt-data.test.ts
-->

---
### Requirement: Small Tests Before E2E

TWFoundry SHALL cover the first frontend slice with unit and integration tests before relying on Playwright E2E.

#### Scenario: Frontend tests are introduced

- **GIVEN** MRT mock fixtures, station selection state, layer toggles, and map provider selection exist
- **WHEN** tests are added
- **THEN** Vitest covers fixture shape, station lookup behavior, selected station state, MRT layer toggles, and map provider boundary behavior before Playwright smoke tests are added


<!-- @trace
source: bootstrap-twfoundry-platform
updated: 2026-04-16
code:
  - frontend/src/features/mrt/data/mrt-fixtures.ts
  - .github/workflows/frontend-ci.yml
  - frontend/src/app/stores/mrt-dashboard.ts
  - frontend/vitest.config.ts
  - frontend/biome.json
  - frontend/src/features/mrt/components/MrtDashboard.vue
  - frontend/package.json
  - frontend/src/style.css
  - frontend/vite.config.ts
  - design/mrt-liveboard-mockup.html
  - frontend/playwright.config.ts
  - frontend/src/features/mrt/components/LayerControl.vue
  - frontend/bun.lockb
  - frontend/src/features/mrt/components/MrtMap.vue
  - frontend/src/app/router.ts
  - frontend/src/shared/config/env.ts
  - frontend/src/features/mrt/components/StationPanel.vue
tests:
  - frontend/src/features/mrt/__tests__/mrt-data.test.ts
-->

---
### Requirement: Dashboard Visualization Direction

TWFoundry SHALL use Vue 3, Pinia, and MapLibre GL for the Phase 1 dashboard.

#### Scenario: User opens the Phase 1 dashboard

- **GIVEN** MRT mock/static data exists
- **WHEN** the dashboard loads
- **THEN** it can display MRT route polylines, MRT station markers, and station LiveBoard information

#### Scenario: MapLibre basemap covers Taiwan

- **GIVEN** `VITE_MAPLIBRE_STYLE_URL` is not configured
- **WHEN** the MRT dashboard initializes MapLibre
- **THEN** the map uses the default OpenFreeMap style instead of MapLibre demo tiles
- **AND** a raster tile fallback remains configurable through `VITE_MAPLIBRE_RASTER_TILES_URL`


<!-- @trace
source: bootstrap-twfoundry-platform
updated: 2026-04-27
code:
  - frontend/src/features/mrt/data/mrt-fixtures.ts
  - .github/workflows/frontend-ci.yml
  - frontend/src/app/stores/mrt-dashboard.ts
  - frontend/vitest.config.ts
  - frontend/biome.json
  - frontend/src/features/mrt/components/MrtDashboard.vue
  - frontend/package.json
  - frontend/src/style.css
  - frontend/vite.config.ts
  - design/mrt-liveboard-mockup.html
  - frontend/playwright.config.ts
  - frontend/src/features/mrt/components/LayerControl.vue
  - frontend/bun.lockb
  - frontend/src/features/mrt/components/MrtMap.vue
  - frontend/src/app/router.ts
  - frontend/src/shared/config/env.ts
  - frontend/src/features/mrt/components/StationPanel.vue
tests:
  - frontend/src/features/mrt/__tests__/mrt-data.test.ts
  - frontend/src/shared/config/env.test.ts
-->

---
### Requirement: Dashboard Design Source

TWFoundry SHALL use a committed dashboard design mockup as the current visual design source of truth for the MRT dashboard user interface.

#### Scenario: Dashboard UI is designed

- **GIVEN** the MRT-first frontend slice is being designed
- **WHEN** dashboard layout, marker interaction, LiveBoard panel states, layer controls, or responsive behavior are changed
- **THEN** the change is represented in the committed design source or synchronized back to it after implementation validation

#### Scenario: Design source is shared with the project

- **GIVEN** a committed dashboard design mockup exists
- **WHEN** project documentation is updated
- **THEN** the design source reference is recorded without requiring secrets or private credentials in the repository


<!-- @trace
source: bootstrap-twfoundry-platform
updated: 2026-04-16
code:
  - frontend/src/features/mrt/data/mrt-fixtures.ts
  - .github/workflows/frontend-ci.yml
  - frontend/src/app/stores/mrt-dashboard.ts
  - frontend/vitest.config.ts
  - frontend/biome.json
  - frontend/src/features/mrt/components/MrtDashboard.vue
  - frontend/package.json
  - frontend/src/style.css
  - frontend/vite.config.ts
  - design/mrt-liveboard-mockup.html
  - frontend/playwright.config.ts
  - frontend/src/features/mrt/components/LayerControl.vue
  - frontend/bun.lockb
  - frontend/src/features/mrt/components/MrtMap.vue
  - frontend/src/app/router.ts
  - frontend/src/shared/config/env.ts
  - frontend/src/features/mrt/components/StationPanel.vue
tests:
  - frontend/src/features/mrt/__tests__/mrt-data.test.ts
-->

---
### Requirement: Deterministic Map E2E

TWFoundry SHALL provide a mock map provider for Playwright E2E tests while preserving MapLibre GL for local/demo usage.

#### Scenario: E2E tests run

- **GIVEN** Playwright tests are executed
- **WHEN** `VITE_MAP_PROVIDER=mock` is configured
- **THEN** tests can verify dashboard load, station selection, and layer toggling without requiring map tile network access


<!-- @trace
source: bootstrap-twfoundry-platform
updated: 2026-04-16
code:
  - frontend/src/features/mrt/data/mrt-fixtures.ts
  - .github/workflows/frontend-ci.yml
  - frontend/src/app/stores/mrt-dashboard.ts
  - frontend/vitest.config.ts
  - frontend/biome.json
  - frontend/src/features/mrt/components/MrtDashboard.vue
  - frontend/package.json
  - frontend/src/style.css
  - frontend/vite.config.ts
  - design/mrt-liveboard-mockup.html
  - frontend/playwright.config.ts
  - frontend/src/features/mrt/components/LayerControl.vue
  - frontend/bun.lockb
  - frontend/src/features/mrt/components/MrtMap.vue
  - frontend/src/app/router.ts
  - frontend/src/shared/config/env.ts
  - frontend/src/features/mrt/components/StationPanel.vue
tests:
  - frontend/src/features/mrt/__tests__/mrt-data.test.ts
-->

---
### Requirement: Map View Extensibility

TWFoundry SHALL keep map-facing contracts extensible for both 2D and 3D presentation modes.

#### Scenario: Renderer receives view mode

- **GIVEN** a frontend overlay renderer receives map context
- **WHEN** the dashboard switches between flat map and 3D-capable presentation
- **THEN** the render context exposes `2d` or `3d` view mode without changing overlay identity

#### Scenario: Coordinates remain 3D-compatible

- **GIVEN** future moving-object domains may include altitude
- **WHEN** coordinates are represented in frontend map contracts
- **THEN** they can include optional altitude while preserving existing latitude and longitude behavior

<!-- @trace
source: define-backend-platform-contracts
updated: 2026-04-27
code:
  - frontend/src/features/mrt/types.ts
  - frontend/src/features/mrt/map/overlay-registry.ts
-->


<!-- @trace
source: define-backend-platform-contracts
updated: 2026-04-27
code:
  - frontend/package.json
  - infra/redpanda/docker-compose.yml
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardTimelineStore.java
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/PushSource.java
  - gradlew
  - README.md
  - docs/git-worktree-layout.md
  - frontend/src/shared/components/BaseButton.vue
  - gradle/wrapper/gradle-wrapper.jar
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/Lifecycle.java
  - frontend/src/features/design-system/components/DesignSystemPage.vue
  - gradle/wrapper/gradle-wrapper.properties
  - backend/ingestion/build.gradle.kts
  - frontend/src/features/mrt/data/mrt-network.generated.ts
  - docs/redpanda-local-dev.md
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/TopicNames.java
  - infra/starrocks/sql/bootstrap.sql
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardService.java
  - frontend/src/shared/design/tokens.css
  - frontend/src/shared/components/BaseCard.vue
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/TdxProperties.java
  - docs/TWFoundry-project-brief.md
  - frontend/src/features/mrt/line-names.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/Datasource.java
  - frontend/playwright.fullstack.config.ts
  - frontend/src/shared/components/BaseBadge.vue
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/E2eTdxLiveBoardGateway.java
  - frontend/src/shared/components/LocaleSwitcher.vue
  - docs/tdx-mrt-api-exploration.md
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/api/MrtLiveBoardController.java
  - frontend/bun.lockb
  - infra/starrocks/docker-compose.yml
  - gradlew.bat
  - backend/common/build.gradle.kts
  - frontend/src/app/router.ts
  - frontend/src/features/mrt/localized-text.ts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/IngestionApplication.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardBackfillStateStore.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/IngestionJobRequest.java
  - frontend/src/features/mrt/tdx/normalize.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/IngestionMethod.java
  - frontend/src/features/mrt/api/tdx-liveboard.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/RawEnvelope.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/TdxHttpLiveBoardGateway.java
  - docs/starrocks-vs-iceberg-evolution-note.md
  - frontend/src/features/mrt/data/mrt-fixtures.ts
  - frontend/src/features/mrt/map/map-provider.ts
  - docs/overlay-registry-design-note.md
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/TdxLiveBoardGateway.java
  - frontend/scripts/tdx-proxy.ts
  - frontend/src/features/mrt/map/inferred-trains.ts
  - frontend/src/features/mrt/components/LayerControl.vue
  - frontend/biome.json
  - frontend/src/features/mrt/components/MrtDashboard.vue
  - AGENTS.md
  - backend/ingestion/src/main/resources/application.properties
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/PullBatch.java
  - docs/starrocks-local-dev.md
  - frontend/src/style.css
  - frontend/src/features/mrt/components/MrtMap.vue
  - settings.gradle.kts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardBackfillStateStore.java
  - backend/streams/build.gradle.kts
  - frontend/src/main.ts
  - frontend/src/shared/config/env.ts
  - frontend/src/shared/components/BasePanel.vue
  - backend/ingestion/src/main/resources/schema.sql
  - frontend/src/features/mrt/types.ts
  - gradle/libs.versions.toml
  - frontend/src/features/mrt/tdx/proxy-core.ts
  - backend/api/build.gradle.kts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/IngestionJobService.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/IngestionJobRunner.java
  - frontend/src/env.d.ts
  - backend/storage/build.gradle.kts
  - frontend/src/shared/i18n/index.ts
  - frontend/src/features/mrt/map/overlay-registry.ts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardTimelineStore.java
  - build.gradle.kts
  - frontend/src/app/stores/mrt-dashboard.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/RunMode.java
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/PullSource.java
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/SourceDescriptor.java
  - frontend/src/features/mrt/components/StationPanel.vue
  - frontend/src/shared/i18n/locale.ts
  - frontend/src/shared/components/BaseSectionLabel.vue
  - frontend/src/shared/i18n/messages.ts
  - frontend/.env.example
tests:
  - frontend/tests/e2e/mrt-dashboard.spec.ts
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardBackfillStateStoreE2eTest.java
  - frontend/src/features/mrt/__tests__/inferred-trains.test.ts
  - frontend/tests/e2e/design-system.spec.ts
  - frontend/src/shared/i18n/locale.test.ts
  - frontend/src/features/mrt/__tests__/mrt-dashboard-live-mode.test.ts
  - frontend/src/features/mrt/__tests__/overlay-registry.test.ts
  - frontend/src/features/mrt/__tests__/map-provider.test.ts
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/IngestionJobServiceTest.java
  - frontend/src/features/mrt/__tests__/tdx-liveboard-api.test.ts
  - frontend/src/features/mrt/__tests__/mrt-store.test.ts
  - backend/common/src/test/java/io/twfoundry/backend/common/domain/TopicNamesTest.java
  - backend/ingestion/src/test/resources/application-e2e.properties
  - frontend/src/features/mrt/__tests__/tdx-proxy.test.ts
  - frontend/src/features/mrt/__tests__/mrt-store-liveboard-source.test.ts
  - frontend/src/shared/config/env.test.ts
  - frontend/src/features/mrt/__tests__/mrt-data.test.ts
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/api/MrtLiveBoardControllerE2eTest.java
  - frontend/src/features/mrt/__tests__/tdx-normalize.test.ts
  - frontend/tests/e2e/fullstack.spec.ts
-->

---
### Requirement: Frontend CI

TWFoundry SHALL run frontend validation in CI for pull requests and pushes to the main branch.

#### Scenario: CI validates the frontend slice

- **GIVEN** frontend code changes are pushed or proposed in a pull request
- **WHEN** CI runs
- **THEN** CI installs frontend dependencies with Bun, runs the production build for TypeScript type checking, runs Vitest unit and integration tests, installs the Playwright Chromium browser, and runs Playwright E2E smoke tests in mock-map mode

#### Scenario: Linting is introduced

- **GIVEN** the project chooses a linting and formatting rule set
- **WHEN** the CI workflow is updated
- **THEN** CI includes a lint or formatting check alongside build, unit/integration tests, and E2E tests


<!-- @trace
source: bootstrap-twfoundry-platform
updated: 2026-04-16
code:
  - frontend/src/features/mrt/data/mrt-fixtures.ts
  - .github/workflows/frontend-ci.yml
  - frontend/src/app/stores/mrt-dashboard.ts
  - frontend/vitest.config.ts
  - frontend/biome.json
  - frontend/src/features/mrt/components/MrtDashboard.vue
  - frontend/package.json
  - frontend/src/style.css
  - frontend/vite.config.ts
  - design/mrt-liveboard-mockup.html
  - frontend/playwright.config.ts
  - frontend/src/features/mrt/components/LayerControl.vue
  - frontend/bun.lockb
  - frontend/src/features/mrt/components/MrtMap.vue
  - frontend/src/app/router.ts
  - frontend/src/shared/config/env.ts
  - frontend/src/features/mrt/components/StationPanel.vue
tests:
  - frontend/src/features/mrt/__tests__/mrt-data.test.ts
-->

---
### Requirement: Implementation Before Coding

TWFoundry SHALL resolve or explicitly defer Phase 1 bootstrap questions before application implementation code is added.

#### Scenario: Developer starts repository work

- **GIVEN** the `bootstrap-twfoundry-platform` change has unresolved implementation-order questions
- **WHEN** implementation is requested
- **THEN** the unresolved questions are resolved or explicitly deferred before scaffolding application code

<!-- @trace
source: bootstrap-twfoundry-platform
updated: 2026-04-16
code:
  - frontend/src/features/mrt/data/mrt-fixtures.ts
  - .github/workflows/frontend-ci.yml
  - frontend/src/app/stores/mrt-dashboard.ts
  - frontend/vitest.config.ts
  - frontend/biome.json
  - frontend/src/features/mrt/components/MrtDashboard.vue
  - frontend/package.json
  - frontend/src/style.css
  - frontend/vite.config.ts
  - design/mrt-liveboard-mockup.html
  - frontend/playwright.config.ts
  - frontend/src/features/mrt/components/LayerControl.vue
  - frontend/bun.lockb
  - frontend/src/features/mrt/components/MrtMap.vue
  - frontend/src/app/router.ts
  - frontend/src/shared/config/env.ts
  - frontend/src/features/mrt/components/StationPanel.vue
tests:
  - frontend/src/features/mrt/__tests__/mrt-data.test.ts
-->

---
### Requirement: Opt-In TDX LiveBoard Source

TWFoundry SHALL provide an opt-in TDX Taipei MRT LiveBoard source for the MRT dashboard while preserving mock LiveBoard data as the default.

#### Scenario: Dashboard uses mock by default

- **GIVEN** no live data source is configured
- **WHEN** the MRT dashboard runs
- **THEN** LiveBoard rows come from the existing mock fixtures

#### Scenario: Dashboard uses TDX through local proxy

- **GIVEN** `VITE_MRT_LIVEBOARD_SOURCE=tdx` and a running local TDX proxy
- **WHEN** a user selects an MRT station
- **THEN** the dashboard requests normalized LiveBoard rows from the proxy without exposing TDX credentials to browser code


<!-- @trace
source: connect-tdx-liveboard-source
updated: 2026-04-16
code:
  - frontend/src/app/stores/mrt-dashboard.ts
  - frontend/src/features/mrt/api/tdx-liveboard.ts
  - frontend/src/features/mrt/tdx/normalize.ts
  - frontend/src/features/mrt/tdx/proxy-core.ts
  - frontend/src/shared/config/env.ts
  - frontend/scripts/tdx-proxy.ts
tests:
  - frontend/src/features/mrt/__tests__/mrt-store-liveboard-source.test.ts
  - frontend/src/features/mrt/__tests__/tdx-normalize.test.ts
  - frontend/src/features/mrt/__tests__/tdx-proxy.test.ts
-->

---
### Requirement: TDX Proxy Safety

TWFoundry SHALL keep TDX client credentials server-side and SHALL rate-limit outbound TDX LiveBoard API calls to no more than 5 calls per second.

#### Scenario: Proxy calls TDX

- **GIVEN** `TDX_CLIENT_ID` and `TDX_CLIENT_SECRET` are configured for the proxy process
- **WHEN** the proxy calls TDX
- **THEN** it uses Client Credentials token exchange, caches the access token, applies the configured API rate limit, and returns safe JSON responses

<!-- @trace
source: connect-tdx-liveboard-source
updated: 2026-04-16
code:
  - frontend/src/features/mrt/tdx/proxy-core.ts
  - frontend/scripts/tdx-proxy.ts
tests:
  - frontend/src/features/mrt/__tests__/tdx-proxy.test.ts
-->

---
### Requirement: Foldable Dashboard Sidebars

TWFoundry SHALL allow the MRT dashboard's Layers sidebar and Station Detail panel to be collapsed and expanded independently while preserving the current dashboard state.

#### Scenario: User collapses the Layers sidebar

- **GIVEN** the MRT dashboard is open with one or more visible MRT route filters
- **WHEN** the user collapses the Layers sidebar
- **THEN** the map expands into the freed space, the existing route visibility selections remain unchanged, and the outer icon rail provides the compact icon-only expand affordance without rendering a second collapsed sidebar rail

#### Scenario: User collapses the Station Detail panel

- **GIVEN** an MRT station is selected and its LiveBoard panel is visible
- **WHEN** the user collapses the Station Detail panel
- **THEN** the map expands into the freed space, the selected station and LiveBoard state remain available when the panel is expanded again, and the collapsed control remains a compact icon-only affordance

#### Scenario: User operates collapse controls with assistive technology

- **GIVEN** the dashboard sidebars can be collapsed
- **WHEN** a user focuses a sidebar collapse control
- **THEN** the control communicates which panel it affects and whether that panel is expanded or collapsed

#### Scenario: User refreshes visible LiveBoard rows

- **GIVEN** the Station Detail panel is expanded
- **WHEN** the user activates Refresh
- **THEN** the dashboard reloads the selected station's LiveBoard rows without changing the selected station

#### Scenario: Dashboard communicates the active LiveBoard source

- **GIVEN** the dashboard is configured for mock or TDX LiveBoard rows
- **WHEN** the dashboard renders its monitoring chrome
- **THEN** the visible source label reflects the configured LiveBoard source instead of always displaying mock data

<!-- @trace
source: make-dashboard-sidebars-foldable
updated: 2026-04-16
code:
  - frontend/src/features/mrt/components/StationPanel.vue
  - frontend/src/features/mrt/components/MrtDashboard.vue
tests:
  - frontend/tests/e2e/mrt-dashboard.spec.ts
-->

---
### Requirement: TWFoundry Design System

TWFoundry SHALL define a light-mode design system for the frontend dashboard that documents reusable visual tokens, typography, spacing, component patterns, and usage rules.

#### Scenario: Developer reviews frontend visual foundations

- **GIVEN** the frontend dashboard exists
- **WHEN** a developer opens the Design System page
- **THEN** the page documents TWFoundry design principles, color tokens, typography roles, spacing scale, and reusable component patterns

#### Scenario: Dashboard uses transit-aware visual tokens

- **GIVEN** MRT route and LiveBoard UI elements are displayed
- **WHEN** route, status, panel, and text styling are applied
- **THEN** the UI uses named design tokens and semantic MRT route colors instead of unrelated stock-market or decorative styling

#### Scenario: Design system preserves product context

- **GIVEN** the design system is inspired by an external light-mode study
- **WHEN** examples are added to TWFoundry
- **THEN** examples use Taiwan transit, MRT, map, LiveBoard, and data operating system concepts rather than finance dashboard concepts

#### Scenario: Design system prevents UI drift

- **GIVEN** future dashboard UI changes are planned
- **WHEN** a developer needs color, spacing, typography, card, badge, table, or control guidance
- **THEN** the Design System page provides explicit usage rules and examples that can be reused by product surfaces

#### Scenario: First-pass library decision is reviewed

- **GIVEN** TWFoundry is implemented with Vue 3 and scoped CSS
- **WHEN** a developer reviews UI library choices for the first design system pass
- **THEN** the design system documents the trade-offs for local Vue components, shadcn/ui, shadcn-vue, Ant Design Vue, and headless primitives, and selects local Vue components plus CSS tokens for the first pass

<!-- @trace
source: define-twfoundry-design-system
updated: 2026-04-17
code:
  - frontend/biome.json
  - frontend/src/features/mrt/components/MrtDashboard.vue
  - frontend/src/shared/components/BaseBadge.vue
  - frontend/src/features/design-system/components/DesignSystemPage.vue
  - frontend/src/shared/components/BaseSectionLabel.vue
  - frontend/src/shared/components/BaseButton.vue
  - frontend/src/shared/components/BasePanel.vue
  - frontend/src/app/router.ts
  - frontend/.DS_Store
  - frontend/src/shared/design/tokens.css
  - frontend/scripts/test.html
  - frontend/src/shared/components/BaseCard.vue
  - frontend/src/style.css
tests:
  - frontend/tests/e2e/design-system.spec.ts
-->

---
### Requirement: Dashboard Uses TWFoundry Design System

TWFoundry SHALL apply the documented frontend design system to the MRT dashboard without changing the dashboard's functional behavior.

#### Scenario: Dashboard uses shared visual tokens

- **GIVEN** TWFoundry design tokens exist
- **WHEN** the MRT dashboard renders shell, sidebars, station panels, LiveBoard rows, route controls, and map overlay affordances
- **THEN** matching colors, borders, spacing, text roles, and surfaces use TWFoundry design tokens instead of one-off values

#### Scenario: Dashboard preserves map-first behavior

- **GIVEN** the design system is applied to dashboard components
- **WHEN** a user opens the MRT dashboard
- **THEN** the map remains the primary visual surface and existing station selection, layer toggle, foldable sidebar, mock map, MapLibre map, and TDX opt-in behavior remain unchanged

#### Scenario: Timeline control uses shared dashboard grammar

- **GIVEN** the MRT dashboard renders the replay timeline on desktop width
- **WHEN** the footer timeline chrome is shown
- **THEN** playback transport controls, snapshot metadata, and scrubber feedback are separated into distinct grouped surfaces instead of one flat control row
- **AND** the timeline shows the current snapshot time, feed freshness, feed/source label, and replay position while preserving live, pause, and replay behavior

#### Scenario: Dashboard avoids premature UI kit adoption

- **GIVEN** the design system can be implemented with local Vue components and CSS tokens
- **WHEN** dashboard components are refactored
- **THEN** the implementation does not add Ant Design Vue, shadcn-vue, shadcn React, or other UI kit dependencies

<!-- @trace
source: apply-design-system-to-mrt-dashboard
updated: 2026-04-23
code:
  - frontend/src/features/mrt/components/MrtDashboard.vue
  - frontend/src/features/design-system/components/DesignSystemPage.vue
  - frontend/src/shared/i18n/messages.ts
  - frontend/.DS_Store
  - frontend/src/features/mrt/components/MrtMap.vue
  - frontend/src/shared/design/tokens.css
  - frontend/src/features/mrt/components/LayerControl.vue
  - frontend/src/features/mrt/components/StationPanel.vue
  - frontend/scripts/test.html
-->

---
### Requirement: Responsive Dashboard Breakpoints

TWFoundry SHALL define shared frontend breakpoint rules for dashboard and design system responsive behavior.

#### Scenario: Developer reviews responsive design rules

- **GIVEN** the frontend Design System page exists
- **WHEN** a developer reviews responsive guidance
- **THEN** the page documents mobile, tablet, and desktop breakpoint thresholds and their intended dashboard behavior

#### Scenario: Dashboard reaches desktop width

- **GIVEN** the viewport is at least 1024px wide
- **WHEN** the MRT dashboard renders
- **THEN** the full map-first desktop layout can show topbar, icon rail, layer controls, map, station detail, and timeline

#### Scenario: Dashboard reaches tablet width

- **GIVEN** the viewport is between 640px and 1023px wide
- **WHEN** the MRT dashboard renders
- **THEN** the layout keeps the map primary and avoids persistent left and right sidebars that squeeze the map
- **AND** compact controls can reveal Layers, Station Detail, and Timeline panels on demand

#### Scenario: Dashboard reaches mobile width

- **GIVEN** the viewport is 639px wide or narrower
- **WHEN** the MRT dashboard renders
- **THEN** the layout uses a single-column map-first mode without wide sidebars or icon rail
- **AND** compact controls can reveal Layers, Station Detail, and Timeline panels without showing collapsed desktop rails

#### Scenario: Breakpoints remain consistent

- **GIVEN** dashboard and design system components need responsive CSS
- **WHEN** media queries are added or updated
- **THEN** they use the shared mobile, tablet, and desktop thresholds instead of component-specific ad hoc values such as 840px or 860px

<!-- @trace
source: define-responsive-dashboard-breakpoints
updated: 2026-04-17
code:
  - frontend/src/shared/design/tokens.css
  - frontend/scripts/test.html
  - frontend/src/features/mrt/components/MrtDashboard.vue
  - frontend/.DS_Store
  - frontend/src/features/design-system/components/DesignSystemPage.vue
  - frontend/src/features/mrt/components/MrtMap.vue
  - frontend/src/features/mrt/components/StationPanel.vue
tests:
  - frontend/tests/e2e/design-system.spec.ts
-->

---
### Requirement: Frontend i18n Foundation

TWFoundry SHALL provide a frontend internationalization foundation for user-facing product copy in the Vue application.

#### Scenario: App starts with default locale

- **GIVEN** no valid locale preference exists
- **WHEN** the frontend app starts
- **THEN** the UI uses `en-US` copy by default

#### Scenario: User switches locale

- **GIVEN** the dashboard is open
- **WHEN** the user selects `zh-TW`
- **THEN** primary dashboard chrome, panel headings, controls, and documentation navigation use Traditional Chinese copy
- **AND** the selected locale is persisted for future page loads

#### Scenario: Domain data remains source-owned

- **GIVEN** MRT station names, route names, mock arrivals, or TDX rows are displayed
- **WHEN** locale changes
- **THEN** source-owned transit data is not rewritten through product-copy dictionaries

#### Scenario: Design system documents i18n guidance

- **GIVEN** a developer reviews the Design System page
- **WHEN** they look for copy rules
- **THEN** the page explains where user-facing product copy should live and which domain data is out of scope for first-pass translation

#### Scenario: Design system documents Traditional Chinese typography

- **GIVEN** the frontend supports `zh-TW`
- **WHEN** a developer reviews typography guidance
- **THEN** the Design System page documents Traditional Chinese font fallbacks, no negative letter spacing, and readable line-height expectations

<!-- @trace
source: add-frontend-i18n-foundation
updated: 2026-04-22
code:
  - frontend/src/shared/design/tokens.css
  - frontend/bun.lockb
  - frontend/src/features/mrt/components/LayerControl.vue
  - frontend/src/features/design-system/components/DesignSystemPage.vue
  - frontend/src/shared/i18n/locale.ts
  - frontend/src/features/mrt/components/MrtMap.vue
  - frontend/src/shared/components/LocaleSwitcher.vue
  - frontend/src/main.ts
  - frontend/src/shared/i18n/messages.ts
  - frontend/.DS_Store
  - frontend/package.json
  - frontend/src/shared/i18n/index.ts
  - frontend/src/features/mrt/components/StationPanel.vue
  - frontend/scripts/test.html
  - frontend/src/features/mrt/components/MrtDashboard.vue
tests:
  - frontend/src/shared/i18n/locale.test.ts
  - frontend/tests/e2e/design-system.spec.ts
  - frontend/tests/e2e/mrt-dashboard.spec.ts
-->

---
### Requirement: Dashboard Common Components

TWFoundry SHALL document a common component catalog for the map-first dashboard in the Design System page.

#### Scenario: Developer reviews dashboard component inventory

- **GIVEN** the Design System page exists
- **WHEN** a developer reviews dashboard primitives
- **THEN** the page lists common dashboard components and groups them by action, feedback, overlay, data display, and map chrome

#### Scenario: Developer reviews overlay guidance

- **GIVEN** future dashboard interactions may need overlays
- **WHEN** a developer reviews the Design System page
- **THEN** the page defines intended use for Dialog, Toast, and Drawer / Sheet

#### Scenario: Developer checks current product fit

- **GIVEN** the MRT dashboard already ships some primitives
- **WHEN** the Design System page is reviewed
- **THEN** the page marks which common components are already implemented, partially matched, or still missing
- **AND** `TimelineControl` is documented as an implemented map-chrome primitive instead of a placeholder

<!-- @trace
source: define-dashboard-common-components
updated: 2026-04-23
code:
  - frontend/src/features/design-system/components/DesignSystemPage.vue
  - frontend/src/features/mrt/components/MrtDashboard.vue
  - frontend/src/shared/i18n/messages.ts
  - frontend/scripts/test.html
  - frontend/.DS_Store
-->

---
### Requirement: Backend Platform Contracts

TWFoundry SHALL define backend and data-platform contracts before implementing Phase 1 ingestion, streaming, storage, or API runtime flows.

#### Scenario: Backend work is planned after frontend bootstrap

- **GIVEN** the MRT-first frontend dashboard contract exists
- **WHEN** backend platform implementation is planned
- **THEN** raw envelope fields, source registry fields, pluggable datasource connector contracts, topic naming, latest-state storage schemas, backend module boundaries, and local infrastructure entrypoints are defined in a follow-up change


<!-- @trace
source: define-backend-platform-contracts
updated: 2026-04-27
code:
  - frontend/package.json
  - infra/redpanda/docker-compose.yml
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardTimelineStore.java
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/PushSource.java
  - gradlew
  - README.md
  - docs/git-worktree-layout.md
  - frontend/src/shared/components/BaseButton.vue
  - gradle/wrapper/gradle-wrapper.jar
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/Lifecycle.java
  - frontend/src/features/design-system/components/DesignSystemPage.vue
  - gradle/wrapper/gradle-wrapper.properties
  - backend/ingestion/build.gradle.kts
  - frontend/src/features/mrt/data/mrt-network.generated.ts
  - docs/redpanda-local-dev.md
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/TopicNames.java
  - infra/starrocks/sql/bootstrap.sql
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardService.java
  - frontend/src/shared/design/tokens.css
  - frontend/src/shared/components/BaseCard.vue
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/TdxProperties.java
  - docs/TWFoundry-project-brief.md
  - frontend/src/features/mrt/line-names.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/Datasource.java
  - frontend/playwright.fullstack.config.ts
  - frontend/src/shared/components/BaseBadge.vue
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/E2eTdxLiveBoardGateway.java
  - frontend/src/shared/components/LocaleSwitcher.vue
  - docs/tdx-mrt-api-exploration.md
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/api/MrtLiveBoardController.java
  - frontend/bun.lockb
  - infra/starrocks/docker-compose.yml
  - gradlew.bat
  - backend/common/build.gradle.kts
  - frontend/src/app/router.ts
  - frontend/src/features/mrt/localized-text.ts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/IngestionApplication.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardBackfillStateStore.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/IngestionJobRequest.java
  - frontend/src/features/mrt/tdx/normalize.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/IngestionMethod.java
  - frontend/src/features/mrt/api/tdx-liveboard.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/RawEnvelope.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/TdxHttpLiveBoardGateway.java
  - docs/starrocks-vs-iceberg-evolution-note.md
  - frontend/src/features/mrt/data/mrt-fixtures.ts
  - frontend/src/features/mrt/map/map-provider.ts
  - docs/overlay-registry-design-note.md
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/TdxLiveBoardGateway.java
  - frontend/scripts/tdx-proxy.ts
  - frontend/src/features/mrt/map/inferred-trains.ts
  - frontend/src/features/mrt/components/LayerControl.vue
  - frontend/biome.json
  - frontend/src/features/mrt/components/MrtDashboard.vue
  - AGENTS.md
  - backend/ingestion/src/main/resources/application.properties
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/PullBatch.java
  - docs/starrocks-local-dev.md
  - frontend/src/style.css
  - frontend/src/features/mrt/components/MrtMap.vue
  - settings.gradle.kts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardBackfillStateStore.java
  - backend/streams/build.gradle.kts
  - frontend/src/main.ts
  - frontend/src/shared/config/env.ts
  - frontend/src/shared/components/BasePanel.vue
  - backend/ingestion/src/main/resources/schema.sql
  - frontend/src/features/mrt/types.ts
  - gradle/libs.versions.toml
  - frontend/src/features/mrt/tdx/proxy-core.ts
  - backend/api/build.gradle.kts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/IngestionJobService.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/IngestionJobRunner.java
  - frontend/src/env.d.ts
  - backend/storage/build.gradle.kts
  - frontend/src/shared/i18n/index.ts
  - frontend/src/features/mrt/map/overlay-registry.ts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardTimelineStore.java
  - build.gradle.kts
  - frontend/src/app/stores/mrt-dashboard.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/RunMode.java
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/PullSource.java
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/SourceDescriptor.java
  - frontend/src/features/mrt/components/StationPanel.vue
  - frontend/src/shared/i18n/locale.ts
  - frontend/src/shared/components/BaseSectionLabel.vue
  - frontend/src/shared/i18n/messages.ts
  - frontend/.env.example
tests:
  - frontend/tests/e2e/mrt-dashboard.spec.ts
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardBackfillStateStoreE2eTest.java
  - frontend/src/features/mrt/__tests__/inferred-trains.test.ts
  - frontend/tests/e2e/design-system.spec.ts
  - frontend/src/shared/i18n/locale.test.ts
  - frontend/src/features/mrt/__tests__/mrt-dashboard-live-mode.test.ts
  - frontend/src/features/mrt/__tests__/overlay-registry.test.ts
  - frontend/src/features/mrt/__tests__/map-provider.test.ts
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/IngestionJobServiceTest.java
  - frontend/src/features/mrt/__tests__/tdx-liveboard-api.test.ts
  - frontend/src/features/mrt/__tests__/mrt-store.test.ts
  - backend/common/src/test/java/io/twfoundry/backend/common/domain/TopicNamesTest.java
  - backend/ingestion/src/test/resources/application-e2e.properties
  - frontend/src/features/mrt/__tests__/tdx-proxy.test.ts
  - frontend/src/features/mrt/__tests__/mrt-store-liveboard-source.test.ts
  - frontend/src/shared/config/env.test.ts
  - frontend/src/features/mrt/__tests__/mrt-data.test.ts
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/api/MrtLiveBoardControllerE2eTest.java
  - frontend/src/features/mrt/__tests__/tdx-normalize.test.ts
  - frontend/tests/e2e/fullstack.spec.ts
-->

---
### Requirement: Backend Scope Isolation

TWFoundry SHALL keep backend platform contract work separate from the completed frontend bootstrap slice.

#### Scenario: Bootstrap is completed

- **GIVEN** `bootstrap-twfoundry-platform` has completed the frontend-first dashboard foundation
- **WHEN** backend contract tasks remain
- **THEN** those tasks are tracked by `define-backend-platform-contracts` instead of expanding the bootstrap change


<!-- @trace
source: define-backend-platform-contracts
updated: 2026-04-27
code:
  - frontend/package.json
  - infra/redpanda/docker-compose.yml
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardTimelineStore.java
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/PushSource.java
  - gradlew
  - README.md
  - docs/git-worktree-layout.md
  - frontend/src/shared/components/BaseButton.vue
  - gradle/wrapper/gradle-wrapper.jar
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/Lifecycle.java
  - frontend/src/features/design-system/components/DesignSystemPage.vue
  - gradle/wrapper/gradle-wrapper.properties
  - backend/ingestion/build.gradle.kts
  - frontend/src/features/mrt/data/mrt-network.generated.ts
  - docs/redpanda-local-dev.md
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/TopicNames.java
  - infra/starrocks/sql/bootstrap.sql
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardService.java
  - frontend/src/shared/design/tokens.css
  - frontend/src/shared/components/BaseCard.vue
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/TdxProperties.java
  - docs/TWFoundry-project-brief.md
  - frontend/src/features/mrt/line-names.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/Datasource.java
  - frontend/playwright.fullstack.config.ts
  - frontend/src/shared/components/BaseBadge.vue
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/E2eTdxLiveBoardGateway.java
  - frontend/src/shared/components/LocaleSwitcher.vue
  - docs/tdx-mrt-api-exploration.md
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/api/MrtLiveBoardController.java
  - frontend/bun.lockb
  - infra/starrocks/docker-compose.yml
  - gradlew.bat
  - backend/common/build.gradle.kts
  - frontend/src/app/router.ts
  - frontend/src/features/mrt/localized-text.ts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/IngestionApplication.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardBackfillStateStore.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/IngestionJobRequest.java
  - frontend/src/features/mrt/tdx/normalize.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/IngestionMethod.java
  - frontend/src/features/mrt/api/tdx-liveboard.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/RawEnvelope.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/TdxHttpLiveBoardGateway.java
  - docs/starrocks-vs-iceberg-evolution-note.md
  - frontend/src/features/mrt/data/mrt-fixtures.ts
  - frontend/src/features/mrt/map/map-provider.ts
  - docs/overlay-registry-design-note.md
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/TdxLiveBoardGateway.java
  - frontend/scripts/tdx-proxy.ts
  - frontend/src/features/mrt/map/inferred-trains.ts
  - frontend/src/features/mrt/components/LayerControl.vue
  - frontend/biome.json
  - frontend/src/features/mrt/components/MrtDashboard.vue
  - AGENTS.md
  - backend/ingestion/src/main/resources/application.properties
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/PullBatch.java
  - docs/starrocks-local-dev.md
  - frontend/src/style.css
  - frontend/src/features/mrt/components/MrtMap.vue
  - settings.gradle.kts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardBackfillStateStore.java
  - backend/streams/build.gradle.kts
  - frontend/src/main.ts
  - frontend/src/shared/config/env.ts
  - frontend/src/shared/components/BasePanel.vue
  - backend/ingestion/src/main/resources/schema.sql
  - frontend/src/features/mrt/types.ts
  - gradle/libs.versions.toml
  - frontend/src/features/mrt/tdx/proxy-core.ts
  - backend/api/build.gradle.kts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/IngestionJobService.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/IngestionJobRunner.java
  - frontend/src/env.d.ts
  - backend/storage/build.gradle.kts
  - frontend/src/shared/i18n/index.ts
  - frontend/src/features/mrt/map/overlay-registry.ts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardTimelineStore.java
  - build.gradle.kts
  - frontend/src/app/stores/mrt-dashboard.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/RunMode.java
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/PullSource.java
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/SourceDescriptor.java
  - frontend/src/features/mrt/components/StationPanel.vue
  - frontend/src/shared/i18n/locale.ts
  - frontend/src/shared/components/BaseSectionLabel.vue
  - frontend/src/shared/i18n/messages.ts
  - frontend/.env.example
tests:
  - frontend/tests/e2e/mrt-dashboard.spec.ts
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardBackfillStateStoreE2eTest.java
  - frontend/src/features/mrt/__tests__/inferred-trains.test.ts
  - frontend/tests/e2e/design-system.spec.ts
  - frontend/src/shared/i18n/locale.test.ts
  - frontend/src/features/mrt/__tests__/mrt-dashboard-live-mode.test.ts
  - frontend/src/features/mrt/__tests__/overlay-registry.test.ts
  - frontend/src/features/mrt/__tests__/map-provider.test.ts
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/IngestionJobServiceTest.java
  - frontend/src/features/mrt/__tests__/tdx-liveboard-api.test.ts
  - frontend/src/features/mrt/__tests__/mrt-store.test.ts
  - backend/common/src/test/java/io/twfoundry/backend/common/domain/TopicNamesTest.java
  - backend/ingestion/src/test/resources/application-e2e.properties
  - frontend/src/features/mrt/__tests__/tdx-proxy.test.ts
  - frontend/src/features/mrt/__tests__/mrt-store-liveboard-source.test.ts
  - frontend/src/shared/config/env.test.ts
  - frontend/src/features/mrt/__tests__/mrt-data.test.ts
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/api/MrtLiveBoardControllerE2eTest.java
  - frontend/src/features/mrt/__tests__/tdx-normalize.test.ts
  - frontend/tests/e2e/fullstack.spec.ts
-->

---
### Requirement: Phase 1 Backbone Direction

TWFoundry SHALL use `Redpanda/Kafka -> Stream Processing -> StarRocks` as the Phase 1 backend backbone direction.

#### Scenario: Backbone technology is selected

- **GIVEN** the project needs a production-oriented backend direction for Phase 1 source ingestion and serving
- **WHEN** the backend platform contracts are defined
- **THEN** the change documents `Redpanda` or `Kafka` as the event backbone and `StarRocks` as the latest-state serving store
- **AND** the change does not require Fluss as the primary Phase 1 backbone


<!-- @trace
source: define-backend-platform-contracts
updated: 2026-04-27
code:
  - frontend/package.json
  - infra/redpanda/docker-compose.yml
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardTimelineStore.java
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/PushSource.java
  - gradlew
  - README.md
  - docs/git-worktree-layout.md
  - frontend/src/shared/components/BaseButton.vue
  - gradle/wrapper/gradle-wrapper.jar
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/Lifecycle.java
  - frontend/src/features/design-system/components/DesignSystemPage.vue
  - gradle/wrapper/gradle-wrapper.properties
  - backend/ingestion/build.gradle.kts
  - frontend/src/features/mrt/data/mrt-network.generated.ts
  - docs/redpanda-local-dev.md
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/TopicNames.java
  - infra/starrocks/sql/bootstrap.sql
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardService.java
  - frontend/src/shared/design/tokens.css
  - frontend/src/shared/components/BaseCard.vue
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/TdxProperties.java
  - docs/TWFoundry-project-brief.md
  - frontend/src/features/mrt/line-names.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/Datasource.java
  - frontend/playwright.fullstack.config.ts
  - frontend/src/shared/components/BaseBadge.vue
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/E2eTdxLiveBoardGateway.java
  - frontend/src/shared/components/LocaleSwitcher.vue
  - docs/tdx-mrt-api-exploration.md
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/api/MrtLiveBoardController.java
  - frontend/bun.lockb
  - infra/starrocks/docker-compose.yml
  - gradlew.bat
  - backend/common/build.gradle.kts
  - frontend/src/app/router.ts
  - frontend/src/features/mrt/localized-text.ts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/IngestionApplication.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardBackfillStateStore.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/IngestionJobRequest.java
  - frontend/src/features/mrt/tdx/normalize.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/IngestionMethod.java
  - frontend/src/features/mrt/api/tdx-liveboard.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/RawEnvelope.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/TdxHttpLiveBoardGateway.java
  - docs/starrocks-vs-iceberg-evolution-note.md
  - frontend/src/features/mrt/data/mrt-fixtures.ts
  - frontend/src/features/mrt/map/map-provider.ts
  - docs/overlay-registry-design-note.md
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/TdxLiveBoardGateway.java
  - frontend/scripts/tdx-proxy.ts
  - frontend/src/features/mrt/map/inferred-trains.ts
  - frontend/src/features/mrt/components/LayerControl.vue
  - frontend/biome.json
  - frontend/src/features/mrt/components/MrtDashboard.vue
  - AGENTS.md
  - backend/ingestion/src/main/resources/application.properties
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/PullBatch.java
  - docs/starrocks-local-dev.md
  - frontend/src/style.css
  - frontend/src/features/mrt/components/MrtMap.vue
  - settings.gradle.kts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardBackfillStateStore.java
  - backend/streams/build.gradle.kts
  - frontend/src/main.ts
  - frontend/src/shared/config/env.ts
  - frontend/src/shared/components/BasePanel.vue
  - backend/ingestion/src/main/resources/schema.sql
  - frontend/src/features/mrt/types.ts
  - gradle/libs.versions.toml
  - frontend/src/features/mrt/tdx/proxy-core.ts
  - backend/api/build.gradle.kts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/IngestionJobService.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/IngestionJobRunner.java
  - frontend/src/env.d.ts
  - backend/storage/build.gradle.kts
  - frontend/src/shared/i18n/index.ts
  - frontend/src/features/mrt/map/overlay-registry.ts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardTimelineStore.java
  - build.gradle.kts
  - frontend/src/app/stores/mrt-dashboard.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/RunMode.java
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/PullSource.java
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/SourceDescriptor.java
  - frontend/src/features/mrt/components/StationPanel.vue
  - frontend/src/shared/i18n/locale.ts
  - frontend/src/shared/components/BaseSectionLabel.vue
  - frontend/src/shared/i18n/messages.ts
  - frontend/.env.example
tests:
  - frontend/tests/e2e/mrt-dashboard.spec.ts
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardBackfillStateStoreE2eTest.java
  - frontend/src/features/mrt/__tests__/inferred-trains.test.ts
  - frontend/tests/e2e/design-system.spec.ts
  - frontend/src/shared/i18n/locale.test.ts
  - frontend/src/features/mrt/__tests__/mrt-dashboard-live-mode.test.ts
  - frontend/src/features/mrt/__tests__/overlay-registry.test.ts
  - frontend/src/features/mrt/__tests__/map-provider.test.ts
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/IngestionJobServiceTest.java
  - frontend/src/features/mrt/__tests__/tdx-liveboard-api.test.ts
  - frontend/src/features/mrt/__tests__/mrt-store.test.ts
  - backend/common/src/test/java/io/twfoundry/backend/common/domain/TopicNamesTest.java
  - backend/ingestion/src/test/resources/application-e2e.properties
  - frontend/src/features/mrt/__tests__/tdx-proxy.test.ts
  - frontend/src/features/mrt/__tests__/mrt-store-liveboard-source.test.ts
  - frontend/src/shared/config/env.test.ts
  - frontend/src/features/mrt/__tests__/mrt-data.test.ts
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/api/MrtLiveBoardControllerE2eTest.java
  - frontend/src/features/mrt/__tests__/tdx-normalize.test.ts
  - frontend/tests/e2e/fullstack.spec.ts
-->

---
### Requirement: Source Registry Contract

TWFoundry SHALL define a source registry contract so datasource onboarding is configuration-driven instead of spread through source-specific branching logic.

#### Scenario: A new datasource is introduced

- **GIVEN** a maintainer wants to add a new datasource such as TDX, YouBike, Civil IoT, or MRT static GTFS
- **WHEN** the source is registered
- **THEN** the registry captures source identity, dataset identity, ingestion method, auth strategy, cadence, schema version, and raw topic mapping


<!-- @trace
source: define-backend-platform-contracts
updated: 2026-04-27
code:
  - frontend/package.json
  - infra/redpanda/docker-compose.yml
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardTimelineStore.java
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/PushSource.java
  - gradlew
  - README.md
  - docs/git-worktree-layout.md
  - frontend/src/shared/components/BaseButton.vue
  - gradle/wrapper/gradle-wrapper.jar
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/Lifecycle.java
  - frontend/src/features/design-system/components/DesignSystemPage.vue
  - gradle/wrapper/gradle-wrapper.properties
  - backend/ingestion/build.gradle.kts
  - frontend/src/features/mrt/data/mrt-network.generated.ts
  - docs/redpanda-local-dev.md
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/TopicNames.java
  - infra/starrocks/sql/bootstrap.sql
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardService.java
  - frontend/src/shared/design/tokens.css
  - frontend/src/shared/components/BaseCard.vue
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/TdxProperties.java
  - docs/TWFoundry-project-brief.md
  - frontend/src/features/mrt/line-names.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/Datasource.java
  - frontend/playwright.fullstack.config.ts
  - frontend/src/shared/components/BaseBadge.vue
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/E2eTdxLiveBoardGateway.java
  - frontend/src/shared/components/LocaleSwitcher.vue
  - docs/tdx-mrt-api-exploration.md
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/api/MrtLiveBoardController.java
  - frontend/bun.lockb
  - infra/starrocks/docker-compose.yml
  - gradlew.bat
  - backend/common/build.gradle.kts
  - frontend/src/app/router.ts
  - frontend/src/features/mrt/localized-text.ts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/IngestionApplication.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardBackfillStateStore.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/IngestionJobRequest.java
  - frontend/src/features/mrt/tdx/normalize.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/IngestionMethod.java
  - frontend/src/features/mrt/api/tdx-liveboard.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/RawEnvelope.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/TdxHttpLiveBoardGateway.java
  - docs/starrocks-vs-iceberg-evolution-note.md
  - frontend/src/features/mrt/data/mrt-fixtures.ts
  - frontend/src/features/mrt/map/map-provider.ts
  - docs/overlay-registry-design-note.md
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/TdxLiveBoardGateway.java
  - frontend/scripts/tdx-proxy.ts
  - frontend/src/features/mrt/map/inferred-trains.ts
  - frontend/src/features/mrt/components/LayerControl.vue
  - frontend/biome.json
  - frontend/src/features/mrt/components/MrtDashboard.vue
  - AGENTS.md
  - backend/ingestion/src/main/resources/application.properties
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/PullBatch.java
  - docs/starrocks-local-dev.md
  - frontend/src/style.css
  - frontend/src/features/mrt/components/MrtMap.vue
  - settings.gradle.kts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardBackfillStateStore.java
  - backend/streams/build.gradle.kts
  - frontend/src/main.ts
  - frontend/src/shared/config/env.ts
  - frontend/src/shared/components/BasePanel.vue
  - backend/ingestion/src/main/resources/schema.sql
  - frontend/src/features/mrt/types.ts
  - gradle/libs.versions.toml
  - frontend/src/features/mrt/tdx/proxy-core.ts
  - backend/api/build.gradle.kts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/IngestionJobService.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/IngestionJobRunner.java
  - frontend/src/env.d.ts
  - backend/storage/build.gradle.kts
  - frontend/src/shared/i18n/index.ts
  - frontend/src/features/mrt/map/overlay-registry.ts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardTimelineStore.java
  - build.gradle.kts
  - frontend/src/app/stores/mrt-dashboard.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/RunMode.java
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/PullSource.java
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/SourceDescriptor.java
  - frontend/src/features/mrt/components/StationPanel.vue
  - frontend/src/shared/i18n/locale.ts
  - frontend/src/shared/components/BaseSectionLabel.vue
  - frontend/src/shared/i18n/messages.ts
  - frontend/.env.example
tests:
  - frontend/tests/e2e/mrt-dashboard.spec.ts
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardBackfillStateStoreE2eTest.java
  - frontend/src/features/mrt/__tests__/inferred-trains.test.ts
  - frontend/tests/e2e/design-system.spec.ts
  - frontend/src/shared/i18n/locale.test.ts
  - frontend/src/features/mrt/__tests__/mrt-dashboard-live-mode.test.ts
  - frontend/src/features/mrt/__tests__/overlay-registry.test.ts
  - frontend/src/features/mrt/__tests__/map-provider.test.ts
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/IngestionJobServiceTest.java
  - frontend/src/features/mrt/__tests__/tdx-liveboard-api.test.ts
  - frontend/src/features/mrt/__tests__/mrt-store.test.ts
  - backend/common/src/test/java/io/twfoundry/backend/common/domain/TopicNamesTest.java
  - backend/ingestion/src/test/resources/application-e2e.properties
  - frontend/src/features/mrt/__tests__/tdx-proxy.test.ts
  - frontend/src/features/mrt/__tests__/mrt-store-liveboard-source.test.ts
  - frontend/src/shared/config/env.test.ts
  - frontend/src/features/mrt/__tests__/mrt-data.test.ts
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/api/MrtLiveBoardControllerE2eTest.java
  - frontend/src/features/mrt/__tests__/tdx-normalize.test.ts
  - frontend/tests/e2e/fullstack.spec.ts
-->

---
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


<!-- @trace
source: define-backend-platform-contracts
updated: 2026-04-27
code:
  - frontend/package.json
  - infra/redpanda/docker-compose.yml
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardTimelineStore.java
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/PushSource.java
  - gradlew
  - README.md
  - docs/git-worktree-layout.md
  - frontend/src/shared/components/BaseButton.vue
  - gradle/wrapper/gradle-wrapper.jar
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/Lifecycle.java
  - frontend/src/features/design-system/components/DesignSystemPage.vue
  - gradle/wrapper/gradle-wrapper.properties
  - backend/ingestion/build.gradle.kts
  - frontend/src/features/mrt/data/mrt-network.generated.ts
  - docs/redpanda-local-dev.md
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/TopicNames.java
  - infra/starrocks/sql/bootstrap.sql
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardService.java
  - frontend/src/shared/design/tokens.css
  - frontend/src/shared/components/BaseCard.vue
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/TdxProperties.java
  - docs/TWFoundry-project-brief.md
  - frontend/src/features/mrt/line-names.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/Datasource.java
  - frontend/playwright.fullstack.config.ts
  - frontend/src/shared/components/BaseBadge.vue
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/E2eTdxLiveBoardGateway.java
  - frontend/src/shared/components/LocaleSwitcher.vue
  - docs/tdx-mrt-api-exploration.md
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/api/MrtLiveBoardController.java
  - frontend/bun.lockb
  - infra/starrocks/docker-compose.yml
  - gradlew.bat
  - backend/common/build.gradle.kts
  - frontend/src/app/router.ts
  - frontend/src/features/mrt/localized-text.ts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/IngestionApplication.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardBackfillStateStore.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/IngestionJobRequest.java
  - frontend/src/features/mrt/tdx/normalize.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/IngestionMethod.java
  - frontend/src/features/mrt/api/tdx-liveboard.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/RawEnvelope.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/TdxHttpLiveBoardGateway.java
  - docs/starrocks-vs-iceberg-evolution-note.md
  - frontend/src/features/mrt/data/mrt-fixtures.ts
  - frontend/src/features/mrt/map/map-provider.ts
  - docs/overlay-registry-design-note.md
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/TdxLiveBoardGateway.java
  - frontend/scripts/tdx-proxy.ts
  - frontend/src/features/mrt/map/inferred-trains.ts
  - frontend/src/features/mrt/components/LayerControl.vue
  - frontend/biome.json
  - frontend/src/features/mrt/components/MrtDashboard.vue
  - AGENTS.md
  - backend/ingestion/src/main/resources/application.properties
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/PullBatch.java
  - docs/starrocks-local-dev.md
  - frontend/src/style.css
  - frontend/src/features/mrt/components/MrtMap.vue
  - settings.gradle.kts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardBackfillStateStore.java
  - backend/streams/build.gradle.kts
  - frontend/src/main.ts
  - frontend/src/shared/config/env.ts
  - frontend/src/shared/components/BasePanel.vue
  - backend/ingestion/src/main/resources/schema.sql
  - frontend/src/features/mrt/types.ts
  - gradle/libs.versions.toml
  - frontend/src/features/mrt/tdx/proxy-core.ts
  - backend/api/build.gradle.kts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/IngestionJobService.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/IngestionJobRunner.java
  - frontend/src/env.d.ts
  - backend/storage/build.gradle.kts
  - frontend/src/shared/i18n/index.ts
  - frontend/src/features/mrt/map/overlay-registry.ts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardTimelineStore.java
  - build.gradle.kts
  - frontend/src/app/stores/mrt-dashboard.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/RunMode.java
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/PullSource.java
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/SourceDescriptor.java
  - frontend/src/features/mrt/components/StationPanel.vue
  - frontend/src/shared/i18n/locale.ts
  - frontend/src/shared/components/BaseSectionLabel.vue
  - frontend/src/shared/i18n/messages.ts
  - frontend/.env.example
tests:
  - frontend/tests/e2e/mrt-dashboard.spec.ts
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardBackfillStateStoreE2eTest.java
  - frontend/src/features/mrt/__tests__/inferred-trains.test.ts
  - frontend/tests/e2e/design-system.spec.ts
  - frontend/src/shared/i18n/locale.test.ts
  - frontend/src/features/mrt/__tests__/mrt-dashboard-live-mode.test.ts
  - frontend/src/features/mrt/__tests__/overlay-registry.test.ts
  - frontend/src/features/mrt/__tests__/map-provider.test.ts
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/IngestionJobServiceTest.java
  - frontend/src/features/mrt/__tests__/tdx-liveboard-api.test.ts
  - frontend/src/features/mrt/__tests__/mrt-store.test.ts
  - backend/common/src/test/java/io/twfoundry/backend/common/domain/TopicNamesTest.java
  - backend/ingestion/src/test/resources/application-e2e.properties
  - frontend/src/features/mrt/__tests__/tdx-proxy.test.ts
  - frontend/src/features/mrt/__tests__/mrt-store-liveboard-source.test.ts
  - frontend/src/shared/config/env.test.ts
  - frontend/src/features/mrt/__tests__/mrt-data.test.ts
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/api/MrtLiveBoardControllerE2eTest.java
  - frontend/src/features/mrt/__tests__/tdx-normalize.test.ts
  - frontend/tests/e2e/fullstack.spec.ts
-->

---
### Requirement: Raw Envelope Contract

TWFoundry SHALL define a shared raw record envelope for all datasource connectors.

#### Scenario: A connector publishes a raw record

- **GIVEN** any datasource connector emits source-owned data
- **WHEN** it publishes to a raw topic
- **THEN** the record includes at least `event_id`, `source`, `dataset`, `domain`, `ingestion_method`, `ingested_at`, `schema_version`, `content_type`, and `payload`


<!-- @trace
source: define-backend-platform-contracts
updated: 2026-04-27
code:
  - frontend/package.json
  - infra/redpanda/docker-compose.yml
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardTimelineStore.java
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/PushSource.java
  - gradlew
  - README.md
  - docs/git-worktree-layout.md
  - frontend/src/shared/components/BaseButton.vue
  - gradle/wrapper/gradle-wrapper.jar
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/Lifecycle.java
  - frontend/src/features/design-system/components/DesignSystemPage.vue
  - gradle/wrapper/gradle-wrapper.properties
  - backend/ingestion/build.gradle.kts
  - frontend/src/features/mrt/data/mrt-network.generated.ts
  - docs/redpanda-local-dev.md
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/TopicNames.java
  - infra/starrocks/sql/bootstrap.sql
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardService.java
  - frontend/src/shared/design/tokens.css
  - frontend/src/shared/components/BaseCard.vue
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/TdxProperties.java
  - docs/TWFoundry-project-brief.md
  - frontend/src/features/mrt/line-names.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/Datasource.java
  - frontend/playwright.fullstack.config.ts
  - frontend/src/shared/components/BaseBadge.vue
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/E2eTdxLiveBoardGateway.java
  - frontend/src/shared/components/LocaleSwitcher.vue
  - docs/tdx-mrt-api-exploration.md
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/api/MrtLiveBoardController.java
  - frontend/bun.lockb
  - infra/starrocks/docker-compose.yml
  - gradlew.bat
  - backend/common/build.gradle.kts
  - frontend/src/app/router.ts
  - frontend/src/features/mrt/localized-text.ts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/IngestionApplication.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardBackfillStateStore.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/IngestionJobRequest.java
  - frontend/src/features/mrt/tdx/normalize.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/IngestionMethod.java
  - frontend/src/features/mrt/api/tdx-liveboard.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/RawEnvelope.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/TdxHttpLiveBoardGateway.java
  - docs/starrocks-vs-iceberg-evolution-note.md
  - frontend/src/features/mrt/data/mrt-fixtures.ts
  - frontend/src/features/mrt/map/map-provider.ts
  - docs/overlay-registry-design-note.md
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/TdxLiveBoardGateway.java
  - frontend/scripts/tdx-proxy.ts
  - frontend/src/features/mrt/map/inferred-trains.ts
  - frontend/src/features/mrt/components/LayerControl.vue
  - frontend/biome.json
  - frontend/src/features/mrt/components/MrtDashboard.vue
  - AGENTS.md
  - backend/ingestion/src/main/resources/application.properties
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/PullBatch.java
  - docs/starrocks-local-dev.md
  - frontend/src/style.css
  - frontend/src/features/mrt/components/MrtMap.vue
  - settings.gradle.kts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardBackfillStateStore.java
  - backend/streams/build.gradle.kts
  - frontend/src/main.ts
  - frontend/src/shared/config/env.ts
  - frontend/src/shared/components/BasePanel.vue
  - backend/ingestion/src/main/resources/schema.sql
  - frontend/src/features/mrt/types.ts
  - gradle/libs.versions.toml
  - frontend/src/features/mrt/tdx/proxy-core.ts
  - backend/api/build.gradle.kts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/IngestionJobService.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/IngestionJobRunner.java
  - frontend/src/env.d.ts
  - backend/storage/build.gradle.kts
  - frontend/src/shared/i18n/index.ts
  - frontend/src/features/mrt/map/overlay-registry.ts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardTimelineStore.java
  - build.gradle.kts
  - frontend/src/app/stores/mrt-dashboard.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/RunMode.java
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/PullSource.java
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/SourceDescriptor.java
  - frontend/src/features/mrt/components/StationPanel.vue
  - frontend/src/shared/i18n/locale.ts
  - frontend/src/shared/components/BaseSectionLabel.vue
  - frontend/src/shared/i18n/messages.ts
  - frontend/.env.example
tests:
  - frontend/tests/e2e/mrt-dashboard.spec.ts
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardBackfillStateStoreE2eTest.java
  - frontend/src/features/mrt/__tests__/inferred-trains.test.ts
  - frontend/tests/e2e/design-system.spec.ts
  - frontend/src/shared/i18n/locale.test.ts
  - frontend/src/features/mrt/__tests__/mrt-dashboard-live-mode.test.ts
  - frontend/src/features/mrt/__tests__/overlay-registry.test.ts
  - frontend/src/features/mrt/__tests__/map-provider.test.ts
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/IngestionJobServiceTest.java
  - frontend/src/features/mrt/__tests__/tdx-liveboard-api.test.ts
  - frontend/src/features/mrt/__tests__/mrt-store.test.ts
  - backend/common/src/test/java/io/twfoundry/backend/common/domain/TopicNamesTest.java
  - backend/ingestion/src/test/resources/application-e2e.properties
  - frontend/src/features/mrt/__tests__/tdx-proxy.test.ts
  - frontend/src/features/mrt/__tests__/mrt-store-liveboard-source.test.ts
  - frontend/src/shared/config/env.test.ts
  - frontend/src/features/mrt/__tests__/mrt-data.test.ts
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/api/MrtLiveBoardControllerE2eTest.java
  - frontend/src/features/mrt/__tests__/tdx-normalize.test.ts
  - frontend/tests/e2e/fullstack.spec.ts
-->

---
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


<!-- @trace
source: define-backend-platform-contracts
updated: 2026-04-27
code:
  - frontend/package.json
  - infra/redpanda/docker-compose.yml
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardTimelineStore.java
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/PushSource.java
  - gradlew
  - README.md
  - docs/git-worktree-layout.md
  - frontend/src/shared/components/BaseButton.vue
  - gradle/wrapper/gradle-wrapper.jar
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/Lifecycle.java
  - frontend/src/features/design-system/components/DesignSystemPage.vue
  - gradle/wrapper/gradle-wrapper.properties
  - backend/ingestion/build.gradle.kts
  - frontend/src/features/mrt/data/mrt-network.generated.ts
  - docs/redpanda-local-dev.md
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/TopicNames.java
  - infra/starrocks/sql/bootstrap.sql
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardService.java
  - frontend/src/shared/design/tokens.css
  - frontend/src/shared/components/BaseCard.vue
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/TdxProperties.java
  - docs/TWFoundry-project-brief.md
  - frontend/src/features/mrt/line-names.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/Datasource.java
  - frontend/playwright.fullstack.config.ts
  - frontend/src/shared/components/BaseBadge.vue
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/E2eTdxLiveBoardGateway.java
  - frontend/src/shared/components/LocaleSwitcher.vue
  - docs/tdx-mrt-api-exploration.md
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/api/MrtLiveBoardController.java
  - frontend/bun.lockb
  - infra/starrocks/docker-compose.yml
  - gradlew.bat
  - backend/common/build.gradle.kts
  - frontend/src/app/router.ts
  - frontend/src/features/mrt/localized-text.ts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/IngestionApplication.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardBackfillStateStore.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/IngestionJobRequest.java
  - frontend/src/features/mrt/tdx/normalize.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/IngestionMethod.java
  - frontend/src/features/mrt/api/tdx-liveboard.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/RawEnvelope.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/TdxHttpLiveBoardGateway.java
  - docs/starrocks-vs-iceberg-evolution-note.md
  - frontend/src/features/mrt/data/mrt-fixtures.ts
  - frontend/src/features/mrt/map/map-provider.ts
  - docs/overlay-registry-design-note.md
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/TdxLiveBoardGateway.java
  - frontend/scripts/tdx-proxy.ts
  - frontend/src/features/mrt/map/inferred-trains.ts
  - frontend/src/features/mrt/components/LayerControl.vue
  - frontend/biome.json
  - frontend/src/features/mrt/components/MrtDashboard.vue
  - AGENTS.md
  - backend/ingestion/src/main/resources/application.properties
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/PullBatch.java
  - docs/starrocks-local-dev.md
  - frontend/src/style.css
  - frontend/src/features/mrt/components/MrtMap.vue
  - settings.gradle.kts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardBackfillStateStore.java
  - backend/streams/build.gradle.kts
  - frontend/src/main.ts
  - frontend/src/shared/config/env.ts
  - frontend/src/shared/components/BasePanel.vue
  - backend/ingestion/src/main/resources/schema.sql
  - frontend/src/features/mrt/types.ts
  - gradle/libs.versions.toml
  - frontend/src/features/mrt/tdx/proxy-core.ts
  - backend/api/build.gradle.kts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/IngestionJobService.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/IngestionJobRunner.java
  - frontend/src/env.d.ts
  - backend/storage/build.gradle.kts
  - frontend/src/shared/i18n/index.ts
  - frontend/src/features/mrt/map/overlay-registry.ts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardTimelineStore.java
  - build.gradle.kts
  - frontend/src/app/stores/mrt-dashboard.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/RunMode.java
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/PullSource.java
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/SourceDescriptor.java
  - frontend/src/features/mrt/components/StationPanel.vue
  - frontend/src/shared/i18n/locale.ts
  - frontend/src/shared/components/BaseSectionLabel.vue
  - frontend/src/shared/i18n/messages.ts
  - frontend/.env.example
tests:
  - frontend/tests/e2e/mrt-dashboard.spec.ts
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardBackfillStateStoreE2eTest.java
  - frontend/src/features/mrt/__tests__/inferred-trains.test.ts
  - frontend/tests/e2e/design-system.spec.ts
  - frontend/src/shared/i18n/locale.test.ts
  - frontend/src/features/mrt/__tests__/mrt-dashboard-live-mode.test.ts
  - frontend/src/features/mrt/__tests__/overlay-registry.test.ts
  - frontend/src/features/mrt/__tests__/map-provider.test.ts
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/IngestionJobServiceTest.java
  - frontend/src/features/mrt/__tests__/tdx-liveboard-api.test.ts
  - frontend/src/features/mrt/__tests__/mrt-store.test.ts
  - backend/common/src/test/java/io/twfoundry/backend/common/domain/TopicNamesTest.java
  - backend/ingestion/src/test/resources/application-e2e.properties
  - frontend/src/features/mrt/__tests__/tdx-proxy.test.ts
  - frontend/src/features/mrt/__tests__/mrt-store-liveboard-source.test.ts
  - frontend/src/shared/config/env.test.ts
  - frontend/src/features/mrt/__tests__/mrt-data.test.ts
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/api/MrtLiveBoardControllerE2eTest.java
  - frontend/src/features/mrt/__tests__/tdx-normalize.test.ts
  - frontend/tests/e2e/fullstack.spec.ts
-->

---
### Requirement: Latest-State Storage Direction

TWFoundry SHALL use StarRocks Primary Key Table design for Phase 1 latest-state serving tables where entity state is updated in place.

#### Scenario: Current station state is served

- **GIVEN** stream processing has normalized source records into entity state updates
- **WHEN** the platform materializes current operational state
- **THEN** StarRocks stores the latest row by entity key for dashboard and API reads


<!-- @trace
source: define-backend-platform-contracts
updated: 2026-04-27
code:
  - frontend/package.json
  - infra/redpanda/docker-compose.yml
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardTimelineStore.java
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/PushSource.java
  - gradlew
  - README.md
  - docs/git-worktree-layout.md
  - frontend/src/shared/components/BaseButton.vue
  - gradle/wrapper/gradle-wrapper.jar
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/Lifecycle.java
  - frontend/src/features/design-system/components/DesignSystemPage.vue
  - gradle/wrapper/gradle-wrapper.properties
  - backend/ingestion/build.gradle.kts
  - frontend/src/features/mrt/data/mrt-network.generated.ts
  - docs/redpanda-local-dev.md
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/TopicNames.java
  - infra/starrocks/sql/bootstrap.sql
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardService.java
  - frontend/src/shared/design/tokens.css
  - frontend/src/shared/components/BaseCard.vue
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/TdxProperties.java
  - docs/TWFoundry-project-brief.md
  - frontend/src/features/mrt/line-names.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/Datasource.java
  - frontend/playwright.fullstack.config.ts
  - frontend/src/shared/components/BaseBadge.vue
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/E2eTdxLiveBoardGateway.java
  - frontend/src/shared/components/LocaleSwitcher.vue
  - docs/tdx-mrt-api-exploration.md
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/api/MrtLiveBoardController.java
  - frontend/bun.lockb
  - infra/starrocks/docker-compose.yml
  - gradlew.bat
  - backend/common/build.gradle.kts
  - frontend/src/app/router.ts
  - frontend/src/features/mrt/localized-text.ts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/IngestionApplication.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardBackfillStateStore.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/IngestionJobRequest.java
  - frontend/src/features/mrt/tdx/normalize.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/IngestionMethod.java
  - frontend/src/features/mrt/api/tdx-liveboard.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/RawEnvelope.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/TdxHttpLiveBoardGateway.java
  - docs/starrocks-vs-iceberg-evolution-note.md
  - frontend/src/features/mrt/data/mrt-fixtures.ts
  - frontend/src/features/mrt/map/map-provider.ts
  - docs/overlay-registry-design-note.md
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/TdxLiveBoardGateway.java
  - frontend/scripts/tdx-proxy.ts
  - frontend/src/features/mrt/map/inferred-trains.ts
  - frontend/src/features/mrt/components/LayerControl.vue
  - frontend/biome.json
  - frontend/src/features/mrt/components/MrtDashboard.vue
  - AGENTS.md
  - backend/ingestion/src/main/resources/application.properties
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/PullBatch.java
  - docs/starrocks-local-dev.md
  - frontend/src/style.css
  - frontend/src/features/mrt/components/MrtMap.vue
  - settings.gradle.kts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardBackfillStateStore.java
  - backend/streams/build.gradle.kts
  - frontend/src/main.ts
  - frontend/src/shared/config/env.ts
  - frontend/src/shared/components/BasePanel.vue
  - backend/ingestion/src/main/resources/schema.sql
  - frontend/src/features/mrt/types.ts
  - gradle/libs.versions.toml
  - frontend/src/features/mrt/tdx/proxy-core.ts
  - backend/api/build.gradle.kts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/IngestionJobService.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/IngestionJobRunner.java
  - frontend/src/env.d.ts
  - backend/storage/build.gradle.kts
  - frontend/src/shared/i18n/index.ts
  - frontend/src/features/mrt/map/overlay-registry.ts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardTimelineStore.java
  - build.gradle.kts
  - frontend/src/app/stores/mrt-dashboard.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/RunMode.java
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/PullSource.java
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/SourceDescriptor.java
  - frontend/src/features/mrt/components/StationPanel.vue
  - frontend/src/shared/i18n/locale.ts
  - frontend/src/shared/components/BaseSectionLabel.vue
  - frontend/src/shared/i18n/messages.ts
  - frontend/.env.example
tests:
  - frontend/tests/e2e/mrt-dashboard.spec.ts
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardBackfillStateStoreE2eTest.java
  - frontend/src/features/mrt/__tests__/inferred-trains.test.ts
  - frontend/tests/e2e/design-system.spec.ts
  - frontend/src/shared/i18n/locale.test.ts
  - frontend/src/features/mrt/__tests__/mrt-dashboard-live-mode.test.ts
  - frontend/src/features/mrt/__tests__/overlay-registry.test.ts
  - frontend/src/features/mrt/__tests__/map-provider.test.ts
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/IngestionJobServiceTest.java
  - frontend/src/features/mrt/__tests__/tdx-liveboard-api.test.ts
  - frontend/src/features/mrt/__tests__/mrt-store.test.ts
  - backend/common/src/test/java/io/twfoundry/backend/common/domain/TopicNamesTest.java
  - backend/ingestion/src/test/resources/application-e2e.properties
  - frontend/src/features/mrt/__tests__/tdx-proxy.test.ts
  - frontend/src/features/mrt/__tests__/mrt-store-liveboard-source.test.ts
  - frontend/src/shared/config/env.test.ts
  - frontend/src/features/mrt/__tests__/mrt-data.test.ts
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/api/MrtLiveBoardControllerE2eTest.java
  - frontend/src/features/mrt/__tests__/tdx-normalize.test.ts
  - frontend/tests/e2e/fullstack.spec.ts
-->

---
### Requirement: MRT Backend MVP Slice

TWFoundry SHALL define the first backend MVP as an MRT real-data slice that can be viewed from the web UI.

#### Scenario: MRT real data is visible through the product

- **GIVEN** TDX MRT ingestion, backend processing, storage, and API paths are implemented
- **WHEN** a user opens the MRT dashboard in the web UI
- **THEN** the user can view MRT train positions and train information through the backend path instead of only mock frontend data
- **AND** the MRT timeline supports dragging so the user can inspect how trains move over time


<!-- @trace
source: define-backend-platform-contracts
updated: 2026-04-27
code:
  - frontend/package.json
  - infra/redpanda/docker-compose.yml
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardTimelineStore.java
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/PushSource.java
  - gradlew
  - README.md
  - docs/git-worktree-layout.md
  - frontend/src/shared/components/BaseButton.vue
  - gradle/wrapper/gradle-wrapper.jar
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/Lifecycle.java
  - frontend/src/features/design-system/components/DesignSystemPage.vue
  - gradle/wrapper/gradle-wrapper.properties
  - backend/ingestion/build.gradle.kts
  - frontend/src/features/mrt/data/mrt-network.generated.ts
  - docs/redpanda-local-dev.md
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/TopicNames.java
  - infra/starrocks/sql/bootstrap.sql
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardService.java
  - frontend/src/shared/design/tokens.css
  - frontend/src/shared/components/BaseCard.vue
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/TdxProperties.java
  - docs/TWFoundry-project-brief.md
  - frontend/src/features/mrt/line-names.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/Datasource.java
  - frontend/playwright.fullstack.config.ts
  - frontend/src/shared/components/BaseBadge.vue
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/E2eTdxLiveBoardGateway.java
  - frontend/src/shared/components/LocaleSwitcher.vue
  - docs/tdx-mrt-api-exploration.md
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/api/MrtLiveBoardController.java
  - frontend/bun.lockb
  - infra/starrocks/docker-compose.yml
  - gradlew.bat
  - backend/common/build.gradle.kts
  - frontend/src/app/router.ts
  - frontend/src/features/mrt/localized-text.ts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/IngestionApplication.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardBackfillStateStore.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/IngestionJobRequest.java
  - frontend/src/features/mrt/tdx/normalize.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/IngestionMethod.java
  - frontend/src/features/mrt/api/tdx-liveboard.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/RawEnvelope.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/TdxHttpLiveBoardGateway.java
  - docs/starrocks-vs-iceberg-evolution-note.md
  - frontend/src/features/mrt/data/mrt-fixtures.ts
  - frontend/src/features/mrt/map/map-provider.ts
  - docs/overlay-registry-design-note.md
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/TdxLiveBoardGateway.java
  - frontend/scripts/tdx-proxy.ts
  - frontend/src/features/mrt/map/inferred-trains.ts
  - frontend/src/features/mrt/components/LayerControl.vue
  - frontend/biome.json
  - frontend/src/features/mrt/components/MrtDashboard.vue
  - AGENTS.md
  - backend/ingestion/src/main/resources/application.properties
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/PullBatch.java
  - docs/starrocks-local-dev.md
  - frontend/src/style.css
  - frontend/src/features/mrt/components/MrtMap.vue
  - settings.gradle.kts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardBackfillStateStore.java
  - backend/streams/build.gradle.kts
  - frontend/src/main.ts
  - frontend/src/shared/config/env.ts
  - frontend/src/shared/components/BasePanel.vue
  - backend/ingestion/src/main/resources/schema.sql
  - frontend/src/features/mrt/types.ts
  - gradle/libs.versions.toml
  - frontend/src/features/mrt/tdx/proxy-core.ts
  - backend/api/build.gradle.kts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/IngestionJobService.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/IngestionJobRunner.java
  - frontend/src/env.d.ts
  - backend/storage/build.gradle.kts
  - frontend/src/shared/i18n/index.ts
  - frontend/src/features/mrt/map/overlay-registry.ts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardTimelineStore.java
  - build.gradle.kts
  - frontend/src/app/stores/mrt-dashboard.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/RunMode.java
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/PullSource.java
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/SourceDescriptor.java
  - frontend/src/features/mrt/components/StationPanel.vue
  - frontend/src/shared/i18n/locale.ts
  - frontend/src/shared/components/BaseSectionLabel.vue
  - frontend/src/shared/i18n/messages.ts
  - frontend/.env.example
tests:
  - frontend/tests/e2e/mrt-dashboard.spec.ts
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardBackfillStateStoreE2eTest.java
  - frontend/src/features/mrt/__tests__/inferred-trains.test.ts
  - frontend/tests/e2e/design-system.spec.ts
  - frontend/src/shared/i18n/locale.test.ts
  - frontend/src/features/mrt/__tests__/mrt-dashboard-live-mode.test.ts
  - frontend/src/features/mrt/__tests__/overlay-registry.test.ts
  - frontend/src/features/mrt/__tests__/map-provider.test.ts
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/IngestionJobServiceTest.java
  - frontend/src/features/mrt/__tests__/tdx-liveboard-api.test.ts
  - frontend/src/features/mrt/__tests__/mrt-store.test.ts
  - backend/common/src/test/java/io/twfoundry/backend/common/domain/TopicNamesTest.java
  - backend/ingestion/src/test/resources/application-e2e.properties
  - frontend/src/features/mrt/__tests__/tdx-proxy.test.ts
  - frontend/src/features/mrt/__tests__/mrt-store-liveboard-source.test.ts
  - frontend/src/shared/config/env.test.ts
  - frontend/src/features/mrt/__tests__/mrt-data.test.ts
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/api/MrtLiveBoardControllerE2eTest.java
  - frontend/src/features/mrt/__tests__/tdx-normalize.test.ts
  - frontend/tests/e2e/fullstack.spec.ts
-->

---
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


<!-- @trace
source: define-backend-platform-contracts
updated: 2026-04-27
code:
  - frontend/package.json
  - infra/redpanda/docker-compose.yml
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardTimelineStore.java
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/PushSource.java
  - gradlew
  - README.md
  - docs/git-worktree-layout.md
  - frontend/src/shared/components/BaseButton.vue
  - gradle/wrapper/gradle-wrapper.jar
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/Lifecycle.java
  - frontend/src/features/design-system/components/DesignSystemPage.vue
  - gradle/wrapper/gradle-wrapper.properties
  - backend/ingestion/build.gradle.kts
  - frontend/src/features/mrt/data/mrt-network.generated.ts
  - docs/redpanda-local-dev.md
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/TopicNames.java
  - infra/starrocks/sql/bootstrap.sql
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardService.java
  - frontend/src/shared/design/tokens.css
  - frontend/src/shared/components/BaseCard.vue
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/TdxProperties.java
  - docs/TWFoundry-project-brief.md
  - frontend/src/features/mrt/line-names.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/Datasource.java
  - frontend/playwright.fullstack.config.ts
  - frontend/src/shared/components/BaseBadge.vue
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/E2eTdxLiveBoardGateway.java
  - frontend/src/shared/components/LocaleSwitcher.vue
  - docs/tdx-mrt-api-exploration.md
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/api/MrtLiveBoardController.java
  - frontend/bun.lockb
  - infra/starrocks/docker-compose.yml
  - gradlew.bat
  - backend/common/build.gradle.kts
  - frontend/src/app/router.ts
  - frontend/src/features/mrt/localized-text.ts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/IngestionApplication.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardBackfillStateStore.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/IngestionJobRequest.java
  - frontend/src/features/mrt/tdx/normalize.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/IngestionMethod.java
  - frontend/src/features/mrt/api/tdx-liveboard.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/RawEnvelope.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/TdxHttpLiveBoardGateway.java
  - docs/starrocks-vs-iceberg-evolution-note.md
  - frontend/src/features/mrt/data/mrt-fixtures.ts
  - frontend/src/features/mrt/map/map-provider.ts
  - docs/overlay-registry-design-note.md
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/TdxLiveBoardGateway.java
  - frontend/scripts/tdx-proxy.ts
  - frontend/src/features/mrt/map/inferred-trains.ts
  - frontend/src/features/mrt/components/LayerControl.vue
  - frontend/biome.json
  - frontend/src/features/mrt/components/MrtDashboard.vue
  - AGENTS.md
  - backend/ingestion/src/main/resources/application.properties
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/PullBatch.java
  - docs/starrocks-local-dev.md
  - frontend/src/style.css
  - frontend/src/features/mrt/components/MrtMap.vue
  - settings.gradle.kts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardBackfillStateStore.java
  - backend/streams/build.gradle.kts
  - frontend/src/main.ts
  - frontend/src/shared/config/env.ts
  - frontend/src/shared/components/BasePanel.vue
  - backend/ingestion/src/main/resources/schema.sql
  - frontend/src/features/mrt/types.ts
  - gradle/libs.versions.toml
  - frontend/src/features/mrt/tdx/proxy-core.ts
  - backend/api/build.gradle.kts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/IngestionJobService.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/IngestionJobRunner.java
  - frontend/src/env.d.ts
  - backend/storage/build.gradle.kts
  - frontend/src/shared/i18n/index.ts
  - frontend/src/features/mrt/map/overlay-registry.ts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardTimelineStore.java
  - build.gradle.kts
  - frontend/src/app/stores/mrt-dashboard.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/RunMode.java
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/PullSource.java
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/SourceDescriptor.java
  - frontend/src/features/mrt/components/StationPanel.vue
  - frontend/src/shared/i18n/locale.ts
  - frontend/src/shared/components/BaseSectionLabel.vue
  - frontend/src/shared/i18n/messages.ts
  - frontend/.env.example
tests:
  - frontend/tests/e2e/mrt-dashboard.spec.ts
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardBackfillStateStoreE2eTest.java
  - frontend/src/features/mrt/__tests__/inferred-trains.test.ts
  - frontend/tests/e2e/design-system.spec.ts
  - frontend/src/shared/i18n/locale.test.ts
  - frontend/src/features/mrt/__tests__/mrt-dashboard-live-mode.test.ts
  - frontend/src/features/mrt/__tests__/overlay-registry.test.ts
  - frontend/src/features/mrt/__tests__/map-provider.test.ts
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/IngestionJobServiceTest.java
  - frontend/src/features/mrt/__tests__/tdx-liveboard-api.test.ts
  - frontend/src/features/mrt/__tests__/mrt-store.test.ts
  - backend/common/src/test/java/io/twfoundry/backend/common/domain/TopicNamesTest.java
  - backend/ingestion/src/test/resources/application-e2e.properties
  - frontend/src/features/mrt/__tests__/tdx-proxy.test.ts
  - frontend/src/features/mrt/__tests__/mrt-store-liveboard-source.test.ts
  - frontend/src/shared/config/env.test.ts
  - frontend/src/features/mrt/__tests__/mrt-data.test.ts
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/api/MrtLiveBoardControllerE2eTest.java
  - frontend/src/features/mrt/__tests__/tdx-normalize.test.ts
  - frontend/tests/e2e/fullstack.spec.ts
-->

---
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

<!-- @trace
source: define-backend-platform-contracts
updated: 2026-04-27
code:
  - frontend/package.json
  - infra/redpanda/docker-compose.yml
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardTimelineStore.java
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/PushSource.java
  - gradlew
  - README.md
  - docs/git-worktree-layout.md
  - frontend/src/shared/components/BaseButton.vue
  - gradle/wrapper/gradle-wrapper.jar
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/Lifecycle.java
  - frontend/src/features/design-system/components/DesignSystemPage.vue
  - gradle/wrapper/gradle-wrapper.properties
  - backend/ingestion/build.gradle.kts
  - frontend/src/features/mrt/data/mrt-network.generated.ts
  - docs/redpanda-local-dev.md
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/TopicNames.java
  - infra/starrocks/sql/bootstrap.sql
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardService.java
  - frontend/src/shared/design/tokens.css
  - frontend/src/shared/components/BaseCard.vue
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/TdxProperties.java
  - docs/TWFoundry-project-brief.md
  - frontend/src/features/mrt/line-names.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/Datasource.java
  - frontend/playwright.fullstack.config.ts
  - frontend/src/shared/components/BaseBadge.vue
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/E2eTdxLiveBoardGateway.java
  - frontend/src/shared/components/LocaleSwitcher.vue
  - docs/tdx-mrt-api-exploration.md
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/api/MrtLiveBoardController.java
  - frontend/bun.lockb
  - infra/starrocks/docker-compose.yml
  - gradlew.bat
  - backend/common/build.gradle.kts
  - frontend/src/app/router.ts
  - frontend/src/features/mrt/localized-text.ts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/IngestionApplication.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardBackfillStateStore.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/IngestionJobRequest.java
  - frontend/src/features/mrt/tdx/normalize.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/IngestionMethod.java
  - frontend/src/features/mrt/api/tdx-liveboard.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/RawEnvelope.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/TdxHttpLiveBoardGateway.java
  - docs/starrocks-vs-iceberg-evolution-note.md
  - frontend/src/features/mrt/data/mrt-fixtures.ts
  - frontend/src/features/mrt/map/map-provider.ts
  - docs/overlay-registry-design-note.md
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/TdxLiveBoardGateway.java
  - frontend/scripts/tdx-proxy.ts
  - frontend/src/features/mrt/map/inferred-trains.ts
  - frontend/src/features/mrt/components/LayerControl.vue
  - frontend/biome.json
  - frontend/src/features/mrt/components/MrtDashboard.vue
  - AGENTS.md
  - backend/ingestion/src/main/resources/application.properties
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/PullBatch.java
  - docs/starrocks-local-dev.md
  - frontend/src/style.css
  - frontend/src/features/mrt/components/MrtMap.vue
  - settings.gradle.kts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardBackfillStateStore.java
  - backend/streams/build.gradle.kts
  - frontend/src/main.ts
  - frontend/src/shared/config/env.ts
  - frontend/src/shared/components/BasePanel.vue
  - backend/ingestion/src/main/resources/schema.sql
  - frontend/src/features/mrt/types.ts
  - gradle/libs.versions.toml
  - frontend/src/features/mrt/tdx/proxy-core.ts
  - backend/api/build.gradle.kts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/IngestionJobService.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/IngestionJobRunner.java
  - frontend/src/env.d.ts
  - backend/storage/build.gradle.kts
  - frontend/src/shared/i18n/index.ts
  - frontend/src/features/mrt/map/overlay-registry.ts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardTimelineStore.java
  - build.gradle.kts
  - frontend/src/app/stores/mrt-dashboard.ts
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/RunMode.java
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/PullSource.java
  - backend/common/src/main/java/io/twfoundry/backend/common/domain/SourceDescriptor.java
  - frontend/src/features/mrt/components/StationPanel.vue
  - frontend/src/shared/i18n/locale.ts
  - frontend/src/shared/components/BaseSectionLabel.vue
  - frontend/src/shared/i18n/messages.ts
  - frontend/.env.example
tests:
  - frontend/tests/e2e/mrt-dashboard.spec.ts
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardBackfillStateStoreE2eTest.java
  - frontend/src/features/mrt/__tests__/inferred-trains.test.ts
  - frontend/tests/e2e/design-system.spec.ts
  - frontend/src/shared/i18n/locale.test.ts
  - frontend/src/features/mrt/__tests__/mrt-dashboard-live-mode.test.ts
  - frontend/src/features/mrt/__tests__/overlay-registry.test.ts
  - frontend/src/features/mrt/__tests__/map-provider.test.ts
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/IngestionJobServiceTest.java
  - frontend/src/features/mrt/__tests__/tdx-liveboard-api.test.ts
  - frontend/src/features/mrt/__tests__/mrt-store.test.ts
  - backend/common/src/test/java/io/twfoundry/backend/common/domain/TopicNamesTest.java
  - backend/ingestion/src/test/resources/application-e2e.properties
  - frontend/src/features/mrt/__tests__/tdx-proxy.test.ts
  - frontend/src/features/mrt/__tests__/mrt-store-liveboard-source.test.ts
  - frontend/src/shared/config/env.test.ts
  - frontend/src/features/mrt/__tests__/mrt-data.test.ts
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/api/MrtLiveBoardControllerE2eTest.java
  - frontend/src/features/mrt/__tests__/tdx-normalize.test.ts
  - frontend/tests/e2e/fullstack.spec.ts
-->

---
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


<!-- @trace
source: add-mrt-live-mode-timeline
updated: 2026-04-27
code:
  - frontend/bun.lockb
  - docs/TWFoundry-project-brief.md
  - docs/git-worktree-layout.md
  - docs/overlay-registry-design-note.md
  - frontend/src/features/mrt/api/tdx-liveboard.ts
  - frontend/src/features/mrt/components/StationPanel.vue
  - backend/ingestion/src/main/resources/schema.sql
  - frontend/src/shared/config/env.ts
  - docs/starrocks-vs-iceberg-evolution-note.md
  - docs/starrocks-local-dev.md
  - gradle/libs.versions.toml
  - frontend/src/features/mrt/line-names.ts
  - frontend/src/features/mrt/map/map-provider.ts
  - frontend/src/features/mrt/localized-text.ts
  - frontend/src/app/stores/mrt-dashboard.ts
  - frontend/src/features/mrt/tdx/normalize.ts
  - backend/ingestion/src/main/resources/application.properties
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/E2eTdxLiveBoardGateway.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardBackfillStateStore.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardTimelineStore.java
  - frontend/src/env.d.ts
  - frontend/src/features/mrt/components/LayerControl.vue
  - infra/starrocks/docker-compose.yml
  - README.md
  - frontend/.env.example
  - frontend/src/features/mrt/components/MrtMap.vue
  - frontend/src/features/mrt/data/mrt-fixtures.ts
  - frontend/src/features/mrt/map/inferred-trains.ts
  - infra/redpanda/docker-compose.yml
  - frontend/src/shared/components/BaseBadge.vue
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardBackfillStateStore.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/api/MrtLiveBoardController.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardTimelineStore.java
  - frontend/src/features/mrt/data/mrt-network.generated.ts
  - backend/ingestion/build.gradle.kts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardService.java
  - frontend/src/features/mrt/components/MrtDashboard.vue
  - frontend/src/shared/i18n/messages.ts
  - frontend/src/features/mrt/types.ts
  - frontend/src/features/mrt/map/overlay-registry.ts
  - docs/redpanda-local-dev.md
  - frontend/package.json
  - frontend/src/features/design-system/components/DesignSystemPage.vue
  - infra/starrocks/sql/bootstrap.sql
tests:
  - frontend/src/features/mrt/__tests__/map-provider.test.ts
  - backend/ingestion/src/test/resources/application-e2e.properties
  - frontend/src/features/mrt/__tests__/mrt-store-liveboard-source.test.ts
  - frontend/src/features/mrt/__tests__/mrt-data.test.ts
  - frontend/tests/e2e/fullstack.spec.ts
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardBackfillStateStoreE2eTest.java
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/api/MrtLiveBoardControllerE2eTest.java
  - frontend/src/features/mrt/__tests__/tdx-normalize.test.ts
  - frontend/src/features/mrt/__tests__/mrt-store.test.ts
  - frontend/src/shared/config/env.test.ts
  - frontend/src/features/mrt/__tests__/mrt-dashboard-live-mode.test.ts
  - frontend/src/features/mrt/__tests__/tdx-liveboard-api.test.ts
  - frontend/src/features/mrt/__tests__/inferred-trains.test.ts
-->

---
### Requirement: MRT Timeline Replay API

TWFoundry SHALL expose a backend MRT timeline API that returns recent persisted snapshots in replay order.

#### Scenario: Recent persisted snapshots are queryable

- **GIVEN** MRT liveboard snapshots have been persisted
- **WHEN** the frontend requests MRT timeline history
- **THEN** the backend returns recent snapshots ordered from oldest to newest
- **AND** each snapshot contains the normalized liveboard rows needed to replay dashboard state


<!-- @trace
source: add-mrt-live-mode-timeline
updated: 2026-04-27
code:
  - frontend/bun.lockb
  - docs/TWFoundry-project-brief.md
  - docs/git-worktree-layout.md
  - docs/overlay-registry-design-note.md
  - frontend/src/features/mrt/api/tdx-liveboard.ts
  - frontend/src/features/mrt/components/StationPanel.vue
  - backend/ingestion/src/main/resources/schema.sql
  - frontend/src/shared/config/env.ts
  - docs/starrocks-vs-iceberg-evolution-note.md
  - docs/starrocks-local-dev.md
  - gradle/libs.versions.toml
  - frontend/src/features/mrt/line-names.ts
  - frontend/src/features/mrt/map/map-provider.ts
  - frontend/src/features/mrt/localized-text.ts
  - frontend/src/app/stores/mrt-dashboard.ts
  - frontend/src/features/mrt/tdx/normalize.ts
  - backend/ingestion/src/main/resources/application.properties
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/E2eTdxLiveBoardGateway.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardBackfillStateStore.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardTimelineStore.java
  - frontend/src/env.d.ts
  - frontend/src/features/mrt/components/LayerControl.vue
  - infra/starrocks/docker-compose.yml
  - README.md
  - frontend/.env.example
  - frontend/src/features/mrt/components/MrtMap.vue
  - frontend/src/features/mrt/data/mrt-fixtures.ts
  - frontend/src/features/mrt/map/inferred-trains.ts
  - infra/redpanda/docker-compose.yml
  - frontend/src/shared/components/BaseBadge.vue
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardBackfillStateStore.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/api/MrtLiveBoardController.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardTimelineStore.java
  - frontend/src/features/mrt/data/mrt-network.generated.ts
  - backend/ingestion/build.gradle.kts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardService.java
  - frontend/src/features/mrt/components/MrtDashboard.vue
  - frontend/src/shared/i18n/messages.ts
  - frontend/src/features/mrt/types.ts
  - frontend/src/features/mrt/map/overlay-registry.ts
  - docs/redpanda-local-dev.md
  - frontend/package.json
  - frontend/src/features/design-system/components/DesignSystemPage.vue
  - infra/starrocks/sql/bootstrap.sql
tests:
  - frontend/src/features/mrt/__tests__/map-provider.test.ts
  - backend/ingestion/src/test/resources/application-e2e.properties
  - frontend/src/features/mrt/__tests__/mrt-store-liveboard-source.test.ts
  - frontend/src/features/mrt/__tests__/mrt-data.test.ts
  - frontend/tests/e2e/fullstack.spec.ts
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardBackfillStateStoreE2eTest.java
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/api/MrtLiveBoardControllerE2eTest.java
  - frontend/src/features/mrt/__tests__/tdx-normalize.test.ts
  - frontend/src/features/mrt/__tests__/mrt-store.test.ts
  - frontend/src/shared/config/env.test.ts
  - frontend/src/features/mrt/__tests__/mrt-dashboard-live-mode.test.ts
  - frontend/src/features/mrt/__tests__/tdx-liveboard-api.test.ts
  - frontend/src/features/mrt/__tests__/inferred-trains.test.ts
-->

---
### Requirement: Timeline Drag Replay

TWFoundry SHALL let the operator drag the MRT timeline to inspect persisted snapshots.

#### Scenario: Dragging the timeline changes the displayed snapshot

- **GIVEN** the MRT dashboard has loaded persisted timeline snapshots
- **WHEN** the operator drags the timeline away from the latest point
- **THEN** the dashboard enters `paused` mode
- **AND** the selected persisted snapshot becomes the source of truth for rendered MRT liveboard data
- **AND** pressing `Now` returns the dashboard to the latest live snapshot


<!-- @trace
source: add-mrt-live-mode-timeline
updated: 2026-04-27
code:
  - frontend/bun.lockb
  - docs/TWFoundry-project-brief.md
  - docs/git-worktree-layout.md
  - docs/overlay-registry-design-note.md
  - frontend/src/features/mrt/api/tdx-liveboard.ts
  - frontend/src/features/mrt/components/StationPanel.vue
  - backend/ingestion/src/main/resources/schema.sql
  - frontend/src/shared/config/env.ts
  - docs/starrocks-vs-iceberg-evolution-note.md
  - docs/starrocks-local-dev.md
  - gradle/libs.versions.toml
  - frontend/src/features/mrt/line-names.ts
  - frontend/src/features/mrt/map/map-provider.ts
  - frontend/src/features/mrt/localized-text.ts
  - frontend/src/app/stores/mrt-dashboard.ts
  - frontend/src/features/mrt/tdx/normalize.ts
  - backend/ingestion/src/main/resources/application.properties
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/E2eTdxLiveBoardGateway.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardBackfillStateStore.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardTimelineStore.java
  - frontend/src/env.d.ts
  - frontend/src/features/mrt/components/LayerControl.vue
  - infra/starrocks/docker-compose.yml
  - README.md
  - frontend/.env.example
  - frontend/src/features/mrt/components/MrtMap.vue
  - frontend/src/features/mrt/data/mrt-fixtures.ts
  - frontend/src/features/mrt/map/inferred-trains.ts
  - infra/redpanda/docker-compose.yml
  - frontend/src/shared/components/BaseBadge.vue
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardBackfillStateStore.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/api/MrtLiveBoardController.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardTimelineStore.java
  - frontend/src/features/mrt/data/mrt-network.generated.ts
  - backend/ingestion/build.gradle.kts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardService.java
  - frontend/src/features/mrt/components/MrtDashboard.vue
  - frontend/src/shared/i18n/messages.ts
  - frontend/src/features/mrt/types.ts
  - frontend/src/features/mrt/map/overlay-registry.ts
  - docs/redpanda-local-dev.md
  - frontend/package.json
  - frontend/src/features/design-system/components/DesignSystemPage.vue
  - infra/starrocks/sql/bootstrap.sql
tests:
  - frontend/src/features/mrt/__tests__/map-provider.test.ts
  - backend/ingestion/src/test/resources/application-e2e.properties
  - frontend/src/features/mrt/__tests__/mrt-store-liveboard-source.test.ts
  - frontend/src/features/mrt/__tests__/mrt-data.test.ts
  - frontend/tests/e2e/fullstack.spec.ts
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardBackfillStateStoreE2eTest.java
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/api/MrtLiveBoardControllerE2eTest.java
  - frontend/src/features/mrt/__tests__/tdx-normalize.test.ts
  - frontend/src/features/mrt/__tests__/mrt-store.test.ts
  - frontend/src/shared/config/env.test.ts
  - frontend/src/features/mrt/__tests__/mrt-dashboard-live-mode.test.ts
  - frontend/src/features/mrt/__tests__/tdx-liveboard-api.test.ts
  - frontend/src/features/mrt/__tests__/inferred-trains.test.ts
-->

---
### Requirement: Snapshot-Driven Train Position Replay

TWFoundry SHALL recompute train positions from the selected timeline snapshot.

#### Scenario: Train positions move when replay position changes

- **GIVEN** two or more persisted MRT snapshots contain different liveboard timing states
- **WHEN** the operator drags the timeline to another snapshot
- **THEN** inferred train marker positions update according to the selected snapshot rows
- **AND** sidebar train rows and station panel arrivals remain consistent with the same snapshot


<!-- @trace
source: add-mrt-live-mode-timeline
updated: 2026-04-27
code:
  - frontend/bun.lockb
  - docs/TWFoundry-project-brief.md
  - docs/git-worktree-layout.md
  - docs/overlay-registry-design-note.md
  - frontend/src/features/mrt/api/tdx-liveboard.ts
  - frontend/src/features/mrt/components/StationPanel.vue
  - backend/ingestion/src/main/resources/schema.sql
  - frontend/src/shared/config/env.ts
  - docs/starrocks-vs-iceberg-evolution-note.md
  - docs/starrocks-local-dev.md
  - gradle/libs.versions.toml
  - frontend/src/features/mrt/line-names.ts
  - frontend/src/features/mrt/map/map-provider.ts
  - frontend/src/features/mrt/localized-text.ts
  - frontend/src/app/stores/mrt-dashboard.ts
  - frontend/src/features/mrt/tdx/normalize.ts
  - backend/ingestion/src/main/resources/application.properties
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/E2eTdxLiveBoardGateway.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardBackfillStateStore.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardTimelineStore.java
  - frontend/src/env.d.ts
  - frontend/src/features/mrt/components/LayerControl.vue
  - infra/starrocks/docker-compose.yml
  - README.md
  - frontend/.env.example
  - frontend/src/features/mrt/components/MrtMap.vue
  - frontend/src/features/mrt/data/mrt-fixtures.ts
  - frontend/src/features/mrt/map/inferred-trains.ts
  - infra/redpanda/docker-compose.yml
  - frontend/src/shared/components/BaseBadge.vue
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardBackfillStateStore.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/api/MrtLiveBoardController.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardTimelineStore.java
  - frontend/src/features/mrt/data/mrt-network.generated.ts
  - backend/ingestion/build.gradle.kts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardService.java
  - frontend/src/features/mrt/components/MrtDashboard.vue
  - frontend/src/shared/i18n/messages.ts
  - frontend/src/features/mrt/types.ts
  - frontend/src/features/mrt/map/overlay-registry.ts
  - docs/redpanda-local-dev.md
  - frontend/package.json
  - frontend/src/features/design-system/components/DesignSystemPage.vue
  - infra/starrocks/sql/bootstrap.sql
tests:
  - frontend/src/features/mrt/__tests__/map-provider.test.ts
  - backend/ingestion/src/test/resources/application-e2e.properties
  - frontend/src/features/mrt/__tests__/mrt-store-liveboard-source.test.ts
  - frontend/src/features/mrt/__tests__/mrt-data.test.ts
  - frontend/tests/e2e/fullstack.spec.ts
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardBackfillStateStoreE2eTest.java
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/api/MrtLiveBoardControllerE2eTest.java
  - frontend/src/features/mrt/__tests__/tdx-normalize.test.ts
  - frontend/src/features/mrt/__tests__/mrt-store.test.ts
  - frontend/src/shared/config/env.test.ts
  - frontend/src/features/mrt/__tests__/mrt-dashboard-live-mode.test.ts
  - frontend/src/features/mrt/__tests__/tdx-liveboard-api.test.ts
  - frontend/src/features/mrt/__tests__/inferred-trains.test.ts
-->

---
### Requirement: Train-Centric Replay Selection

TWFoundry SHALL keep train-centric selection behavior during replay.

#### Scenario: Replay keeps selection centered on the train

- **GIVEN** the operator has selected a train from the map or sidebar
- **WHEN** the timeline moves to another persisted snapshot
- **THEN** the dashboard keeps `selectedTrainId` as the train-centric identity while that train exists in the selected snapshot
- **AND** the selection is cleared only if the selected snapshot no longer contains that train

<!-- @trace
source: add-mrt-live-mode-timeline
updated: 2026-04-27
code:
  - frontend/bun.lockb
  - docs/TWFoundry-project-brief.md
  - docs/git-worktree-layout.md
  - docs/overlay-registry-design-note.md
  - frontend/src/features/mrt/api/tdx-liveboard.ts
  - frontend/src/features/mrt/components/StationPanel.vue
  - backend/ingestion/src/main/resources/schema.sql
  - frontend/src/shared/config/env.ts
  - docs/starrocks-vs-iceberg-evolution-note.md
  - docs/starrocks-local-dev.md
  - gradle/libs.versions.toml
  - frontend/src/features/mrt/line-names.ts
  - frontend/src/features/mrt/map/map-provider.ts
  - frontend/src/features/mrt/localized-text.ts
  - frontend/src/app/stores/mrt-dashboard.ts
  - frontend/src/features/mrt/tdx/normalize.ts
  - backend/ingestion/src/main/resources/application.properties
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/infrastructure/tdx/E2eTdxLiveBoardGateway.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardBackfillStateStore.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardTimelineStore.java
  - frontend/src/env.d.ts
  - frontend/src/features/mrt/components/LayerControl.vue
  - infra/starrocks/docker-compose.yml
  - README.md
  - frontend/.env.example
  - frontend/src/features/mrt/components/MrtMap.vue
  - frontend/src/features/mrt/data/mrt-fixtures.ts
  - frontend/src/features/mrt/map/inferred-trains.ts
  - infra/redpanda/docker-compose.yml
  - frontend/src/shared/components/BaseBadge.vue
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardBackfillStateStore.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/api/MrtLiveBoardController.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardTimelineStore.java
  - frontend/src/features/mrt/data/mrt-network.generated.ts
  - backend/ingestion/build.gradle.kts
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/MrtLiveBoardService.java
  - frontend/src/features/mrt/components/MrtDashboard.vue
  - frontend/src/shared/i18n/messages.ts
  - frontend/src/features/mrt/types.ts
  - frontend/src/features/mrt/map/overlay-registry.ts
  - docs/redpanda-local-dev.md
  - frontend/package.json
  - frontend/src/features/design-system/components/DesignSystemPage.vue
  - infra/starrocks/sql/bootstrap.sql
tests:
  - frontend/src/features/mrt/__tests__/map-provider.test.ts
  - backend/ingestion/src/test/resources/application-e2e.properties
  - frontend/src/features/mrt/__tests__/mrt-store-liveboard-source.test.ts
  - frontend/src/features/mrt/__tests__/mrt-data.test.ts
  - frontend/tests/e2e/fullstack.spec.ts
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/EmbeddedJdbcMrtLiveBoardBackfillStateStoreE2eTest.java
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/api/MrtLiveBoardControllerE2eTest.java
  - frontend/src/features/mrt/__tests__/tdx-normalize.test.ts
  - frontend/src/features/mrt/__tests__/mrt-store.test.ts
  - frontend/src/shared/config/env.test.ts
  - frontend/src/features/mrt/__tests__/mrt-dashboard-live-mode.test.ts
  - frontend/src/features/mrt/__tests__/tdx-liveboard-api.test.ts
  - frontend/src/features/mrt/__tests__/inferred-trains.test.ts
-->

---
### Requirement: MapLibre Geospatial Backbone

TWFoundry SHALL use MapLibre as the frontend geospatial backbone for real map position, viewport, zoom, bearing, pitch, source loading, and feature querying.

TWFoundry SHALL treat the actual map as a geospatial base overlay/configuration, not as a domain data source such as TDX, PM2.5, Weather, or Incident.

#### Scenario: Actual Taipei map is displayed

- **GIVEN** the frontend map-backed cockpit is opened
- **WHEN** the map initializes successfully
- **THEN** the user sees a real Taipei map styled with TWFoundry's Sakura voxel-friendly visual direction

#### Scenario: Open free tile source is used for prototype

- **GIVEN** the first MapLibre-backed frontend implementation is configured
- **WHEN** the map style is loaded
- **THEN** the default tile/style source uses OpenFreeMap unless explicitly overridden by configuration

#### Scenario: Map base does not pollute domain sources

- **GIVEN** the map base overlay is enabled
- **WHEN** TDX, PM2.5, Weather, or Incident overlays are toggled
- **THEN** those domain sources remain independently controlled and are not coupled to the map tile provider

#### Scenario: MRT overlay aligns with map

- **GIVEN** MRT route and station geometry is available as GeoJSON or normalized ontology projections
- **WHEN** the Taipei Metro overlay is enabled
- **THEN** MRT route lines and station anchors appear above the actual map at their geographic positions


<!-- @trace
source: add-maplibre-voxel-map
updated: 2026-04-30
code:
  - frontend/src/App.vue
  - screenshots/maplibre-voxel/home.png
  - frontend/src/MapLibreOverlay.vue
  - frontend/src/ontologyProjection.js
  - frontend/src/voxelWorld.js
  - screenshots/maplibre-voxel/design-system.png
  - frontend/src/styles.css
tests:
  - frontend/tests/mapOverlayData.test.mjs
-->

---
### Requirement: Ontology-Driven Voxel Projection

TWFoundry SHALL render voxel entities from ontology projections rather than raw source API rows.

#### Scenario: Backend row becomes visible object

- **GIVEN** a backend LiveBoard row references a station and line
- **WHEN** frontend projection resolves it into an ontology object with geometry and state
- **THEN** the corresponding train or station render module can display it on the MapLibre-backed world


<!-- @trace
source: add-maplibre-voxel-map
updated: 2026-04-30
code:
  - frontend/src/App.vue
  - screenshots/maplibre-voxel/home.png
  - frontend/src/MapLibreOverlay.vue
  - frontend/src/ontologyProjection.js
  - frontend/src/voxelWorld.js
  - screenshots/maplibre-voxel/design-system.png
  - frontend/src/styles.css
tests:
  - frontend/tests/mapOverlayData.test.mjs
-->

---
### Requirement: Overlay Visibility Controls Both Map and Voxel Layers

TWFoundry SHALL keep overlay toggles as domain-level controls over both MapLibre style layers and Three.js voxel entities.

#### Scenario: Taipei Metro overlay is disabled

- **GIVEN** the Taipei Metro overlay is visible
- **WHEN** the user disables the overlay
- **THEN** MRT route lines, station anchors, and train voxel entities are hidden without deleting ontology object state


<!-- @trace
source: add-maplibre-voxel-map
updated: 2026-04-30
code:
  - frontend/src/App.vue
  - screenshots/maplibre-voxel/home.png
  - frontend/src/MapLibreOverlay.vue
  - frontend/src/ontologyProjection.js
  - frontend/src/voxelWorld.js
  - screenshots/maplibre-voxel/design-system.png
  - frontend/src/styles.css
tests:
  - frontend/tests/mapOverlayData.test.mjs
-->

---
### Requirement: Map Failure Fallback

TWFoundry SHALL handle MapLibre style or tile loading failure without a blank screen.

The fallback state SHALL preserve the map-first ontology model: available ontology objects,
overlay controls, freshness/completeness status, and selected-object detail remain inspectable.

Voxel detail MAY remain available for selected objects, but fallback behavior SHALL NOT require a
primary voxel diorama surface.

#### Scenario: Map tile provider is unavailable

- **GIVEN** the MapLibre style or tiles fail to load
- **WHEN** the dashboard renders
- **THEN** the user sees a recoverable map-source status message
- **AND** available ontology objects and overlay controls remain usable
- **AND** voxel rendering, if shown, is scoped to selected-object detail rather than replacing the
  map as the primary product surface


<!-- @trace
source: cleanup-map-first-contract-boundaries
updated: 2026-05-14
code:
  - frontend/src/voxelLandmarkRenderers.js
  - screenshots/phase1-debug-underlay-v3.png
  - frontend/vite.config.js
  - screenshots/phase1-data-derived-city-no-context-buildings.png
  - screenshots/phase1-data-derived-osm-fixture-buildings-framed.png
  - screenshots/phase1-data-derived-osm-fixture-buildings-reviewed.png
  - screenshots/phase1-dense-voxel-city-context.png
  - screenshots/phase1-polygon-footprint-buildings.png
  - screenshots/phase1-webmercator-local.png
  - backend/ingestion/src/main/resources/world/zhongshan-osm-fixture.json
  - screenshots/debug-map-reference-in-scene-wait.png
  - screenshots/debug-map-road-clear-intersection-filter.png
  - frontend/src/voxelWorld.js
  - screenshots/debug-map-reference-in-scene.png
  - screenshots/debug-map-road-width-canvas-fix.png
  - screenshots/phase1-data-derived-city-no-context-buildings-v3.png
  - screenshots/phase1-data-derived-city-no-context-buildings-v4.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/WorldViewService.java
  - frontend/index.html
  - frontend/package.json
  - screenshots/phase1-debug-underlay-v2.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/ZhongshanFixtureOsmCatalog.java
  - screenshots/phase1-ground-road-surfaces-contract-fixed.png
  - screenshots/phase1-ground-road-surfaces.png
  - screenshots/phase1-maplibre-scale-corrected-focused.png
  - screenshots/phase1-static-feature-catalog.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/CuratedZhongshanStaticFeatureProvider.java
  - screenshots/phase1-zhongshan-live-voxel.png
  - screenshots/real-map-alignment-debug-on-v3-long-wait.png
  - screenshots/phase1-debug-underlay.png
  - frontend/src/mockData.js
  - screenshots/real-map-alignment-debug-on.png
  - screenshots/debug-map-texture-publish-road-width-fix.png
  - screenshots/phase1-data-derived-city-no-context-buildings-v2.png
  - screenshots/phase1-maplibre-scale-corrected-focus-near.png
  - frontend/src/worldViewRenderModules.js
  - README.md
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/OsmStaticFeatureAdapter.java
  - screenshots/debug-map-reference-in-scene-after-lifecycle-fix.png
  - screenshots/phase1-urban-role-city-fabric.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/StaticFeatureProvider.java
  - screenshots/phase1-zhongshan-live-default.png
  - screenshots/phase1-data-derived-osm-fixture-buildings-clean-labels.png
  - screenshots/phase1-data-derived-city-final.png
  - screenshots/road-geo-source-alignment-debug-on.png
  - frontend/src/MapLibreOverlay.vue
  - screenshots/voxel-style-base-debug-off.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/StaticFeatureStyleResolver.java
  - screenshots/debug-map-road-clear-filter.png
  - screenshots/phase1-data-derived-osm-fixture-buildings-refocused.png
  - screenshots/phase1-maplibre-no-road-buildings.png
  - screenshots/phase1-maplibre-scale-final.png
  - frontend/src/mapAlignmentDiagnostics.js
  - frontend/src/mapOverlayRenderers.js
  - screenshots/phase1-maplibre-texture-plane.png
  - SPEC.md
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/api/WorldViewController.java
  - frontend/src/worldViewPayload.js
  - Design.md
  - docs/decision-history/2026-05-map-first-pivot.md
  - frontend/src/OntologyPreview.vue
  - screenshots/phase1-ground-road-surfaces-readable.png
  - screenshots/source-geometry-contract-debug-on.png
  - backend/ingestion/src/main/resources/world/taipei-main-station-osm-fixture.json
  - frontend/src/App.vue
  - screenshots/phase1-data-derived-osm-fixture-buildings.png
  - frontend/src/mapDerivedWorldPayload.js
  - frontend/src/overlayRegistry.js
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/WorldView.java
  - screenshots/phase1-static-feature-provider.png
  - screenshots/phase1-maplibre-scale-corrected.png
  - frontend/bun.lock
  - screenshots/voxel-style-base-debug-off-v2.png
  - screenshots/real-map-alignment-debug-on-v2.png
  - screenshots/phase1-urban-role-style-resolver.png
  - screenshots/phase1-debug-underlay-v4.png
  - screenshots/phase1-zhongshan-live-station.png
  - frontend/src/styles.css
  - screenshots/phase1-geo-anchored-underlay.png
tests:
  - frontend/tests/mapAlignmentDiagnostics.test.mjs
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/api/WorldViewControllerE2eTest.java
  - frontend/tests/overlayRegistry.test.mjs
  - frontend/tests/worldViewRenderModules.test.mjs
  - frontend/tests/run.mjs
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/world/CuratedZhongshanStaticFeatureProviderTest.java
  - frontend/tests/worldViewPayload.test.mjs
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/world/OsmStaticFeatureAdapterTest.java
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/world/StaticFeatureStyleResolverTest.java
-->

---
### Requirement: Backend-Computed World View Contract

TWFoundry MAY continue exposing backend-computed `WorldViewPayload` during the map-first migration.

`WorldViewPayload`, `chunks`, and `projections` are legacy-compatible implementation fields. New
product decisions SHALL treat them as compatibility inputs that feed ontology objects, map overlay
projections, selected-object details, freshness, and completeness.

The frontend SHALL NOT treat `WorldViewPayload` as proof that the primary dashboard must be a
voxel diorama.

#### Scenario: Frontend requests current world view

- **GIVEN** the frontend opens the operations dashboard
- **WHEN** it requests `GET /api/world/view?focusId=zhongshan-station&lod=city&time=live`
- **THEN** the backend may return `schemaVersion`, `request`, `focus`, `chunks`, `objects`,
  `projections`, `renderModules`, `freshness`, and `completeness`
- **AND** the frontend maps those fields into ontology objects, map overlays, and selected-object
  detail
- **AND** the user-facing product model remains map-first

#### Scenario: Partial payload identifies missing overlays

- **GIVEN** a non-critical source is stale or unavailable
- **WHEN** the backend can still generate part of the view
- **THEN** it returns completeness metadata such as `status`, `missingOverlays`, and `warnings`
- **AND** the frontend keeps available ontology objects inspectable


<!-- @trace
source: cleanup-map-first-contract-boundaries
updated: 2026-05-14
code:
  - frontend/src/voxelLandmarkRenderers.js
  - screenshots/phase1-debug-underlay-v3.png
  - frontend/vite.config.js
  - screenshots/phase1-data-derived-city-no-context-buildings.png
  - screenshots/phase1-data-derived-osm-fixture-buildings-framed.png
  - screenshots/phase1-data-derived-osm-fixture-buildings-reviewed.png
  - screenshots/phase1-dense-voxel-city-context.png
  - screenshots/phase1-polygon-footprint-buildings.png
  - screenshots/phase1-webmercator-local.png
  - backend/ingestion/src/main/resources/world/zhongshan-osm-fixture.json
  - screenshots/debug-map-reference-in-scene-wait.png
  - screenshots/debug-map-road-clear-intersection-filter.png
  - frontend/src/voxelWorld.js
  - screenshots/debug-map-reference-in-scene.png
  - screenshots/debug-map-road-width-canvas-fix.png
  - screenshots/phase1-data-derived-city-no-context-buildings-v3.png
  - screenshots/phase1-data-derived-city-no-context-buildings-v4.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/WorldViewService.java
  - frontend/index.html
  - frontend/package.json
  - screenshots/phase1-debug-underlay-v2.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/ZhongshanFixtureOsmCatalog.java
  - screenshots/phase1-ground-road-surfaces-contract-fixed.png
  - screenshots/phase1-ground-road-surfaces.png
  - screenshots/phase1-maplibre-scale-corrected-focused.png
  - screenshots/phase1-static-feature-catalog.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/CuratedZhongshanStaticFeatureProvider.java
  - screenshots/phase1-zhongshan-live-voxel.png
  - screenshots/real-map-alignment-debug-on-v3-long-wait.png
  - screenshots/phase1-debug-underlay.png
  - frontend/src/mockData.js
  - screenshots/real-map-alignment-debug-on.png
  - screenshots/debug-map-texture-publish-road-width-fix.png
  - screenshots/phase1-data-derived-city-no-context-buildings-v2.png
  - screenshots/phase1-maplibre-scale-corrected-focus-near.png
  - frontend/src/worldViewRenderModules.js
  - README.md
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/OsmStaticFeatureAdapter.java
  - screenshots/debug-map-reference-in-scene-after-lifecycle-fix.png
  - screenshots/phase1-urban-role-city-fabric.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/StaticFeatureProvider.java
  - screenshots/phase1-zhongshan-live-default.png
  - screenshots/phase1-data-derived-osm-fixture-buildings-clean-labels.png
  - screenshots/phase1-data-derived-city-final.png
  - screenshots/road-geo-source-alignment-debug-on.png
  - frontend/src/MapLibreOverlay.vue
  - screenshots/voxel-style-base-debug-off.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/StaticFeatureStyleResolver.java
  - screenshots/debug-map-road-clear-filter.png
  - screenshots/phase1-data-derived-osm-fixture-buildings-refocused.png
  - screenshots/phase1-maplibre-no-road-buildings.png
  - screenshots/phase1-maplibre-scale-final.png
  - frontend/src/mapAlignmentDiagnostics.js
  - frontend/src/mapOverlayRenderers.js
  - screenshots/phase1-maplibre-texture-plane.png
  - SPEC.md
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/api/WorldViewController.java
  - frontend/src/worldViewPayload.js
  - Design.md
  - docs/decision-history/2026-05-map-first-pivot.md
  - frontend/src/OntologyPreview.vue
  - screenshots/phase1-ground-road-surfaces-readable.png
  - screenshots/source-geometry-contract-debug-on.png
  - backend/ingestion/src/main/resources/world/taipei-main-station-osm-fixture.json
  - frontend/src/App.vue
  - screenshots/phase1-data-derived-osm-fixture-buildings.png
  - frontend/src/mapDerivedWorldPayload.js
  - frontend/src/overlayRegistry.js
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/WorldView.java
  - screenshots/phase1-static-feature-provider.png
  - screenshots/phase1-maplibre-scale-corrected.png
  - frontend/bun.lock
  - screenshots/voxel-style-base-debug-off-v2.png
  - screenshots/real-map-alignment-debug-on-v2.png
  - screenshots/phase1-urban-role-style-resolver.png
  - screenshots/phase1-debug-underlay-v4.png
  - screenshots/phase1-zhongshan-live-station.png
  - frontend/src/styles.css
  - screenshots/phase1-geo-anchored-underlay.png
tests:
  - frontend/tests/mapAlignmentDiagnostics.test.mjs
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/api/WorldViewControllerE2eTest.java
  - frontend/tests/overlayRegistry.test.mjs
  - frontend/tests/worldViewRenderModules.test.mjs
  - frontend/tests/run.mjs
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/world/CuratedZhongshanStaticFeatureProviderTest.java
  - frontend/tests/worldViewPayload.test.mjs
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/world/OsmStaticFeatureAdapterTest.java
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/world/StaticFeatureStyleResolverTest.java
-->

---
### Requirement: Diorama Chunk Is Product-Owned

TWFoundry SHALL treat `DioramaChunk` as a legacy-compatible internal render artifact during the
map-first migration.

`DioramaChunk` MAY continue carrying focus-local geometry, source references, ground features,
static features, or semantic zones for compatibility paths. It SHALL NOT be presented as the main
product unit in new user-facing UI or future product decisions.

#### Scenario: Compatibility chunk contains local render data

- **GIVEN** a compatibility payload contains `DioramaChunk` data
- **WHEN** a legacy renderer or object-detail path consumes it
- **THEN** source references and local geometry remain traceable
- **AND** the primary dashboard still presents map overlays and ontology object detail rather than
  chunk-first navigation

#### Scenario: Source-derived geometry remains traceable

- **GIVEN** static map or OSM-like fixture data contributes geometry
- **WHEN** the compatibility payload includes that geometry
- **THEN** source refs and source geometry remain available for diagnostics and trust
- **AND** renderer code does not invent source truth


<!-- @trace
source: cleanup-map-first-contract-boundaries
updated: 2026-05-14
code:
  - frontend/src/voxelLandmarkRenderers.js
  - screenshots/phase1-debug-underlay-v3.png
  - frontend/vite.config.js
  - screenshots/phase1-data-derived-city-no-context-buildings.png
  - screenshots/phase1-data-derived-osm-fixture-buildings-framed.png
  - screenshots/phase1-data-derived-osm-fixture-buildings-reviewed.png
  - screenshots/phase1-dense-voxel-city-context.png
  - screenshots/phase1-polygon-footprint-buildings.png
  - screenshots/phase1-webmercator-local.png
  - backend/ingestion/src/main/resources/world/zhongshan-osm-fixture.json
  - screenshots/debug-map-reference-in-scene-wait.png
  - screenshots/debug-map-road-clear-intersection-filter.png
  - frontend/src/voxelWorld.js
  - screenshots/debug-map-reference-in-scene.png
  - screenshots/debug-map-road-width-canvas-fix.png
  - screenshots/phase1-data-derived-city-no-context-buildings-v3.png
  - screenshots/phase1-data-derived-city-no-context-buildings-v4.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/WorldViewService.java
  - frontend/index.html
  - frontend/package.json
  - screenshots/phase1-debug-underlay-v2.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/ZhongshanFixtureOsmCatalog.java
  - screenshots/phase1-ground-road-surfaces-contract-fixed.png
  - screenshots/phase1-ground-road-surfaces.png
  - screenshots/phase1-maplibre-scale-corrected-focused.png
  - screenshots/phase1-static-feature-catalog.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/CuratedZhongshanStaticFeatureProvider.java
  - screenshots/phase1-zhongshan-live-voxel.png
  - screenshots/real-map-alignment-debug-on-v3-long-wait.png
  - screenshots/phase1-debug-underlay.png
  - frontend/src/mockData.js
  - screenshots/real-map-alignment-debug-on.png
  - screenshots/debug-map-texture-publish-road-width-fix.png
  - screenshots/phase1-data-derived-city-no-context-buildings-v2.png
  - screenshots/phase1-maplibre-scale-corrected-focus-near.png
  - frontend/src/worldViewRenderModules.js
  - README.md
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/OsmStaticFeatureAdapter.java
  - screenshots/debug-map-reference-in-scene-after-lifecycle-fix.png
  - screenshots/phase1-urban-role-city-fabric.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/StaticFeatureProvider.java
  - screenshots/phase1-zhongshan-live-default.png
  - screenshots/phase1-data-derived-osm-fixture-buildings-clean-labels.png
  - screenshots/phase1-data-derived-city-final.png
  - screenshots/road-geo-source-alignment-debug-on.png
  - frontend/src/MapLibreOverlay.vue
  - screenshots/voxel-style-base-debug-off.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/StaticFeatureStyleResolver.java
  - screenshots/debug-map-road-clear-filter.png
  - screenshots/phase1-data-derived-osm-fixture-buildings-refocused.png
  - screenshots/phase1-maplibre-no-road-buildings.png
  - screenshots/phase1-maplibre-scale-final.png
  - frontend/src/mapAlignmentDiagnostics.js
  - frontend/src/mapOverlayRenderers.js
  - screenshots/phase1-maplibre-texture-plane.png
  - SPEC.md
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/api/WorldViewController.java
  - frontend/src/worldViewPayload.js
  - Design.md
  - docs/decision-history/2026-05-map-first-pivot.md
  - frontend/src/OntologyPreview.vue
  - screenshots/phase1-ground-road-surfaces-readable.png
  - screenshots/source-geometry-contract-debug-on.png
  - backend/ingestion/src/main/resources/world/taipei-main-station-osm-fixture.json
  - frontend/src/App.vue
  - screenshots/phase1-data-derived-osm-fixture-buildings.png
  - frontend/src/mapDerivedWorldPayload.js
  - frontend/src/overlayRegistry.js
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/WorldView.java
  - screenshots/phase1-static-feature-provider.png
  - screenshots/phase1-maplibre-scale-corrected.png
  - frontend/bun.lock
  - screenshots/voxel-style-base-debug-off-v2.png
  - screenshots/real-map-alignment-debug-on-v2.png
  - screenshots/phase1-urban-role-style-resolver.png
  - screenshots/phase1-debug-underlay-v4.png
  - screenshots/phase1-zhongshan-live-station.png
  - frontend/src/styles.css
  - screenshots/phase1-geo-anchored-underlay.png
tests:
  - frontend/tests/mapAlignmentDiagnostics.test.mjs
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/api/WorldViewControllerE2eTest.java
  - frontend/tests/overlayRegistry.test.mjs
  - frontend/tests/worldViewRenderModules.test.mjs
  - frontend/tests/run.mjs
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/world/CuratedZhongshanStaticFeatureProviderTest.java
  - frontend/tests/worldViewPayload.test.mjs
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/world/OsmStaticFeatureAdapterTest.java
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/world/StaticFeatureStyleResolverTest.java
-->

---
### Requirement: Ontology Object Identity Is Independent Of Chunk Boundaries

TWFoundry SHALL keep canonical operational identity in `OntologyObject` records.

Map overlays, object detail renderers, compatibility chunks, and compatibility projections SHALL
NOT own event, train, station, sensor, or alert identity.

#### Scenario: Cross-area rain cell has one object

- **GIVEN** one rain cell covers multiple map areas, overlays, or compatibility chunks
- **WHEN** the backend computes the view
- **THEN** the `objects` collection contains exactly one `OntologyObject` for that rain cell
- **AND** any overlay features or compatibility projections reference the same object identity

#### Scenario: Projection click resolves to canonical object

- **GIVEN** the frontend user clicks a map overlay feature or compatibility projection
- **WHEN** the projection contains an object reference
- **THEN** the inspector resolves the selected object from the canonical `objects` collection
- **AND** all projections for that object share the same object detail view

#### Scenario: Static station feature maps to canonical station object

- **GIVEN** a static station feature is visible through a map overlay, object detail, or
  compatibility renderer
- **WHEN** it corresponds to a canonical station ontology object
- **THEN** the feature includes an ontology object reference
- **AND** clicking the station resolves to the canonical station object rather than a raw geo feature


<!-- @trace
source: cleanup-remaining-legacy-world-view-references
updated: 2026-05-14
code:
  - screenshots/debug-map-road-clear-intersection-filter.png
  - frontend/src/mockData.js
  - screenshots/debug-map-road-clear-filter.png
  - screenshots/real-map-alignment-debug-on-v2.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/WorldView.java
  - frontend/src/voxelWorld.js
  - frontend/vite.config.js
  - SPEC.md
  - screenshots/debug-map-reference-in-scene-wait.png
  - screenshots/phase1-maplibre-no-road-buildings.png
  - frontend/src/OntologyPreview.vue
  - screenshots/phase1-webmercator-local.png
  - backend/ingestion/src/main/resources/world/taipei-main-station-osm-fixture.json
  - frontend/src/mapDerivedWorldPayload.js
  - backend/ingestion/src/main/resources/world/zhongshan-osm-fixture.json
  - screenshots/phase1-ground-road-surfaces-contract-fixed.png
  - screenshots/phase1-data-derived-city-no-context-buildings-v3.png
  - screenshots/phase1-maplibre-scale-corrected-focus-near.png
  - screenshots/phase1-debug-underlay-v2.png
  - screenshots/phase1-zhongshan-live-voxel.png
  - docs/decision-history/2026-05-map-first-pivot.md
  - screenshots/phase1-data-derived-city-final.png
  - frontend/package.json
  - frontend/src/MapLibreOverlay.vue
  - screenshots/phase1-data-derived-osm-fixture-buildings-framed.png
  - screenshots/phase1-static-feature-provider.png
  - screenshots/phase1-data-derived-osm-fixture-buildings-reviewed.png
  - frontend/src/styles.css
  - screenshots/phase1-geo-anchored-underlay.png
  - screenshots/debug-map-reference-in-scene.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/api/WorldViewController.java
  - screenshots/phase1-zhongshan-live-default.png
  - screenshots/phase1-data-derived-city-no-context-buildings-v4.png
  - frontend/src/worldViewPayload.js
  - screenshots/phase1-static-feature-catalog.png
  - screenshots/voxel-style-base-debug-off-v2.png
  - frontend/src/mapOverlayRenderers.js
  - frontend/src/voxelLandmarkRenderers.js
  - screenshots/phase1-debug-underlay-v3.png
  - Design.md
  - screenshots/phase1-debug-underlay.png
  - screenshots/real-map-alignment-debug-on.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/StaticFeatureStyleResolver.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/StaticFeatureProvider.java
  - frontend/src/worldViewRenderModules.js
  - screenshots/debug-map-reference-in-scene-after-lifecycle-fix.png
  - screenshots/phase1-maplibre-scale-final.png
  - screenshots/source-geometry-contract-debug-on.png
  - screenshots/phase1-data-derived-osm-fixture-buildings-refocused.png
  - screenshots/debug-map-road-width-canvas-fix.png
  - screenshots/phase1-dense-voxel-city-context.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/ZhongshanFixtureOsmCatalog.java
  - screenshots/phase1-maplibre-scale-corrected.png
  - README.md
  - screenshots/debug-map-texture-publish-road-width-fix.png
  - screenshots/phase1-ground-road-surfaces-readable.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/CuratedZhongshanStaticFeatureProvider.java
  - screenshots/phase1-polygon-footprint-buildings.png
  - screenshots/real-map-alignment-debug-on-v3-long-wait.png
  - frontend/bun.lock
  - screenshots/phase1-data-derived-osm-fixture-buildings-clean-labels.png
  - screenshots/phase1-zhongshan-live-station.png
  - screenshots/phase1-urban-role-style-resolver.png
  - screenshots/phase1-data-derived-osm-fixture-buildings.png
  - screenshots/phase1-maplibre-texture-plane.png
  - screenshots/phase1-urban-role-city-fabric.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/OsmStaticFeatureAdapter.java
  - screenshots/phase1-data-derived-city-no-context-buildings.png
  - frontend/src/overlayRegistry.js
  - screenshots/phase1-maplibre-scale-corrected-focused.png
  - screenshots/phase1-data-derived-city-no-context-buildings-v2.png
  - screenshots/road-geo-source-alignment-debug-on.png
  - frontend/src/App.vue
  - frontend/src/mapAlignmentDiagnostics.js
  - screenshots/phase1-debug-underlay-v4.png
  - frontend/index.html
  - screenshots/phase1-ground-road-surfaces.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/WorldViewService.java
  - screenshots/voxel-style-base-debug-off.png
tests:
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/world/StaticFeatureStyleResolverTest.java
  - frontend/tests/run.mjs
  - frontend/tests/worldViewRenderModules.test.mjs
  - frontend/tests/mapAlignmentDiagnostics.test.mjs
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/api/WorldViewControllerE2eTest.java
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/world/OsmStaticFeatureAdapterTest.java
  - frontend/tests/overlayRegistry.test.mjs
  - frontend/tests/worldViewPayload.test.mjs
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/world/CuratedZhongshanStaticFeatureProviderTest.java
-->

---
### Requirement: Chunk Projection Bridges Object To Local Render Module

TWFoundry MAY continue using `ChunkProjection` as a legacy-compatible bridge from ontology objects
to render modules.

New map-first work SHOULD prefer generic overlay projection and object detail contracts. If
`ChunkProjection` is consumed, it SHALL be treated as an input to compatibility rendering or
selected-object detail, not as the product-level projection model.

#### Scenario: Compatibility projection resolves to ontology object

- **GIVEN** a compatibility projection references an ontology object
- **WHEN** the frontend consumes the projection
- **THEN** selection resolves to the canonical ontology object
- **AND** overlay visibility hides the projection without deleting ontology state

#### Scenario: New overlay work remains product-facing

- **GIVEN** a new operational domain is exposed on the map
- **WHEN** its renderer is implemented
- **THEN** the product identity is registered through overlay metadata
- **AND** renderer code does not define overlay identity by itself


<!-- @trace
source: cleanup-map-first-contract-boundaries
updated: 2026-05-14
code:
  - frontend/src/voxelLandmarkRenderers.js
  - screenshots/phase1-debug-underlay-v3.png
  - frontend/vite.config.js
  - screenshots/phase1-data-derived-city-no-context-buildings.png
  - screenshots/phase1-data-derived-osm-fixture-buildings-framed.png
  - screenshots/phase1-data-derived-osm-fixture-buildings-reviewed.png
  - screenshots/phase1-dense-voxel-city-context.png
  - screenshots/phase1-polygon-footprint-buildings.png
  - screenshots/phase1-webmercator-local.png
  - backend/ingestion/src/main/resources/world/zhongshan-osm-fixture.json
  - screenshots/debug-map-reference-in-scene-wait.png
  - screenshots/debug-map-road-clear-intersection-filter.png
  - frontend/src/voxelWorld.js
  - screenshots/debug-map-reference-in-scene.png
  - screenshots/debug-map-road-width-canvas-fix.png
  - screenshots/phase1-data-derived-city-no-context-buildings-v3.png
  - screenshots/phase1-data-derived-city-no-context-buildings-v4.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/WorldViewService.java
  - frontend/index.html
  - frontend/package.json
  - screenshots/phase1-debug-underlay-v2.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/ZhongshanFixtureOsmCatalog.java
  - screenshots/phase1-ground-road-surfaces-contract-fixed.png
  - screenshots/phase1-ground-road-surfaces.png
  - screenshots/phase1-maplibre-scale-corrected-focused.png
  - screenshots/phase1-static-feature-catalog.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/CuratedZhongshanStaticFeatureProvider.java
  - screenshots/phase1-zhongshan-live-voxel.png
  - screenshots/real-map-alignment-debug-on-v3-long-wait.png
  - screenshots/phase1-debug-underlay.png
  - frontend/src/mockData.js
  - screenshots/real-map-alignment-debug-on.png
  - screenshots/debug-map-texture-publish-road-width-fix.png
  - screenshots/phase1-data-derived-city-no-context-buildings-v2.png
  - screenshots/phase1-maplibre-scale-corrected-focus-near.png
  - frontend/src/worldViewRenderModules.js
  - README.md
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/OsmStaticFeatureAdapter.java
  - screenshots/debug-map-reference-in-scene-after-lifecycle-fix.png
  - screenshots/phase1-urban-role-city-fabric.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/StaticFeatureProvider.java
  - screenshots/phase1-zhongshan-live-default.png
  - screenshots/phase1-data-derived-osm-fixture-buildings-clean-labels.png
  - screenshots/phase1-data-derived-city-final.png
  - screenshots/road-geo-source-alignment-debug-on.png
  - frontend/src/MapLibreOverlay.vue
  - screenshots/voxel-style-base-debug-off.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/StaticFeatureStyleResolver.java
  - screenshots/debug-map-road-clear-filter.png
  - screenshots/phase1-data-derived-osm-fixture-buildings-refocused.png
  - screenshots/phase1-maplibre-no-road-buildings.png
  - screenshots/phase1-maplibre-scale-final.png
  - frontend/src/mapAlignmentDiagnostics.js
  - frontend/src/mapOverlayRenderers.js
  - screenshots/phase1-maplibre-texture-plane.png
  - SPEC.md
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/api/WorldViewController.java
  - frontend/src/worldViewPayload.js
  - Design.md
  - docs/decision-history/2026-05-map-first-pivot.md
  - frontend/src/OntologyPreview.vue
  - screenshots/phase1-ground-road-surfaces-readable.png
  - screenshots/source-geometry-contract-debug-on.png
  - backend/ingestion/src/main/resources/world/taipei-main-station-osm-fixture.json
  - frontend/src/App.vue
  - screenshots/phase1-data-derived-osm-fixture-buildings.png
  - frontend/src/mapDerivedWorldPayload.js
  - frontend/src/overlayRegistry.js
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/WorldView.java
  - screenshots/phase1-static-feature-provider.png
  - screenshots/phase1-maplibre-scale-corrected.png
  - frontend/bun.lock
  - screenshots/voxel-style-base-debug-off-v2.png
  - screenshots/real-map-alignment-debug-on-v2.png
  - screenshots/phase1-urban-role-style-resolver.png
  - screenshots/phase1-debug-underlay-v4.png
  - screenshots/phase1-zhongshan-live-station.png
  - frontend/src/styles.css
  - screenshots/phase1-geo-anchored-underlay.png
tests:
  - frontend/tests/mapAlignmentDiagnostics.test.mjs
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/api/WorldViewControllerE2eTest.java
  - frontend/tests/overlayRegistry.test.mjs
  - frontend/tests/worldViewRenderModules.test.mjs
  - frontend/tests/run.mjs
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/world/CuratedZhongshanStaticFeatureProviderTest.java
  - frontend/tests/worldViewPayload.test.mjs
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/world/OsmStaticFeatureAdapterTest.java
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/world/StaticFeatureStyleResolverTest.java
-->

---
### Requirement: Backend Owns Heavy Spatial Computation

TWFoundry SHALL perform heavy geospatial computation in the backend for production view contracts.

Heavy computation includes source feature normalization, spatial indexing, geometry simplification,
projection generation, map focus clipping, and compatibility local-geometry generation.

#### Scenario: Frontend receives precomputed projection geometry

- **GIVEN** a production view is returned
- **WHEN** the frontend receives map overlay or compatibility projection geometry
- **THEN** geometry is already normalized for the relevant renderer contract
- **AND** the frontend does not need to decode raw source tiles or perform authoritative source
  geometry placement

#### Scenario: Java is the initial compute runtime

- **GIVEN** the first backend view implementation is built
- **WHEN** view computation is implemented
- **THEN** it uses the existing Java backend stack
- **AND** Go or Rust workers are not required until profiling identifies a specific compute
  bottleneck


<!-- @trace
source: cleanup-remaining-legacy-world-view-references
updated: 2026-05-14
code:
  - screenshots/debug-map-road-clear-intersection-filter.png
  - frontend/src/mockData.js
  - screenshots/debug-map-road-clear-filter.png
  - screenshots/real-map-alignment-debug-on-v2.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/WorldView.java
  - frontend/src/voxelWorld.js
  - frontend/vite.config.js
  - SPEC.md
  - screenshots/debug-map-reference-in-scene-wait.png
  - screenshots/phase1-maplibre-no-road-buildings.png
  - frontend/src/OntologyPreview.vue
  - screenshots/phase1-webmercator-local.png
  - backend/ingestion/src/main/resources/world/taipei-main-station-osm-fixture.json
  - frontend/src/mapDerivedWorldPayload.js
  - backend/ingestion/src/main/resources/world/zhongshan-osm-fixture.json
  - screenshots/phase1-ground-road-surfaces-contract-fixed.png
  - screenshots/phase1-data-derived-city-no-context-buildings-v3.png
  - screenshots/phase1-maplibre-scale-corrected-focus-near.png
  - screenshots/phase1-debug-underlay-v2.png
  - screenshots/phase1-zhongshan-live-voxel.png
  - docs/decision-history/2026-05-map-first-pivot.md
  - screenshots/phase1-data-derived-city-final.png
  - frontend/package.json
  - frontend/src/MapLibreOverlay.vue
  - screenshots/phase1-data-derived-osm-fixture-buildings-framed.png
  - screenshots/phase1-static-feature-provider.png
  - screenshots/phase1-data-derived-osm-fixture-buildings-reviewed.png
  - frontend/src/styles.css
  - screenshots/phase1-geo-anchored-underlay.png
  - screenshots/debug-map-reference-in-scene.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/api/WorldViewController.java
  - screenshots/phase1-zhongshan-live-default.png
  - screenshots/phase1-data-derived-city-no-context-buildings-v4.png
  - frontend/src/worldViewPayload.js
  - screenshots/phase1-static-feature-catalog.png
  - screenshots/voxel-style-base-debug-off-v2.png
  - frontend/src/mapOverlayRenderers.js
  - frontend/src/voxelLandmarkRenderers.js
  - screenshots/phase1-debug-underlay-v3.png
  - Design.md
  - screenshots/phase1-debug-underlay.png
  - screenshots/real-map-alignment-debug-on.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/StaticFeatureStyleResolver.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/StaticFeatureProvider.java
  - frontend/src/worldViewRenderModules.js
  - screenshots/debug-map-reference-in-scene-after-lifecycle-fix.png
  - screenshots/phase1-maplibre-scale-final.png
  - screenshots/source-geometry-contract-debug-on.png
  - screenshots/phase1-data-derived-osm-fixture-buildings-refocused.png
  - screenshots/debug-map-road-width-canvas-fix.png
  - screenshots/phase1-dense-voxel-city-context.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/ZhongshanFixtureOsmCatalog.java
  - screenshots/phase1-maplibre-scale-corrected.png
  - README.md
  - screenshots/debug-map-texture-publish-road-width-fix.png
  - screenshots/phase1-ground-road-surfaces-readable.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/CuratedZhongshanStaticFeatureProvider.java
  - screenshots/phase1-polygon-footprint-buildings.png
  - screenshots/real-map-alignment-debug-on-v3-long-wait.png
  - frontend/bun.lock
  - screenshots/phase1-data-derived-osm-fixture-buildings-clean-labels.png
  - screenshots/phase1-zhongshan-live-station.png
  - screenshots/phase1-urban-role-style-resolver.png
  - screenshots/phase1-data-derived-osm-fixture-buildings.png
  - screenshots/phase1-maplibre-texture-plane.png
  - screenshots/phase1-urban-role-city-fabric.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/OsmStaticFeatureAdapter.java
  - screenshots/phase1-data-derived-city-no-context-buildings.png
  - frontend/src/overlayRegistry.js
  - screenshots/phase1-maplibre-scale-corrected-focused.png
  - screenshots/phase1-data-derived-city-no-context-buildings-v2.png
  - screenshots/road-geo-source-alignment-debug-on.png
  - frontend/src/App.vue
  - frontend/src/mapAlignmentDiagnostics.js
  - screenshots/phase1-debug-underlay-v4.png
  - frontend/index.html
  - screenshots/phase1-ground-road-surfaces.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/WorldViewService.java
  - screenshots/voxel-style-base-debug-off.png
tests:
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/world/StaticFeatureStyleResolverTest.java
  - frontend/tests/run.mjs
  - frontend/tests/worldViewRenderModules.test.mjs
  - frontend/tests/mapAlignmentDiagnostics.test.mjs
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/api/WorldViewControllerE2eTest.java
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/world/OsmStaticFeatureAdapterTest.java
  - frontend/tests/overlayRegistry.test.mjs
  - frontend/tests/worldViewPayload.test.mjs
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/world/CuratedZhongshanStaticFeatureProviderTest.java
-->

---
### Requirement: Geo Source Providers Are Replaceable

TWFoundry SHALL keep geospatial source providers replaceable behind backend source adapter or
geospatial provider abstractions.

The map-first product contract SHALL NOT depend directly on OpenFreeMap, PMTiles, OpenMapTiles,
MapLibre style JSON, or any single tile provider.

#### Scenario: Mock provider backs first vertical slice

- **GIVEN** the first backend-computed view is implemented
- **WHEN** real vector tile ingestion is not ready
- **THEN** a mock, static, or fixture provider can supply normalized source features
- **AND** the frontend consumes the same map overlay, ontology, freshness, and object detail
  contracts

#### Scenario: Provider can change without frontend contract change

- **GIVEN** the backend replaces a mock provider with PMTiles, OpenMapTiles, OSM-derived fixtures, or
  another source
- **WHEN** the frontend requests the view
- **THEN** the product contract remains stable
- **AND** frontend render modules do not need provider-specific logic


<!-- @trace
source: cleanup-remaining-legacy-world-view-references
updated: 2026-05-14
code:
  - screenshots/debug-map-road-clear-intersection-filter.png
  - frontend/src/mockData.js
  - screenshots/debug-map-road-clear-filter.png
  - screenshots/real-map-alignment-debug-on-v2.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/WorldView.java
  - frontend/src/voxelWorld.js
  - frontend/vite.config.js
  - SPEC.md
  - screenshots/debug-map-reference-in-scene-wait.png
  - screenshots/phase1-maplibre-no-road-buildings.png
  - frontend/src/OntologyPreview.vue
  - screenshots/phase1-webmercator-local.png
  - backend/ingestion/src/main/resources/world/taipei-main-station-osm-fixture.json
  - frontend/src/mapDerivedWorldPayload.js
  - backend/ingestion/src/main/resources/world/zhongshan-osm-fixture.json
  - screenshots/phase1-ground-road-surfaces-contract-fixed.png
  - screenshots/phase1-data-derived-city-no-context-buildings-v3.png
  - screenshots/phase1-maplibre-scale-corrected-focus-near.png
  - screenshots/phase1-debug-underlay-v2.png
  - screenshots/phase1-zhongshan-live-voxel.png
  - docs/decision-history/2026-05-map-first-pivot.md
  - screenshots/phase1-data-derived-city-final.png
  - frontend/package.json
  - frontend/src/MapLibreOverlay.vue
  - screenshots/phase1-data-derived-osm-fixture-buildings-framed.png
  - screenshots/phase1-static-feature-provider.png
  - screenshots/phase1-data-derived-osm-fixture-buildings-reviewed.png
  - frontend/src/styles.css
  - screenshots/phase1-geo-anchored-underlay.png
  - screenshots/debug-map-reference-in-scene.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/api/WorldViewController.java
  - screenshots/phase1-zhongshan-live-default.png
  - screenshots/phase1-data-derived-city-no-context-buildings-v4.png
  - frontend/src/worldViewPayload.js
  - screenshots/phase1-static-feature-catalog.png
  - screenshots/voxel-style-base-debug-off-v2.png
  - frontend/src/mapOverlayRenderers.js
  - frontend/src/voxelLandmarkRenderers.js
  - screenshots/phase1-debug-underlay-v3.png
  - Design.md
  - screenshots/phase1-debug-underlay.png
  - screenshots/real-map-alignment-debug-on.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/StaticFeatureStyleResolver.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/StaticFeatureProvider.java
  - frontend/src/worldViewRenderModules.js
  - screenshots/debug-map-reference-in-scene-after-lifecycle-fix.png
  - screenshots/phase1-maplibre-scale-final.png
  - screenshots/source-geometry-contract-debug-on.png
  - screenshots/phase1-data-derived-osm-fixture-buildings-refocused.png
  - screenshots/debug-map-road-width-canvas-fix.png
  - screenshots/phase1-dense-voxel-city-context.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/ZhongshanFixtureOsmCatalog.java
  - screenshots/phase1-maplibre-scale-corrected.png
  - README.md
  - screenshots/debug-map-texture-publish-road-width-fix.png
  - screenshots/phase1-ground-road-surfaces-readable.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/CuratedZhongshanStaticFeatureProvider.java
  - screenshots/phase1-polygon-footprint-buildings.png
  - screenshots/real-map-alignment-debug-on-v3-long-wait.png
  - frontend/bun.lock
  - screenshots/phase1-data-derived-osm-fixture-buildings-clean-labels.png
  - screenshots/phase1-zhongshan-live-station.png
  - screenshots/phase1-urban-role-style-resolver.png
  - screenshots/phase1-data-derived-osm-fixture-buildings.png
  - screenshots/phase1-maplibre-texture-plane.png
  - screenshots/phase1-urban-role-city-fabric.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/OsmStaticFeatureAdapter.java
  - screenshots/phase1-data-derived-city-no-context-buildings.png
  - frontend/src/overlayRegistry.js
  - screenshots/phase1-maplibre-scale-corrected-focused.png
  - screenshots/phase1-data-derived-city-no-context-buildings-v2.png
  - screenshots/road-geo-source-alignment-debug-on.png
  - frontend/src/App.vue
  - frontend/src/mapAlignmentDiagnostics.js
  - screenshots/phase1-debug-underlay-v4.png
  - frontend/index.html
  - screenshots/phase1-ground-road-surfaces.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/WorldViewService.java
  - screenshots/voxel-style-base-debug-off.png
tests:
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/world/StaticFeatureStyleResolverTest.java
  - frontend/tests/run.mjs
  - frontend/tests/worldViewRenderModules.test.mjs
  - frontend/tests/mapAlignmentDiagnostics.test.mjs
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/api/WorldViewControllerE2eTest.java
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/world/OsmStaticFeatureAdapterTest.java
  - frontend/tests/overlayRegistry.test.mjs
  - frontend/tests/worldViewPayload.test.mjs
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/world/CuratedZhongshanStaticFeatureProviderTest.java
-->

---
### Requirement: World View Freshness And Replay Are Explicit

TWFoundry SHALL include freshness and replay metadata in every production view contract.

Freshness metadata SHALL identify live/replay mode, generated time, source lag, and per-source
status. This metadata MAY be carried by legacy `WorldViewPayload` during migration.

#### Scenario: Live view reports source lag

- **GIVEN** the frontend requests `time=live`
- **WHEN** the backend returns a production or compatibility view payload
- **THEN** freshness metadata reports live mode
- **AND** maximum source lag is present
- **AND** source-level freshness is present

#### Scenario: Replay payload is deterministic

- **GIVEN** the frontend requests a specific replay timestamp
- **WHEN** the same request is repeated
- **THEN** the backend returns deterministic object and projection state for that timestamp unless
  source data has been explicitly reprocessed


<!-- @trace
source: cleanup-remaining-legacy-world-view-references
updated: 2026-05-14
code:
  - screenshots/debug-map-road-clear-intersection-filter.png
  - frontend/src/mockData.js
  - screenshots/debug-map-road-clear-filter.png
  - screenshots/real-map-alignment-debug-on-v2.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/WorldView.java
  - frontend/src/voxelWorld.js
  - frontend/vite.config.js
  - SPEC.md
  - screenshots/debug-map-reference-in-scene-wait.png
  - screenshots/phase1-maplibre-no-road-buildings.png
  - frontend/src/OntologyPreview.vue
  - screenshots/phase1-webmercator-local.png
  - backend/ingestion/src/main/resources/world/taipei-main-station-osm-fixture.json
  - frontend/src/mapDerivedWorldPayload.js
  - backend/ingestion/src/main/resources/world/zhongshan-osm-fixture.json
  - screenshots/phase1-ground-road-surfaces-contract-fixed.png
  - screenshots/phase1-data-derived-city-no-context-buildings-v3.png
  - screenshots/phase1-maplibre-scale-corrected-focus-near.png
  - screenshots/phase1-debug-underlay-v2.png
  - screenshots/phase1-zhongshan-live-voxel.png
  - docs/decision-history/2026-05-map-first-pivot.md
  - screenshots/phase1-data-derived-city-final.png
  - frontend/package.json
  - frontend/src/MapLibreOverlay.vue
  - screenshots/phase1-data-derived-osm-fixture-buildings-framed.png
  - screenshots/phase1-static-feature-provider.png
  - screenshots/phase1-data-derived-osm-fixture-buildings-reviewed.png
  - frontend/src/styles.css
  - screenshots/phase1-geo-anchored-underlay.png
  - screenshots/debug-map-reference-in-scene.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/api/WorldViewController.java
  - screenshots/phase1-zhongshan-live-default.png
  - screenshots/phase1-data-derived-city-no-context-buildings-v4.png
  - frontend/src/worldViewPayload.js
  - screenshots/phase1-static-feature-catalog.png
  - screenshots/voxel-style-base-debug-off-v2.png
  - frontend/src/mapOverlayRenderers.js
  - frontend/src/voxelLandmarkRenderers.js
  - screenshots/phase1-debug-underlay-v3.png
  - Design.md
  - screenshots/phase1-debug-underlay.png
  - screenshots/real-map-alignment-debug-on.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/StaticFeatureStyleResolver.java
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/StaticFeatureProvider.java
  - frontend/src/worldViewRenderModules.js
  - screenshots/debug-map-reference-in-scene-after-lifecycle-fix.png
  - screenshots/phase1-maplibre-scale-final.png
  - screenshots/source-geometry-contract-debug-on.png
  - screenshots/phase1-data-derived-osm-fixture-buildings-refocused.png
  - screenshots/debug-map-road-width-canvas-fix.png
  - screenshots/phase1-dense-voxel-city-context.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/ZhongshanFixtureOsmCatalog.java
  - screenshots/phase1-maplibre-scale-corrected.png
  - README.md
  - screenshots/debug-map-texture-publish-road-width-fix.png
  - screenshots/phase1-ground-road-surfaces-readable.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/CuratedZhongshanStaticFeatureProvider.java
  - screenshots/phase1-polygon-footprint-buildings.png
  - screenshots/real-map-alignment-debug-on-v3-long-wait.png
  - frontend/bun.lock
  - screenshots/phase1-data-derived-osm-fixture-buildings-clean-labels.png
  - screenshots/phase1-zhongshan-live-station.png
  - screenshots/phase1-urban-role-style-resolver.png
  - screenshots/phase1-data-derived-osm-fixture-buildings.png
  - screenshots/phase1-maplibre-texture-plane.png
  - screenshots/phase1-urban-role-city-fabric.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/OsmStaticFeatureAdapter.java
  - screenshots/phase1-data-derived-city-no-context-buildings.png
  - frontend/src/overlayRegistry.js
  - screenshots/phase1-maplibre-scale-corrected-focused.png
  - screenshots/phase1-data-derived-city-no-context-buildings-v2.png
  - screenshots/road-geo-source-alignment-debug-on.png
  - frontend/src/App.vue
  - frontend/src/mapAlignmentDiagnostics.js
  - screenshots/phase1-debug-underlay-v4.png
  - frontend/index.html
  - screenshots/phase1-ground-road-surfaces.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/WorldViewService.java
  - screenshots/voxel-style-base-debug-off.png
tests:
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/world/StaticFeatureStyleResolverTest.java
  - frontend/tests/run.mjs
  - frontend/tests/worldViewRenderModules.test.mjs
  - frontend/tests/mapAlignmentDiagnostics.test.mjs
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/api/WorldViewControllerE2eTest.java
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/world/OsmStaticFeatureAdapterTest.java
  - frontend/tests/overlayRegistry.test.mjs
  - frontend/tests/worldViewPayload.test.mjs
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/world/CuratedZhongshanStaticFeatureProviderTest.java
-->

---
### Requirement: World View API Errors Are Structured

TWFoundry SHALL return structured world-view API errors.

World-view errors SHALL include an error `code`, human-readable `message`, optional `details`, and optional `retryAfterSeconds`.

#### Scenario: Unknown focus id

- **GIVEN** the frontend requests an unknown `focusId`
- **WHEN** the backend cannot resolve the focus
- **THEN** it returns `WORLD_FOCUS_NOT_FOUND`
- **AND** the frontend can show a recoverable fallback state

#### Scenario: Source unavailable

- **GIVEN** required source data is unavailable
- **WHEN** the backend cannot generate a complete world view
- **THEN** it returns `WORLD_VIEW_UNAVAILABLE` or a partial payload with stale source freshness
- **AND** the response makes retry behavior explicit


<!-- @trace
source: add-backend-computed-diorama-world-view
updated: 2026-04-30
code:
  - frontend/vite.config.js
  - frontend/src/DesignSystemPage.vue
  - frontend/src/App.vue
  - frontend/src/styles.css
  - frontend/src/voxelWorld.js
  - frontend/src/worldViewPayload.js
  - frontend/src/worldViewRenderModules.js
  - frontend/src/RenderModulePreview.vue
tests:
  - frontend/tests/run.mjs
  - frontend/tests/worldViewRenderModules.test.mjs
-->

---
### Requirement: Debug Geo Data Is Explicitly Diagnostic

TWFoundry SHALL keep raw or normalized debug geo data separate from the production product surface.

Debug payloads MAY include normalized `GeoFeature` records, source references, projection checks,
geometry alignment diagnostics, and provider timings. These diagnostics SHALL be available only
through debug, design-system, test, or operator surfaces unless explicitly promoted by a future
product requirement.

#### Scenario: Debug geo features are requested

- **GIVEN** a debug or design-system surface requests diagnostic geo data
- **WHEN** the backend or frontend returns diagnostic metadata
- **THEN** raw or normalized debug features may appear in diagnostics
- **AND** the primary dashboard remains governed by map overlays and ontology object detail
- **AND** map alignment diagnostics do not appear as normal user-facing product controls


<!-- @trace
source: cleanup-map-first-contract-boundaries
updated: 2026-05-14
code:
  - frontend/src/voxelLandmarkRenderers.js
  - screenshots/phase1-debug-underlay-v3.png
  - frontend/vite.config.js
  - screenshots/phase1-data-derived-city-no-context-buildings.png
  - screenshots/phase1-data-derived-osm-fixture-buildings-framed.png
  - screenshots/phase1-data-derived-osm-fixture-buildings-reviewed.png
  - screenshots/phase1-dense-voxel-city-context.png
  - screenshots/phase1-polygon-footprint-buildings.png
  - screenshots/phase1-webmercator-local.png
  - backend/ingestion/src/main/resources/world/zhongshan-osm-fixture.json
  - screenshots/debug-map-reference-in-scene-wait.png
  - screenshots/debug-map-road-clear-intersection-filter.png
  - frontend/src/voxelWorld.js
  - screenshots/debug-map-reference-in-scene.png
  - screenshots/debug-map-road-width-canvas-fix.png
  - screenshots/phase1-data-derived-city-no-context-buildings-v3.png
  - screenshots/phase1-data-derived-city-no-context-buildings-v4.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/WorldViewService.java
  - frontend/index.html
  - frontend/package.json
  - screenshots/phase1-debug-underlay-v2.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/ZhongshanFixtureOsmCatalog.java
  - screenshots/phase1-ground-road-surfaces-contract-fixed.png
  - screenshots/phase1-ground-road-surfaces.png
  - screenshots/phase1-maplibre-scale-corrected-focused.png
  - screenshots/phase1-static-feature-catalog.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/CuratedZhongshanStaticFeatureProvider.java
  - screenshots/phase1-zhongshan-live-voxel.png
  - screenshots/real-map-alignment-debug-on-v3-long-wait.png
  - screenshots/phase1-debug-underlay.png
  - frontend/src/mockData.js
  - screenshots/real-map-alignment-debug-on.png
  - screenshots/debug-map-texture-publish-road-width-fix.png
  - screenshots/phase1-data-derived-city-no-context-buildings-v2.png
  - screenshots/phase1-maplibre-scale-corrected-focus-near.png
  - frontend/src/worldViewRenderModules.js
  - README.md
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/OsmStaticFeatureAdapter.java
  - screenshots/debug-map-reference-in-scene-after-lifecycle-fix.png
  - screenshots/phase1-urban-role-city-fabric.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/StaticFeatureProvider.java
  - screenshots/phase1-zhongshan-live-default.png
  - screenshots/phase1-data-derived-osm-fixture-buildings-clean-labels.png
  - screenshots/phase1-data-derived-city-final.png
  - screenshots/road-geo-source-alignment-debug-on.png
  - frontend/src/MapLibreOverlay.vue
  - screenshots/voxel-style-base-debug-off.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/StaticFeatureStyleResolver.java
  - screenshots/debug-map-road-clear-filter.png
  - screenshots/phase1-data-derived-osm-fixture-buildings-refocused.png
  - screenshots/phase1-maplibre-no-road-buildings.png
  - screenshots/phase1-maplibre-scale-final.png
  - frontend/src/mapAlignmentDiagnostics.js
  - frontend/src/mapOverlayRenderers.js
  - screenshots/phase1-maplibre-texture-plane.png
  - SPEC.md
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/api/WorldViewController.java
  - frontend/src/worldViewPayload.js
  - Design.md
  - docs/decision-history/2026-05-map-first-pivot.md
  - frontend/src/OntologyPreview.vue
  - screenshots/phase1-ground-road-surfaces-readable.png
  - screenshots/source-geometry-contract-debug-on.png
  - backend/ingestion/src/main/resources/world/taipei-main-station-osm-fixture.json
  - frontend/src/App.vue
  - screenshots/phase1-data-derived-osm-fixture-buildings.png
  - frontend/src/mapDerivedWorldPayload.js
  - frontend/src/overlayRegistry.js
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/WorldView.java
  - screenshots/phase1-static-feature-provider.png
  - screenshots/phase1-maplibre-scale-corrected.png
  - frontend/bun.lock
  - screenshots/voxel-style-base-debug-off-v2.png
  - screenshots/real-map-alignment-debug-on-v2.png
  - screenshots/phase1-urban-role-style-resolver.png
  - screenshots/phase1-debug-underlay-v4.png
  - screenshots/phase1-zhongshan-live-station.png
  - frontend/src/styles.css
  - screenshots/phase1-geo-anchored-underlay.png
tests:
  - frontend/tests/mapAlignmentDiagnostics.test.mjs
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/api/WorldViewControllerE2eTest.java
  - frontend/tests/overlayRegistry.test.mjs
  - frontend/tests/worldViewRenderModules.test.mjs
  - frontend/tests/run.mjs
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/world/CuratedZhongshanStaticFeatureProviderTest.java
  - frontend/tests/worldViewPayload.test.mjs
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/world/OsmStaticFeatureAdapterTest.java
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/world/StaticFeatureStyleResolverTest.java
-->

---
### Requirement: Map-First Ontology Dashboard

TWFoundry SHALL use an interactive map as the primary dashboard surface.

The map surface SHALL render operational information through product overlays rather than through primary voxel terrain, chunk, or diorama concepts.

#### Scenario: Operator opens the dashboard

- **GIVEN** the frontend shell is loaded
- **WHEN** the default dashboard renders
- **THEN** the primary stage is an interactive MapLibre map
- **AND** domain information is controlled through overlay visibility
- **AND** voxel art is not required to understand the map state

#### Scenario: Operator selects an ontology object

- **GIVEN** an ontology object is selected from a map marker, line, area, or object list
- **WHEN** the object inspector renders
- **THEN** the inspector shows stable object properties and relationships
- **AND** any voxel rendering is scoped to selected-object detail
- **AND** the voxel renderer is selected by generic object type, kind, capability, or render module rather than by a specific place name

#### Scenario: Overlay model remains extensible

- **GIVEN** a new operational domain is added
- **WHEN** the domain is exposed on the map
- **THEN** it is registered as a product overlay with visibility, data dependency, timeline awareness, and renderer metadata
- **AND** the user can disable the overlay without editing unrelated renderer code

<!-- @trace
source: map-first-ontology-overlays
updated: 2026-05-11
code:
  - screenshots/phase1-geo-anchored-underlay.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/StaticFeatureStyleResolver.java
  - screenshots/phase1-data-derived-osm-fixture-buildings-reviewed.png
  - screenshots/phase1-zhongshan-live-station.png
  - frontend/src/worldViewRenderModules.js
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/api/WorldViewController.java
  - screenshots/debug-map-reference-in-scene-after-lifecycle-fix.png
  - screenshots/phase1-data-derived-city-no-context-buildings-v3.png
  - frontend/src/mapDerivedWorldPayload.js
  - frontend/src/worldViewPayload.js
  - screenshots/phase1-webmercator-local.png
  - screenshots/phase1-data-derived-city-no-context-buildings-v2.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/WorldViewService.java
  - frontend/src/MapLibreOverlay.vue
  - frontend/src/voxelWorld.js
  - screenshots/phase1-data-derived-osm-fixture-buildings-clean-labels.png
  - backend/ingestion/src/main/resources/world/zhongshan-osm-fixture.json
  - screenshots/phase1-data-derived-osm-fixture-buildings.png
  - screenshots/phase1-debug-underlay-v2.png
  - screenshots/phase1-maplibre-no-road-buildings.png
  - screenshots/phase1-urban-role-city-fabric.png
  - screenshots/real-map-alignment-debug-on-v2.png
  - screenshots/phase1-debug-underlay-v4.png
  - Design.md
  - screenshots/debug-map-road-width-canvas-fix.png
  - screenshots/debug-map-texture-publish-road-width-fix.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/StaticFeatureProvider.java
  - screenshots/source-geometry-contract-debug-on.png
  - frontend/index.html
  - frontend/src/mapAlignmentDiagnostics.js
  - screenshots/phase1-zhongshan-live-default.png
  - screenshots/phase1-zhongshan-live-voxel.png
  - frontend/src/App.vue
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/CuratedZhongshanStaticFeatureProvider.java
  - screenshots/phase1-static-feature-catalog.png
  - screenshots/real-map-alignment-debug-on.png
  - frontend/src/styles.css
  - screenshots/phase1-maplibre-scale-corrected.png
  - screenshots/phase1-dense-voxel-city-context.png
  - screenshots/debug-map-reference-in-scene-wait.png
  - screenshots/phase1-debug-underlay-v3.png
  - screenshots/phase1-maplibre-texture-plane.png
  - frontend/src/mockData.js
  - screenshots/debug-map-road-clear-intersection-filter.png
  - screenshots/phase1-data-derived-city-final.png
  - screenshots/phase1-ground-road-surfaces-contract-fixed.png
  - screenshots/phase1-static-feature-provider.png
  - frontend/src/OntologyPreview.vue
  - frontend/vite.config.js
  - frontend/src/mapOverlayRenderers.js
  - frontend/src/voxelLandmarkRenderers.js
  - screenshots/road-geo-source-alignment-debug-on.png
  - screenshots/debug-map-reference-in-scene.png
  - frontend/src/overlayRegistry.js
  - screenshots/debug-map-road-clear-filter.png
  - screenshots/phase1-data-derived-osm-fixture-buildings-framed.png
  - frontend/package.json
  - screenshots/phase1-data-derived-city-no-context-buildings-v4.png
  - screenshots/phase1-debug-underlay.png
  - screenshots/voxel-style-base-debug-off.png
  - backend/ingestion/src/main/resources/world/taipei-main-station-osm-fixture.json
  - screenshots/phase1-maplibre-scale-corrected-focus-near.png
  - screenshots/phase1-maplibre-scale-final.png
  - screenshots/real-map-alignment-debug-on-v3-long-wait.png
  - screenshots/phase1-data-derived-city-no-context-buildings.png
  - screenshots/phase1-ground-road-surfaces.png
  - screenshots/phase1-ground-road-surfaces-readable.png
  - screenshots/voxel-style-base-debug-off-v2.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/ZhongshanFixtureOsmCatalog.java
  - screenshots/phase1-data-derived-osm-fixture-buildings-refocused.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/WorldView.java
  - screenshots/phase1-maplibre-scale-corrected-focused.png
  - screenshots/phase1-urban-role-style-resolver.png
  - screenshots/phase1-polygon-footprint-buildings.png
  - frontend/bun.lock
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/OsmStaticFeatureAdapter.java
tests:
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/world/CuratedZhongshanStaticFeatureProviderTest.java
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/world/OsmStaticFeatureAdapterTest.java
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/api/WorldViewControllerE2eTest.java
  - frontend/tests/worldViewRenderModules.test.mjs
  - frontend/tests/worldViewPayload.test.mjs
  - frontend/tests/overlayRegistry.test.mjs
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/world/StaticFeatureStyleResolverTest.java
  - frontend/tests/mapAlignmentDiagnostics.test.mjs
  - frontend/tests/run.mjs
-->

---
### Requirement: Root Map-First Specification

TWFoundry SHALL maintain a language-agnostic root `SPEC.md` that defines the map-first ontology
product and system contract.

The root specification SHALL be the highest-level contract for source integration, ontology
objects, map projections, selected-object detail rendering, and observability boundaries.

#### Scenario: Future change touches product architecture

- **GIVEN** a future change affects source adapters, ontology objects, overlays, map rendering,
  object detail rendering, fallback policy, or diagnostics
- **WHEN** the change is proposed
- **THEN** the change is evaluated against root `SPEC.md`
- **AND** any intentional divergence is documented in the change design


<!-- @trace
source: define-twfoundry-map-first-spec
updated: 2026-05-13
code:
  - screenshots/phase1-maplibre-texture-plane.png
  - screenshots/phase1-data-derived-osm-fixture-buildings-reviewed.png
  - frontend/src/worldViewRenderModules.js
  - frontend/src/mapOverlayRenderers.js
  - screenshots/phase1-data-derived-city-no-context-buildings-v4.png
  - screenshots/phase1-static-feature-catalog.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/WorldViewService.java
  - screenshots/phase1-data-derived-city-no-context-buildings-v3.png
  - frontend/src/worldViewPayload.js
  - screenshots/phase1-data-derived-osm-fixture-buildings-refocused.png
  - screenshots/phase1-debug-underlay.png
  - screenshots/phase1-data-derived-osm-fixture-buildings-framed.png
  - frontend/src/styles.css
  - screenshots/phase1-ground-road-surfaces-readable.png
  - frontend/src/voxelLandmarkRenderers.js
  - frontend/src/App.vue
  - screenshots/phase1-maplibre-scale-corrected.png
  - screenshots/phase1-zhongshan-live-default.png
  - screenshots/debug-map-reference-in-scene-after-lifecycle-fix.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/CuratedZhongshanStaticFeatureProvider.java
  - frontend/index.html
  - screenshots/phase1-data-derived-city-final.png
  - backend/ingestion/src/main/resources/world/zhongshan-osm-fixture.json
  - screenshots/debug-map-reference-in-scene-wait.png
  - screenshots/debug-map-road-clear-filter.png
  - screenshots/debug-map-road-clear-intersection-filter.png
  - screenshots/phase1-maplibre-scale-final.png
  - frontend/src/mockData.js
  - Design.md
  - frontend/src/OntologyPreview.vue
  - screenshots/phase1-geo-anchored-underlay.png
  - screenshots/phase1-static-feature-provider.png
  - screenshots/phase1-urban-role-city-fabric.png
  - screenshots/voxel-style-base-debug-off.png
  - screenshots/phase1-maplibre-no-road-buildings.png
  - frontend/vite.config.js
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/ZhongshanFixtureOsmCatalog.java
  - frontend/src/voxelWorld.js
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/StaticFeatureProvider.java
  - backend/ingestion/src/main/resources/world/taipei-main-station-osm-fixture.json
  - screenshots/phase1-debug-underlay-v2.png
  - screenshots/phase1-debug-underlay-v4.png
  - screenshots/phase1-ground-road-surfaces-contract-fixed.png
  - screenshots/debug-map-road-width-canvas-fix.png
  - screenshots/phase1-ground-road-surfaces.png
  - screenshots/phase1-polygon-footprint-buildings.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/OsmStaticFeatureAdapter.java
  - screenshots/debug-map-reference-in-scene.png
  - screenshots/phase1-debug-underlay-v3.png
  - screenshots/phase1-maplibre-scale-corrected-focus-near.png
  - screenshots/phase1-webmercator-local.png
  - screenshots/real-map-alignment-debug-on-v3-long-wait.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/api/WorldViewController.java
  - frontend/package.json
  - screenshots/phase1-data-derived-city-no-context-buildings.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/WorldView.java
  - screenshots/phase1-data-derived-osm-fixture-buildings.png
  - screenshots/phase1-zhongshan-live-station.png
  - screenshots/phase1-zhongshan-live-voxel.png
  - screenshots/real-map-alignment-debug-on-v2.png
  - screenshots/real-map-alignment-debug-on.png
  - frontend/src/MapLibreOverlay.vue
  - screenshots/voxel-style-base-debug-off-v2.png
  - screenshots/source-geometry-contract-debug-on.png
  - screenshots/phase1-maplibre-scale-corrected-focused.png
  - frontend/src/overlayRegistry.js
  - screenshots/debug-map-texture-publish-road-width-fix.png
  - SPEC.md
  - frontend/src/mapAlignmentDiagnostics.js
  - screenshots/phase1-data-derived-city-no-context-buildings-v2.png
  - screenshots/phase1-urban-role-style-resolver.png
  - screenshots/road-geo-source-alignment-debug-on.png
  - frontend/bun.lock
  - frontend/src/mapDerivedWorldPayload.js
  - screenshots/phase1-data-derived-osm-fixture-buildings-clean-labels.png
  - README.md
  - screenshots/phase1-dense-voxel-city-context.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/StaticFeatureStyleResolver.java
tests:
  - frontend/tests/worldViewPayload.test.mjs
  - frontend/tests/worldViewRenderModules.test.mjs
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/world/OsmStaticFeatureAdapterTest.java
  - frontend/tests/mapAlignmentDiagnostics.test.mjs
  - frontend/tests/overlayRegistry.test.mjs
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/api/WorldViewControllerE2eTest.java
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/world/StaticFeatureStyleResolverTest.java
  - frontend/tests/run.mjs
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/world/CuratedZhongshanStaticFeatureProviderTest.java
-->

---
### Requirement: Map-First Layer Boundaries

TWFoundry SHALL keep product policy, configuration, source integration, ontology, projection,
rendering, and observability as separate architectural boundaries.

Source-specific facts SHALL enter through source adapters, fallback fixtures, or normalized payloads
before reaching renderers.

Renderers SHALL consume generic map overlay or object detail contracts rather than source-specific
truth.

#### Scenario: New source is added

- **GIVEN** a new public-data source is introduced
- **WHEN** the source becomes visible in the dashboard
- **THEN** it is represented through source descriptor, normalization, ontology mapping, projection
  mapping, and freshness/completeness metadata
- **AND** frontend renderers do not branch directly on raw source payload shape

#### Scenario: New visual overlay is added

- **GIVEN** a new operational domain becomes visible on the map
- **WHEN** the overlay is implemented
- **THEN** its product identity is registered outside renderer-only code
- **AND** disabling the overlay hides projections without deleting ontology objects


<!-- @trace
source: define-twfoundry-map-first-spec
updated: 2026-05-13
code:
  - screenshots/phase1-maplibre-texture-plane.png
  - screenshots/phase1-data-derived-osm-fixture-buildings-reviewed.png
  - frontend/src/worldViewRenderModules.js
  - frontend/src/mapOverlayRenderers.js
  - screenshots/phase1-data-derived-city-no-context-buildings-v4.png
  - screenshots/phase1-static-feature-catalog.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/WorldViewService.java
  - screenshots/phase1-data-derived-city-no-context-buildings-v3.png
  - frontend/src/worldViewPayload.js
  - screenshots/phase1-data-derived-osm-fixture-buildings-refocused.png
  - screenshots/phase1-debug-underlay.png
  - screenshots/phase1-data-derived-osm-fixture-buildings-framed.png
  - frontend/src/styles.css
  - screenshots/phase1-ground-road-surfaces-readable.png
  - frontend/src/voxelLandmarkRenderers.js
  - frontend/src/App.vue
  - screenshots/phase1-maplibre-scale-corrected.png
  - screenshots/phase1-zhongshan-live-default.png
  - screenshots/debug-map-reference-in-scene-after-lifecycle-fix.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/CuratedZhongshanStaticFeatureProvider.java
  - frontend/index.html
  - screenshots/phase1-data-derived-city-final.png
  - backend/ingestion/src/main/resources/world/zhongshan-osm-fixture.json
  - screenshots/debug-map-reference-in-scene-wait.png
  - screenshots/debug-map-road-clear-filter.png
  - screenshots/debug-map-road-clear-intersection-filter.png
  - screenshots/phase1-maplibre-scale-final.png
  - frontend/src/mockData.js
  - Design.md
  - frontend/src/OntologyPreview.vue
  - screenshots/phase1-geo-anchored-underlay.png
  - screenshots/phase1-static-feature-provider.png
  - screenshots/phase1-urban-role-city-fabric.png
  - screenshots/voxel-style-base-debug-off.png
  - screenshots/phase1-maplibre-no-road-buildings.png
  - frontend/vite.config.js
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/ZhongshanFixtureOsmCatalog.java
  - frontend/src/voxelWorld.js
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/StaticFeatureProvider.java
  - backend/ingestion/src/main/resources/world/taipei-main-station-osm-fixture.json
  - screenshots/phase1-debug-underlay-v2.png
  - screenshots/phase1-debug-underlay-v4.png
  - screenshots/phase1-ground-road-surfaces-contract-fixed.png
  - screenshots/debug-map-road-width-canvas-fix.png
  - screenshots/phase1-ground-road-surfaces.png
  - screenshots/phase1-polygon-footprint-buildings.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/OsmStaticFeatureAdapter.java
  - screenshots/debug-map-reference-in-scene.png
  - screenshots/phase1-debug-underlay-v3.png
  - screenshots/phase1-maplibre-scale-corrected-focus-near.png
  - screenshots/phase1-webmercator-local.png
  - screenshots/real-map-alignment-debug-on-v3-long-wait.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/api/WorldViewController.java
  - frontend/package.json
  - screenshots/phase1-data-derived-city-no-context-buildings.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/WorldView.java
  - screenshots/phase1-data-derived-osm-fixture-buildings.png
  - screenshots/phase1-zhongshan-live-station.png
  - screenshots/phase1-zhongshan-live-voxel.png
  - screenshots/real-map-alignment-debug-on-v2.png
  - screenshots/real-map-alignment-debug-on.png
  - frontend/src/MapLibreOverlay.vue
  - screenshots/voxel-style-base-debug-off-v2.png
  - screenshots/source-geometry-contract-debug-on.png
  - screenshots/phase1-maplibre-scale-corrected-focused.png
  - frontend/src/overlayRegistry.js
  - screenshots/debug-map-texture-publish-road-width-fix.png
  - SPEC.md
  - frontend/src/mapAlignmentDiagnostics.js
  - screenshots/phase1-data-derived-city-no-context-buildings-v2.png
  - screenshots/phase1-urban-role-style-resolver.png
  - screenshots/road-geo-source-alignment-debug-on.png
  - frontend/bun.lock
  - frontend/src/mapDerivedWorldPayload.js
  - screenshots/phase1-data-derived-osm-fixture-buildings-clean-labels.png
  - README.md
  - screenshots/phase1-dense-voxel-city-context.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/StaticFeatureStyleResolver.java
tests:
  - frontend/tests/worldViewPayload.test.mjs
  - frontend/tests/worldViewRenderModules.test.mjs
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/world/OsmStaticFeatureAdapterTest.java
  - frontend/tests/mapAlignmentDiagnostics.test.mjs
  - frontend/tests/overlayRegistry.test.mjs
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/api/WorldViewControllerE2eTest.java
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/world/StaticFeatureStyleResolverTest.java
  - frontend/tests/run.mjs
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/world/CuratedZhongshanStaticFeatureProviderTest.java
-->

---
### Requirement: Legacy Diorama Term Compatibility

TWFoundry SHALL treat `WorldViewPayload`, `DioramaChunk`, and `ChunkProjection` as legacy-compatible
implementation terms during the map-first migration.

New product UI SHALL NOT present voxel chunks, diorama alignment, or voxel terrain as the primary
dashboard model.

Voxel rendering SHALL remain scoped to selected-object detail unless a future root specification
revision explicitly changes that policy.

#### Scenario: Existing payload fields remain during migration

- **GIVEN** existing backend or frontend code still uses `WorldViewPayload`, `DioramaChunk`, or
  `ChunkProjection`
- **WHEN** a map-first feature consumes that data
- **THEN** the feature treats those fields as compatibility inputs
- **AND** the user-facing model remains map overlays plus selected ontology object detail

<!-- @trace
source: define-twfoundry-map-first-spec
updated: 2026-05-13
code:
  - screenshots/phase1-maplibre-texture-plane.png
  - screenshots/phase1-data-derived-osm-fixture-buildings-reviewed.png
  - frontend/src/worldViewRenderModules.js
  - frontend/src/mapOverlayRenderers.js
  - screenshots/phase1-data-derived-city-no-context-buildings-v4.png
  - screenshots/phase1-static-feature-catalog.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/WorldViewService.java
  - screenshots/phase1-data-derived-city-no-context-buildings-v3.png
  - frontend/src/worldViewPayload.js
  - screenshots/phase1-data-derived-osm-fixture-buildings-refocused.png
  - screenshots/phase1-debug-underlay.png
  - screenshots/phase1-data-derived-osm-fixture-buildings-framed.png
  - frontend/src/styles.css
  - screenshots/phase1-ground-road-surfaces-readable.png
  - frontend/src/voxelLandmarkRenderers.js
  - frontend/src/App.vue
  - screenshots/phase1-maplibre-scale-corrected.png
  - screenshots/phase1-zhongshan-live-default.png
  - screenshots/debug-map-reference-in-scene-after-lifecycle-fix.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/CuratedZhongshanStaticFeatureProvider.java
  - frontend/index.html
  - screenshots/phase1-data-derived-city-final.png
  - backend/ingestion/src/main/resources/world/zhongshan-osm-fixture.json
  - screenshots/debug-map-reference-in-scene-wait.png
  - screenshots/debug-map-road-clear-filter.png
  - screenshots/debug-map-road-clear-intersection-filter.png
  - screenshots/phase1-maplibre-scale-final.png
  - frontend/src/mockData.js
  - Design.md
  - frontend/src/OntologyPreview.vue
  - screenshots/phase1-geo-anchored-underlay.png
  - screenshots/phase1-static-feature-provider.png
  - screenshots/phase1-urban-role-city-fabric.png
  - screenshots/voxel-style-base-debug-off.png
  - screenshots/phase1-maplibre-no-road-buildings.png
  - frontend/vite.config.js
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/ZhongshanFixtureOsmCatalog.java
  - frontend/src/voxelWorld.js
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/StaticFeatureProvider.java
  - backend/ingestion/src/main/resources/world/taipei-main-station-osm-fixture.json
  - screenshots/phase1-debug-underlay-v2.png
  - screenshots/phase1-debug-underlay-v4.png
  - screenshots/phase1-ground-road-surfaces-contract-fixed.png
  - screenshots/debug-map-road-width-canvas-fix.png
  - screenshots/phase1-ground-road-surfaces.png
  - screenshots/phase1-polygon-footprint-buildings.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/OsmStaticFeatureAdapter.java
  - screenshots/debug-map-reference-in-scene.png
  - screenshots/phase1-debug-underlay-v3.png
  - screenshots/phase1-maplibre-scale-corrected-focus-near.png
  - screenshots/phase1-webmercator-local.png
  - screenshots/real-map-alignment-debug-on-v3-long-wait.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/api/WorldViewController.java
  - frontend/package.json
  - screenshots/phase1-data-derived-city-no-context-buildings.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/WorldView.java
  - screenshots/phase1-data-derived-osm-fixture-buildings.png
  - screenshots/phase1-zhongshan-live-station.png
  - screenshots/phase1-zhongshan-live-voxel.png
  - screenshots/real-map-alignment-debug-on-v2.png
  - screenshots/real-map-alignment-debug-on.png
  - frontend/src/MapLibreOverlay.vue
  - screenshots/voxel-style-base-debug-off-v2.png
  - screenshots/source-geometry-contract-debug-on.png
  - screenshots/phase1-maplibre-scale-corrected-focused.png
  - frontend/src/overlayRegistry.js
  - screenshots/debug-map-texture-publish-road-width-fix.png
  - SPEC.md
  - frontend/src/mapAlignmentDiagnostics.js
  - screenshots/phase1-data-derived-city-no-context-buildings-v2.png
  - screenshots/phase1-urban-role-style-resolver.png
  - screenshots/road-geo-source-alignment-debug-on.png
  - frontend/bun.lock
  - frontend/src/mapDerivedWorldPayload.js
  - screenshots/phase1-data-derived-osm-fixture-buildings-clean-labels.png
  - README.md
  - screenshots/phase1-dense-voxel-city-context.png
  - backend/ingestion/src/main/java/io/twfoundry/backend/ingestion/application/world/StaticFeatureStyleResolver.java
tests:
  - frontend/tests/worldViewPayload.test.mjs
  - frontend/tests/worldViewRenderModules.test.mjs
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/world/OsmStaticFeatureAdapterTest.java
  - frontend/tests/mapAlignmentDiagnostics.test.mjs
  - frontend/tests/overlayRegistry.test.mjs
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/api/WorldViewControllerE2eTest.java
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/world/StaticFeatureStyleResolverTest.java
  - frontend/tests/run.mjs
  - backend/ingestion/src/test/java/io/twfoundry/backend/ingestion/application/world/CuratedZhongshanStaticFeatureProviderTest.java
-->