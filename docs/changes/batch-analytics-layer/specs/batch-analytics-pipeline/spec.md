## ADDED Requirements

### Requirement: Daily Batch Roll-Up Pipeline

The system SHALL provide an orchestrated batch pipeline that, once per service day, reads archived bus observations from the lake (`bus-lake-archiver` JSONL of `normalized.tdx.bus_vehicle_position`), computes per-service-day service-health aggregates, and produces the published `bus-service-health-dataset`. The pipeline SHALL be schedulable, retriable, and support backfill over a date range.

#### Scenario: Daily run produces a service day's aggregates

- **WHEN** the pipeline runs for service date `D`
- **THEN** it reads all lake observations whose service date is `D`
- **AND** it produces reliability, route-density, data-freshness, bunching aggregates and a multi-day timeline entry for `D`
- **AND** it publishes the resulting `bus-service-health-dataset` artifacts

#### Scenario: Backfill over a date range

- **WHEN** the pipeline is invoked to backfill service dates from `D0` through `D1`
- **THEN** it processes each service day in the range independently
- **AND** the published dataset reflects every successfully processed day

#### Scenario: Stage failure is retriable without manual cleanup

- **WHEN** a pipeline stage fails for service date `D`
- **THEN** re-running the pipeline for `D` recomputes that day from the lake
- **AND** no partial or duplicated state from the failed run remains

### Requirement: Iceberg Lakehouse Curated Store

The system SHALL persist the pipeline's curated inputs and outputs as Apache Iceberg tables on R2, partitioned by `service_date`. Raw lake JSONL SHALL remain the immutable archive and SHALL NOT be mutated by the pipeline.

#### Scenario: Curated data is partitioned by service date

- **WHEN** the pipeline writes curated data for service date `D`
- **THEN** the data is stored in an Iceberg table partition keyed by `service_date = D`
- **AND** querying a single service date prunes to that partition

#### Scenario: Raw archive is preserved

- **WHEN** the pipeline reads lake JSONL for any service day
- **THEN** the original JSONL archive remains unchanged after the run

### Requirement: Idempotent Per-Service-Day Processing

Every pipeline stage SHALL be keyed by `service_date` and SHALL fully replace that day's partition or rows on re-run, so repeated runs for the same service day converge to the same result without duplication.

#### Scenario: Re-running a day replaces rather than appends

- **WHEN** the pipeline has already processed service date `D`
- **AND** the pipeline runs again for `D`
- **THEN** the curated Iceberg partition and ClickHouse rows for `D` are replaced
- **AND** aggregate counts for `D` are identical to a single run (no doubling)

### Requirement: Pipeline Freshness And Lineage

Each published dataset SHALL record the `service_date` it covers and the `generatedAt` timestamp of the run that produced it, so consumers can distinguish current from stale data.

#### Scenario: Published dataset carries provenance

- **WHEN** the pipeline publishes the dataset for service date `D`
- **THEN** the dataset manifest contains `serviceDate = D` and a non-null `generatedAt` set to the run time
