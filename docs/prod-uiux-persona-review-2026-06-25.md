# Production UI/UX Persona Review — 2026-06-25

## Scope

- Target: production site `https://twfoundry.pages.dev`
- Pages tested:
  - `/` Operations Explorer
  - `/bus-oversight` Bus route service dashboard
  - `/route-geometry?route=303區` via `View route`
- Evidence captured:
  - `/tmp/twfoundry-prod-home-desktop/screenshot.png`
  - `/tmp/twfoundry-prod-home-mobile/screenshot.png`
  - `/tmp/twfoundry-prod-bus-desktop-wait/screenshot.png`
  - `/tmp/twfoundry-prod-bus-mobile-wait/screenshot.png`
  - `/tmp/twfoundry-prod-click-view-route/screenshot.png`

## Executive Summary

The strongest product surface is `/bus-oversight`: it communicates route-level service reliability better than the map-first homepage. The current workflow is credible for a technical demo, but not yet simple enough for an operator or reviewer because live signals, batch history, route drilldown, and data-health states compete for attention.

Recommended direction: make the product answer three questions first:

1. What is broken now?
2. Which route/segment is affected?
3. What should the operator inspect next?

Everything else should be secondary or behind detail drawers.

## Persona 1 — Transit Operations Dispatcher

Goal: identify current service gaps or bunching, choose a route to inspect, and decide whether follow-up is needed.

Observed workflow:

1. Opens `/bus-oversight`.
2. Sees live KPI cards: service-gap events and bunching events.
3. Checks timeline and route schematic.
4. Looks at `Flink live events` and `Routes to review`.
5. Clicks a route in the watchlist.

Findings:

- The dashboard has useful operational concepts: live event counts, route watchlist, timeline, route schematic, problem cards.
- The live event log and batch watchlist are disconnected. Live events show routes like `215`, `287區`, `295`, while the selected focus route defaults to historical batch route `303區`.
- Clicking `Route 2` changes the focus route, but the selected timeline slot can still show "No service problems" even though the watchlist says the route has `9 Service gap` signals. The route selection should jump to the most relevant problem slot.
- The first render briefly shows zero/waiting states before live/batch data loads. This looks like real zero events, not loading.

Suggested changes:

- Split the main dashboard into `Live now` and `Batch history` modes instead of mixing them in the same default view.
- Make live event rows clickable. Clicking a live event should focus that route and show its evidence immediately.
- When selecting a route from `Routes to review`, auto-jump the timeline to the highest-severity slot for that route.
- Replace zero defaults with loading skeletons or `Loading live signals...`; only show `0` after the request resolves.

## Persona 2 — City/Business Reviewer

Goal: understand the product value in 30 seconds and decide whether the system looks real, trustworthy, and Taiwan-specific.

Observed workflow:

1. Opens `/`.
2. Sees a map-first operations explorer with a left panel and timeline.
3. Clicks `Bus control dashboard`.
4. Reviews the dedicated dashboard.
5. Clicks `View route` from a route card.

Findings:

- `/bus-oversight` is a clearer product story than `/`. The homepage visually promises a map-first command center, but the first desktop viewport has a mostly empty dark map and a dense left sidebar.
- The homepage includes planned layers (`MRT LiveBoard`, `Transit signals`) in the main layer switcher. For a reviewer, planned items make the product feel less finished.
- `View route` routes to `/route-geometry?route=303區`, but the production page calls `/api/tdx/bus-delay-poc` and receives `503` because TDX credentials are not configured in Pages. The page gracefully shows no abnormal signal, but the console/API failure weakens trust.
- The `Data health` drawer is one of the strongest trust-building elements: it clearly lists source, status, cadence, coverage, and updated time.

Suggested changes:

- Make `/bus-oversight` the primary entry for external reviewers, or add a very prominent first-viewport CTA on `/`: `Open live bus service dashboard`.
- Move planned layers out of the main navigation into a small `Roadmap` or `Coming soon` drawer.
- Fix or hide production route drilldown features that require unavailable credentials. If credentials cannot be configured, route detail should use cached public datasets only.
- Promote `Data health` from a secondary button to a compact always-visible trust strip: `Live signals fresh · Batch 2026-06-24 · Route geometry 1199/1223 ready`.

## Persona 3 — Mobile Field Supervisor

Goal: check current incident counts and route problems quickly from a phone.

Observed workflow:

1. Opens `/bus-oversight` on a 390x844 viewport.
2. Sees title, mode switch, and five stacked KPI cards.
3. Scrolls to timeline, focus route, live events, and watchlist.
4. Opens `/` on mobile.

Findings:

- `/bus-oversight` mobile is readable, but the first viewport is consumed almost entirely by KPI cards. The actionable lists are below the fold.
- The five KPI cards are too tall for mobile. The user must scroll before seeing any route or live event.
- `/` mobile has a visible overlap: the `Time 2026-05-20 09:10` chip overlays the route review copy. This is a concrete layout bug.
- The homepage mobile first viewport shows chrome, a text panel, map zoom controls, and timeline, but not a clear primary action.

Suggested changes:

- On mobile `/bus-oversight`, replace five large KPI cards with a compact summary:
  - `Live: 158 gaps · 45 bunching`
  - `Batch: 21 routes · score 60`
  - Then show `Live events` immediately.
- Make KPI detail expandable instead of always expanded.
- Fix homepage mobile overlap by moving status/time chips into a single wrapping row or hiding secondary status chips below 480px.
- Add a sticky mobile bottom action: `Live events`, `Routes`, `Timeline`, `Data`.

## Workflow Review

### Entry

Current: `/` starts with a sophisticated map explorer.

Issue: it is visually impressive but not the clearest path to product value. The user sees historical `2026-05-20` data first, while the real production value is current live bus signal monitoring.

Recommendation: default reviewer/operator traffic to `/bus-oversight`. Keep `/` as `Map explorer` for deeper exploration.

### Monitoring

Current: `/bus-oversight` shows batch and live in the same top band.

Issue: the system mixes three time contexts:

- live Flink signals: `2026-06-25T17:15+08:00`
- batch analytics manifest: service date `2026-06-24`
- bundled historical dashboard timeline: `2026-05-20`

Recommendation: make time provenance explicit and visually separated:

- `Live now` for Flink signals.
- `Yesterday batch` for ClickHouse analytics.
- `Historical sample` only when using bundled fixtures.

### Drilldown

Current: route cards and live rows exist, but they do not form one clear path.

Issue: `View route` goes to a separate route detail page with a production 503 dependency. Watchlist selection updates the schematic but may not jump to the relevant event slot. Live signal rows are informational rather than action-oriented.

Recommendation: unify drilldown:

- Click route/event -> focus route -> jump to relevant timestamp -> show evidence and next action.
- Keep external route geometry page as advanced detail only after the primary dashboard evidence is stable.

### Data Trust

Current: `Data health` is strong but secondary.

Issue: users need source confidence before interpreting live/batch mismatches.

Recommendation: surface a compact data trust strip near the title:

```text
Live Flink: 17:15 fresh | Batch analytics: 2026-06-24 | Route geometry: 1199/1223 ready
```

## Prioritized UI/UX Changes

### P0 — Fix Misleading States

- Do not render `0` for KPI values before data loads.
- Fix `/route-geometry` production 503 dependency or remove that link from production.
- Fix mobile homepage text overlap.

### P1 — Simplify The Core Workflow

- Use `/bus-oversight` as the primary operational/reviewer entry.
- Add a `Live now` section above or before batch KPIs.
- Make live signal rows clickable and route-focusing.
- Auto-jump route selection to the most severe/relevant timeline slot.

### P2 — Reduce Cognitive Load

- Collapse five KPI cards on mobile into a two-line live summary plus expandable metrics.
- Replace the giant route dropdown on `/` with searchable route picker plus `Problem routes first`.
- Move planned layers out of the main layer selector.
- Rename or clarify `Batch snapshot` because users can mistake it for the whole page status, while some cards are live.

### P3 — Polish

- Keep `Data health`, but expose a compact trust summary by default.
- Shorten timestamp rendering in live event rows from full ISO strings to local time plus date tooltip.
- Reduce duplicate legends when map/schematic already has clear encoding.

## Suggested Simplified Information Architecture

```text
/bus-oversight
  1. Live now
     - gap count, bunching count, latest slot, top 5 live signals
  2. Routes needing review
     - ranked by severity and recency
  3. Route evidence
     - schematic, problem segment, vehicles/evidence, next action
  4. Batch history
     - 7-day timeline, reliability score, low-capacity trends
  5. Data health
     - source freshness and coverage

/
  Map explorer
  - current layer
  - search/filter route
  - selected object/route detail
  - link to operational dashboard
```

## Final Recommendation

Prioritize `/bus-oversight` as the product-facing experience. The map explorer can remain a powerful technical surface, but the operational workflow should be simpler: live problem list first, route evidence second, historical batch third, data health always visible.
