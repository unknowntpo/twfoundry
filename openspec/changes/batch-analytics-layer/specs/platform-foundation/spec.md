## ADDED Requirements

### Requirement: Lambda Batch Analytics Layer

TWFoundry SHALL operate a batch analytics layer as the historical-aggregation half of its Lambda architecture, complementing the live Flink speed layer. The batch layer SHALL curate archived observations into an Iceberg lakehouse on R2 and load daily aggregates into ClickHouse for OLAP, orchestrated by Airflow. The speed layer SHALL remain the source of near-real-time signals; the batch layer SHALL own daily historical aggregation. This direction supersedes the earlier StarRocks-only storage direction for batch analytics.

#### Scenario: Batch and speed layers have distinct roles

- **WHEN** the platform serves bus service-health metrics
- **THEN** near-real-time gap/bunching counts originate from the Flink speed layer
- **AND** daily historical aggregates (reliability, density, freshness, bunching, timeline) originate from the batch layer

#### Scenario: Batch layer curates the lake into the lakehouse

- **WHEN** the batch layer processes archived observations
- **THEN** it writes curated, `service_date`-partitioned data to an Iceberg lakehouse on R2
- **AND** it loads per-service-day aggregates into ClickHouse for serving

#### Scenario: Batch layer feeds the serving-layer merge

- **WHEN** a later serving-layer watermark merge combines past and live data
- **THEN** the batch layer's published dataset is the historical (past-of-watermark) input to that merge
