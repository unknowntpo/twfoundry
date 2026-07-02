# Deployment Ledger

The single glance at **what is running where, and when it got there** — until GitOps (ArgoCD)
makes git the source of truth (see [UNK-51](https://linear.app/unknowntpo/issue/UNK-51)).

Nothing here auto-deploys: a `git push` only builds images and runs CI. Cluster applies,
scheduler restarts, image rollouts, Pages deploys, and R2 writes are **manual, per-action,
owner-approved** steps. Whenever you perform one, add a row to the Deploy Log below.

Last reviewed: **2026-06-30**

---

## Environments

| Env | Where | Deploy method | Notes |
|---|---|---|---|
| **prod frontend** | Cloudflare Pages project `twfoundry` → `twfoundry.pages.dev` | manual `wrangler` (`build:prod`) | **No git auto-deploy.** Tracked: [UNK-52](https://linear.app/unknowntpo/issue/UNK-52) |
| **staging frontend** | Cloudflare Pages project `twfoundry-poc` | manual `wrangler` | |
| **prod data plane** | morefine single-node k0s, namespace `twfoundry-data` | `kubectl apply` / CI image build + rollout | kubeconfig `~/.kube/config-morefine` |
| **object store** | Cloudflare R2 bucket `twfoundry-poc-archive` | batch job uploads via `wrangler` | serves `/api/analytics/bus/*` |

## What is running now (data plane, ns `twfoundry-data`)

| Component | Image / source | Role | Notes |
|---|---|---|---|
| `bus-ingestion` | `ghcr.io/.../bus-ingestion:latest` | live TDX poller → Kafka | 5-min slots |
| `bus-track-b` | `ghcr.io/.../*:latest` | Flink route-sentinel + lake archiver | speed layer + `/lake/<date>.jsonl` |
| `af-scheduler` / `af-dag-processor` / `af-triggerer` / `af-api-server` | Airflow 3.2.2 (Helm release `af`) | batch orchestration | KubernetesExecutor |
| `clickhouse` (sts) | ClickHouse | batch OLAP store | `bus_vehicle_observations`, no TTL, **passwordless** (UNK-58) |
| `kafka` (sts) | Kafka | event bus | `normalized.tdx.bus_vehicle_position` |
| `bus-batch-job` | `ghcr.io/.../bus-batch-job:latest` | daily roll-up + publish + archive | run by DAG `bus_service_health_daily` (03:30 TPE) |
| `bus-batch-daily` (CronJob) | same image | legacy daily path | **SUSPENDED** (rollback only, UNK-54) |

## DAG delivery (Airflow)

DAGs come from the `airflow-dags` ConfigMap (subPath mount). To deploy a DAG change:
re-create the ConfigMap from `airflow/dags/<file>.py`, then `rollout restart deploy/af-dag-processor`
(scheduler does NOT need restart). Verify with `airflow dags list-import-errors` → "No data found".
Full procedure in the `airflow-homelab-access` memory.

## R2 analytics state

| Prefix | Content | Last verified |
|---|---|---|
| `analytics/bus/` | rolling "latest" snapshot, overwritten daily | `serviceDate=2026-06-29` |
| `analytics/bus/by-date/<date>/` | immutable per-day archive (permanent history) | `2026-06-22`..`2026-06-27` backfilled |

## ⚠️ Known prod/source drift (2026-06-30)

- **prod frontend is a STALE build**: the deployed Pages bundle predates `build:prod` (commit 4127654),
  so the live site reads the frozen `2026-05-20` demo fixtures (map vehicle timeline +
  `/data/analytics`) instead of fresh R2. Backend R2 is fresh (06-29); the frontend just hasn't been
  redeployed. Fix = rebuild `build:prod` + `wrangler` deploy. Map vehicle playback also still points at
  the static `2026-05-20` archive fixture and needs wiring to real data.

---

## Deploy Log

Newest first. One row per shared/prod mutation.

| Date (TPE) | Action | Target | Ref | Verified |
|---|---|---|---|---|
| 2026-06-30 | Deploy DAG (add per-date archive step) + restart dag-processor | Airflow `bus_service_health_daily` | commit `84c7162` | `list-import-errors` clean ✅ |
| 2026-06-30 | One-shot archive backfill Job | R2 `analytics/bus/by-date/2026-06-22..27/` | `k8s/bus-analytics-archive-job.yaml` | prod API 200, single-day rows ✅ |
| 2026-06-30 | CI image rebuild (batch detection-rule contract+lib fix) | `bus-batch-job:latest` | commit `09405bb` | in-image import test ✅ |
