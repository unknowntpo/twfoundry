## Why

The bus oversight dashboard's service-health metrics (7-day timeline, reliability index, route density / data-freshness / bunching) are served from a one-time `clickhouse-static-snapshot` frozen at service date 2026-05-20 — identical on local and prod, never refreshed. Only the Flink speed layer (gap/bunching counts) is live. Without a batch layer, the historical/aggregated half of the Lambda architecture cannot roll forward, the dashboard misrepresents stale data as current, and the planned speed+batch serving-layer watermark merge (UNK-37) has no batch input to merge.

## What Changes

- Introduce an **Airflow-orchestrated daily batch pipeline** on the homelab cluster that reads archived observations from the lake (`bus-lake-archiver` JSONL of `normalized.tdx.bus_vehicle_position`), rolls them up into an **Iceberg lakehouse on R2**, and loads aggregates into **ClickHouse** for OLAP.
- Define a **rolling bus service-health dataset** (the contract the dashboard consumes): per-service-day reliability index, route density, data-freshness, bunching, and a multi-day service-health timeline — refreshed daily, with explicit `serviceDate`/`generatedAt` provenance.
- Publish that dataset to a stable serving location (R2 JSON under `analytics/bus/`, mirroring today's static paths) so the frontend switch is a data-source swap, not a render rewrite.
- Wire `BusOversightDashboard` to the rolling dataset (currently hardcodes `/data/analytics/bus/*.json`); preserve a static fallback for local/offline.
- Refine `platform-foundation` to record the Lambda batch layer (Iceberg + ClickHouse) alongside the existing speed layer, superseding the earlier StarRocks-only direction.

## Capabilities

### New Capabilities

- `batch-analytics-pipeline`: Airflow-orchestrated daily roll-up of lake observations into an Iceberg lakehouse on R2 and ClickHouse OLAP, with idempotent per-service-day partitions and freshness/lineage guarantees.
- `bus-service-health-dataset`: The published, daily-refreshed bus service-health analytics contract (schema, fields, provenance, serving location) consumed by the oversight dashboard, replacing the frozen static snapshot.

### Modified Capabilities

- `platform-foundation`: Record the batch/Lambda layer (Iceberg lakehouse on R2 + ClickHouse OLAP, Airflow orchestration) as the historical-aggregation half of the architecture, complementing the live Flink speed layer.

## Impact

- Affected specs: new `batch-analytics-pipeline`, `bus-service-health-dataset`; modified `platform-foundation`.
- Affected code/infra: new Airflow DAG(s) + transform jobs (homelab k0s); Iceberg-on-R2 table layout; ClickHouse schema/loaders; `cloudflare/scripts/` or a publisher service to emit `analytics/bus/*` to R2; `frontend/src/BusOversightDashboard.vue` data-source wiring (+ `busOversightData.js`).
- Linear: M5 / UNK-34, UNK-35, UNK-36; unblocks UNK-37 (speed+batch watermark merge).
- Dependencies: existing lake JSONL (`bus-lake-archiver`), R2 bucket + account-scoped token, homelab cluster capacity for Airflow + ClickHouse.
