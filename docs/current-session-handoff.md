# Current Session Handoff

Date: 2026-06-23  
Mode: **Producer handoff** — for the next session.

---

## ⏩ READ FIRST — 2026-06-23 evening (UI declutter + M5 batch layer)

Two parallel branches off `main`, both pushed; neither merged, no prod/homelab changes made.

### Branch `ui/operations-explorer-dedup` → PR [#1](https://github.com/unknowntpo/twfoundry/pull/1)
Frontend-only UI/UX pass (root operations explorer + bus dashboard): removed duplicated UI, promoted the layer switcher to top chrome, distinguished live-vs-batch KPIs, etc. + `dev:remote` to pull real R2 live signals locally. Build/tests green; verified in preview. **Awaiting review/merge.**

### Branch `m5-batch-layer` — batch analytics layer (the Lambda batch half)
Replaces the frozen `clickhouse-static-snapshot` with a rolling, dated bus service-health dataset. **Verified locally; NOT deployed to homelab and prod NOT cut over** (deliberate — needs human review of rolling data first).

- **Design/spec**: `openspec/changes/batch-analytics-layer/` (proposal+design+specs+tasks; spectra-validated).
- **Verified locally** (against local ClickHouse `docker-compose` + `data/lake/2026-06-19/20/21.jsonl`):
  - `infra/clickhouse/scripts/load-lake-observations.mjs` — idempotent lake→ClickHouse loader (the missing ingestion step). Loaded 06-21 = 23,195 rows / 285 routes.
  - `frontend/scripts/publish-clickhouse-bus-analytics.mjs` — added `--lookback-days` (real multi-day timeline via `LIMIT n BY service_date`) + configurable `--source` (honest provenance, default unchanged).
  - `infra/clickhouse/scripts/run-bus-service-health-pipeline.mjs` — chains load→publish (the daily roll-up).
  - `BusOversightDashboard.vue` — `VITE_TWFOUNDRY_ANALYTICS_BASE` env-switch (default static fallback).
  - Visual proof: `bun run dev:rolling` shows the dashboard on serviceDate **2026-06-21** (not frozen 05-20) with a real multi-day timeline (06-15..06-21).
- **Committed but NOT deployed/run on cluster** (see `infra/clickhouse/README.md` status table):
  - `airflow/dags/bus_service_health_daily.py` — daily DAG (syntax-checked only).
  - `infra/clickhouse/scripts/upload-bus-analytics.mjs` — R2 upload (dry-run verified; needs wrangler auth).
- **NOT started / pending** (next session): Iceberg lakehouse curated store on R2; deploy Airflow DAG on homelab; **bunching enrichment** (lake rows lack `route_progress_*` → batch bunching only on days that already have progress data); **prod cutover** (flip dashboard default to R2 rolling dataset + retire static snapshot).

> ⚠️ Local ClickHouse must be running (`infra/clickhouse/docker-compose.yml`, default `twfoundry`/`twfoundry_dev`) for the pipeline. The committed `frontend/public/data/analytics/bus/*` static snapshot was left untouched (still the prod fallback).

---

## ⏩ READ FIRST — 2026-06-23 handoff

**Repo:** `/Users/unknowntpo/repo/unknowntpo/twfoundry/main` · branch `main` · clean · pushed · HEAD `cb28387`.

### ⚠️ Background tasks DO NOT carry over — restart if needed
This session left two background tasks running in the *previous* process; a new session starts with none:
- **Redpanda Console port-forward** (the user actively uses this). Restart with a self-healing loop:
  ```bash
  while true; do KUBECONFIG=~/.kube/config-morefine kubectl -n twfoundry-data \
    port-forward svc/redpanda-console 8080:8080; sleep 2; done   # run_in_background
  ```
  then http://localhost:8080. (Kill old: `pkill -f "port-forward svc/redpanda-console"`.)
- Any signal/CI **pollers** were transient — re-create as needed (see commands below).

### What's working now (verify, don't rebuild)
- **Live Flink speed layer end-to-end**: `/bus-oversight` "路線訊號紀錄" panel shows live `大空窗`/`車輛群聚` signals. Pipeline: TDX→ingestion→Kafka→route-sentinel(Flink, checkpointing OFF, `latest`)→`online.tdx.bus_route_signal`→signal-publisher(persistent consumer + periodic publish)→R2→`/api/online/bus-route-signals`→dashboard.
- **Frontend IA**: `/` = multi-layer **OperationsExplorer** map; `/bus-oversight` = bus dashboard (reached via header "公車服務控制台" button). Planned layers (MRT/YouBike/signals) show as disabled "Coming soon". Oversight page has dark full-width bg (no light side margins).
- All 4 `bus-track-b` containers + kafka-0 + redpanda-console Running 0 restarts (ns `twfoundry-data`, `~/.kube/config-morefine`).

### ✅ A: live KPIs — DONE + verified (2026-06-23 11:07)
Oversight `大空窗事件`/`車輛群聚事件` KPI cards show **live current-slot counts** from the bundle's `counts` field, tagged `即時 · HH:MM`; the other 3 cards stay batch ("較昨日"). Verified live: 大空窗 156 / 群聚 0 · 即時 10:55. Required two fixes: publisher emits `counts` (commit `c9a2c6d`) AND the Pages function must forward it (commit `c30c9d1` — `limitSignals` was dropping it). Spot-check: `curl -s '.../api/online/bus-route-signals?limit=2' | jq '.counts'`.

### ▶ FIRST ACTION — open dashboard UX items with the user (B/D/E)
The headline pipeline + dashboard work is done. Resume the dashboard discussion.

### Then: dashboard UX discussion (items B/D/E still open) + Lambda design
- **B (answered, now Linear UNK-37)**: speed+batch merge via a **serving-layer watermark** ("同一套規則、兩種算力、一個 serving 出口"). Past=batch, live-edge=speed, seam at watermark. Depends on the batch layer (M5).
- **A caveat**: only the 2 signal-type KPIs are live; reliability/7-day timeline/focus-route are still the **frozen 2026-05-20 batch snapshot** (`/data/analytics/bus/*.json`). Full live needs the batch layer (Linear M5: UNK-34/35/36).
- **Still to discuss with user**: D (KPI number consistency), E (i18n/empty-state copy), and whether to relabel the batch service-date honestly.

### Linear (project `twfoundry`, team UNK, prefix `UNK-`)
Milestones M1–M5 + issues UNK-19..37 seeded. Done = M1/M2; open = M3 cutover, M4 hardening (UNK-30 Avro+checkpointing), M5 batch + UNK-37 watermark merge. See memory `twfoundry-linear-project`. Keep Linear in sync when issues complete.

### Known recurring gotchas
- **Every `rollout restart` → ~6–12 min signal warmup** (sentinel `latest` + flush-on-slot-transition). Not a bug.
- **NEVER local docker build** (arm Mac → amd64 cluster exec-format error). Push → CI builds 5 images → `kubectl rollout restart deploy/bus-track-b`.
- Frontend deploy: `cd frontend && bun run build && bun run deploy:cloudflare-pages -- --project-name twfoundry-poc --commit-dirty=true`.

---

## ★ NORTH STAR

**Track B (homelab pipeline) is the permanent backbone → RETIRE Track A (Cloudflare edge stopgap).**

```
containerize ✅ → k8s manifests ✅ → deploy P1 on k0s ✅ → Flink speed layer DEPLOYED ✅
  → 48h soak (IN PROGRESS) → CUTOVER (public map → Track B, retire Track A)
  → (later) Iceberg/ClickHouse batch layer (Lambda arch)
```

Kafka is **permanent** — it stays as the backbone for Flink. Do not treat it as transitional.

---

## Current State (2026-06-22 ~19:25 UTC+8)

### P1 + Flink speed layer — GREEN, running 24/7 on homelab k0s

`bus-track-b` is now a single pod with **4 containers** (Recreate strategy, RWO PVCs):

| Container | Role | Status |
|---|---|---|
| `archiver` | Kafka → lake JSONL | Running 0 restarts |
| `scheduler` | ingest→archiver→publish→R2 every 5 min | Running 0 restarts |
| `route-sentinel` | **Flink speed layer** (service-gap / bunching detection) | Running 0 restarts |
| `signal-publisher` | online signal topic → R2 bundle (loop) | Running 0 restarts |

Plus `kafka-0` (1/1) and `bus-ingestion` (1/1).

- **Namespace:** `twfoundry-data`
- **Cluster:** morefine-m9, single-node k0s v1.34.3, `192.168.1.114:6443` (DHCP, may drift)
- **Kubeconfig:** `~/.kube/config-morefine` (context `morefine`, real CA verification)
- **Images (5):** `ghcr.io/unknowntpo/twfoundry/{bus-ingestion,bus-lake-archiver,bus-track-b-scheduler,bus-route-sentinel,bus-route-signal-publisher}:latest` (public GHCR, built by CI `.github/workflows/build-track-b-images.yml` — **amd64 only, NEVER local docker build on arm Mac**)
- **Secret:** `twfoundry-track-b-secrets` (TDX_CLIENT_ID/SECRET + CLOUDFLARE_API_TOKEN/ACCOUNT_ID). R2 token is a dedicated account-scoped Cloudflare token (Workers R2 Storage: Edit), kept at `~/.cloudflare/r2.env`.
- **Kafka topics:** `normalized.tdx.bus_vehicle_position` (input) + `online.tdx.bus_route_signal` (6 part, 7d retention — created this session). Auto-create is ON.

### Speed-layer flow (NEW, deployed this session)

```
bus-ingestion → Kafka normalized.tdx.bus_vehicle_position
  → route-sentinel (Flink, embedded local executor, OffsetsInitializer.latest, checkpoints on RWO PVC bus-route-sentinel-checkpoints)
  → Kafka online.tdx.bus_route_signal
  → signal-publisher (consume loop → bundle → R2 online/bus-route-signals/latest.json)
  → Pages GET /api/online/bus-route-signals (R2-backed, static fallback)
  → frontend BusOversightDashboard live event log
```

### Pipeline Health (verified this session)

- All 4 bus-track-b containers Running, **0 restarts**; scheduler cycle_end exitStatus 0 (slot `2026-06-22T19:20+08:00`).
- **Track B fresh + current: `19:20`.** Flink source consumer group `bus-route-sentinel` committed offsets on input topic, **LAG 0** (consuming + checkpointing OK).
- `/api/online/bus-route-signals` returns the new JSON bundle (`schema twfoundry.online.tdx.bus_route_signal_bundle.v1`, `source flink-speed-layer`), reading the live R2 object (fresh `generatedAt`).
- **`status: waiting_for_flink`, 0 signals so far — EXPECTED.** Sentinel reads from `latest` and only emits on a detected service-gap/bunching; cold start needs to accumulate slot history. Not a bug — confirm real signals appear over the next cycles.

### ⚠️ Observations / caveats

- **Track A is STALE (`latestSlotKey` stuck at `16:50`, ~2.5h behind).** The CF edge cron appears to have stopped producing. Since we are RETIRING Track A and Track B is current at `19:20`, this reinforces the cutover — but flag if the public map matters before cutover. NOT caused by this session's work.
- **No SLF4J backend bundled in the Flink jar** → route-sentinel logs only print SLF4J NOP warnings; Flink internal logs are silenced. Observability gap — add a log4j2 binding to `backend/streams` runtime deps as a follow-up.
- 48h soak clock for the *base* Track B pipeline started ~10:00 UTC+8; the speed layer was added ~19:20 UTC+8.

### Repo

- **Path:** `/Users/unknowntpo/repo/unknowntpo/twfoundry/main`
- **Branch:** `main` — clean, pushed, at `85b3c92`
- **Frontend:** `https://twfoundry-poc.pages.dev`

---

## ▶ NEXT TASKS (priority order)

### ✅ DONE 2026-06-23 — live signals end-to-end on the public dashboard

The full speed layer works and is verified visually: `/bus-oversight` → "路線訊號紀錄" panel shows live `大空窗`/`車輛群聚` signals with current timestamps. Fixes this session:
- **Flink death spiral** (Kryo can't checkpoint records) → checkpointing disabled, `startingOffsets=latest`, topic truncated (commit `596cf19`).
- **signal-publisher missed flushes** (fresh 5s-window consumer per cycle) → rewritten to ONE persistent consumer filling a rolling buffer + periodic publish (commit `056aef0`).
- **Frontend IA** → root `/` = multi-layer OperationsExplorer; bus dashboard at `/bus-oversight` via a header button (commit `e93374e`).
- Proper hardening tracked in Linear UNK-30 (Avro + re-enable checkpointing). Linear project: see memory `twfoundry-linear-project`.

### (historical) Confirm real anomaly signals emit

The speed layer is deployed and consuming. Verify the sentinel emits when a real service-gap/bunching occurs:
```bash
# output topic — should grow > 0 once an anomaly is detected
KUBECONFIG=~/.kube/config-morefine kubectl exec -n twfoundry-data kafka-0 -- bash -lc \
  'kafka-run-class kafka.tools.GetOffsetShell --bootstrap-server localhost:9092 --topic online.tdx.bus_route_signal | awk -F: "{s+=\$3} END {print s}"'
# public bundle
curl -sf 'https://twfoundry-poc.pages.dev/api/online/bus-route-signals' | jq '.status, (.signals|length)'
```
If signals never appear after several hours of service, sanity-check the processor thresholds (`docs/architecture/anomaly-detection-algorithm.md`, params in `BusRouteSentinelProcessor`). **Add an SLF4J/log4j2 binding to the Flink jar first** so the sentinel is observable — currently it logs nothing.

### 2. Monitor 48h Soak (in progress, mostly passive)

Track B must publish fresh data ≥48h continuously.

**Verification commands:**
```bash
# Track B freshness (Track A is currently stale — being retired)
curl -sf 'https://twfoundry-poc.pages.dev/api/projections/bus_vehicles_track_b/timeline' | jq '.latestSlotKey, .source.mode'

# Pod health (expect bus-track-b 4/4)
KUBECONFIG=~/.kube/config-morefine kubectl get pods -n twfoundry-data
KUBECONFIG=~/.kube/config-morefine kubectl logs -n twfoundry-data deploy/bus-track-b -c scheduler --tail=20
KUBECONFIG=~/.kube/config-morefine kubectl logs -n twfoundry-data deploy/bus-track-b -c route-sentinel --tail=20
```

**If pods crash:** `KUBECONFIG=~/.kube/config-morefine kubectl rollout restart deploy/bus-track-b -n twfoundry-data` (Recreate strategy — old pod fully terminates first, no Multi-Attach). kafka-0 usually self-heals; if not, delete pod and wait for KRaft reformat (may need PVC delete for clean state).

**Redeploy after an image change:** images are `:latest`, `imagePullPolicy: Always` → push code, wait for CI green, then `kubectl rollout restart deploy/bus-track-b`.

### 2. CUTOVER — after 48h soak passes (~2026-06-24)

1. Stop Mac local daemon if still running (it shouldn't be — all runs on k0s now)
2. Switch public map to Track B: either change frontend to read `bus_vehicles_track_b` → `bus_vehicles`, OR publish Track B to `bus/projections/` prefix (same R2 bucket)
3. Retire Track A edge worker (`cloudflare/ingestor-worker/`) — disable the cron trigger
4. Update handoff + docs

### 3. Backlog (not blocking, pick up after cutover)

| Item | Notes |
|---|---|
| **P2 GitOps** | Bring twfoundry k8s under `~/repo/unknowntpo/infra` ArgoCD. `terraform import` the P1-made ns/secret. Fill `homelab/20-saas-k0s` with k0sctl (adopt morefine). |
| **Strimzi migration** | Replace raw kafka.yaml with Strimzi operator when Kafka becomes Flink backbone. Plan retention/HA. |
| **Avro for stream types + re-enable checkpointing** | The sentinel state types are Java `record`s → Flink falls back to **Kryo**, whose `FieldSerializer` can't `setAccessible`/get field offset on record fields → every checkpoint failed → restart-loop re-emitted the backlog (17.8M dup signals). Mitigated by disabling checkpointing (commit `596cf19`), but that drops state fault-tolerance. **Proper fix:** define the stream contract (`EnrichedBusVehicleObservation`, `BusRouteSignal`, `NormalizedBusVehiclePosition`) as **Avro** schemas (`.avsc` → generated SpecificRecord) so Flink uses `AvroSerializer` (checkpoint-safe, compact, cross-service, schema-evolution). Then set `BUS_SENTINEL_CHECKPOINT_INTERVAL_MS>0` to restore exactly-once state. Avro also unifies the Kafka contract shared by bus-ingestion → sentinel → signal-publisher (today ad-hoc JSON). Alternative if staying JVM-only: convert the types to real Flink POJOs (public mutable fields + no-arg ctor → `PojoSerializer`). |
| **Archiver cold-start retry** | `services/bus-lake-archiver/src/index.js` — add internal Kafka connection retry (currently relies on pod restart). |
| **Anomaly detection (speed layer)** | Design doc at `docs/architecture/anomaly-detection-algorithm.md`. Flink OR lightweight stateful consumer. Same algorithm either way. |
| **Flink + Iceberg batch layer** | Lambda arch: Airflow-orchestrated Iceberg lakehouse on R2 + ClickHouse OLAP. Design only. |
| **Reconcile automation** | `scripts/reconcile-once.sh` — schedule via Airflow DAG on homelab. |
| **`infra` repo tunnel doc** | `~/repo/unknowntpo/infra/master/homelab/cloudflare-tunnels.md` exists locally, not committed. |

---

## Two Tracks

```
TRACK A (production map — live, TO BE RETIRED)    TRACK B (homelab backbone — 24/7 on k0s)
──────────────────────────────────────────        ──────────────────────────────────────────
TDX → CF ingestor-worker (cron */5)                TDX → bus-ingestion → Kafka → archiver
    → R2 bus/projections/*                             → lake JSONL → bus-projection-publisher
    → Pages /api/projections/bus_vehicles              → R2 bus/projections-track-b/*
                                                       → Pages /api/projections/bus_vehicles_track_b
```

## Key Files

| Area | Path |
|---|---|
| k8s manifests | `k8s/{namespace,kafka,bus-ingestion,bus-track-b,kustomization}.yaml` |
| GHCR CI | `.github/workflows/build-track-b-images.yml` |
| Scheduler Dockerfile | `services/bus-track-b-scheduler/Dockerfile` |
| Track B scripts | `scripts/track-b-{cycle,daemon}.sh` |
| Ingestion | `services/bus-ingestion/` |
| Archiver | `services/bus-lake-archiver/` |
| Publisher | `services/bus-projection-publisher/` |
| R2 upload | `cloudflare/scripts/upload-bus-projections.mjs` |
| Anomaly detection design | `docs/architecture/anomaly-detection-algorithm.md` |
| k0s deploy plan | `docs/architecture/track-b-k0s-deployment-plan.md` |
| Architecture docs | `docs/architecture/*.md` |

## Known Bugs Fixed (don't reintroduce)

1. **KRaft voter deadlock:** `KAFKA_CONTROLLER_QUORUM_VOTERS` must use `1@localhost:29093`, NOT `1@kafka:29093` (headless DNS requires pod Ready, but pod needs quorum to be Ready).
2. **Scheduler missing frontend module:** Dockerfile must `COPY frontend/functions/_shared`, `.dockerignore` must un-ignore it.
3. **arm64 on amd64:** NEVER local `docker build` on arm Mac for this cluster. Always via CI (`.github/workflows/build-track-b-images.yml`).
4. **R2 token:** Must be the dedicated account-scoped token (Workers R2 Storage: Edit), NOT the tunnel/DNS token.
5. **Flink ClosureCleaner serialization (commits `97454fc`, `351ec64`):** the route-sentinel Flink job threw `NotSerializableException` at job-submit (NOT caught by unit tests, only at runtime). Three causes, all fixed: (a) lambdas captured a local `ObjectMapper` (JavaTimeModule holds a non-serializable `DateTimeFormatter`) and one used a bound method ref → made `MAPPER` a `static final` field referenced (not captured), no bound refs; (b) flatMap captured the `BusRouteSentinelConfig` record (not Serializable) → pass only the primitive `maxDistanceToRouteMeters`; (c) `BusRouteSentinelProcessor` (non-transient field of the function) didn't `implements Serializable` → added it. **Guard:** `BusRouteSentinelJobGraphTest` builds the graph in a local env so ClosureCleaner runs at test time — run `./gradlew :backend:streams:test` before any change to the job graph.

## Secret Locations (values NOT included)

| Secret | Location |
|---|---|
| TDX creds (k8s) | k8s secret `twfoundry-track-b-secrets` keys `TDX_CLIENT_ID`, `TDX_CLIENT_SECRET` |
| CF R2 token (k8s) | k8s secret `twfoundry-track-b-secrets` keys `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` |
| R2 token (local) | `~/.cloudflare/r2.env` |
| R2 S3 creds (local) | `~/.cloudflare/r2-s3.env` |
| TDX creds (local) | `backend/ingestion/.env` |
| Wrangler auth | OAuth as `e850506@gmail.com` |

## Cluster Access

- **LAN direct:** `KUBECONFIG=~/.kube/config-morefine kubectl ...` (server `192.168.1.114:6443`, real CA)
- **Off-LAN via SSH tunnel:** `ssh -L 6443:127.0.0.1:6443 morefinepublic` then `server: https://localhost:6443` + `insecure-skip-tls-verify`
- **Cloudflare tunnel `homelab_linux`:** provides SSH to morefine (systemd, auto-start on boot)

## Tests

```bash
cd services/bus-ingestion && npm test          # 7 tests
cd services/bus-lake-archiver && npm test      # 10 tests
cd services/bus-projection-publisher && npm test  # 3 tests
cd frontend && npm run test:cloudflare-pages   # projection function tests
```

## Security Notes

- Never commit or paste TDX credentials, Cloudflare tokens, or tunnel secrets.
- No secret values in k8s manifests — all via `secretKeyRef`/`envFrom` to `twfoundry-track-b-secrets`.
- Build images via CI only, never local docker build (arm64 trap).
