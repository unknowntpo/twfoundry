# Route Context Backfill

This POC keeps route context as a manual backfill, not a cron job.

## What It Produces

- `frontend/public/data/tdx-bus/route-context/manifest.json`
- `frontend/public/data/tdx-bus/route-context/{encodeURIComponent(RouteName)}.json`
- `frontend/public/data/tdx-bus/route-quality/manifest.json`
- R2 copies under `twfoundry-poc-archive/data/tdx-bus/route-context/` and `twfoundry-poc-archive/data/tdx-bus/route-quality/`

The frontend currently reads the deployed static files. R2 is the durable copy for handoff and future Functions-backed serving.

## Manual Run

Run from `frontend/`:

```bash
bun run check:tdx-token
bun run fetch:tdx-bus-route-context
bun run audit:tdx-bus-route-quality
```

`fetch:tdx-bus-route-context` reads all Taipei bus routes from TDX `Bus.Route.City`, then fetches `Bus.Shape.City` and `Bus.StopOfRoute.City` for each route.

For a quick non-writing route list check:

```bash
bun scripts/fetch-tdx-taipei-bus-route-context.mjs --from-route-list --dry-run
```

For the old small sample flow:

```bash
bun run fetch:tdx-bus-route-context:archive-sample
```

## Upload To R2

Run from `cloudflare/worker/`:

```bash
bun run upload:route-context -- --dry-run
bun run upload:route-context
```

The dry run prints the exact `wrangler r2 object put` commands before writing remote objects.

## Publish Static Demo

Run from `frontend/` after the backfill:

```bash
bun run build
bunx wrangler pages deploy dist --project-name twfoundry-poc
```

## Acceptance Checks

- Route filter can select Route 1 and other common routes.
- The map shows bus vehicle points for the selected route.
- If `StopOfRoute` data exists, yellow stop dots appear for the selected route.
- The layer panel route geometry label no longer says `not audited` for routes included in `route-quality/manifest.json`.
- R2 contains both route context and route quality JSON objects under `data/tdx-bus/`.

## Why No Cron Yet

Vehicle positions are real-time and need the 5-minute Worker cron. Route shapes and stops change much less often, so a manual backfill is enough for the POC. If this becomes production, promote it to a separate daily or weekly maintenance job.
