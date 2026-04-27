# StarRocks vs Iceberg + StarRocks Evolution Note

## Context

TWFoundry needs a data platform that can support:

- real-time MRT and YouBike ingestion
- map-facing serving APIs
- future timeline and replay
- future historical analytics
- possible object-storage-first deployment

This note compares two practical directions:

- `StarRocks-first`
- `Iceberg + StarRocks`

## Short Conclusion

For TWFoundry now:

- start with `StarRocks-first`
- keep the architecture compatible with `Iceberg + StarRocks`
- do not force Iceberg into the first working MRT slice

Reason:

- the current project priority is product-serving speed, not lakehouse completeness
- the first hard problem is frontend and backend product behavior
- Iceberg becomes more valuable once history, replay, long retention, and cross-engine access matter

## Option A: StarRocks-first

Illustrative path:

```text
Datasource Connectors
  -> Kafka / Redpanda
  -> Stream Processing
  -> StarRocks
  -> Spring Boot API
  -> Vue frontend
```

### Strengths

- simpler Phase 1 architecture
- fewer moving pieces
- fast path for serving product APIs
- easier to reason about latest-state tables
- good fit for MRT liveboard and station-serving use cases

### Weaknesses

- not a full lakehouse architecture
- long-term historical replay is less elegant
- cross-engine data sharing is weaker than an Iceberg-first layout

## Option B: Iceberg + StarRocks

Illustrative path:

```text
Datasource Connectors
  -> Kafka / Redpanda
  -> raw / normalized processing
  -> Iceberg tables on S3 or MinIO
  -> StarRocks query / serving
  -> Spring Boot API
  -> Vue frontend
```

### Strengths

- better long-term storage model
- open table format
- better replay and historical retention story
- easier multi-engine future
- aligns better with a broader lakehouse direction

### Weaknesses

- more components earlier
- more metadata and catalog decisions
- more ingestion and table-management complexity
- higher Phase 1 delivery risk

## Role Split

The cleanest mental model is:

```text
Iceberg = storage/table format
StarRocks = fast query and serving engine
Postgres = control plane and application metadata
```

This is preferable to using PostgreSQL as the primary analytical serving layer.

## Recommended Path For TWFoundry

### Phase 1

Use:

- `Kafka/Redpanda`
- `StarRocks`
- `Postgres`

Role split:

- `StarRocks`: latest-state tables and fast product-serving queries
- `Postgres`: source registry, scheduler metadata, control-plane state

Do not require Iceberg yet.

### Phase 2

Add:

- `S3/MinIO`
- `Iceberg`

Use it for:

- historical retention
- replay-friendly storage
- colder data
- future batch and analytical workloads

Keep `StarRocks` as the serving/query layer.

## Why This Fits TWFoundry

The project is currently dominated by:

- overlay modeling
- map product behavior
- timeline behavior
- backend contract stability
- MRT and YouBike product slices

That means the platform needs fast end-to-end product delivery more than it needs a fully realized lakehouse from day one.

So the practical decision is:

```text
ship StarRocks first
leave room for Iceberg second
```

## Migration-Friendly Design Rules

To keep this evolution path open:

- do not bind product APIs directly to raw StarRocks table names
- keep datasource contracts independent from storage engine details
- model history and replay as platform concepts, not only storage implementation details
- avoid naming that assumes latest-state is the only storage mode forever
- preserve object-storage compatibility in infrastructure direction

## Final Recommendation

TWFoundry should use:

- `StarRocks-first` for the first working platform slice
- `Iceberg + StarRocks` as the intended evolution path once historical and replay needs become first-class
