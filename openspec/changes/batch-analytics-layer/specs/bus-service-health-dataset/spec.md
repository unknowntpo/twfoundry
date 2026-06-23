## ADDED Requirements

### Requirement: Service-Health Dataset Contract

The system SHALL publish a bus service-health dataset comprising: a `manifest` (with `serviceDate`, `generatedAt`, `source`), a per-service-day `reliability` index and `routes` count, and `route-density`, `data-freshness`, and `bunching` aggregate collections, plus a multi-day service-health `timeline`. The published field shapes SHALL remain compatible with what `BusOversightDashboard` already renders so adoption is a data-source swap.

#### Scenario: Dataset exposes the dashboard's required metrics

- **WHEN** a consumer fetches the dataset for the latest service day
- **THEN** it receives the manifest, reliability index, route count, route-density, data-freshness, and bunching collections, and the multi-day timeline
- **AND** each collection's row shape matches the fields the dashboard renders

#### Scenario: Published payload is validated before serving

- **WHEN** the pipeline prepares the dataset for publication
- **THEN** it validates the payload against this contract
- **AND** it MUST NOT publish a payload that fails validation

### Requirement: Dataset Provenance Is Explicit

The dataset manifest SHALL carry an explicit `serviceDate` (the day the metrics describe) and a non-null `generatedAt` (when the data was produced). The `source` field SHALL identify the producing pipeline and MUST NOT be labelled as a frozen static snapshot once the rolling pipeline is authoritative.

#### Scenario: Rolling dataset is distinguishable from the frozen snapshot

- **WHEN** the rolling pipeline has published a dataset
- **THEN** the manifest `generatedAt` is non-null
- **AND** the `source` identifies the batch pipeline rather than `clickhouse-static-snapshot`

### Requirement: Daily Refresh And Rolling Timeline

The dataset SHALL be refreshed each service day, and the service-health timeline SHALL roll forward to include the most recent service day while retaining at least the trailing window the dashboard displays.

#### Scenario: Timeline includes the latest service day

- **WHEN** service date `D` has been processed
- **THEN** the published timeline's most recent entry is `D`
- **AND** the timeline retains at least the trailing 7 service days ending at `D`

### Requirement: Stable Serving Location With Static Fallback

The dataset SHALL be served from a stable location under `analytics/bus/` on R2, addressable by the dashboard. A bundled static dataset SHALL remain available as an offline/local fallback so the dashboard degrades to the last-known dataset rather than an empty state when the rolling source is unreachable.

#### Scenario: Dashboard reads the rolling dataset on prod

- **WHEN** the dashboard loads with the rolling source configured
- **THEN** it fetches the dataset from the `analytics/bus/` serving location
- **AND** it renders the metrics with their published provenance

#### Scenario: Dashboard falls back when the source is unreachable

- **WHEN** the rolling dataset cannot be fetched
- **THEN** the dashboard loads the bundled static fallback dataset
- **AND** it does not render an empty dashboard
