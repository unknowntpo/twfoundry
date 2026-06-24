# Bus service-health batch layer

The batch (historical-aggregation) half of the Lambda architecture. It turns
archived lake observations into the rolling, dated **bus service-health
dataset** the oversight dashboard consumes — replacing the frozen one-time
`clickhouse-static-snapshot`. The live Flink speed layer (gap/bunching counts)
is separate and unchanged.

See `openspec/changes/batch-analytics-layer/` for the full proposal/design/spec.

## Pipeline

```
data/lake/<service_date>.jsonl                 (bus-lake-archiver output)
  │  load-lake-observations.mjs   (idempotent per service_date)
  ▼
ClickHouse twfoundry.bus_vehicle_observations  (schema: sql/schema.sql)
  │  publish-clickhouse-bus-analytics.mjs --lookback-days 7
  ▼
data/analytics-rolling/bus/{manifest,route-density,data-freshness,bunching}.json
  │  upload-bus-analytics.mjs       (wrangler r2 object put)
  ▼
R2 analytics/bus/*  ──►  dashboard via VITE_TWFOUNDRY_ANALYTICS_BASE
```

`run-bus-service-health-pipeline.mjs` chains load + publish (the daily roll-up).
The Airflow DAG `airflow/dags/bus_service_health_daily.py` runs that + the R2
upload on a daily schedule.

## Run locally

```bash
# ClickHouse (local): infra/clickhouse/docker-compose.yml  (default twfoundry/twfoundry_dev)
node infra/clickhouse/scripts/run-bus-service-health-pipeline.mjs \
  --service-date 2026-06-21 --lookback-days 7 \
  --output-root data/analytics-rolling/bus

# point the dashboard at the rolling output (served locally or from R2)
VITE_TWFOUNDRY_ANALYTICS_BASE=/data/analytics/bus  # or the R2-served prefix
```

Single day / back-compat snapshot: omit `--lookback-days` (defaults to 1) and
use the legacy `frontend` script default `--output-root public/data/analytics/bus`.

## Status

| Piece | Status |
|---|---|
| lake → ClickHouse loader (idempotent per day) | ✅ verified locally |
| publisher: rolling `--lookback-days`, honest `--source`, multi-day timeline | ✅ verified locally |
| local orchestration script | ✅ verified locally (06-19/20/21) |
| dashboard env-switch (`VITE_TWFOUNDRY_ANALYTICS_BASE`) | ✅ code in; default unchanged |
| R2 upload script | ✅ dry-run verified; needs wrangler auth + R2 to run for real |
| Airflow DAG | ⚠️ committed, **not deployed** (needs Airflow on homelab) |
| Iceberg lakehouse curated store on R2 | ⛔ not started — see below |
| prod cutover (retire static snapshot) | ⛔ not done (intentionally; needs review) |

## Idempotency

`load-lake-observations.mjs` deletes a service day's rows
(`ALTER TABLE ... DELETE WHERE service_date = D SETTINGS mutations_sync = 1`)
before re-inserting, so re-runs converge. The table currently partitions by
`toYYYYMM(service_date)` (monthly); the DELETE-based replace gives per-day
idempotency without needing daily partitions. If daily `REPLACE PARTITION`
becomes preferable for volume, repartition by `service_date`.

## Not yet done (cluster phase)

- **Iceberg lakehouse on R2** as the curated store (design decision: Iceberg as
  batch source of truth). Pick an engine (PyIceberg+DuckDB vs Spark) sized for
  the single homelab node; raw lake JSONL stays the immutable fallback. Today
  the pipeline goes lake → ClickHouse directly; Iceberg is the durability/
  schema-evolution upgrade.
- **Deploy the Airflow DAG** on the homelab cluster (resource-capped to coexist
  with ClickHouse + the speed-layer pod) and wire ClickHouse/R2 creds.
- **bunching enrichment**: lake rows lack `route_progress_*`, so batch bunching
  only appears for days that already have progress data. Enrich observations
  with route-geometry progress (same computation as the speed-layer sentinel)
  to make batch bunching complete.
- **prod cutover**: once the rolling dataset is authoritative on R2, flip the
  dashboard default base and retire the committed `clickhouse-static-snapshot`
  files. Left undone deliberately — needs a human to confirm the rolling data
  is good before changing what prod serves.
