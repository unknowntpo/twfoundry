# platform-foundation Specification

## Purpose

Define TWFoundry's Phase 1 platform foundation: source candidates, frontend-first MRT dashboard scope, map provider boundaries, dashboard design source, and the high-level backend/data platform direction that later changes refine.

## Requirements

### Requirement: Phase 1 Layered Architecture

TWFoundry SHALL define a Phase 1 architecture with data source, ingestion, Kafka Streams, StarRocks storage, Spring Boot API, and Vue + Google Maps frontend layers.

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
### Requirement: Frontend Stack Direction

TWFoundry SHALL use Bun, Vite, Vue 3, TypeScript, Pinia, Vue Router, Google Maps JavaScript API, Vue scoped CSS, Vitest, and Playwright for the first frontend implementation.

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

TWFoundry SHALL use Vue 3, Pinia, and Google Maps JavaScript API for the Phase 1 dashboard.

#### Scenario: User opens the Phase 1 dashboard

- **GIVEN** MRT mock/static data exists
- **WHEN** the dashboard loads
- **THEN** it can display MRT route polylines, MRT station markers, and station LiveBoard information


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

TWFoundry SHALL provide a mock map provider for Playwright E2E tests while preserving Google Maps JavaScript API for local/demo usage.

#### Scenario: E2E tests run

- **GIVEN** Playwright tests are executed
- **WHEN** `VITE_MAP_PROVIDER=mock` is configured
- **THEN** tests can verify dashboard load, station selection, and layer toggling without requiring Google Maps network access, quota, tile loading, or an API key


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