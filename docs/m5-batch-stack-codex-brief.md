# M5 Batch Stack — Homelab Deployment Brief (Codex task)

> Self-contained brief for an agent starting **cold**. Goal: stand up the batch
> (historical-aggregation) half of TWFoundry's Lambda architecture on the homelab
> k0s cluster so the bus oversight dashboard's timeline shows **current** batch
> data, on top of which the already-built **watermark merge** stitches the live
> Flink edge. Today the dashboard's batch metrics are a **frozen 2026-05-20
> static snapshot**.

---

## 0. Definition of done

1. A daily batch job runs on the homelab cluster: lake JSONL → ClickHouse → publish service-health dataset → upload to R2 under `analytics/bus/`.
2. The dataset is served to the dashboard (Pages function reading R2) and the dashboard build points at it via `VITE_TWFOUNDRY_ANALYTICS_BASE`.
3. On `https://twfoundry-poc.pages.dev/bus-oversight` the 7-day timeline shows a **recent** service day (not 2026-05-20), and because batch is now current, the **watermark merge** activates: solid batch bars + dashed "LIVE →" divider + hatched provisional Flink bars on the live edge.
4. The live Flink speed layer (`bus-track-b` pod) is **untouched and still healthy** throughout.

---

## 1. Environment & access

- **Repo**: `/Users/unknowntpo/repo/unknowntpo/twfoundry/main`
  - `main` branch has all M5 frontend + scripts merged.
  - `m5-watermark-merge` branch (pushed, not merged) has the watermark-merge timeline UI. **Merge + deploy this first** (see §6, step 1) — it's prod-safe (batch-only fallback until batch is current).
- **Cluster**: `morefine-m9`, single-node k0s v1.34.3. `export KUBECONFIG=~/.kube/config-morefine`. Namespace `twfoundry-data`. Off-LAN: Cloudflare tunnel `homelab_linux` (SSH) or `ssh -L 6443:127.0.0.1:6443 morefinepublic`.
- **R2**: bucket `twfoundry-poc-archive`. Account-scoped token (Workers R2 Storage: Edit) at `~/.cloudflare/r2.env`; k8s secret `twfoundry-track-b-secrets` already holds `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`. Wrangler OAuth as `e850506@gmail.com`.
- **Cloudflare Pages**: project `twfoundry-poc`, deploy = `cd frontend && bun run build && bunx wrangler pages deploy --commit-dirty=true` (config in `frontend/wrangler.toml`, output `./dist`, R2 binding `BUS_PROJECTION_BUCKET`). Pages Functions live in `frontend/functions/`. **No auto-deploy on push — deploys are manual.**
- **Local ClickHouse** (laptop, for dev/verification only): `infra/clickhouse/docker-compose.yml`, default user `twfoundry` / `default`, password `twfoundry_dev`, db `twfoundry`, `http://127.0.0.1:8123`.

## 2. CRITICAL cluster facts (verified 2026-06-24)

- **Homelab has NO ClickHouse and NO Airflow.** Full pod list in `twfoundry-data`: `kafka-0`, `bus-ingestion`, `bus-track-b` (4 containers: archiver/scheduler/route-sentinel/signal-publisher), `redpanda-console`. Nothing else cluster-wide except kube-system + local-path-storage. **Both must be deployed from scratch.**
- **Single modest node** already running the live Flink speed layer. The earlier "death spiral" (17.8M dup signals) shows it's fragile. **Resource-cap everything you add; schedule off-peak; never edit/restart the `bus-track-b` pod.**
- **amd64 only**: NEVER `docker build` locally on the arm Mac for this cluster. Build images via CI (`.github/workflows/build-track-b-images.yml` pattern) → GHCR → `kubectl rollout`.
- Storage: `local-path-provisioner` (RWO PVCs).

## 3. What already exists (built + verified locally, on `main`)

| Piece | Path | Status |
|---|---|---|
| ClickHouse schema + aggregate SQL | `infra/clickhouse/sql/{schema,route_vehicle_density,route_data_freshness,route_bunching_signal}.sql` | ✅ used locally |
| Lake → ClickHouse loader (idempotent per `service_date`) | `infra/clickhouse/scripts/load-lake-observations.mjs` | ✅ verified (06-21 = 23,195 rows) |
| Publisher (`--lookback-days`, `--source`, multi-day) | `frontend/scripts/publish-clickhouse-bus-analytics.mjs` | ✅ verified |
| Local orchestration (load→publish) | `infra/clickhouse/scripts/run-bus-service-health-pipeline.mjs` | ✅ verified |
| R2 upload | `infra/clickhouse/scripts/upload-bus-analytics.mjs` | ✅ dry-run verified |
| Airflow DAG (chains the above) | `airflow/dags/bus_service_health_daily.py` | ⚠️ written, NOT deployed |
| Frontend env-switch | `frontend/src/BusOversightDashboard.vue` (`VITE_TWFOUNDRY_ANALYTICS_BASE`) | ✅ default = static fallback |
| Watermark merge (speed+batch on timeline) | `frontend/src/busOversightData.js`, branch `m5-watermark-merge` | ✅ verified local; prod-safe (stale→batch-only) |
| Status / pending notes | `infra/clickhouse/README.md` | reference |
| Design/spec | `openspec/changes/batch-analytics-layer/` | reference |

**Lake data**: `bus-track-b`'s archiver container writes lake JSONL. Locally `data/lake/2026-06-19/20/21.jsonl` exist (schema `twfoundry.normalized.tdx.bus_vehicle_position.v1`, fields incl. `slot_key`, `service_date`, `vehicle_id`, `route_uid`, `route_name`, `direction`, `longitude`, `latitude`, `speed_kph`, `gps_time`, `update_time`, `freshness`, `completeness`). **On the cluster, find where the archiver persists lake JSONL** (which container/PVC/path) — Codex must inspect `k8s/bus-track-b.yaml` + the archiver source `services/bus-lake-archiver/`.

## 4. Target architecture on homelab

```
TDX → bus-ingestion → Kafka(normalized.tdx.bus_vehicle_position)
   → bus-track-b archiver → lake JSONL (PVC)        [EXISTS]
   → [NEW] daily job: load-lake-observations → ClickHouse(homelab) [NEW]
   → [NEW] publish-clickhouse-bus-analytics → dataset JSON
   → [NEW] upload-bus-analytics → R2 analytics/bus/*
   → [NEW] Pages function /api/analytics/bus/* reads R2
   → dashboard (VITE_TWFOUNDRY_ANALYTICS_BASE=/api/analytics/bus)
   → watermark merge stitches live Flink edge (already built)
```

## 5. ⚠️ Two key design decisions (resolve before building)

### D1 — Airflow vs k8s CronJob
Full Airflow (scheduler + webserver + metadata DB) is **heavy for this single node** and risks the speed layer. The DAG is just `load → publish → upload` BashOperators. **Strong recommendation: implement as a k8s `CronJob`** running the orchestration + upload scripts inside a small Node+Bun image (built via CI), instead of standing up Airflow. This satisfies UNK-36's intent with a fraction of the footprint. Confirm this choice with the user before building Airflow. (If Airflow is required for other reasons, deploy the official Helm chart with `LocalExecutor`, resource-capped, single replica.)

### D2 — How the dashboard reads the rolling dataset (serving path)
The dashboard's `analyticsUrl(file)` = `VITE_TWFOUNDRY_ANALYTICS_BASE ? \`${BASE}/${file}\` : \`/data/analytics/bus/${file}\``. To serve rolling R2 data: **add a Pages Function** `frontend/functions/api/analytics/bus/[[path]].js` that reads the R2 binding `BUS_PROJECTION_BUCKET` at key `analytics/bus/<file>` (mirror the existing `frontend/functions/api/online/bus-route-signals` function), then build the frontend with `VITE_TWFOUNDRY_ANALYTICS_BASE=/api/analytics/bus`. RECOMMENDED (same-origin, cacheable). Keep the static `/data/analytics/bus/*` as the offline fallback (the env-switch already does this).

## 6. Step-by-step plan

### Step 1 — (Claude/Eric, not Codex) merge + deploy the watermark UI
- Merge `m5-watermark-merge` → `main`, then `cd frontend && bun run build && bunx wrangler pages deploy --commit-dirty=true`. Prod-safe; lights up automatically once batch is current.

### Step 2 — ClickHouse on homelab
- Manifests in `k8s/clickhouse.yaml` (or `infra/clickhouse/k8s/`): single-replica StatefulSet, RWO PVC, **resource limits** (e.g. `max_server_memory_usage` capped, requests/limits memory ~1–2Gi — measure node headroom first with `kubectl top node`). Service `clickhouse:8123` in `twfoundry-data`.
- Apply DDL from `infra/clickhouse/sql/schema.sql` (+ the 3 aggregate `.sql` are queries used by the publisher, not DDL).
- Verify: `kubectl exec` a `SELECT 1`.

### Step 3 — daily batch job (CronJob, per D1)
- Build a small image (Node 20 + Bun) containing the repo's `infra/clickhouse/scripts/*` + `frontend/scripts/publish-clickhouse-bus-analytics.mjs` + the lake access. Build via CI (amd64) → GHCR.
- CronJob (daily, off-peak, resource-capped) runs `run-bus-service-health-pipeline.mjs --service-date <yesterday> --lookback-days 7 --output-root /out` then `upload-bus-analytics.mjs --input-root /out --prefix analytics/bus`.
- Env: `CLICKHOUSE_URL=http://clickhouse:8123`, creds; R2 via `twfoundry-track-b-secrets` + wrangler (or S3 API to R2). Lake: mount the archiver's lake PVC read-only, or read lake from R2 if the archiver also uploads there (check).
- **Backfill** the recent service days once (manual Job over a date range) so the 7-day timeline has history.

### Step 4 — serving + cutover (per D2)
- Add the Pages Function reading R2; build frontend with `VITE_TWFOUNDRY_ANALYTICS_BASE=/api/analytics/bus`; deploy.
- Confirm `https://twfoundry-poc.pages.dev/api/analytics/bus/manifest.json` returns the rolling manifest (recent `serviceDate`, `source: clickhouse-rolling`, non-null `generatedAt`).

### Step 5 — verify end-to-end
- Dashboard timeline shows a recent service day; watermark merge active (provisional bars on the live edge); `bus-track-b` still 4/4 Running 0 restarts; node not under memory pressure.
- Update Linear UNK-34/35/36 and `infra/clickhouse/README.md` status table.

## 7. Guardrails (do NOT)
- Do not `docker build` locally for the cluster (arm→amd64 exec-format error). CI only.
- Do not edit/restart/scale the `bus-track-b` pod or kafka-0.
- Do not commit secrets. R2 token = account-scoped; reuse `twfoundry-track-b-secrets`.
- Do not flip the prod dashboard to the rolling source until the rolling R2 dataset is confirmed good (the env-switch + static fallback make this reversible — revert the build env to roll back).
- Cap memory on ClickHouse + the job so the speed layer never OOMs.

## 8. Verification commands (reference)
```bash
export KUBECONFIG=~/.kube/config-morefine
kubectl get pods -n twfoundry-data
kubectl top node                              # headroom before adding ClickHouse
# after deploy:
curl -s https://twfoundry-poc.pages.dev/api/analytics/bus/manifest.json | jq '{serviceDate,source,generatedAt}'
curl -s 'https://twfoundry-poc.pages.dev/api/online/bus-route-signals?limit=1' | jq '.status'  # speed layer still ok
```

## 9. Linear
M5 milestone: **UNK-34** (Iceberg lakehouse — separate/optional; current path is lake→CH direct), **UNK-35** (ClickHouse OLAP — In Progress), **UNK-36** (Airflow/orchestration — In Progress; CronJob alternative per D1), **UNK-37** (watermark merge — frontend done on `m5-watermark-merge`, the serving-layer rule-sharing is satisfied since speed reuses the batch headway rule). Update these as steps land.
