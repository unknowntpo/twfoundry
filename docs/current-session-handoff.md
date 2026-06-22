# Current Session Handoff

Date: 2026-06-22  
Mode: **Producer handoff** — for Codex or next agent to continue.

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

### 1. Confirm real anomaly signals emit (data-dependent, FIRST thing to check)

The speed layer is deployed and consuming, but `status` is still `waiting_for_flink` (0 signals). Verify the sentinel actually emits when a real service-gap/bunching occurs:
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
