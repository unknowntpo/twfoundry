# Cloud Code UI/UX Persona Review Handoff

## Goal

- Mode: Producer handoff for another coding/review agent.
- Current user goal: make the previous "3 personas walk the full workflow, then produce executable simplification/modification suggestions" process repeatable by Cloud Code.
- Latest user request: create a handoff document so Cloud Code can run the same UI/UX review process.
- Desired next outcome: Cloud Code should run a production-site UI/UX workflow review, assume three concrete personas, capture evidence, and write a concise actionable review with simplification suggestions.

## Project State

- Repo/worktree: `/Users/unknowntpo/repo/unknowntpo/twfoundry/main`
- Branch: `main`
- Dirty status at handoff creation:
  - `docs/prod-uiux-persona-review-2026-06-25.md` is untracked from the previous Codex review.
  - This handoff file may also be untracked if not yet committed.
- Important project rules:
  - Read `/Users/unknowntpo/repo/unknowntpo/twfoundry/main/AGENTS.md` first.
  - Reply to the user in Chinese.
  - Keep output concise, technical, and action-oriented.
  - Do not change UI code unless the user explicitly asks for implementation after the review.
- Relevant files:
  - Existing review: `/Users/unknowntpo/repo/unknowntpo/twfoundry/main/docs/prod-uiux-persona-review-2026-06-25.md`
  - Main frontend entrypoints:
    - `/Users/unknowntpo/repo/unknowntpo/twfoundry/main/frontend/src/main.js`
    - `/Users/unknowntpo/repo/unknowntpo/twfoundry/main/frontend/src/OperationsExplorer.vue`
    - `/Users/unknowntpo/repo/unknowntpo/twfoundry/main/frontend/src/BusOversightDashboard.vue`
  - Product contract: `/Users/unknowntpo/repo/unknowntpo/twfoundry/main/SPEC.md`

## What Changed

- Completed:
  - A production UI/UX persona review was run against `https://twfoundry.pages.dev`.
  - A review document was written at `docs/prod-uiux-persona-review-2026-06-25.md`.
  - This handoff captures the process so another agent can repeat it independently.
- In progress:
  - No UI code changes.
- Deferred:
  - Implementing any UI simplification.
  - Turning recommendations into OpenSpec/Spectra changes.
  - Committing files.

## Review Process To Repeat

### First Action

1. Check workspace state:
   ```bash
   cd /Users/unknowntpo/repo/unknowntpo/twfoundry/main
   git status --short --branch
   ```
2. Read:
   - `AGENTS.md`
   - `docs/prod-uiux-persona-review-2026-06-25.md`
   - the frontend entrypoints listed above
3. Use the production site and production traffic, not local mock data, unless prod is down:
   - `https://twfoundry.pages.dev/`
   - `https://twfoundry.pages.dev/bus-oversight`
   - route drilldown from `View route`

### Personas

Use exactly these three personas unless the user asks for different ones:

1. Transit Operations Dispatcher
   - Goal: quickly find current service gaps/bunching, choose a route, inspect evidence, decide whether follow-up is needed.
2. City/Business Reviewer
   - Goal: understand product value and credibility in 30 seconds; evaluate whether the system feels real, Taiwan-specific, and trustworthy.
3. Mobile Field Supervisor
   - Goal: check current incidents and route problems on a phone with minimal scrolling.

### Workflow Walkthrough

Run these paths for each persona:

1. Entry workflow:
   - Open `/`.
   - Identify first clear action.
   - Decide whether the homepage communicates product value or distracts from the operational dashboard.
2. Monitoring workflow:
   - Open `/bus-oversight`.
   - Wait for live and batch data to load.
   - Inspect KPI cards, timeline, route schematic, live events, watchlist, route problems, and data provenance.
3. Drilldown workflow:
   - From `/`, click `Bus control dashboard`.
   - From `/`, click the first `View route`.
   - From `/bus-oversight`, click a route in `Routes to review`.
   - Check whether the selected route, timeline slot, route evidence, and next action stay coherent.
4. Mobile workflow:
   - Repeat `/` and `/bus-oversight` at a mobile viewport around `390x844`.
   - Check overlap, tap target size, first-viewport usefulness, and whether actionable content is above the fold.

### Evidence To Capture

Capture at minimum:

- Desktop screenshot of `/`.
- Mobile screenshot of `/`.
- Desktop screenshot of `/bus-oversight` after data load.
- Mobile screenshot of `/bus-oversight` after data load.
- Screenshot and console/network notes for `View route` drilldown.
- Text or JSON summary of:
  - console errors/warnings
  - failed requests
  - visible first-viewport text
  - final URLs after clicks

If using Playwright, approximate commands are:

```bash
cd /Users/unknowntpo/repo/unknowntpo/twfoundry/main/frontend
bun install
```

Then use a small Playwright script or browser automation to visit:

```text
https://twfoundry.pages.dev/
https://twfoundry.pages.dev/bus-oversight
```

Use desktop viewport `1280x720` and mobile viewport `390x844`. Wait about `4000ms` after opening `/bus-oversight` so live and batch data settle before final screenshot.

## Known Observations From Previous Run

Treat these as hypotheses to re-check, not permanent truth:

- `/bus-oversight` is the strongest product-facing surface.
- `/` is visually sophisticated but can bury the real operational value behind a map explorer and dense chrome.
- The dashboard mixes multiple time contexts:
  - live Flink signals
  - batch analytics
  - historical bundled timeline/sample
- First render may briefly show `0`/waiting values before data resolves; this can be mistaken for real zero incidents.
- Mobile `/` showed text overlap around the time/status chip and route review copy.
- Mobile `/bus-oversight` used most of the first viewport on KPI cards, pushing live events and route lists below the fold.
- `View route` previously reached `/route-geometry?route=303區`; production attempted `/api/tdx/bus-delay-poc` and returned `503` because Pages TDX credentials were not configured.
- `Data health` drawer was a strong trust-building element and may deserve a compact always-visible summary.

## Output Format For Cloud Code

Write or update a markdown review under:

```text
/Users/unknowntpo/repo/unknowntpo/twfoundry/main/docs/
```

Suggested filename:

```text
prod-uiux-persona-review-YYYY-MM-DD.md
```

Required sections:

1. Scope
   - URLs tested
   - viewport sizes
   - artifacts/screenshots
2. Executive Summary
   - 3 to 5 bullets max
3. Persona Reviews
   - one section per persona
   - goal, observed workflow, findings, suggested changes
4. Workflow Review
   - entry, monitoring, drilldown, mobile, data trust
5. Prioritized Recommendations
   - P0 fix misleading/broken states
   - P1 simplify core workflow
   - P2 reduce cognitive load
   - P3 polish
6. Suggested Simplified Information Architecture
7. Final Recommendation

Keep recommendations executable. Phrase them as UI/product changes, for example:

- "Make live event rows clickable and focus the matching route."
- "Auto-jump route selection to the most severe relevant timeline slot."
- "Replace pre-load KPI zeros with skeleton/loading state."
- "Move planned layers out of the main layer selector."

## Decisions

- Decision: use production site and production traffic for this review.
  - Why: the user explicitly said prod traffic/site is more realistic.
  - Tradeoff: prod data can change between runs, so findings must include exact date/time and observed payload state.
- Decision: produce a review document, not UI code changes.
  - Why: the user asked for a repeatable review/handoff process.
  - Tradeoff: implementation remains a separate follow-up.
- Decision: avoid Codex-specific tooling in the handoff.
  - Why: Cloud Code should be able to run the same process with its own browser/Playwright tools.
  - Tradeoff: this handoff does not depend on the Codex `frontend-feedback-loop` script, though the previous review used it.

## Runtime / Environment

- Public URLs:
  - `https://twfoundry.pages.dev/`
  - `https://twfoundry.pages.dev/bus-oversight`
  - `https://twfoundry.pages.dev/api/online/bus-route-signals?limit=8`
  - `https://twfoundry.pages.dev/api/analytics/bus/manifest.json`
- Local services required: none if reviewing production.
- Ports: none required.
- Tunnels / proxies: none required.
- Required env vars: none for production review.

## Verification

- Passed in previous run:
  - Prod `/` loaded on desktop and mobile.
  - Prod `/bus-oversight` loaded on desktop and mobile.
  - Prod live signals API returned live route signals.
  - Prod analytics manifest returned batch analytics metadata.
- Failed or warning in previous run:
  - Route drilldown attempted a prod API path that returned `503`.
  - `/` mobile had visible text overlap.
  - WebGL performance warnings appeared on `/`; no page errors were observed.
- Not run:
  - No code tests.
  - No UI implementation.

## Security Notes

- Secrets intentionally omitted.
- Do not print or copy Cloudflare, TDX, kubeconfig, cookies, or auth headers.
- This review should not require credentials.
- Commands requiring approval/access:
  - network/browser access to production URLs
  - any Git operation that writes refs/index
  - any deployment or Cloudflare/TDX/kubernetes command

## Next Steps

1. First action: run the production UI/UX review using the process above and capture fresh evidence.
2. Second action: write a new review markdown file under `main/docs/`, or update the existing review if the user wants one canonical file.
3. Optional follow-up: after the user approves recommendations, create a separate implementation plan or OpenSpec/Spectra change for UI simplification.

## Unknowns

- Unknown: whether the production route drilldown 503 still happens.
  - How to resolve: click `View route` and inspect console/network output.
- Unknown: current live signal counts and exact latest slot.
  - How to resolve: fetch `/api/online/bus-route-signals?limit=8` during the run and record timestamp.
- Unknown: whether Cloud Code has Playwright installed.
  - How to resolve: check the environment; if unavailable, use any browser automation or screenshot method available to Cloud Code.
