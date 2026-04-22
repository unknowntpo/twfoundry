# Design: Define Backend Platform Contracts

## Overview

This change defines the minimum backend and data-platform contracts needed before implementing Phase 1 ingestion services, stream processors, StarRocks schemas, or Spring Boot APIs.

The Phase 1 backbone is:

```text
Datasource Connectors -> Redpanda/Kafka -> Stream Processing -> StarRocks -> Spring Boot API
```

This change does not adopt Fluss as the primary backbone. The architecture should remain compatible with a future streaming-storage evaluation, but the initial production direction is `Redpanda/Kafka -> StarRocks`.

## Design Goals

- Support many datasource types without hard-coding every ingestion path.
- Let each datasource choose a different ingestion method while still publishing into a common event backbone.
- Preserve raw source payloads behind a stable envelope.
- Separate raw ingestion, normalization, and latest-state serving concerns.
- Keep the frontend contract stable until a backend API contract is explicitly accepted.

## MVP Definition

The first backend MVP should be the MRT real-data slice.

Success for this MVP means:

- TDX MRT real data is ingested by the backend
- the backend publishes and materializes the MRT latest-state path
- the web UI can display MRT train positions and train information from the backend path
- the MRT timeline exists and can be dragged to inspect train movement over time
- the slice is covered by backend end-to-end tests and frontend plus backend end-to-end tests

This MVP is intentionally narrower than full multi-source platform delivery. YouBike, Civil IoT, and broader source onboarding remain follow-on work after the MRT slice is proven.

## Additional Visualization Requirement

The platform should preserve support for both 2D and 3D map views.

This is not limited to the MRT MVP. The map view model should remain extensible for future domains such as flight data, where altitude and three-dimensional movement become first-class concerns.

That means backend contracts and frontend-facing map state should avoid assuming a strictly 2D transport model.

## Domain Language First

This change should define domain language before defining code interfaces.

The datasource interface, topic taxonomy, table naming, and processing boundaries should all be derived from a shared platform vocabulary. This is the backend equivalent of establishing a design system before defining UI components.

Without a shared vocabulary, the project risks mixing:

- `source` and `dataset`
- `connector` and `runtime adapter`
- `event` and `state`
- `raw record` and `frontend DTO`

That drift would make interfaces unstable and topic or table naming inconsistent.

## Canonical Terms

### Source Layer

- `source`: an external data provider such as `tdx`, `youbike`, or `ciot`
- `dataset`: one logical feed exposed by a source such as `mrt_liveboard` or `station_status`
- `record`: one upstream source-owned unit of data

### Platform Ingestion Layer

- `datasource`: the platform abstraction for an onboarded source dataset
- `connector`: the concrete implementation that retrieves or receives source data
- `source registry`: configuration that declares source identity, method, auth, cadence, and topic mapping
- `raw envelope`: the TWFoundry-owned wrapper around a source-owned payload

### Stream and Serving Layer

- `event`: a normalized domain record derived from raw source records
- `entity`: a platform-owned business object such as `station_liveboard`
- `state`: the current materialized value of an entity
- `projection`: logic that converts events into latest-state or serving models
- `latest-state table`: a serving table that stores the newest row by entity key

### Transport Layer

- `raw topic`: source-owned payloads wrapped in the common envelope
- `normalized topic`: cleaned domain events
- `state topic`: latest-state change stream
- `dead-letter topic`: terminal failure topic for a source dataset

## Ambiguous Terms To Avoid

- Avoid using `source` when `dataset` is meant.
- Avoid using `connector` when referring to HTTP, file, or webhook runtime adapters.
- Avoid using `event` when the data shape is actually current state.
- Avoid using `model` alone without clarifying whether it is raw, normalized, state, API, or storage-facing.

## Deferred From Bootstrap

The following items were intentionally moved out of `bootstrap-twfoundry-platform`:

- Current-state storage direction beyond the high-level StarRocks choice.
- Backend module skeletons for ingestion, streams, and API.
- Local Kafka and StarRocks infrastructure notes or compose files.
- Raw topic message envelope details.
- Curated topic naming and ownership.
- StarRocks Primary Key Table schemas for current-state tables.

## Backbone Direction

Phase 1 should use:

- `Redpanda` or `Kafka` as the event streaming backbone
- stream processors for validation, normalization, and projection
- `StarRocks` as the latest-state and serving store
- `Spring Boot` as the API boundary

This direction fits the current TWFoundry scope better than Fluss because:

- it aligns with the existing Kafka-oriented architecture notes already captured in project docs
- it avoids coupling the first backend slice to Flink- and lakehouse-specific runtime decisions
- it keeps the operational model simpler for the initial TDX, YouBike, Civil IoT, and GTFS connectors

## Core Model

### Source Registry

Each datasource should be registered as configuration, not embedded as ad hoc code paths.

Minimum registry fields:

- `source_id`: stable identifier such as `tdx`, `youbike`, `ciot`
- `dataset_id`: logical dataset such as `mrt_liveboard`, `station_status`
- `domain`: business domain such as `transit`, `mobility`, `environment`
- `ownership`: team or maintainer
- `ingestion_method`: `poll`, `webhook`, `file_import`, `event_stream`
- `run_mode`: `live`, `backfill`, `replay`
- `auth_strategy`: `none`, `api_key`, `oauth_client_credentials`, `signature`
- `cadence`: schedule or trigger policy
- `schema_version`: current raw envelope schema version
- `raw_topic`: target raw topic name
- `normalized_targets`: downstream normalized or state topics

The registry exists to make connectors pluggable by configuration and capability, not by branching logic spread through the codebase.

### Pluggable Connector Model

Datasource connectors should implement a shared interface and lifecycle.

Connector responsibilities:

- fetch or receive records from one upstream dataset
- convert upstream records into TWFoundry raw envelope records
- provide stable partition keys where possible
- emit records to the configured raw topic
- surface retryable vs terminal errors

Connector types:

- `poll`: scheduled REST or HTTP pull, suitable for TDX and YouBike
- `webhook`: inbound push integration
- `file_import`: GTFS, CSV, JSON snapshot, or bulk artifact ingestion
- `event_stream`: external event stream ingestion such as Kafka, Redpanda, MQTT, or another broker

Run modes:

- `live`: normal online ingestion
- `backfill`: historical gap fill or historical range import
- `replay`: replay of previously captured data or previously published events

### Datasource Interface

The datasource abstraction should stay small and should not expose transport-specific runtime entrypoints in the primary interface.

The main contract should describe the datasource itself. Pull- and push-style ingestion should be modeled as optional capabilities.

Illustrative Java-style contract:

```java
public enum IngestionMethod {
  POLL,
  WEBHOOK,
  FILE_IMPORT,
  EVENT_STREAM
}

public enum RunMode {
  LIVE,
  BACKFILL,
  REPLAY
}

public record SourceDescriptor(
  String sourceId,
  String datasetId,
  String domain,
  IngestionMethod ingestionMethod,
  RunMode runMode,
  String schemaVersion,
  String rawTopic
) {}

public record RawEnvelope<TPayload>(
  String eventId,
  String source,
  String dataset,
  String domain,
  String key,
  Instant observedAt,
  Instant ingestedAt,
  IngestionMethod ingestionMethod,
  RunMode runMode,
  String schemaVersion,
  String contentType,
  TPayload payload,
  Map<String, String> metadata
) {}

public interface Datasource {
  SourceDescriptor describe();
}

public interface PullSource<TCursor, TPayload> {
  PullBatch<TCursor, TPayload> pull(TCursor cursor);
}

public interface PushSource<TInput, TPayload> {
  List<RawEnvelope<TPayload>> ingest(TInput input);
}

public interface Lifecycle {
  default void initialize() {}
  default void shutdown() {}
}

public record PullBatch<TCursor, TPayload>(
  List<RawEnvelope<TPayload>> records,
  TCursor nextCursor
) {}
```

The exact implementation language may change later, but the contract shape should stay equivalent:

- `describe()` declares identity and topic mapping
- `Datasource` describes the onboarded source dataset
- `PullSource` is used for scheduled or cursor-based source retrieval
- `PushSource` is used for runtime adapters such as webhook, file, or broker bridge ingestion
- every source capability returns raw envelope records, never frontend-facing DTOs

### Method Semantics

The methods above should work as follows:

- `describe()`
  returns immutable source metadata used by the registry, scheduler, publisher, and observability pipeline

- `pull(cursor)`
  is called by a scheduler or pull runtime
  it fetches records from an upstream source, wraps them as `RawEnvelope`, and returns the next cursor if incremental progress is supported

- `ingest(input)`
  is called by a push runtime adapter
  it converts one inbound unit such as an HTTP payload, file artifact, or bridged broker message into one or more `RawEnvelope` records

- `initialize()`
  is optional startup logic such as client bootstrapping, auth warm-up, or resource checks

- `shutdown()`
  is optional teardown logic such as closing clients or flushing buffers

- `PullBatch.records`
  is the batch of raw envelopes to publish

- `PullBatch.nextCursor`
  is the source-specific continuation token, offset, watermark, or timestamp used by the next pull cycle

- `ingestionMethod`
  describes how data enters the platform
  for example `POLL`, `WEBHOOK`, `FILE_IMPORT`, or `EVENT_STREAM`

- `runMode`
  describes why the current execution is running
  for example normal live sync, historical backfill, or replay

### What `TPayload` Means

`TPayload` is the source-owned payload inside `RawEnvelope`.

It is not:

- a frontend DTO
- a normalized domain event
- a StarRocks row model
- an API response model

It is:

- the raw upstream JSON object
- a parsed CSV or GTFS row
- a webhook body after source-specific parsing
- a broker message body after bridge decoding

Examples:

- TDX MRT LiveBoard connector:
  `TPayload = TdxLiveBoardRecord`

- YouBike station status connector:
  `TPayload = YouBikeStationStatusRecord`

- GTFS stop_times loader:
  `TPayload = GtfsStopTimeRow`

The rule is simple:

- `RawEnvelope<TPayload>` preserves source truth
- normalization later converts `TPayload` into platform events or state models

### Why `RunMode` Is Separate From `IngestionMethod`

`IngestionMethod` and `RunMode` are different dimensions.

`IngestionMethod` answers:

- how did data enter the platform?

`RunMode` answers:

- why is this ingestion run happening now?

Examples:

- TDX scheduled sync:
  `IngestionMethod = POLL`, `RunMode = LIVE`

- TDX historical recovery:
  `IngestionMethod = POLL`, `RunMode = BACKFILL`

- GTFS zip import:
  `IngestionMethod = FILE_IMPORT`, `RunMode = BACKFILL`

- external Kafka bridge:
  `IngestionMethod = EVENT_STREAM`, `RunMode = LIVE`

- event replay:
  `IngestionMethod = EVENT_STREAM`, `RunMode = REPLAY`

### Why this interface is pluggable

This model keeps the runtime generic:

- scheduler triggers `PullSource`
- HTTP ingress, file loaders, and bridge adapters trigger `PushSource`
- all connector outputs are normalized into the same raw envelope
- publishing and retries are handled by shared infrastructure, not per-source custom code

That means adding a new datasource should mostly require:

1. adding a source registry entry
2. implementing one datasource plus one or more ingestion capabilities
3. binding it to shared publisher and observability utilities

### Spring Boot Runtime Binding

In a Java and Spring Boot implementation, runtime orchestration should be separate from datasource capability contracts.

Typical mapping:

- Spring scheduling triggers `PullSource`
- Spring MVC or WebFlux ingress adapts inbound requests into `PushSource`
- batch runners adapt files or backfill jobs into `PushSource`
- shared publisher beans write `RawEnvelope` records to `Redpanda/Kafka`

This keeps Spring Boot as the runtime host, while datasource contracts remain framework-light and testable.

### Scheduling and Trigger Model

Scheduling should not be embedded in datasource contracts.

The platform should separate:

- datasource capability
- ingestion job execution
- trigger mechanism

That separation allows the same datasource to run under:

- internal Spring Boot scheduling
- external scheduler orchestration
- manual operator trigger
- event-driven trigger

Illustrative runtime split:

```text
Datasource capability
  -> describes source + pulls or ingests records

Job runner
  -> executes one ingestion run for source X / dataset Y / run mode Z

Trigger mechanism
  -> decides when and why the job runner is invoked
```

The datasource should not know whether the run was triggered by:

- `@Scheduled`
- Kubernetes CronJob
- Airflow
- Jenkins
- an operator action
- an event command

It should only receive execution context and return raw envelopes.

### Internal and External Scheduler Compatibility

Phase 1 should support both internal and external scheduling models at the architecture level.

Internal scheduling:

- Spring Boot scheduler triggers recurring live ingestion jobs
- suitable for simple periodic polling such as TDX, YouBike, and Civil IoT

External scheduling:

- an orchestrator such as Airflow, Kubernetes CronJob, or another control-plane service triggers ingestion jobs from outside the runtime
- suitable for backfill, replay, controlled reruns, or future DAG-based orchestration

Recommended Phase 1 direction:

- use internal Spring Boot scheduling for normal recurring live ingestion
- expose a stable job trigger boundary so external schedulers can be added later without changing datasource contracts

### Job Runner Contract

The scheduler should invoke a job runner, not a datasource directly.

Illustrative Java-style contract:

```java
public record IngestionJobRequest(
  String sourceId,
  String datasetId,
  RunMode runMode,
  Instant requestedAt,
  String requestedBy,
  Map<String, String> parameters
) {}

public interface IngestionJobRunner {
  void run(IngestionJobRequest request);
}
```

The job runner is responsible for:

- resolving the registered datasource
- resolving whether the datasource supports pull or push execution
- creating execution context
- invoking the datasource capability
- publishing raw envelopes
- recording execution outcome and metrics

This keeps scheduling concerns out of datasource contracts while preserving compatibility with future external schedulers.

## Envelope Contract

All raw records published to the backbone should use a shared envelope.

Required fields:

- `event_id`
- `source`
- `dataset`
- `domain`
- `ingestion_method`
- `ingested_at`
- `schema_version`
- `content_type`
- `payload`

Recommended fields:

- `key`
- `observed_at`
- `trace_id`
- `metadata`

The payload should preserve source-owned data as faithfully as possible. Source-specific translation belongs in normalization stages, not raw ingestion.

## Topic Taxonomy

The platform should distinguish topic purpose clearly.

Phase 1 topic families:

- `raw.<domain>.<source>.<dataset>`
- `normalized.<domain>.<entity>`
- `state.<domain>.<entity>`
- `dlq.<domain>.<source>.<dataset>`

Examples:

- `raw.transit.tdx.mrt_liveboard`
- `raw.mobility.youbike.station_status`
- `raw.environment.ciot.observations`
- `raw.transit.mrt.gtfs_static`
- `normalized.transit.mrt_arrival`
- `state.transit.station_liveboard`
- `dlq.transit.tdx.mrt_liveboard`

Ownership rules:

- datasource connectors own `raw.*`
- stream processors own `normalized.*` and `state.*`
- dead-letter topics exist per source dataset to isolate failures and support replay

## Processing Boundaries

### Ingestion Layer

The ingestion layer is responsible for:

- source authentication
- polling or receiving upstream records
- envelope creation
- raw topic publication
- retry classification and source health reporting

The ingestion layer is not responsible for:

- complex joins across sources
- frontend DTO shaping
- latest-state materialization

### Stream Processing Layer

The stream layer is responsible for:

- validation and schema checks
- normalization into domain events
- light enrichment
- deduplication where necessary
- latest-state projection for StarRocks sinks

### Storage Layer

StarRocks should be used for current-state and dashboard-serving tables.

Current-state tables should use Primary Key Table design when records are updated in place by entity key.

Typical Phase 1 tables:

- `mrt_liveboard_current`
- `youbike_station_status_current`
- `ciot_observation_current`
- `station_master`

Historical retention can be added later through append-only history tables or lake/object storage if the project chooses to expand beyond latest-state serving.

## Initial Connector Mapping

### TDX MRT LiveBoard

- method: `poll`
- auth: `oauth_client_credentials`
- raw topic: `raw.transit.tdx.mrt_liveboard`
- normalized entity: `normalized.transit.mrt_arrival`
- state entity: `state.transit.station_liveboard`

### YouBike Station Status

- method: `poll`
- auth: `none` or source-specific public API policy
- raw topic: `raw.mobility.youbike.station_status`

### Civil IoT SensorThings

- method: `poll`
- raw topic: `raw.environment.ciot.observations`

### MRT Static GTFS

- method: `file`
- raw topic: `raw.transit.mrt.gtfs_static`

## Backend Module Direction

The repo should eventually grow minimal modules such as:

```text
backend/
  common/
  ingestion/
  api/
  storage/
  streams/
```

Recommended purpose per module:

- `backend/common`
  shared contracts such as `SourceDescriptor`, `RawEnvelope`, `IngestionMethod`, `RunMode`, error models, and topic naming helpers

- `backend/ingestion`
  datasource runtime, source registry, connectors, scheduling, job runner, and raw event publishing

- `backend/api`
  internal trigger endpoints, health endpoints, and later dashboard-facing backend APIs

- `backend/storage`
  StarRocks-facing query and write adapters

- `backend/streams`
  future stream normalization and projection logic when this becomes a separate runtime concern

No module implementation is required to accept this design, but future code should follow these boundaries.

## Build Tooling Direction

Backend build tooling should use:

- `Gradle`
- `build.gradle.kts`
- `libs.versions.toml`

The backend should use a multi-module Gradle layout so shared contracts and runtime adapters do not collapse into one application module too early.

This direction is preferred because:

- multi-module layout fits the planned backend boundaries
- Kotlin DSL is type-safe and works well with Java-first projects
- version catalogs centralize Spring Boot, Kafka, JDBC, observability, and test dependency versions

## Package Layout Direction

Within each backend runtime module, package layout should follow a clean architecture bias:

```text
domain/
application/
infrastructure/
```

Meaning:

- `domain`
  source contracts, value types, policies, and platform vocabulary

- `application`
  use cases, orchestration, job execution, and coordination logic

- `infrastructure`
  Spring Boot adapters, Kafka publishers, HTTP clients, schedulers, JDBC adapters, and concrete connectors

`application` is the layer name. `usecase` belongs inside that layer as implementation content, not as the top-level architecture name.

## Common Backend Dependencies

Phase 1 backend should be designed around these common dependency categories:

- Spring Boot core runtime
- Spring Web for internal and future serving APIs
- Spring Actuator for health and metrics endpoints
- Spring Validation for input and config validation
- Spring Kafka for `Redpanda/Kafka` integration
- Spring Retry for retry and backoff policy
- Spring JDBC for StarRocks access
- Jackson for source payload serialization and deserialization
- Micrometer with Prometheus registry for metrics
- Spring Boot test support and Kafka test support

Phase 1 should avoid introducing by default:

- JPA or Hibernate
- Kafka Streams as an immediate dependency
- Airflow-specific runtime coupling
- GraalVM native build requirements
- Schema Registry, Avro, or Protobuf before raw contracts stabilize

## Test Strategy Direction

The backend should define explicit test layers from the beginning.

### Unit Tests

Unit tests validate:

- domain value types
- topic naming helpers
- envelope creation logic
- connector-local parsing and mapping logic
- retry or classification policies

These tests should not require Kafka, StarRocks, or network access.

### Integration Tests

Integration tests validate:

- Spring Boot wiring
- scheduler and job runner interactions
- publisher behavior against local or test broker dependencies
- storage adapters against test-compatible DB boundaries
- connector interactions with stubbed upstream services

These tests should verify module boundaries and infrastructure adapters.

Local integration testing may use Testcontainers reusable containers for faster reruns and easier debugging. This refers to the Testcontainers reuse feature, for example `withReuse(true)`, not a general CI container reuse assumption.

### Backend End-to-End Tests

Backend E2E tests validate a backend slice across runtime boundaries.

Typical backend E2E path:

```text
trigger -> datasource connector -> raw publish -> downstream observable outcome
```

Examples:

- internal trigger API executes a TDX ingestion run and publishes raw records
- file import trigger loads GTFS and produces raw topic output

For local debugging, backend E2E runs may also use reusable Testcontainers instances with `withReuse(true)` so generated broker and storage state can be inspected after the test completes.

### Frontend + Backend End-to-End Tests

Full-stack E2E tests validate the product path across frontend and backend.

Typical path:

```text
frontend action -> backend API -> storage or state -> rendered UI result
```

These tests should remain small in count and focus on critical user-visible flows.

### Recommended Test Ownership

- `UT`
  fast, isolated, source contract and mapping correctness

- `IT`
  framework wiring, adapters, Kafka, DB, and module integration

- `BE E2E`
  backend runtime slice behavior

- `FE + BE E2E`
  user-facing product flow

This distinction should be reflected later in Gradle tasks, CI workflows, and test source-set naming.

## Containerized Test Runtime Direction

The project should use:

- `docker-compose` for local stack visibility and manual runtime inspection
- `Testcontainers` for automated integration and backend end-to-end tests

Phase 1 should not require a devcontainer.

### Testcontainers Reuse Policy

For local development:

- reusable Testcontainers instances may be enabled
- this refers to Testcontainers reuse support such as `withReuse(true)`
- containers may remain alive after test execution so data and logs can be inspected

For GitHub CI:

- each workflow job starts from a fresh environment
- test design should not rely on cross-job container reuse
- container lifetime is naturally per job even if local development uses reusable containers

### Test Data Cleanup Policy

Tests should clean target scope before execution, not by globally deleting all runtime data.

Required approach:

- use test-specific namespaces, keys, topics, or table partitions
- clear the test-owned scope before each run
- preserve generated artifacts after the run when local debugging benefits from inspection

This allows:

- repeatable tests
- local post-run debugging
- compatibility with reusable local Testcontainers
- compatibility with fresh GitHub CI jobs

## Validation

This change is complete when:

- the backbone direction is explicitly documented as `Redpanda/Kafka -> StarRocks`
- pluggable datasource connector contracts are defined
- raw, normalized, state, and dead-letter topic taxonomy is defined
- latest-state storage direction is documented
- Spectra validation passes for the change
