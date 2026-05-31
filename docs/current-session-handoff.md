# Current Session Handoff

Date: 2026-05-31

Status: active prototype work, not a clean release branch.

## Working Directory

Use:

```sh
cd /Users/unknowntpo/repo/unknowntpo/twfoundry/main
```

Frontend:

```sh
cd frontend
bun run dev -- --port 5220 --strictPort
```

Current preview URL:

```text
http://localhost:5220/
```

## Verification

Latest checks run:

```sh
cd frontend
bun run build
```

Result: passed.

Known non-blocking warning:

- Vite chunk-size warning for MapLibre / deck.gl / Three.js bundles.
- `OntologyPreview.vue` is both dynamically and statically imported.

## Current Dashboard Behavior

The operations dashboard is now map-first and timeline-driven:

- MapLibre renders the dark map, roads, buildings, labels, and POI context.
- deck.gl renders vehicle points, selected vehicle focus, ghost points, route stop pins, and route-progress experiment layers.
- Timeline plays one service day from local archive slots at 5 minute cadence.
- Playback speeds: `1x`, `1.5x`, `2x`, `4x`.
- Timeline hover shows the target date/time.
- Clicking a bus point opens the right inspector.
- Clicking empty map space closes the inspector.
- Hovering a bus point uses pointer cursor and shows a tooltip.

## Route Stops

Route stops are now rendered from formal TDX `StopOfRoute` route context, not from historical vehicle distributions.

Current behavior:

- Route filter must select a specific route.
- The app loads route-context JSON from `frontend/public/data/tdx-bus/route-context/manifest.json`.
- Stops render as amber bus-stop pin icons.
- Stop pins have a minimum visible size and halo so they remain visible on the dark map.
- Hovering a stop shows:
  - stop name
  - route + stop sequence
  - direction as `toward terminal stop`, not raw `Direction 0/1`
  - stop ID

Important decision:

- Stop display does not require route geometry audit.
- Audit only gates derived route progress / delay-like signals.

## Route Geometry And Progress

Route geometry support exists for selected vehicles:

- `frontend/src/busRouteGeometry.js` projects GPS points onto route shape.
- Inspector shows route progress percentage, nearest stop, next stop, off-route distance, and geometry quality.
- Route quality audit output lives under `frontend/public/data/tdx-bus/route-quality/`.
- Quality gate should become a backend ingestion step later.

Current limitation:

- This is still frontend-side prototype computation.
- Production should compute route progress in backend or shared worker.

## Vehicle Animation

The old deck.gl `getPosition` transition caused fake cross-route flying because deck.gl interpolated by array index.

Current behavior:

- Position tweening is keyed by stable vehicle ID / plate number.
- Same vehicle can tween between nearby positions.
- Large jumps fall back to direct updates.
- This avoids points flying across unrelated routes when slot vehicle ordering changes.

## Ghost Trace

Ghost trace remains experimental.

Current behavior:

- Inspector toggle can show same-route baseline points near selected time.
- It is not a delay signal.
- It should eventually use multi-day baseline, schedule, ETA, or route-progress comparison.

Open product decision:

- We may remove or redesign ghost trace until route-level delay baseline is better defined.

## Removed / De-emphasized

The yellow whole-day route distribution overlay was removed from the primary UI.

Reason:

- It competed with current cyan vehicle points.
- Formal route stop locations and route geometry are now better context sources.

Historical distributions may still be useful for analysis, but should not be default map context.

## Design System Work

Minimum design system contract exists as a Vue page:

```text
http://localhost:5220/minimum-design-system-contract
```

Related files:

- `frontend/src/MinimumDesignSystemContract.vue`
- `frontend/src/minimumDesignSystemContract.js`
- `docs/minimum-design-system-contract.html`

Current scope:

- semantic tokens
- map object grammar
- color roles and weights
- breakpoints
- source health row pattern
- bilingual i18n

Decision:

- Do not build a full atomic design system yet.
- Keep extracting stable primitives as the real service architecture becomes clearer.

## Docs To Read First Next Session

Start with:

1. `docs/operations-dashboard-feature-inventory.md`
2. `docs/tdx-bus-route-geometry-api.md`
3. `docs/bus-delay-signal-detection-plan.md`
4. `docs/multi-city-bus-onboarding-pipeline-draft.md`
5. This handoff file.

## Important Scripts

From `frontend/`:

```sh
bun run fetch:tdx-bus-history
bun run fetch:tdx-bus-route-context
bun run audit:tdx-bus-route-quality
bun run test
bun run build
```

TDX credentials should stay in `.env` and must not be printed.

## Current Files With Major Work

Core app:

- `frontend/src/OperationsExplorer.vue`
- `frontend/src/BusDeckMap.vue`
- `frontend/src/operationsWorkflowData.js`
- `frontend/src/busRouteGeometry.js`
- `frontend/src/i18n.js`

Scripts:

- `frontend/scripts/fetch-tdx-taipei-bus-route-context.mjs`
- `frontend/scripts/audit-tdx-bus-route-quality.mjs`

Tests:

- `frontend/tests/busRouteGeometry.test.mjs`
- `frontend/tests/operationsWorkflowData.test.mjs`
- `frontend/tests/run.mjs`

Data cache:

- `frontend/public/data/tdx-bus/archive/`
- `frontend/public/data/tdx-bus/baseline-archive/`
- `frontend/public/data/tdx-bus/route-context/`
- `frontend/public/data/tdx-bus/route-quality/`

## Next Best Tasks

Recommended next implementation order:

1. Verify route stop hover visually in browser after the latest bus-stop pin update.
2. Run `bun run test` in addition to build.
3. Decide whether to commit the current prototype checkpoint.
4. Move route progress computation out of `OperationsExplorer.vue` into a clearer service module.
5. Draft backend API contracts for:
   - service-day archive manifest
   - route context
   - route quality
   - route progress observation
6. Start delay signal V1 as route-level only, not vehicle-level, and label it conservatively.

## Known Risks

- Many changes are currently uncommitted.
- Some generated/cached data files are untracked and may be large.
- Route context coverage depends on which routes have been fetched.
- Route geometry quality varies by route and direction.
- Delay detection is not implemented yet.
- Ghost trace is exploratory and should not be treated as product truth.
