# Homelab OLAP Runtime

This is the first simple runtime for TWFoundry offline analytics.

It intentionally keeps Cloudflare and homelab responsibilities separate:

```text
Browser
  -> Cloudflare Pages
  -> Cloudflare Worker / Pages Function API
  -> Cloudflare R2 materialized artifacts

Homelab Airflow / Kafka / ClickHouse
  -> ingestion, backfill, analytics, projection publishing
  -> Cloudflare R2
```

## Runtime Split

| Layer | Runs on | Responsibility |
| --- | --- | --- |
| Frontend | Cloudflare Pages | Map, timeline, analytics panels |
| Public API | Cloudflare Workers / Pages Functions | Public edge API, auth, R2 reads, no homelab fallback |
| Archive | Cloudflare R2 | Raw snapshots, projections, manifests |
| Offline jobs | Homelab Airflow target | Scheduled ingestion, backfill, projection rebuilds, ClickHouse import |
| Streaming boundary | Homelab Kafka target | Durable event boundary for ingestion and replay |
| OLAP | Homelab ClickHouse | Route density, data freshness, bunching signals |
| Orchestration | Airflow target | DAG dependencies, retries, backfills, and service-day partitioning |

## Airflow Direction

Airflow is the intended orchestration layer for the final homelab pipeline.

Current scripts remain useful as Airflow task implementations:

```text
fetch source data
  -> publish raw / normalized artifacts
  -> rebuild projections
  -> import ClickHouse
  -> publish analytics artifacts to R2 / Pages assets
```

Cron/systemd or one-off scripts may be used for local development, but they should not be described
as the final orchestration model.

## Start Locally Or On Homelab

From repo root:

```bash
docker compose -f infra/homelab/docker-compose.yml up -d clickhouse analytics-api
```

Default local ClickHouse credentials are defined in `infra/homelab/.env.example`:

```text
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=twfoundry_dev
```

Import the current archived projection data:

```bash
bun infra/homelab/scripts/import-bus-observations.mjs
```

Import from R2-backed projections:

```bash
bun infra/homelab/scripts/download-bus-projections-from-r2.mjs
bun infra/homelab/scripts/import-bus-observations.mjs \
  --projection-root infra/homelab/staging/bus-projections
```

For a quick smoke test, limit the R2 download:

```bash
bun infra/homelab/scripts/download-bus-projections-from-r2.mjs --limit 2
bun infra/homelab/scripts/import-bus-observations.mjs \
  --projection-root infra/homelab/staging/bus-projections
```

The R2 path downloads `bus/projections/manifest.json` and every `projectionPath` listed in that manifest. Route context is still read from the repo-local `frontend/public/data/tdx-bus/route-context` files.

Query:

```bash
curl "http://127.0.0.1:8080/health"
curl "http://127.0.0.1:8080/analytics/bus/route-density?service_date=2026-05-20&limit=10"
curl "http://127.0.0.1:8080/analytics/bus/data-freshness?service_date=2026-05-20&limit=10"
curl "http://127.0.0.1:8080/analytics/bus/bunching?service_date=2026-05-20&limit=10"
```

## Publish Public Analytics Snapshot

For the current public milestone, analytics are published as static JSON files
served by Cloudflare Pages:

```text
ClickHouse -> frontend/public/data/analytics/bus/*.json -> Cloudflare Pages
```

Run after importing observations:

```bash
cd frontend
bun run publish:clickhouse-bus-analytics -- --service-date 2026-05-20 --limit 50
```

The publisher writes:

```text
public/data/analytics/bus/manifest.json
public/data/analytics/bus/route-density.json
public/data/analytics/bus/data-freshness.json
public/data/analytics/bus/bunching.json
```

This keeps the homelab private. The public frontend reads the static JSON from the same Pages
hostname.

Public user traffic should not proxy to homelab on cache miss or artifact miss. If a requested
analytics artifact is missing, the edge API should return `no_data` and wait for the homelab
pipeline to publish the missing artifact asynchronously.

## Cloudflare Tunnel

For local/homelab private exposure, create a Cloudflare tunnel that routes a hostname to:

```text
http://analytics-api:8080
```

With a token-based tunnel:

```bash
CLOUDFLARE_TUNNEL_TOKEN=... \
docker compose -f infra/homelab/docker-compose.yml --profile tunnel up -d
```

The frontend should still call the Cloudflare Worker / Pages Function, not the homelab host
directly. A Worker/Tunnel proxy may be used for private operator workflows, but it should not be the
default public serving path.

Public serving boundary details are defined in
`docs/architecture/cloudflare-edge-serving-boundary.md`.

## Infra Repo Reuse

`~/repo/unknowntpo/infra` already defines the long-term homelab model:

- `homelab/20-saas-k0s` and `30-saas-platform` are for long-lived services.
- `homelab/40-edge-cloudflare` owns tunnel/access concerns.

This repo-local compose is the simplest development runtime. If it becomes long-lived production infrastructure, promote it into the infra repo as a homelab SaaS stack.
