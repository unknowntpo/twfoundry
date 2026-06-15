# TWFoundry 島嶼級營運平台產品願景

Status: Draft

Purpose: Capture the intended final product shape, user workflow, engineering architecture, and
resume narrative for TWFoundry.

This document is product narrative. `SPEC.md` remains the normative product and architecture
contract when the two documents conflict.

## 1. Product Positioning

TWFoundry is not only a public transit operations dashboard.

TWFoundry is a Taiwan island operations platform: a map-first data operating system for authorized
government, defense, public-safety, and public-service users to observe Taiwan's real-time and
historical state, understand operational changes, and coordinate responses.

Public transit is the first concrete vertical because it has:

- live public feeds
- route and station topology
- high update frequency
- clear spatial and temporal behavior
- immediate user-facing value

The long-term product direction is broader: integrate mobility, weather, air quality, water,
energy, incidents, infrastructure, and other public or authorized operational datasets into one
coherent island-level operating picture.

## 2. Target Users

Primary users:

- government operations centers
- public transportation agencies
- emergency response and public-safety teams
- defense-adjacent situational awareness teams
- public infrastructure and city operations teams

The product should help these users answer:

- What is happening now?
- Where is it happening?
- How did it change over time?
- Which objects, routes, regions, or services are affected?
- What evidence supports this view?
- What should be monitored next?

The product should not expose raw engineering terms, source-specific API names, or debug language
in primary workflows.

## 3. Final Product Experience

The core experience is a map-first operations dashboard.

### 3.1 Default Dashboard

The user starts from a Taiwan map with operational overlays. The map is the main workspace, not a
decorative background.

Expected surfaces:

- island-level map
- domain overlay controls
- watchlists for routes, regions, facilities, or incidents
- timeline / replay control
- selected-object inspector
- concise freshness and data-quality status
- separated diagnostics surface for advanced users

### 3.2 Route-Level Transit Flow

Transit is the first vertical workflow.

User flow:

1. User opens the operations dashboard.
2. User selects a route from the watchlist, such as route `307`.
3. Dashboard enters route detail mode.
4. Route detail shows a simplified geographic route map with stops, road shape, endpoints, vehicle
   positions, and route operator information.
5. User moves the timeline to inspect vehicle positions at a specific time.
6. User replays a time window to understand how the route changed over time.
7. User selects a vehicle or stop.
8. Inspector shows user-facing facts: current location, nearest stop, direction, observed time,
   source freshness, and evidence.
9. If evidence is insufficient, the UI states the scope clearly, such as `目前只呈現位置，不判斷延遲`.

The UI must not show engineering labels such as `direction = 0`, `direction = 1`, `StopOfRoute`, or
`RouteUID` in the primary flow.

### 3.3 Island-Level Flow

After the transit vertical matures, the same workflow should extend to broader island operations.

User flow:

1. User opens the island operations dashboard.
2. User chooses an operational domain: mobility, weather, air quality, water, infrastructure, or
   incidents.
3. User filters by region, route, facility, event type, or time range.
4. Map overlays show current operational state.
5. Timeline replay shows how the situation evolved.
6. User selects an object or region.
7. Inspector explains what is known, what changed, what source supports it, and what data is stale
   or missing.
8. The system highlights watchlist items that need attention without overstating unsupported
   conclusions.

## 4. Product Principles

### 4.1 User-Facing First

Every product surface, including prototypes and POCs, must be written for the target user.

Developer-facing explanations belong in documentation, diagnostics, or hidden advanced views. They
must not be mixed into the primary product workflow.

### 4.2 Evidence Before Inference

The platform should show observations and evidence before making derived claims.

For example, vehicle position and route progress can be shown before delay detection exists. Delay
claims require schedule or baseline evidence, confidence, and data-quality checks.

### 4.3 Map-First, Timeline-Aware

Operational state is spatial and temporal.

The map answers where. The timeline answers when. The inspector answers what this selected object
means. Watchlists answer what the user should monitor.

### 4.4 One Product, Many Domains

Transit, weather, air quality, water, infrastructure, and incidents should share the same product
architecture:

- source adapters
- normalized observations
- ontology objects
- product projections
- map overlays
- selected-object inspectors
- observability and diagnostics

Each domain may have its own data model, but the product should not become a set of unrelated
dashboards.

## 5. Engineering Architecture

TWFoundry should be organized as layered architecture.

### 5.1 Source Adapter Layer

Responsibilities:

- ingest external and internal data sources
- handle credentials, rate limits, pagination, retries, and fallback fixtures
- preserve raw source references
- keep source-specific schema details out of product UI

Example sources:

- TDX transit feeds
- route and station topology
- weather observations and alerts
- air-quality feeds
- water-level and rainfall sensors
- public incidents or infrastructure events
- future authorized operational datasets

### 5.2 Normalization Layer

Responsibilities:

- convert source payloads into stable observations
- attach timestamps, geometry, source, confidence, and freshness metadata
- prevent product UI from rendering raw source rows directly

Example observation profiles:

- `VehicleObservation`
- `RouteProgressObservation`
- `WeatherObservation`
- `AirQualityObservation`
- `WaterLevelObservation`
- `IncidentObservation`

### 5.3 Ontology Runtime

Responsibilities:

- maintain stable product objects
- connect observations to routes, stops, vehicles, regions, facilities, operators, and incidents
- preserve object identity across sources, overlays, and renderers

Example ontology objects:

- route
- stop
- vehicle observation subject
- operator
- station
- sensor
- region
- facility
- incident

### 5.4 Projection Builder

Responsibilities:

- transform ontology objects and observations into product-facing projections
- prepare map overlays, timeline frames, watchlist summaries, and inspector payloads
- translate engineering fields into user-facing language
- attach evidence, freshness, and confidence

Examples:

- route vehicle positions over time
- stop sequence and route geometry
- region-level operational summary
- incident impact area
- sensor freshness summary

### 5.5 Product UI Layer

Responsibilities:

- render the map-first dashboard
- provide overlay controls, watchlists, timeline replay, and object inspectors
- keep copy user-facing
- use Figma / FigJam for flow definition, not as a parallel screen-design source of truth

Core screens:

- island operations dashboard
- route detail
- timeline replay
- selected-object inspector
- diagnostics / data-quality panel

### 5.6 Observability and Diagnostics Layer

Responsibilities:

- expose source freshness
- expose missing or partial overlays
- record fallback mode
- show geometry quality and projection confidence
- support debugging without leaking debug terms into primary product UI

## 6. Resume Narrative

Strong one-line version:

> Built TWFoundry, a hybrid cloud / homelab Taiwan operations data platform that turns public-data
> feeds into R2-backed historical artifacts, ClickHouse analytics, and replayable map/timeline
> projections.

Expanded version:

> Designed a hybrid data engineering architecture where homelab Airflow, Kafka, and ClickHouse own
> ingestion, backfills, and OLAP analytics, while Cloudflare R2 stores raw and projected artifacts
> and Cloudflare Workers / Pages Functions expose cache-friendly edge APIs for the public product
> UI. The first vertical integrates TDX transit feeds into route-level timeline replay, route
> context, operator metadata, data-quality metrics, and headway / bunching analysis.

Resume bullets:

- Designed a hybrid cloud / homelab data platform for Taiwan operations, using homelab Airflow and
  Kafka for scheduled ingestion and backfills, Cloudflare R2 for raw and projection artifact
  storage, ClickHouse for OLAP analytics, and Cloudflare Workers / Pages for public edge APIs and
  UI delivery.
- Built a materialized edge serving model where Workers / Pages Functions read partitioned R2
  artifacts and expose replayable map/timeline projection APIs without falling back to homelab on
  cache misses.
- Modeled TDX transit observations in ClickHouse across service date, time slot, route, direction,
  vehicle, freshness, route progress, and stop context to support route density, data-quality, and
  headway / bunching analysis.
- Defined product-facing projection contracts that decouple UI rendering from raw source schemas,
  storage engines, and internal engineering labels.
- Added data-quality and cost-control boundaries for freshness, completeness, route geometry
  confidence, R2 missing artifacts, bot traffic, and free-tier usage budgets.

Do not claim in the resume unless implemented:

- Cloudflare Queues or Pipelines as part of the production path.
- Cloudflare scheduled Workers as the final ingestion orchestrator.
- User accounts or paid customer access control.

## 7. MVP Direction

The next product milestone should focus on one complete operational workflow:

`Watchlist -> Route Detail -> Timeline Replay -> Vehicle/Stop Inspector -> Diagnostics`

Transit remains the first implementation domain, but the architecture should be evaluated as an
island operations platform from the beginning.

Success criteria:

- route detail is understandable without engineering knowledge
- timeline replay clearly shows how route state changes over time
- inspector explains selected objects with evidence and freshness
- diagnostics remain available but separated
- the same architecture can support non-transit domains later
