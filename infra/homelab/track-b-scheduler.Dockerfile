# Track B homelab scheduler: runs scripts/track-b-daemon.sh in a loop.
# Runtime-only image — the repo (scripts/, services/bus-projection-publisher,
# cloudflare/) is bind-mounted at /repo by docker-compose, so script edits do
# not require an image rebuild.
FROM node:22-alpine

# bun is required because scripts/track-b-cycle.sh invokes the R2 upload via `bun`.
COPY --from=oven/bun:1.2.15-alpine /usr/local/bin/bun /usr/local/bin/bun

# bash + curl for the cycle script; wrangler (global) for non-interactive R2 puts.
RUN apk add --no-cache bash curl \
  && npm install -g wrangler@4

WORKDIR /repo

# WRANGLER_BIN=wrangler -> upload-bus-projections.mjs runs `wrangler r2 object put`
# directly (no bunx/npx runtime download). Auth via CLOUDFLARE_API_TOKEN +
# CLOUDFLARE_ACCOUNT_ID env supplied by compose.
ENV WRANGLER_BIN=wrangler \
    TRACK_B_INGEST_URL=http://bus-ingestion:8081 \
    TRACK_B_LAKE_PATH=/lake \
    TRACK_B_PROJECTION_OUTPUT_PATH=/repo/cloudflare/artifacts/bus-projections-track-b \
    TRACK_B_INTERVAL_SECONDS=300 \
    TRACK_B_ARCHIVER_SETTLE_SECONDS=75

CMD ["bash", "scripts/track-b-daemon.sh"]
