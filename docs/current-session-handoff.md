# TWFoundry — Session Handoff

_Updated 2026-07-01 (TPE). Provider-neutral. No secrets included._

## Repo / workspace
- Path: `/Users/unknowntpo/repo/unknowntpo/twfoundry/main` (branch `main`, **clean, in sync with origin**).
- Latest commits: `18cffc7` (remap+archive manifests), `78e41bc` (map-match on load), `36c8e3a` (watchlist unify), `84c7162` (daily by-date archive).
- Homelab kubeconfig: `~/.kube/config-morefine`, namespace `twfoundry-data`. ClickHouse passwordless via `kubectl exec statefulset/clickhouse -- clickhouse-client`.
- Prod frontend = Cloudflare Pages project `twfoundry` (twfoundry.pages.dev); staging = `twfoundry-poc`. **Deploy is manual**: `bun run build:prod && bunx wrangler pages deploy dist --project-name <proj>` (wrangler already authed locally).

## What just shipped (this session) — all deployed + verified
- **UNK-61 (DONE): batch map-match.** `infra/clickhouse/scripts/load-lake-observations.mjs` now map-matches every lake row via `buildRouteProgressObservation` (`frontend/src/busRouteGeometry.js`) against route-context geometry bundled into the batch image (`services/bus-batch-job/Dockerfile` + `.dockerignore`). Before this, `route_progress_ratio`/`distance_to_route_meters` were always null → `bunching.json` was 0 rows every day (the old "Critical service gap" cards were **05-20 demo-fixture artifacts**). Re-loaded 06-22..07-01 via `k8s/bus-batch-remap-job.yaml`: 100% map-matched. Result: prod rolling `/api/analytics/bus/bunching.json` = **500 rows**, by-date = **50/day** (was 0). Daily DAG map-matches going forward (same image).
- **Root-page watchlist unified** (`36c8e3a`): `OperationsExplorer.routeHealthWatchlist` now uses the shared `buildWatchlist` (busOversightData.js); cards are basic display + drill-down to `/bus-oversight?route=<name>`; console reads `?route=` on mount; top-bar 控制台 button demoted from `primary`.
- **Frontend deployed** to prod + staging with `build:prod` (analytics base `/api/analytics/bus`), so the 05-20 staleness is gone; rolling analytics serviceDate = current.
- Extensibility Judge on the map-match change: **PASS 95/100** (only gap: no loader-glue unit test; folded into UNK-62).

## Architecture facts worth keeping
- Lambda: SPEED (Flink Java `backend/streams`, live signals) + BATCH (lake → ClickHouse → R2 `/api/analytics/bus`, daily DAG `bus_service_health_daily` 03:30 TPE). Frontend merges via watermark in `busOversightData.js`.
- **map-match exists twice**: JS `busRouteGeometry.js` (batch) + Java `RouteGeometry.java` (Flink). Verified numerically identical (same `EARTH_RADIUS=6371008.8`, equirectangular local projection, haversine). No shared source → drift risk (guarded by planned UNK-62).
- Airflow DAG delivery: `airflow-dags` ConfigMap, **subPath mount** → must `rollout restart deploy/af-dag-processor` after editing (scheduler reads serialized DAGs from postgres, does NOT need restart). Auto-mode classifier blocks this shared-deployment restart even with chat auth — user must run it.
- **Do NOT use TDX historical API** (billed by GB, ~52 pts/GB; shared key blocks live on overage). Widen history via natural daily accumulation.

## Open Linear items (project twfoundry, team Unknowntpo)
- Milestone **M6 · Stability & Refactor**: UNK-50..58 (image SHA pinning, git-sync DAG, Pages CI, manifest drift, CronJob dup, lake-archiver offset loss, DAG alerting, TDX key guard, ClickHouse auth).
- **UNK-62** (M6): golden-vector test guarding JS⇄Java map-match parity — should also cover the new loader glue.
- **UNK-63** (M4): eval PyFlink unified stream+batch (single map-match/detection source).
- **UNK-59** (M6): root-page vehicle timeline still driven by frozen 05-20 fixture (`frontend/public/data/tdx-bus/archive/manifest.json`) — decide (a) wire to real lake/by-date, (b) default follow-live, (c) regenerate fixture. Frontend does NOT yet consume `by-date/` when dragging the timeline to past days.

## Recommended next actions (pick per user)
1. **Frontend consume `by-date/`** so dragging the timeline to a past day shows that day's real reliability/density/freshness/watchlist (data is now populated + permanent). Edit `busOversightData.js` / analytics fetch to load `analytics/bus/by-date/<date>/` for past days.
2. Or start **UNK-59** (vehicle timeline data source) — the last remaining "05-20" artifact.
3. Or knock out an M6 High: UNK-53 (manifest drift), UNK-55 (lake-archiver data loss), UNK-57 (TDX key guard).

## Verification status
- Batch map-match: **passed** (CH `route_progress_ratio` 100% non-null 06-22..07-01; prod bunching.json 500 rows; by-date 50/day).
- Frontend watchlist unify + drill-down: **passed** (preview: cards render, `?route=303區` preselects console detail).
- Tests: `cd frontend && bun run check && bun ./tests/run.mjs` → green. `node --check` on the loader → ok.
- One-shot Jobs `bus-batch-remap` / `bus-analytics-archive` are Completed in-cluster (harmless; delete when convenient).

## Unknowns
- Whether the daily DAG's next 03:30 run succeeds with the new image (not yet observed a scheduled run post-fix; the remap Job proved the code path).
- by-date single-day bunching is LIMIT 50/day by design; confirm that's the desired cap for the future frontend consumer.
