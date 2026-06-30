FROM node:20-alpine

COPY --from=oven/bun:1.2.15-alpine /usr/local/bin/bun /usr/local/bin/bun

RUN apk add --no-cache bash ca-certificates curl \
  && npm install -g wrangler@4

WORKDIR /repo

COPY infra/clickhouse/scripts ./infra/clickhouse/scripts
COPY frontend/scripts/publish-clickhouse-bus-analytics.mjs ./frontend/scripts/publish-clickhouse-bus-analytics.mjs
# UNK-37: publish imports ./lib/busDetectionRules.mjs which reads repo-root contracts/
# (the same detection-rule contract the Flink speed layer uses). Both must be in the image.
COPY frontend/scripts/lib ./frontend/scripts/lib
COPY contracts/bus-detection-rules.v1.json ./contracts/bus-detection-rules.v1.json
# UNK-61: the lake loader map-matches each position against route geometry so the batch
# layer populates route_progress_ratio / distance_to_route_meters (needed for bunching /
# service-gap detection). buildRouteProgressObservation + the route-context shapes must be
# in the image. Route-context is ~32MB of static TDX geometry; acceptable for a batch image.
COPY frontend/src/busRouteGeometry.js ./frontend/src/busRouteGeometry.js
COPY frontend/public/data/tdx-bus/route-context ./frontend/public/data/tdx-bus/route-context

ENV CLICKHOUSE_URL=http://clickhouse:8123 \
    CLICKHOUSE_DATABASE=twfoundry \
    CLICKHOUSE_USER=default \
    CLICKHOUSE_PASSWORD="" \
    R2_BUCKET=twfoundry-poc-archive \
    WRANGLER_BIN=wrangler

CMD ["node", "infra/clickhouse/scripts/run-bus-service-health-pipeline.mjs"]
