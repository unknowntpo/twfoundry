# Bus Pipeline E2E Milestones

**Last updated:** 2026-06-19  
**Goal:** User opens the Cloudflare Pages URL and sees a live Taipei bus map backed by real TDX data (not fixtures).

## Two parallel tracks during rollout

| Track | Path | Role during transition |
|---|---|---|
| **A — Fast edge path (POC)** | TDX → `cloudflare/ingestor-worker` → R2 projections → Pages Functions `/api/projections/bus_vehicles` | **Shortest path to live map data on Pages**; keep running until Track B publishes equivalent artifacts |
| **B — Target homelab path** | TDX → `services/bus-ingestion` → Kafka → `bus-lake-archiver` → Iceberg → projection publish → R2 → Pages | Long-term backbone; does not replace Track A until R2 projection artifacts are fresh |

**Do not break during rollout**

- ClickHouse → `publish:clickhouse-bus-analytics` → static JSON under `frontend/public/data/analytics/bus/` → dashboard analytics panels
- Existing static projection fallback under `frontend/public/data/cloudflare-bus-projections/` (used when R2 binding is absent)

Pages Functions already prefer R2 when `BUS_PROJECTION_BUCKET` is bound; static assets remain the fallback.

## Current implementation inventory (2026-06-19)

| Component | Status | Location |
|---|---|---|
| Kafka dev cluster (KRaft, single broker) | **Implemented** | `infra/kafka/docker-compose.yml` |
| Bus topic bootstrap script | **Implemented** (no LZ4; producer gzip) | `infra/kafka/scripts/create-bus-topics.mjs` |
| Architecture contracts | **Docs** | `docs/architecture/*.md` |
| Ingestion service (Kafka produce) | **Implemented** (real TDX smoke ✓) | `services/bus-ingestion/` |
| Lake archiver (dev Node JSONL) | **Implemented** (interim; not Flink/Iceberg) | `services/bus-lake-archiver/` |
| Projection publisher (lake → R2 contract) | **Implemented** (interim) | `services/bus-projection-publisher/` |
| Airflow reconciliation DAG | **Code + dry-run script** | `infra/airflow/`, `scripts/reconcile-once.sh` |
| Edge ingestor (TDX → R2 projections) | **Deployed + live** | `cloudflare/ingestor-worker/` |
| Pages projection API | **Live** (`verify:cloudflare-poc` ✓) | `frontend/functions/api/projections/[[path]].js` |
| ClickHouse analytics publish path | **Implemented** | `frontend/scripts/publish-clickhouse-bus-analytics.mjs` |
| Java Spring bus projections (local dev) | **Implemented** (archive-based, not Kafka) | `backend/ingestion/` |

## E2E milestones (testable)

### M0 — Inventory and contracts frozen
- [x] Architecture docs indexed (`technical-decisions-log.md`)
- [x] Normalized Kafka contract defined (`normalized-bus-vehicle-position-v1.md`)
- **Test:** docs exist and cross-link

### M1 — Kafka backbone local
- [x] `docker compose up` in `infra/kafka` starts broker
- [x] `npm run create-topics` creates `normalized.tdx.bus_vehicle_position` and DLQ
- **Test:** `kafka-topics --list` shows both topics with expected partition counts
- **Status:** ✅ Complete

### M2 — Ingest service produces real normalized events
- [x] Skeleton: `POST /ingest/slots` and `POST /ingest/live-now`
- [x] HTTP server listening on port 8081
- [x] Real TDX ingest: 1200 records/slot, manifest `complete`, idempotency verified
- **Test:** `kafka-console-consumer` shows JSON with `schema=twfoundry.normalized.tdx.bus_vehicle_position.v1`
- **Status:** ✅ Complete (local dev)

### M3 — Edge ingestor writes live projections to R2 (**fastest visible win**)
- [x] Deploy `cloudflare/ingestor-worker` with TDX secrets; cron `*/5 * * * *`
- [x] R2 has `bus/projections/manifest.json` with recent `slotKey`
- **Test:** `wrangler r2 object get twfoundry-poc-archive bus/projections/manifest.json`
- **Status:** ✅ Complete (production)

### M4 — Pages serves live bus map (not fixtures)
- [x] Pages project has R2 binding `BUS_PROJECTION_BUCKET`
- [x] `verify:cloudflare-poc` passes: 1200 features, `sourceMode: tdx-live-cron`
- **Test:** `bun run verify:cloudflare-poc -- --url https://twfoundry-poc.pages.dev --min-features 50`
- **Status:** ✅ Complete (production)

### M5 — Lake archiver lands observations in Iceberg
- [x] Dev Node archiver: Kafka → `data/lake/{service_date}.jsonl` (1200 rows verified)
- [ ] Flink job + Iceberg on R2 (prod target)
- **Test:** lake JSONL row count matches ingest `recordCount` for slot
- **Status:** ✅ Dev interim complete; prod Iceberg pending

### M6 — Homelab path feeds same R2 projection contract
- [x] Interim publisher: `services/bus-projection-publisher` reads lake JSONL → projection artifacts
- [ ] Upload Track B artifacts to R2 and verify Pages reads them (parallel with edge ingestor)
- **Test:** `cloudflare/scripts/upload-bus-projections.mjs` + `verify:cloudflare-poc`
- **Status:** 📌 Local build ✓; R2 upload not yet wired in CI/homelab

### M7 — Airflow reconciliation closes gaps
- [ ] DAG computes missing slots, calls `POST /ingest/slots` with `mode=backfill`
- **Test:** intentional gap in manifest is filled within grace window

### M8 — Analytics path stays healthy (parallel)
- [ ] ClickHouse import + `publish:clickhouse-bus-analytics` still runs for dashboard analytics
- **Test:** `/data/analytics/bus/*.json` present after deploy; dashboard panels load

## Minimum path to real data on Pages (recommended order)

```text
M3 (edge ingestor → R2)  →  M4 (Pages reads R2)  →  user sees live map
         ↓ parallel
M1 → M2 (Kafka ingest skeleton) → M5 → M6 (homelab replaces edge ingestor over time)
```

**Current milestone: M1–M5 dev complete, M3–M4 production live.**  
**Next:** M6 R2 upload from Track B, M7 scheduled reconcile on homelab.

## Cloudflare pieces to update per milestone

| Milestone | Cloudflare component | Action |
|---|---|---|
| M3 | `cloudflare/ingestor-worker` | Deploy worker; set TDX secrets; confirm R2 bucket `twfoundry-poc-archive` |
| M4 | `frontend/wrangler.toml` | Ensure `BUS_PROJECTION_BUCKET` binding on Pages project |
| M4 | `frontend/functions/api/projections/[[path]].js` | No code change if contract unchanged; verify R2 path resolution |
| M4 | `frontend/scripts/verify-cloudflare-poc.mjs` | Run against production URL after ingestor fills R2 |
| M6 | New homelab publisher (TBD) | Write same R2 keys as ingestor-worker; ingestor can be retired or run parallel |
| M8 | `frontend/package.json` deploy scripts | Keep `publish:clickhouse-bus-analytics` in deploy pipeline; do not remove static analytics assets |

## Open decision for user

**Keep POC ingestor-worker parallel vs cut over?**

- **Recommended:** run **parallel** until M6 proves homelab publishes fresh `bus/projections/*` to the same R2 bucket with ≤5 min freshness.
- Edge ingestor is operationally simpler for the first live demo; homelab path is the long-term source of truth.
- Cut over when: homelab projection publisher freshness ≥ ingestor-worker for 48h and `verify:cloudflare-poc` passes without static fallback.

## References

- Edge serving boundary: `docs/architecture/cloudflare-edge-serving-boundary.md`
- Cloudflare POC deploy: `docs/deploy/cloudflare-first-poc.md`
- Ingestion service: `docs/architecture/ingestion-service-v1.md`
- Kafka topics: `docs/architecture/kafka-topics-bus-v1.md`
