# ClickHouse Bus Analytics Milestone

This milestone turns the existing TDX archived bus projections into an interview-ready OLAP path:

```text
archived projection JSON -> JSONEachRow export -> ClickHouse -> operations analytics SQL
```

The goal is not to replace the current Cloudflare/R2 POC. It is a side path for learning and interview discussion.

## Why ClickHouse Fits

The bus observations are append-heavy event data. Most useful questions scan many rows by time, route, and direction, then aggregate. That is a good fit for a columnar OLAP database.

Good use cases:

- route supply density by time bucket
- telemetry freshness and GPS quality
- same-route vehicle spacing / bunching signals

Poor use cases:

- frequent row-by-row updates
- transactional workflow state
- small mutable records where PostgreSQL would be simpler

## Schema Decision

Table: `twfoundry.bus_vehicle_observations`

The table keeps source observation fields plus small derived fields:

- `gps_update_lag_seconds`: data quality metric
- `route_progress_ratio`: comparable position along the route
- `distance_to_route_meters`: guardrail for route matching quality
- `nearest_stop_name` / `between_stops_label`: explainability for the signal

Partition/order choice:

- `PARTITION BY toYYYYMM(service_date)` keeps time-based retention simple.
- `ORDER BY (service_date, route_name, direction, slot_start, route_progress_ratio, vehicle_id)` supports the main access pattern: route + time + progress scans.

## Run Locally

Start ClickHouse:

```bash
docker compose -f infra/clickhouse/docker-compose.yml up -d
```

Create schema:

```bash
docker compose -f infra/clickhouse/docker-compose.yml exec -T clickhouse \
  clickhouse-client --multiquery < infra/clickhouse/sql/schema.sql
```

Export JSONEachRow from existing static projections:

```bash
bun infra/clickhouse/scripts/export-bus-observations-jsonl.mjs
```

Import:

```bash
docker compose -f infra/clickhouse/docker-compose.yml exec -T clickhouse \
  clickhouse-client \
  --query "INSERT INTO twfoundry.bus_vehicle_observations FORMAT JSONEachRow" \
  < infra/clickhouse/out/bus_vehicle_observations.jsonl
```

Run one query:

```bash
docker compose -f infra/clickhouse/docker-compose.yml exec -T clickhouse \
  clickhouse-client \
  --param_service_date=2026-05-20 \
  --queries-file infra/clickhouse/sql/route_bunching_signal.sql
```

## Interview Talking Points

Use this framing:

> I started with static JSON because it was cheap and simple for a POC. When the question becomes analytical, I add ClickHouse as a read-optimized OLAP path instead of forcing the frontend or R2 object layout to answer analytical queries.

Important tradeoffs:

- R2 static JSON is cheap and easy to cache, but weak for ad hoc aggregations.
- ClickHouse adds operational cost, but makes time-bucket, route-level, and quality queries natural.
- Derived fields such as route progress should be versioned because signal logic can change.

Failure modes to discuss:

- duplicate snapshots: use a stable `(slot_start, vehicle_id, route_uid, direction)` ingestion key or deduplicate at query time
- late data: store event time and ingestion time separately
- bad geometry matching: filter by `distance_to_route_meters`
- stale GPS: expose freshness metrics before trusting bunching signals
