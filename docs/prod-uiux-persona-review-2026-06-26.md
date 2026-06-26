# Production UI/UX Persona Review — 2026-06-26

> Re-run of the 2026-06-25 persona review against production. Treat prior findings as hypotheses; this run records what still holds and what changed.

## Scope

- Target: `https://twfoundry.pages.dev`
- Pages tested:
  - `/` Operations Explorer — desktop `1280x720`, mobile `390x844`
  - `/bus-oversight` Bus route service dashboard — desktop `1280x720`, mobile `390x844`
  - `/route-geometry?route=303區` via `View route` drilldown
- Tooling: Playwright (chromium), `networkidle` + 2.5–4.5s settle wait.
- APIs sampled live during run:
  - `/api/online/bus-route-signals?limit=8` → `200`, `gap 153 / bunching 29 / total 182`, latestSlot `2026-06-26T07:45+08:00`
  - `/api/analytics/bus/manifest.json` → `200`, `serviceDate 2026-06-25`, lookback 7d, source `clickhouse-rolling`
- Artifacts (scratchpad, not committed):
  - `persona/home-desktop.png`, `home-desktop-clicked.png`, `home-mobile.png`, `bus-desktop.png`, `bus-mobile.png`, `report.json`

## Executive Summary

- `/bus-oversight` remains the strongest product surface; `/` is still map-first and historical-first, burying current live value.
- Three time contexts still coexist and are not visually separated: homepage historical `2026-05-20`, batch `2026-06-25`, live Flink `2026-06-26 07:45`.
- **P0 regressions from 2026-06-25 are still unfixed:** route drilldown `503` silently degrades to "no abnormal signal"; mobile `/` has a real text-overlap bug.
- Live data pipeline is healthy (signals + manifest both `200`); the credibility problems are presentation/state, not data.
- New issue: `/route-geometry` renders in Chinese while `/` and `/bus-oversight` render in English — locale inconsistency across the workflow.

## Persona 1 — Transit Operations Dispatcher

Goal: find current service gaps/bunching, pick a route, inspect evidence, decide on follow-up.

Observed workflow: `/bus-oversight` → KPI cards → timeline + focus route → Flink live events / Routes to review → select route.

Findings:
- KPI band mixes provenance: top badge says `Batch snapshot`, yet `Service-gap events 153` and `Bunching events 29` are tagged `live · 07:45`, while `Reliability index 60` and `Monitored routes 21` are batch. One glance cannot tell live from batch.
- Focus route defaults to historical batch `303區` (latest snapshot `2026-05-20 23:00`), disconnected from the live signal log which lists `295`, `287區`, etc. at `2026-06-26 07:45`. Live and selection still do not converge.
- Flink live event rows are informational only — not clickable, do not focus a route.

Suggested changes:
- Split `Live now` vs `Batch history` as explicit modes instead of one mixed band.
- Make live event rows clickable → focus that route + jump timeline to its slot.
- When picking from `Routes to review`, auto-jump to the highest-severity slot for that route.

## Persona 2 — City/Business Reviewer

Goal: judge product value/credibility in ~30s; does it feel real, Taiwan-specific, trustworthy.

Observed workflow: `/` → `Bus control dashboard` → `View route`.

Findings:
- `/` first desktop viewport = dense left sidebar (vehicle layer, route spacing, routes requiring attention) + large dark map showing historical `05-20` TDX positions. Impressive but communicates "historical map explorer," not "live command center."
- **`View route` → `/route-geometry?route=303區` still calls `/api/tdx/bus-delay-poc` and gets `503`** (TDX creds absent on Pages). The page then shows `目前無異常訊號` / `0 筆` / `位置品質 --`. A backend failure is presented as "all clear" — the single most trust-damaging state in the workflow.
- `Data health` drawer remains the strongest trust element (source/status/cadence/coverage/updated).

Suggested changes:
- Either make `/bus-oversight` the default reviewer entry, or put a first-viewport CTA on `/`: `Open live bus service dashboard`.
- Fix the `503` → never render "no abnormal signal" on a failed fetch; show an explicit `Route detail unavailable (data source not configured)` state, or remove the prod link until creds exist / use cached public datasets.
- Promote `Data health` to an always-visible compact trust strip.

## Persona 3 — Mobile Field Supervisor

Goal: check current incidents and route problems on a phone, minimal scrolling.

Observed workflow: `/bus-oversight` @ `390x844`, then `/`.

Findings:
- **`/bus-oversight` mobile first viewport is 100% consumed by 5 stacked KPI cards** (60 / 21 / 153 / 29 / 45). Zero route lists or live events above the fold — every actionable item requires scrolling.
- **`/` mobile has a confirmed layout bug:** the `Time 2026-05-20 09:10 · Playback paused` chip overlaps the route-review copy ("spacing, large gaps, and vehicles running too close together"). Same overlap as 2026-06-25 — unfixed.
- `/` mobile shows no clear primary action above the fold (chrome + text panel + map zoom + timeline).

Suggested changes:
- Mobile `/bus-oversight`: collapse 5 cards into a 2-line summary (`Live: 153 gaps · 29 bunching` / `Batch: 21 routes · score 60`), then surface `Live events` immediately; make full metrics expandable.
- Fix mobile `/` overlap: wrap status/time chips into one row or hide secondary chips below 480px.
- Add a sticky mobile bottom nav: `Live · Routes · Timeline · Data`.

## Workflow Review

- **Entry:** `/` opens on historical `05-20` map; live value lives on `/bus-oversight`. Default operator/reviewer traffic to `/bus-oversight`; keep `/` as `Map explorer`.
- **Monitoring:** three time contexts (live `06-26 07:45`, batch `06-25`, historical `05-20`) share the top band without separation. Label provenance per-card and group by `Live now` / `Yesterday batch` / `Historical sample`.
- **Drilldown:** `View route` → 503 → false "all clear." No coherent click→focus→timestamp→evidence→next-action path. Unify drilldown; keep `/route-geometry` as advanced detail only after primary evidence is stable.
- **Data trust:** `Data health` strong but secondary; surface a compact strip near the title (`Live 07:45 fresh | Batch 2026-06-25 | Geometry 1199/1223`).
- **Console/network:** no page errors anywhere. `/` emits WebGL perf warnings (`GPU stall due to ReadPixels`) — cosmetic, monitor only. Only failing request in the whole run is the drilldown `503`.

## Prioritized Recommendations

### P0 — Fix Misleading / Broken States
- Drilldown `503` must not render as `目前無異常訊號`. Show explicit failure/unavailable state, or remove the prod link.
- Fix mobile `/` time/playback chip overlap.
- Don't render `0`/empty KPI as truth before fetch resolves — use skeleton/loading.

### P1 — Simplify Core Workflow
- `/bus-oversight` as primary entry.
- Explicit `Live now` section above batch KPIs.
- Clickable live signal rows → route focus.
- Auto-jump route selection to most-severe slot.

### P2 — Reduce Cognitive Load
- Mobile: 5 KPI cards → 2-line summary + expandable metrics.
- Per-card live/batch provenance labels; rename `Batch snapshot` so it doesn't imply the whole page is batch.
- Move planned layers out of `/` main layer selector into a `Coming soon` drawer.
- Fix locale inconsistency: `/route-geometry` should honor the same EN/繁中 toggle as the rest of the app.

### P3 — Polish
- Always-visible compact `Data health` trust strip.
- Shorten ISO timestamps in live rows to local time + tooltip.
- Suppress/tune WebGL ReadPixels stall warnings on `/`.

## Suggested Simplified Information Architecture

```text
/bus-oversight
  1. Live now      — gap/bunching counts, latest slot, top 5 live signals (clickable)
  2. Routes to review — ranked by severity + recency
  3. Route evidence   — schematic, problem segment, evidence, next action
  4. Batch history    — 7-day timeline, reliability score, low-capacity trends
  5. Data health      — source freshness + coverage (always visible strip)

/  Map explorer — current layer, route search/filter, selected detail, link to dashboard
```

## Final Recommendation

Make `/bus-oversight` the product-facing experience and clean up state honesty first: a `503` must never look like "all clear," and live vs batch vs historical must be visually distinct. The map explorer stays as a powerful technical surface, not the default entry. No UI code changed in this pass per handoff scope; this is a review only.

## Verification

- Passed: prod `/` + `/bus-oversight` loaded desktop & mobile; live signals API `200`; analytics manifest `200`; no page errors.
- Failed/warning: route drilldown `/api/tdx/bus-delay-poc` `503` (still); mobile `/` text overlap (still); WebGL perf warnings on `/`.
- Not run: no code tests, no UI implementation, no commit.

## Delta vs 2026-06-25

- Still unfixed: drilldown 503 false-clear (P0), mobile `/` overlap (P0), mobile bus KPI-card fold pressure.
- New this run: `/route-geometry` locale inconsistency (Chinese vs EN app).
- Data freshness this run: live `2026-06-26T07:45+08:00` (153 gap / 29 bunching); batch serviceDate `2026-06-25`, score `60 (▼40 vs yesterday)`.
