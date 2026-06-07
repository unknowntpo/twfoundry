# Cloudflare-First POC

Goal: make the current TWFoundry demo publicly viewable with archived bus data, without running the Spring Boot backend in the cloud.

## Runtime Shape

```text
Cloudflare Pages
  frontend/dist
  frontend/functions
  /api/projections/bus_vehicles
  /api/projections/bus_vehicles/timeline

Cloudflare R2
  bus/projections/manifest.json
  bus/projections/{captureDate}/{HH-mm}.json

Cloudflare Access
  optional customer email allowlist for private demo
```

Pages Functions serve the same projection contract that the Java backend exposes locally. The POC keeps projection computation offline: local archive files are converted into static projection artifacts, uploaded to R2, and read by the Pages Function at request time.

The standalone Worker under `cloudflare/worker/` is a fallback deployment shape. Prefer the Pages Function path for the first customer-facing POC because the frontend and `/api/*` stay on the same hostname.

## One-Time Cloudflare Setup

```bash
cd cloudflare/worker
bun install
bunx wrangler login
bunx wrangler r2 bucket create twfoundry-poc-archive
```

Create and deploy the Cloudflare Pages project:

```bash
cd frontend
bun install
bun run build
bunx wrangler pages deploy
```

`frontend/wrangler.toml` binds `BUS_PROJECTION_BUCKET` to `twfoundry-poc-archive`, and `frontend/public/_routes.json` limits Function invocation to `/api/*`. The frontend fetches relative URLs, so the public site should look like:

```text
https://<demo-host>/
https://<demo-host>/api/projections/bus_vehicles/timeline
https://<demo-host>/api/projections/bus_vehicles?slot=09%3A55
```

## Build And Upload Projection Artifacts

```bash
cd frontend
bun run build:cloudflare-bus-projections
```

This writes generated artifacts under `cloudflare/artifacts/bus-projections/`, which is intentionally ignored by git.

Dry-run upload commands first:

```bash
cd cloudflare/worker
bun run upload:bus-projections -- --dry-run
```

Upload to R2:

```bash
cd cloudflare/worker
bun run upload:bus-projections
```

Redeploy Pages after uploading artifacts so the Pages Function can read the R2 bucket binding.

## Local Cloudflare Preview

Use this path when Cloudflare auth is not ready yet, or when you want to verify Pages Functions and R2 before a real deploy.

Build the frontend and projection artifacts:

```bash
cd frontend
bun run build
bun run build:cloudflare-bus-projections
```

Seed Wrangler local R2:

```bash
cd cloudflare/worker
bun run upload:bus-projections:local
```

Start local Pages Functions with the same R2 binding name:

```bash
cd frontend
bun run preview:cloudflare-pages
```

Verify locally:

```bash
curl -s http://127.0.0.1:8788/api/projections/bus_vehicles/timeline
curl -s "http://127.0.0.1:8788/api/projections/bus_vehicles?slot=09%3A55"
```

For a temporary public demo, expose the local Pages preview with a Cloudflare quick tunnel:

```bash
cloudflared tunnel --url http://127.0.0.1:8788
```

This is suitable for short-lived POC review only. It is not a replacement for a named tunnel or a Pages production deployment.

## Verify

After deploying Pages to the demo hostname:

```bash
curl -s https://<demo-host>/api/projections/bus_vehicles/timeline
curl -s "https://<demo-host>/api/projections/bus_vehicles?slot=09%3A55"
```

Open `https://<demo-host>/` and verify:

- map renders archived bus vehicle points
- timeline has 288 slots for the current archive day
- selecting a timeline slot updates vehicle positions
- no request falls back to fixture data

## Customer Demo Hardening

For a customer POC, enable Cloudflare Access on the demo hostname and allow only the customer's email domain or explicit email addresses.

Keep customer-specific environments separate:

```text
twfoundry-poc-archive          internal/demo
twfoundry-customer-a-archive   customer A
twfoundry-customer-b-archive   customer B
```

Do not put TDX credentials or customer secrets in the frontend. When scheduled ingestion is added later, store credentials as Worker secrets.

## Standalone Worker Fallback

If Pages Functions routing is not desirable, deploy the standalone Worker:

```bash
cd cloudflare/worker
bun install
bun run deploy
```

Then route `/api/*` on the demo hostname to that Worker.

## Later Upgrade Path

This POC intentionally skips D1 and Cron. Add them after the public archive demo works:

- Cron Worker: scheduled TDX fetch
- D1: source/job metadata and latest pointer
- R2: raw snapshots plus projection artifacts
- Queues: async projection rebuilds if Cron work becomes too large
