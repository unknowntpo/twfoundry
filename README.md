# TWFoundry

Taiwan public-data operations dashboard for live transit monitoring, map overlays, and data-quality analytics.

[Live demo](https://twfoundry-poc.pages.dev) · [Bus operations dashboard](https://twfoundry-poc.pages.dev/bus-oversight) · [System contract](SPEC.md)

## What It Does

TWFoundry turns public mobility feeds into operational map products:

- Live Taipei bus map backed by real TDX data, not fixtures.
- Bus operations dashboard for route density, data freshness, service gaps, and bunching signals.
- Cloudflare Pages + Pages Functions public frontend with R2-backed data artifacts.
- Homelab data runtime with Kafka, Airflow, ClickHouse, and Kubernetes for ingestion, batch analytics, and backfills.
- Contract-first architecture that keeps raw source schemas, normalized observations, product projections, and UI rendering separate.

## Architecture

```text
TDX public transit APIs
  -> source adapters / ingestion workers
  -> Kafka normalized events
  -> lake archive + ClickHouse analytics
  -> Airflow batch orchestration
  -> Cloudflare R2 materialized artifacts
  -> Cloudflare Pages Functions
  -> Vue / MapLibre operations UI
```

The public site is served from Cloudflare. The private homelab runtime produces and publishes materialized data, so public requests do not hit the homelab directly.

## Current Status

| Area | Status |
|---|---|
| Public demo | Live at `twfoundry-poc.pages.dev` |
| Live bus projections | Production path through Cloudflare R2 + Pages Functions |
| Bus dashboard | Live route/service analytics view |
| Batch analytics | Airflow DAG + ClickHouse rolling dataset |
| Stream backbone | Kafka-based normalized bus events |
| Product contract | `SPEC.md` + architecture docs |

## Tech Stack

- Frontend: Vue 3, Vite, MapLibre GL, deck.gl, Three.js
- Edge serving: Cloudflare Pages, Pages Functions, R2
- Data pipeline: Kafka, Airflow, ClickHouse, Kubernetes/k0s
- Data contracts: normalized observation schemas, projection manifests, OpenSpec/Spectra docs
- Tooling: Bun, Playwright, Wrangler

## Key Links

- [Live demo](https://twfoundry-poc.pages.dev)
- [Bus operations dashboard](https://twfoundry-poc.pages.dev/bus-oversight)
- [Cloudflare edge serving boundary](docs/architecture/cloudflare-edge-serving-boundary.md)
- [Bus pipeline milestones](docs/architecture/bus-pipeline-e2e-milestones.md)
- [Normalized bus event contract](docs/architecture/normalized-bus-vehicle-position-v1.md)
- [Batch stack runbook](docs/m5-batch-stack-runbook.md)

## Run Locally

```bash
cd frontend
bun install
bun run dev
```

Use remote production APIs while developing locally:

```bash
cd frontend
bun run dev:remote
```

## Design Principles

- Normalize public source data before it reaches product UI.
- Treat map overlays as product projections, not renderer-specific demos.
- Keep source adapters, ontology contracts, projections, renderers, and diagnostics separate.
- Prefer replayable materialized artifacts over live public requests into private infrastructure.

## Repository Notes

The normative product/system contract lives in [SPEC.md](SPEC.md). Architecture notes and runbooks live under [docs/](docs/), and implementation change proposals live under [openspec/](openspec/).
