# Cloudflare-First POC

Goal: make the current TWFoundry demo publicly viewable with archived bus data, without running the Spring Boot backend in the cloud.

## Runtime Shape

```text
Cloudflare Pages
  frontend/dist
  frontend/functions
  /api/projections/bus_vehicles
  /api/projections/bus_vehicles/timeline
  /data/cloudflare-bus-projections

Cloudflare R2
  bus/projections/manifest.json
  bus/projections/{captureDate}/{HH-mm}.json
  optional after R2 is enabled

Cloudflare Access
  optional customer email allowlist for private demo
```

Pages Functions serve the same projection contract that the Java backend exposes locally. The POC keeps projection computation offline: local archive files are converted into static projection artifacts, copied into the Pages static assets, and read by the Pages Function at request time. After R2 is enabled, the same artifacts can also be uploaded to R2 and the Function can use the `BUS_PROJECTION_BUCKET` binding.

The standalone Worker under `cloudflare/worker/` is a fallback deployment shape. Prefer the Pages Function path for the first customer-facing POC because the frontend and `/api/*` stay on the same hostname.

## One-Time Cloudflare Setup

```bash
cd cloudflare/worker
bun install
bunx wrangler login
```

Create and deploy the Cloudflare Pages project:

```bash
cd frontend
bun install
bun run build:cloudflare-bus-projections
bun run build
bunx wrangler pages deploy dist --project-name twfoundry-poc --commit-dirty=true
```

`frontend/public/_routes.json` limits Function invocation to `/api/*`. The frontend fetches relative URLs, so the public site should look like:

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

This writes generated artifacts under both ignored paths:

```text
cloudflare/artifacts/bus-projections/
frontend/public/data/cloudflare-bus-projections/
```

The first path is for R2 uploads. The second path is copied into `frontend/dist` by Vite so Pages can serve the public POC even before R2 is enabled.

Dry-run upload commands first:

```bash
cd cloudflare/worker
bun run upload:bus-projections -- --dry-run
```

Optional: after R2 is enabled in the Cloudflare Dashboard, create the bucket:

```bash
bunx wrangler r2 bucket create twfoundry-poc-archive
```

Then add this binding to `frontend/wrangler.toml`:

```toml
[[r2_buckets]]
binding = "BUS_PROJECTION_BUCKET"
bucket_name = "twfoundry-poc-archive"
```

Upload to remote R2:

```bash
cd cloudflare/worker
bun run upload:bus-projections
```

Redeploy Pages after uploading artifacts so the Pages Function can read the R2 bucket binding.

## Historical Backfill

Use a manual backfill when you need to load a specific historical service day from TDX and publish it to R2. The job fetches historical bus records, rebuilds the bus projection artifacts, and optionally uploads them to remote R2.

Preview the commands first:

```bash
cd frontend
bun run backfill:tdx-bus-projections -- --date 2026-05-20 --dry-run --upload
```

Run a one-day backfill and upload to R2:

```bash
cd frontend
bun run backfill:tdx-bus-projections -- --date 2026-05-20 --force --upload
```

Run a date range:

```bash
cd frontend
bun run backfill:tdx-bus-projections -- --from 2026-05-20 --to 2026-05-21 --force --upload
```

Backfill uses TDX historical data. It should not be used to pretend a failed live slot succeeded unless the source data actually covers that slot.

## Live Bus Ingestor Cron

The live ingestor is a Cloudflare Worker under `cloudflare/ingestor-worker/`. It runs every 5 minutes, fetches TDX `Bus.RealTimeByFrequency.City`, writes a raw snapshot to R2, writes the matching bus projection JSON, and updates `bus/projections/manifest.json`.

Configure secrets once:

```bash
cd cloudflare/ingestor-worker
bun install
bunx wrangler secret put TDX_CLIENT_ID
bunx wrangler secret put TDX_CLIENT_SECRET
```

Optional manual run support requires an admin token:

```bash
bunx wrangler secret put INGESTOR_ADMIN_TOKEN
```

Deploy the scheduled Worker:

```bash
cd cloudflare/ingestor-worker
bun run test
bun run deploy
```

Cloudflare requires an account-level `workers.dev` subdomain before Cron Triggers can be attached, even when this Worker keeps `workers_dev = false`. This account uses:

```text
unknowntpo.workers.dev
```

After deploy, Cloudflare Cron Triggers run the Worker on this schedule:

```text
*/5 * * * *
```

The Worker is idempotent per 5-minute slot. If a slot already has a successful projection, later retries skip it unless the manual run uses `?force=1`.

The Worker is scheduled-only by default (`workers_dev = false`), so it does not expose a public URL. If you later add a route or enable workers.dev for manual verification, call the protected endpoint with the configured token:

```bash
curl -X POST \
  -H "Authorization: Bearer <INGESTOR_ADMIN_TOKEN>" \
  https://<ingestor-worker-host>/run
```

Then verify the public Pages API:

```bash
cd frontend
bun run verify:cloudflare-poc -- --url https://twfoundry-poc.pages.dev --min-features 50
```

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
cd frontend
bun run verify:cloudflare-poc -- --url https://<demo-host>
```

The current public POC host is:

```text
https://twfoundry-poc.pages.dev
```

Open `https://<demo-host>/` and verify:

- map renders archived bus vehicle points
- timeline has at least 288 archived slots, plus live slots after the ingestor cron starts writing
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
