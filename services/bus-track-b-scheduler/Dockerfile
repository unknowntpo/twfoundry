# Track B k8s scheduler: baked-in repo subset for scripts/track-b-daemon.sh.
FROM node:22-alpine

COPY --from=oven/bun:1.2.15-alpine /usr/local/bin/bun /usr/local/bin/bun

RUN apk add --no-cache bash curl \
  && npm install -g wrangler@4

WORKDIR /repo

COPY scripts ./scripts
COPY services/bus-projection-publisher ./services/bus-projection-publisher
COPY cloudflare ./cloudflare
# bus-projection-publisher imports ../../../frontend/functions/_shared/busProjectionContract.js
COPY frontend/functions/_shared ./frontend/functions/_shared

ENV WRANGLER_BIN=wrangler \
    TRACK_B_INGEST_URL=http://bus-ingestion:8081 \
    TRACK_B_LAKE_PATH=/lake \
    TRACK_B_PROJECTION_OUTPUT_PATH=/repo/cloudflare/artifacts/bus-projections-track-b \
    TRACK_B_INTERVAL_SECONDS=300 \
    TRACK_B_ARCHIVER_SETTLE_SECONDS=75 \
    TRACK_B_UPLOAD_R2=true \
    TRACK_B_IMPORT_CLICKHOUSE=false

CMD ["bash", "scripts/track-b-daemon.sh"]
