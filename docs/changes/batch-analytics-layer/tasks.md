## 1. Storage foundation

- [ ] 1.1 [P] Stand up the Iceberg lakehouse on R2 as the batch source of truth: define `service_date`-partitioned table layout for curated observations and aggregates, with idempotent DDL (satisfies Iceberg Lakehouse Curated Store).
- [ ] 1.2 [P] Provision ClickHouse — ClickHouse loads daily aggregates, not live Iceberg queries — with MergeTree tables keyed by `service_date` supporting `REPLACE PARTITION`.

## 2. Batch pipeline

- [ ] 2.1 Implement the Airflow DAG orchestrates the daily roll-up on homelab k0s (`bus_service_health_daily`): extract → Iceberg → aggregate → ClickHouse → publish stages with retries and backfill — the Daily Batch Roll-Up Pipeline.
- [ ] 2.2 Implement the extract+curate stage that reads lake JSONL into the Iceberg lakehouse (Iceberg Lakehouse Curated Store) while leaving the raw JSONL archive immutable.
- [ ] 2.3 Implement Idempotent per-service-day partitions keyed by service_date across all stages (Iceberg overwrite partition + ClickHouse `REPLACE PARTITION`), satisfying Idempotent Per-Service-Day Processing.
- [ ] 2.4 Compute the per-service-day reliability index, route-density, data-freshness, and bunching aggregates plus the timeline entry.
- [ ] 2.5 Record run provenance (`serviceDate`, `generatedAt`) to satisfy Pipeline Freshness And Lineage.

## 3. Dataset contract and serving

- [ ] 3.1 Define the Service-Health Dataset Contract schema (manifest, reliability, routes, route-density, data-freshness, bunching, multi-day timeline) compatible with the dashboard's rendered fields.
- [ ] 3.2 Implement Publish the service-health dataset as R2 JSON mirroring the static paths under `analytics/bus/`, validating the payload against the contract before upload (Stable Serving Location With Static Fallback).
- [ ] 3.3 Set explicit provenance so Dataset Provenance Is Explicit (non-null `generatedAt`; `source` identifies the pipeline, not `clickhouse-static-snapshot`).
- [ ] 3.4 Implement Daily Refresh And Rolling Timeline so the timeline rolls to the latest service day and retains at least the trailing 7 service days.

## 4. Frontend wiring

- [ ] 4.1 Wire `BusOversightDashboard` so the Frontend consumes via an env-switchable base URL with static fallback (`VITE_TWFOUNDRY_ANALYTICS_BASE`): default to the R2-served dataset on prod, bundled static files locally.

## 5. Backfill, cutover, and platform direction

- [ ] 5.1 Backfill historical service days, then run daily: run the Airflow backfill over the lake's date range, then enable the daily schedule.
- [ ] 5.2 Flip the dashboard default to the rolling dataset and retire the frozen `clickhouse-static-snapshot` files once the rolling dataset is authoritative (keep the static fallback).
- [ ] 5.3 [P] Record the Lambda Batch Analytics Layer direction in `platform-foundation` and confirm the speed/batch role split documented in the spec.
