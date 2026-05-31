# Parallel Workstream Design Choices

Date: 2026-05-31

Status: active planning note. Keep this file updated when UI/UX or backend
architecture choices change.

## Goal

Run UI/UX design-system extraction and Java backend architecture work in parallel
without letting either track invent incompatible contracts.

The shared rule:

```text
product contract first
  -> frontend design primitives
  -> backend API/read-model contracts
  -> transport and storage choices
```

Kafka is a target transport, not the first contract boundary.

## Worktree Plan

| Track | Worktree | Branch | Ownership |
| --- | --- | --- | --- |
| UI/UX design system | `uiux-design-system` | `codex/uiux-design-system` | Vue design primitives, tokens, dashboard layout alignment |
| Java backend architecture | `backend-java-platform` | `codex/backend-java-platform` | Spring Boot API contracts, file-backed repositories, future storage/streaming seams |

Both branches should start from the same `main` checkpoint and integrate through
explicit contract files instead of informal component/API assumptions.

## Shared Contracts

The two tracks must agree on these stable shapes before implementation expands:

- `ServiceDayTimeline`
- `VehicleObservation`
- `RouteContext`
- `RouteQuality`
- `RouteProgressObservation`
- `DerivedSignal`

Frontend should consume these as API-shaped data even while the backend is still
file-backed. Backend should expose these as Java DTOs even while storage is still
local JSON.

## UI/UX Track Choices

Decision: extract a small Vue design system, not a full atomic design system.

Start with primitives that already repeat in `OperationsExplorer.vue`:

- `TwfPanel`
- `TwfMetricCard`
- `TwfSegmentedControl`
- `TwfMapChip`
- `TwfHealthRow`
- `TwfInspectorSection`

Token source of truth should move toward shared CSS variables generated from or
aligned with `frontend/src/minimumDesignSystemContract.js`.

Non-goals for the first UI/UX branch:

- Storybook
- full component library
- broad visual redesign
- replacing MapLibre/deck.gl rendering

Success criteria:

- dashboard and design-system contract page use the same semantic tokens
- repeated panel/control styles are reduced
- route stop context remains visually secondary to live vehicle observations
- bilingual labels stay in `i18n.js`, not inside components

## Backend Track Choices

Decision: introduce a Java backend as the contract owner before introducing
database or Kafka infrastructure.

Initial stack:

- Java
- Spring Boot
- Gradle Kotlin DSL
- REST API
- file-backed repository reading the current JSON cache

Initial API surface:

```text
GET /api/transit/bus/timeline?city=Taipei&date=2026-05-20
GET /api/transit/bus/observations?city=Taipei&date=2026-05-20&slot=09:25
GET /api/transit/bus/routes/{routeName}/context?city=Taipei
GET /api/transit/bus/routes/{routeName}/quality?city=Taipei
```

Non-goals for the first backend branch:

- Kafka brokers
- Postgres/PostGIS
- authentication
- live production deployment
- delay prediction

Success criteria:

- frontend can switch from `/data/...` static files to `/api/...` without data
  shape changes
- Java DTOs preserve frontend contract names and evidence fields
- file repository can later be replaced by Postgres/Kafka read models
- route progress and delay-like signals remain separate from raw ingestion

## Integration Rule

The UI/UX branch may improve presentation but must not invent new product truth.
The backend branch may introduce DTOs and APIs but must not force UI-specific
rendering concepts into service contracts.

Any cross-track change must update this file or a more specific contract doc.

## Kafka Migration Path

The architecture should remain Kafka-ready:

```text
TDX source job
  -> raw event topic
  -> normalizer consumer
  -> normalized observation topic
  -> route progress consumer
  -> derived signal topic
  -> API/read model
```

Do not introduce Kafka until at least one of these is true:

- multiple consumers need the same observation stream
- replay is required for service-day or multi-day analysis
- ingestion and signal computation need independent scaling
- additional sources such as MRT, YouBike, weather, or incidents join the system

## Open Decisions

- Should backend V1 live under repo root `backend/` or a Gradle multi-project
  layout?
- Should frontend use Vite proxy for `/api`, or explicit `VITE_API_BASE_URL`?
- Should normalized schemas be documented as OpenAPI first, or Java DTO first?
- Which route context cache should be committed long term versus regenerated?
