# Current Session Handoff

Date: 2026-06-21 (updated; lineage from 2026-06-20)  
Mode: **Producer handoff** for the next agent or operator.

## ⚡ Session Update 2026-06-21 (read first)

- **Decision: DO NOT build Flink now.** Deferred per KISS. Saved to memory.
- **Confirmed priority order:**
  1. ▶ **Track B continuous automation** ← do this next (cron: ingest→archiver→publisher→upload, freshness hugging Track A)
  2. Cutover + retire Track A (after Track B fresh ~48h)
  3. ○ Flink + Iceberg (deferred)
- **Architecture clarification (avoid re-confusing the next agent):**
  - **Flink = archival layer** (Kafka→Iceberg). Its verification = checkpoint commit / Iceberg snapshot / upsert dedup — *not* gap/bunching.
  - **service_gap / bunching detection = ClickHouse layer** (`publish-clickhouse-bus-analytics.mjs`), downstream and *unrelated* to Flink.
- **Cleanup done:** orphaned `browser-tools-mcp` MCP servers from killed cursor agents → killed. Pipeline services down. Kafka kept Up (pipeline needs it).
- **Still running (NOT this workspace's tasks — leave alone):** user's own interactive `codex` CLI sessions in other terminals (PIDs ~9–10 days old, foreground/attached).

## Goal

- **Current user goal:** Finish Phase 1 bus data pipeline (KISS, extend when needed); user sees live Taipei bus map on Cloudflare Pages backed by real TDX data.
- **Latest user request:** Continue pipeline work; upload Track B to R2; understand Track A vs B; write handoff for pickup.
- **Desired next outcome:** Automate Track B (ingest → archiver → publisher → R2 upload on a schedule); eventually cut Track B over to replace Track A when freshness is proven for 48h.

**Primary milestone doc:** `docs/architecture/bus-pipeline-e2e-milestones.md`  
**Local runbook:** `docs/architecture/bus-pipeline-local-e2e.md`

## Project State

- **Repo/worktree:** `/Users/unknowntpo/repo/unknowntpo/twfoundry/main`
- **Branch:** `main` (ahead 95, behind 12 vs origin — dirty tree, do not assume clean)
- **Public frontend:** `https://twfoundry-poc.pages.dev`
- **Primary review page:** `https://twfoundry-poc.pages.dev/route-geometry?route=307`

### Important paths (bus pipeline)

| Area | Path |
|---|---|
| Kafka dev | `infra/kafka/` |
| Ingestion service | `services/bus-ingestion/` (HTTP `:8081`) |
| Lake archiver (dev) | `services/bus-lake-archiver/` |
| Projection publisher (interim M6) | `services/bus-projection-publisher/` |
| Edge ingestor (Track A) | `cloudflare/ingestor-worker/` |
| R2 upload script | `cloudflare/scripts/upload-bus-projections.mjs` |
| Pages projection API | `frontend/functions/api/projections/[[path]].js` |
| Projection contract | `frontend/functions/_shared/busProjectionContract.js` |
| Reconcile (no Airflow required) | `scripts/reconcile-once.sh` |
| Archiver E2E script | `scripts/verify-archiver-e2e.sh` |
| Local lake output | `data/lake/{service_date}.jsonl` |
| Track B artifacts (local) | `cloudflare/artifacts/bus-projections-track-b/` |
| Ingestion manifest | `services/bus-ingestion/data/bus/ingestion/manifest.json` |
| Architecture docs | `docs/architecture/*.md` |

## Two Tracks (must understand before changing anything)

```
TRACK A (production map — live)          TRACK B (homelab backbone — parallel verify)
─────────────────────────────            ───────────────────────────────────────────
TDX → CF ingestor-worker                 TDX → bus-ingestion → Kafka → archiver
    → R2 bus/projections/*                   → data/lake/*.jsonl
    → Pages /api/projections/bus_vehicles    → bus-projection-publisher
                                             → R2 bus/projections-track-b/*
                                             → Pages /api/projections/bus_vehicles_track_b
```

| | Track A | Track B |
|---|---|---|
| **Runs where** | Cloudflare edge (cron `*/5`) | Local / future homelab k0s |
| **R2 prefix** | `bus/projections/` | `bus/projections-track-b/` |
| **Pages API** | `/api/projections/bus_vehicles` | `/api/projections/bus_vehicles_track_b` |
| **source.mode** | `tdx-live-cron` | `homelab-lake-publisher` |
| **Production status (2026-06-20)** | Live, 3468+ snapshots | 1 manual snapshot (stale) |
| **Cutover** | Keep until B is fresh 48h | Target long-term source of truth |

**Do not break during rollout:** ClickHouse analytics path (`publish:clickhouse-bus-analytics` → static JSON under `frontend/public/data/analytics/bus/`).

## What Changed (this session lineage)

### Completed

- **M1 Kafka:** dev KRaft broker, topic bootstrap script.
- **M2 Ingest:** real TDX smoke — 1200 records/slot, manifest `complete`, idempotency verified.
- **M3–M4 Production:** Track A live; `verify:cloudflare-poc` passes (≥50 features).
- **M5 dev:** Node archiver Kafka → `data/lake/*.jsonl` (1200 rows verified for one slot).
- **M6 interim:** `services/bus-projection-publisher` built; Track B uploaded to R2; Pages route added for `bus_vehicles_track_b`; production verified.
- **LZ4 blocker resolved:** dropped `kafkajs-lz4`; recreated Kafka topic without broker LZ4; producer uses gzip.
- **Scripts fixed:** `scripts/verify-archiver-e2e.sh` (kafka-1, correct lake path); `scripts/reconcile-once.sh` (repo-relative paths).
- **Docs updated:** `bus-pipeline-e2e-milestones.md`, `bus-pipeline-local-e2e.md`.

### In progress / not done

- Track B **continuous automation** (cron/systemd/homelab job: ingest + archiver + publisher + R2 upload).
- Track B **freshness** — still one manual slot from 2026-06-19; Track A is current.
- **M5 prod:** Flink + Iceberg on R2 (design only: `docs/architecture/bus-lake-archiver-v1.md`).
- **M7:** Airflow DAG scheduled on homelab (code + dry-run script exist; not hosted).
- **Homelab k0s deploy** deferred (`docs/architecture/homelab-deployment-notes.md`).
- **Frontend default map** still reads Track A (`bus_vehicles`); Track B is parallel verify only.

### Deferred (user agreed)

- E2E with real data on Cloudflare Pages beyond current projection API — discuss after pipeline is boringly reliable.
- Homelab cutover discussion until local path proven.

## Key Decisions

- **KISS first:** Node dev archiver + JSONL lake before Flink/Iceberg.
- **No LZ4 on Kafka topic:** kafkajs consumer cannot decode broker LZ4 without broken WASM on Node 24; use producer gzip.
- **Parallel tracks:** Run Track A (edge) until Track B publishes fresh `bus/projections*` (or cutover prefix) for 48h.
- **Separate R2 prefix for Track B:** `bus/projections-track-b/` avoids overwriting edge manifest during rollout.
- **Manifest ≠ Kafka dedup:** failover may dup Kafka; lake merge converges on `(slot_key, vehicle_id, route_uid, direction)`.
- **HTTP port 8081** for bus-ingestion (8080 conflicts with ClickHouse on user's machine).
- **Do not commit unless user asks** — tree is dirty/uncommitted.

## Runtime / Environment (as of handoff)

| Service | Status |
|---|---|
| Kafka Docker (`infra/kafka`) | **Up** — `twfoundry-kafka-1` on `localhost:9092` |
| bus-ingestion `:8081` | **Down** (stopped per user request) |
| bus-lake-archiver | **Down** |
| Track A CF ingestor-worker | **Up** in Cloudflare (cron) |
| Local lake file | `data/lake/2026-06-19.jsonl` — **1200 rows** |

### Production verification (2026-06-20)

```text
Track A  GET .../bus_vehicles/timeline
         → mode: tdx-live-cron, latest: 2026-06-20T08:00+08:00, snapshots: 3468

Track A  GET .../bus_vehicles?slot=latest
         → 1041 features

Track B  GET .../bus_vehicles_track_b/timeline
         → mode: homelab-lake-publisher, latest: 2026-06-19T11:45+08:00, snapshots: 1

Track B  GET .../bus_vehicles_track_b?slot=latest
         → 1200 features (stale capturedAt: 2026-06-19T07:10:32Z)
```

### Secret locations (values NOT included)

| Secret | Location / binding |
|---|---|
| TDX creds (local ingest) | `backend/ingestion/.env` — vars `TDX_CLIENT_ID`, `TDX_CLIENT_SECRET` |
| TDX creds (CF worker) | Cloudflare Worker secrets on `twfoundry-bus-ingestor` |
| R2 bucket | `twfoundry-poc-archive`, binding `BUS_PROJECTION_BUCKET` on Pages |
| Wrangler auth | OAuth logged in as `e850506@gmail.com` (verified during session) |

## Commands (safe to run)

### Start local pipeline

```bash
# Kafka
cd infra/kafka && docker compose up -d && node scripts/create-bus-topics.mjs

# Ingest (needs TDX creds from backend/ingestion/.env)
cd services/bus-ingestion && npm start
curl http://localhost:8081/health

# Ingest one slot (force)
curl -X POST http://localhost:8081/ingest/slots \
  -H 'Content-Type: application/json' \
  -d '{"slotKey":"2026-06-20T08:00+08:00","mode":"backfill","force":true}'

# Archiver
cd services/bus-lake-archiver
KAFKA_GROUP_ID=bus-lake-archiver-dev START_FROM_BEGINNING=true npm start

# Publish Track B artifacts from lake
cd services/bus-projection-publisher
R2_PREFIX=bus/projections-track-b SERVICE_DATE=2026-06-19 \
  OUTPUT_PATH=../../cloudflare/artifacts/bus-projections-track-b npm start

# Upload Track B to R2
cd cloudflare
bun scripts/upload-bus-projections.mjs \
  --input-root artifacts/bus-projections-track-b \
  --prefix bus/projections-track-b

# Reconcile dry-run
python3 scripts/reconcile-once.sh --dry-run --url http://localhost:8081
```

### Verify production

```bash
cd frontend
bun run verify:cloudflare-poc -- --url https://twfoundry-poc.pages.dev --min-features 50 --skip-analytics --skip-route-evidence

# Track B manual check
curl -s https://twfoundry-poc.pages.dev/api/projections/bus_vehicles_track_b/timeline | jq '.latestSlotKey, .source.mode'
curl -s 'https://twfoundry-poc.pages.dev/api/projections/bus_vehicles_track_b?slot=latest' | jq '.features | length, .source.mode'
```

### Deploy Pages (after changing Functions)

```bash
cd frontend
bun run build
bun run deploy:cloudflare-pages -- --project-name twfoundry-poc --commit-dirty=true
```

### Tests

```bash
cd services/bus-ingestion && npm test          # 7 tests
cd services/bus-lake-archiver && npm test      # 10 tests
cd services/bus-projection-publisher && npm test  # 3 tests
cd frontend && npm run test:cloudflare-pages   # projection function tests
cd infra/airflow && python -m pytest tests/  # slot utils
bash scripts/verify-archiver-e2e.sh          # needs Kafka up
```

## Verification Summary

| Check | Result |
|---|---|
| M2 real TDX ingest → Kafka | ✅ Passed (1200/slot) |
| M5 archiver → lake JSONL | ✅ Passed (1200 rows) |
| M3–M4 Track A production | ✅ Passed (`verify:cloudflare-poc`) |
| M6 Track B R2 + Pages API | ✅ Passed (manual upload + curl verify) |
| Reconcile dry-run | ✅ Passed |
| LZ4 on Kafka topic | ❌ Removed — do not re-enable |
| Track B continuous freshness | ❌ Not automated |
| Homelab k0s deploy | ⏸ Deferred |
| Git commit | ⏸ Not done (user preference) |

## Next Steps (recommended order)

1. **Automate Track B locally:** script or systemd that runs ingest (live slot) → archiver → publisher → R2 upload every 5 min; verify Track B `latestSlotKey` stays within 10 min of Track A.
2. **Wire reconcile:** run `scripts/reconcile-once.sh` (non-dry-run) against local ingest to backfill manifest gaps; later schedule Airflow DAG on homelab.
3. **Optional cutover prep:** when Track B is fresh for 48h, either switch frontend to `bus_vehicles_track_b` or publish Track B to `bus/projections/` and retire edge worker.
4. **M5 prod path:** Flink + Iceberg per `docs/architecture/bus-lake-archiver-v1.md` (replace dev JSONL archiver).
5. **Homelab:** deploy to k0s per `docs/architecture/homelab-deployment-notes.md` once local loop is boring.

**First action for pickup agent:** Start local services (Kafka + ingest + archiver), ingest current slot, run publisher + R2 upload, confirm Track B production API updates.

## Security Notes

- Never commit or paste TDX credentials, Cloudflare tokens, or tunnel secrets.
- R2 upload and Pages deploy require Cloudflare auth (wrangler OAuth present on this machine).
- User rejected auto-approved Kafka topic delete/recreate once — prefer documented scripts over ad-hoc broker ops.

## Unknowns

| Unknown | How to resolve |
|---|---|
| Whether to point frontend map at Track B before full cutover | User decision; keep parallel API until 48h freshness proven |
| Flink/Iceberg timeline for M5 prod | Read `bus-lake-archiver-v1.md`; not blocking Track B JSONL path |
| Homelab k0s readiness | Check `~/repo/unknowntpo/infra` and `homelab-deployment-notes.md` |
| Branch sync (ahead 95, behind 12) | User should decide rebase/merge before any push |

## Prior Work (still relevant, other features)

- Route detail / delay signal work: `frontend/src/RouteGeometryConcept.vue`, `GET /api/tdx/bus-delay-poc`
- Delay signal naming: `候車超時候選` (frequency routes), not generic `誤點`
- Static fallback evidence: `frontend/public/data/tdx-bus/reliability-evidence/route-307.json`
- Public `/api/tdx/bus-delay-poc` may return `503` if TDX secrets not on Pages — static fallback used

## References

- E2E milestones: `docs/architecture/bus-pipeline-e2e-milestones.md`
- Local E2E: `docs/architecture/bus-pipeline-local-e2e.md`
- Cloudflare deploy: `docs/deploy/cloudflare-first-poc.md`
- Technical decisions: `docs/architecture/technical-decisions-log.md`
- Prior conversation transcript: `.cursor/projects/.../agent-transcripts/55445821-680d-4baa-88f3-f9bc259c4735/55445821-680d-4baa-88f3-f9bc259c4735.jsonl`
