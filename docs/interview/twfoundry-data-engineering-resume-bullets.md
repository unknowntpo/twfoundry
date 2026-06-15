# TWFoundry Data Engineering Resume Bullets

Status: draft for resume integration

Target role: Data Engineer / Data Infrastructure Engineer

## Positioning

TWFoundry should be presented as a hybrid cloud / homelab data platform, not as a frontend map demo.

Core story:

```text
Homelab Airflow / Kafka / ClickHouse
  -> ingestion, backfill, OLAP, data quality
  -> Cloudflare R2 materialized artifacts
  -> Cloudflare Workers / Pages Functions edge APIs
  -> Cloudflare Pages product UI
```

Do not mention Redpanda in the resume. Use Kafka.

Do not claim Cloudflare Queues, Pipelines, Workflows, Containers, or Waiting Room as implemented
production paths until they are actually in the repo.

## Recommended Resume Entry

```tex
\begin{rSubsection}{TWFoundry}{2026}{Hybrid cloud / homelab Taiwan operations data platform. Tech Stack: {\color{teal}\textbf{Airflow, Kafka, ClickHouse, Cloudflare R2, Workers/Pages, Docker, TypeScript}}}{{\color{teal}\underline{\href{https://github.com/unknowntpo/twfoundry}{GitHub}}}}
    \item Designed a hybrid cloud / homelab data platform for Taiwan operations, using homelab Airflow and Kafka for scheduled ingestion and backfills, Cloudflare R2 for raw and projection artifact storage, ClickHouse for OLAP analytics, and Cloudflare Workers / Pages for public edge APIs and UI delivery.
    \item Built a materialized edge serving model where Workers / Pages Functions read partitioned R2 artifacts and expose replayable map/timeline projection APIs without falling back to homelab on cache misses.
    \item Modeled TDX transit observations in ClickHouse across service date, time slot, route, direction, vehicle, freshness, route progress, and stop context to support route density, data-quality, and headway / bunching analysis.
\end{rSubsection}
```

## If Space Allows

Use one of these as a fourth bullet only if the resume has room:

```text
Defined product-facing projection contracts that decouple UI rendering from raw source schemas,
storage engines, and internal engineering labels.
```

```text
Added data-quality and cost-control boundaries for freshness, completeness, route geometry
confidence, R2 missing artifacts, bot traffic, and free-tier usage budgets.
```

## Interview Talking Points

### Hybrid Boundary

Cloudflare is the public serving layer. Homelab is the data engineering runtime.

This allows the public demo to stay cheap and cache-friendly while keeping Airflow, Kafka, and
ClickHouse private.

### R2 Artifact Boundary

R2 stores materialized artifacts:

- raw snapshots
- historical archives
- projection manifests
- replayable map/timeline projections
- published analytics snapshots

If an artifact is missing, the edge API returns `no_data`. It does not call homelab synchronously.

### Cost Control

The public edge path should avoid unbounded Cloudflare charges by using:

- Cloudflare Access for private demos
- Turnstile for public anonymous session issuance
- Bot Fight Mode
- WAF rate limiting on browser-facing `/api/*`
- a Durable Object global budget limiter before R2 reads
- aggressive cache headers for immutable projection artifacts

### Data Engineering Value

This project demonstrates:

- scheduled ingestion and backfill design
- streaming boundary design with Kafka
- object-storage artifact layout with R2
- OLAP modeling in ClickHouse
- materialized projection serving
- data-quality gates and evidence boundaries
- edge / homelab cost isolation
