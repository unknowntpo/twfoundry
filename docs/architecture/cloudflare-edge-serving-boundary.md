# Cloudflare Edge Serving Boundary

Status: accepted design direction

Purpose: Define the public serving boundary for TWFoundry so the public product can be hosted on
Cloudflare without exposing the homelab data runtime or creating unbounded Cloudflare costs.

## Decision

Cloudflare is the public edge serving layer. Homelab is the data engineering runtime.

```text
Browser
  -> Cloudflare WAF / Bot controls / optional Access or Turnstile
  -> Cloudflare Pages static UI
  -> Cloudflare Pages Functions or Workers browser-facing API
  -> Cloudflare R2 materialized artifacts
```

```text
Homelab Airflow / Kafka / ClickHouse
  -> ingestion, backfill, OLAP, projection generation
  -> publish raw, normalized, projection, and analytics artifacts to R2
```

Public user traffic MUST NOT fall through to homelab when an R2 artifact is missing.

## Browser-Facing API

Routes such as `/api/projections/bus_vehicles` are browser-facing APIs used by the Vue frontend.
They are not intended as third-party integration APIs, but they are still reachable from the public
Internet if the product is public.

The frontend rendering happens in the browser:

```text
Cloudflare Pages
  -> serves HTML / JS / CSS
Browser
  -> runs Vue app
  -> calls /api/projections/*
Pages Function / Worker
  -> reads R2
  -> returns JSON
Browser
  -> updates map, timeline, and panels
```

Pages Functions and Workers SHOULD serve JSON contracts and light routing/auth logic. They SHOULD
NOT be treated as the primary data-processing runtime.

## R2 Miss Policy

R2 is the serving boundary for public product data.

```text
R2 has artifact
  -> return artifact
R2 missing artifact
  -> return product-level no_data / unavailable response
  -> do not call homelab synchronously
```

Recommended response shape:

```json
{
  "status": "no_data",
  "reason": "projection_not_available",
  "slot": "2026-05-20T09:55+08:00"
}
```

Missing data should be repaired by asynchronous ingestion, backfill, or projection publishing jobs.
It should not be repaired by a public request path.

## Homelab Boundary

Homelab owns:

- Airflow DAGs for scheduled ingestion, backfills, retries, and task dependencies
- Kafka as the streaming boundary
- ClickHouse for OLAP and historical analytics
- private projection generation and data-quality jobs

Cloudflare owns:

- Pages static UI
- Workers / Pages Functions for public edge APIs
- R2 for raw snapshots, historical archives, projection manifests, and published analytics
- WAF, bot controls, optional Access, optional Turnstile, and rate limiting

Cloudflare Workers may read materialized artifacts from R2. They SHOULD NOT proxy public traffic to
homelab by default.

## Bot And Cost Controls

The first public deployment should use these controls:

- Private demos SHOULD use Cloudflare Access with an explicit email allowlist.
- Public demos SHOULD use Turnstile before issuing an anonymous app session.
- Bot Fight Mode SHOULD be enabled for low-effort bot mitigation.
- WAF rate limiting SHOULD protect browser-facing `/api/*` routes.
- Workers SHOULD enforce a global usage budget before reading R2.
- Projection artifacts SHOULD be aggressively cached.
- R2 miss MUST return `no_data`; it MUST NOT trigger homelab fallback.

The global usage budget is a system-level cost guard, not a user-account system. It can be
implemented with a Durable Object counter.

Initial conservative budget targets:

```text
Workers requests: pause at 70k/day on a Free-plan demo
R2 Class B reads: pause at 7M/month
R2 Class A writes: pause at 500k/month
```

When the budget is exhausted, return:

```json
{
  "status": "service_paused",
  "reason": "free_tier_budget_reached"
}
```

## Relational Database Boundary

TWFoundry does not need a relational database for the first public product because it has no user
account, organization, or entitlement concept.

Add a relational control-plane database only when the product needs:

- users, organizations, or access entitlements
- API keys
- audit logs
- manual watchlists or annotations
- source/job metadata beyond artifact manifests
- feature flags
- billing or customer-specific configuration

Cloudflare D1 is the preferred Cloudflare-native option for a lightweight edge control plane. It
should not replace ClickHouse for OLAP or R2 for archival storage.

## Not In Scope For Current Resume Claims

Do not claim these as implemented production paths until they exist in the repo:

- Cloudflare Queues
- Cloudflare Pipelines
- Cloudflare Workflows as Airflow replacement
- Cloudflare Containers for business logic
- Cloudflare Waiting Room

These remain valid future options, but the current resume story should focus on:

```text
Homelab Airflow / Kafka / ClickHouse
  -> Cloudflare R2 artifacts
  -> Cloudflare Workers / Pages Functions
  -> Cloudflare Pages UI
```
