## Context

TWFoundry runs a Lambda architecture. The **speed layer** is live: Flink `route-sentinel` emits gap/bunching signals to Kafka `online.tdx.bus_route_signal`, published to R2 and consumed by the dashboard. The **batch layer does not exist yet** — the dashboard's historical/aggregated metrics come from `frontend/public/data/analytics/bus/*.json`, a one-time `clickhouse-static-snapshot` frozen at service date 2026-05-20.

What already exists to build on:
- `bus-lake-archiver` writes raw `normalized.tdx.bus_vehicle_position` observations to a lake as JSONL (the batch source).
- An R2 bucket + account-scoped token (`~/.cloudflare/r2.env`), and the existing `analytics/bus/*` serving path shape the dashboard already understands.
- A homelab single-node k0s cluster (`twfoundry-data` namespace) with the speed-layer pipeline running.
- A ClickHouse schema was used once to produce the static export (provenance `clickhouse-static-snapshot`).

Constraints: homelab is a single modest node (CO-locate Airflow + ClickHouse carefully); images are amd64-only built via CI (never local docker build on the arm Mac); R2 is the durable store. This change is **design + spec only** — no implementation code.

## Goals / Non-Goals

**Goals:**
- A daily, idempotent batch pipeline turning lake JSONL into a rolling, dated bus service-health dataset.
- A stable serving contract the dashboard can consume with a one-line data-source swap.
- Honest provenance (`serviceDate`, `generatedAt`) so stale data is never shown as current.
- Provide the batch input the speed+batch watermark merge (UNK-37) will later consume.

**Non-Goals:**
- The serving-layer watermark merge itself (UNK-37) — this change only produces the batch dataset; merging past+live at a watermark is a follow-up.
- Real-time/streaming aggregation — that is the speed layer's job; batch is daily.
- Non-bus layers (MRT, YouBike) — the dataset contract is bus-scoped; generalization is future work.
- Replacing the speed layer or changing Flink.
- Migrating the whole platform to a new query engine; ClickHouse already produced the snapshot.

## Decisions

### Iceberg lakehouse on R2 as the batch source of truth
Land roll-up inputs/outputs as Apache Iceberg tables on R2 (S3-compatible) rather than querying raw JSONL each run. Iceberg gives schema evolution, partition pruning by `service_date`, and snapshot isolation so a re-run replaces a day cleanly. Alternative — query JSONL directly with DuckDB/ClickHouse each run — is simpler but rescans the whole lake, has no schema contract, and makes idempotent per-day replacement awkward. Raw JSONL remains the immutable archive; Iceberg is the curated batch store.

### ClickHouse loads daily aggregates, not live Iceberg queries
The daily DAG computes per-service-day aggregates and loads them into ClickHouse MergeTree tables keyed by `service_date`; the dashboard reads small pre-aggregated rows. Alternative — ClickHouse queries Iceberg on R2 on demand — couples request latency to scan cost and the homelab node's I/O. Pre-aggregation keeps the serving payload tiny and bounded, matching today's small JSON files.

### Airflow DAG orchestrates the daily roll-up on homelab k0s
A single Airflow DAG (`bus_service_health_daily`) runs the stages: extract lake JSONL for the target service day → write Iceberg → compute aggregates → load ClickHouse → publish dataset to R2. Airflow gives scheduling, retries, backfill, and lineage visibility. Alternative — a cron `scripts/reconcile-once.sh` — exists but lacks retry/backfill/observability; the reconcile script can be folded in as a task. Airflow runs in `twfoundry-data`, resource-capped to coexist with ClickHouse and the speed-layer pod.

### Publish the service-health dataset as R2 JSON mirroring the static paths
The DAG's final stage writes the same file shapes the dashboard already loads (`analytics/bus/manifest.json`, `bunching.json`, `data-freshness.json`, `route-density.json`, plus the multi-day timeline) to R2 under `analytics/bus/`, with real `serviceDate`/`generatedAt`. Alternative — expose a live ClickHouse-backed `analytics-api` to the public edge — adds an always-on public service and DB exposure; R2 static JSON is cacheable, cheap, and already the consumed shape. The internal `analytics-api` may still serve ad-hoc/internal queries but is not the dashboard's prod dependency.

### Frontend consumes via an env-switchable base URL with static fallback
Replace `BusOversightDashboard`'s hardcoded `/data/analytics/bus/*.json` with a base resolved from `VITE_TWFOUNDRY_ANALYTICS_BASE` (defaulting to the R2-served `/api`/Pages path on prod, and the bundled static files locally) — the same pattern `OperationsExplorer` uses for `ANALYTICS_API_BASE_URL` and that we just added for live signals. Keeps local/offline working and makes the swap a data-source change, not a render rewrite.

### Idempotent per-service-day partitions keyed by service_date
Every stage is keyed by `service_date` and fully replaces that day's partition/rows on re-run (Iceberg overwrite partition; ClickHouse `ALTER TABLE ... REPLACE PARTITION`). Re-running a day is safe and converges. Avoids duplicate-append drift (the same class of bug that produced 17.8M duplicate speed-layer signals earlier).

### Backfill historical service days, then run daily
Seed the dataset by backfilling the service days already in the lake (via Airflow backfill over the date range), then let the daily schedule roll forward. This also retires the frozen `clickhouse-static-snapshot` by producing a real, dated equivalent.

## Risks / Trade-offs

- [Homelab single-node capacity: Airflow + ClickHouse + speed-layer pod contend for CPU/RAM/IO] → resource-limit Airflow workers, schedule the DAG off-peak, cap ClickHouse memory; start with one day's volume and measure before backfilling.
- [Iceberg-on-R2 tooling maturity in a JVM/Python homelab job] → pin a known-good engine (e.g. Spark/PyIceberg or DuckDB-Iceberg) chosen in implementation; keep raw JSONL as the immutable fallback so the lakehouse can be rebuilt.
- [Schema drift between lake JSONL and the published contract] → define the dataset schema in the `bus-service-health-dataset` spec and validate the published JSON against it in the DAG before upload.
- [Dashboard breakage during cutover] → keep the bundled static JSON as fallback and switch via env, so a failed publish degrades to the last-known dataset rather than an empty dashboard.
- [Cost/quota on R2 writes from daily backfill] → backfill in a bounded batch; daily steady-state writes are a handful of small JSON objects.

## Migration Plan

1. Stand up Iceberg-on-R2 table layout and ClickHouse schema (idempotent DDL).
2. Implement the DAG stages against one recent service day; validate published JSON matches the dataset spec and the dashboard renders it via the env-switched base.
3. Backfill the lake's historical service days.
4. Flip the dashboard's default analytics base to the R2-served dataset; keep static fallback.
5. Retire the frozen `clickhouse-static-snapshot` files once the rolling dataset is authoritative.

Rollback: revert the frontend env default to the bundled static JSON; the DAG can be paused without affecting the live speed layer.

## Open Questions

- Iceberg engine choice for the homelab job (PyIceberg + DuckDB vs Spark) — decide in implementation based on node footprint.
- Does the DAG read lake JSONL from R2 directly, or from the archiver PVC? Prefer R2 for durability/decoupling.
- ClickHouse deployment: reuse any existing homelab instance vs a new resource-capped pod in `twfoundry-data`.
- Retention: how many service days the published timeline keeps (dashboard shows 7) vs how much Iceberg history to retain.
