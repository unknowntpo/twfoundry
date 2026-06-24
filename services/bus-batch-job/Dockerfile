FROM node:20-alpine

COPY --from=oven/bun:1.2.15-alpine /usr/local/bin/bun /usr/local/bin/bun

RUN apk add --no-cache bash ca-certificates curl \
  && npm install -g wrangler@4

WORKDIR /repo

COPY infra/clickhouse/scripts ./infra/clickhouse/scripts
COPY frontend/scripts/publish-clickhouse-bus-analytics.mjs ./frontend/scripts/publish-clickhouse-bus-analytics.mjs

ENV CLICKHOUSE_URL=http://clickhouse:8123 \
    CLICKHOUSE_DATABASE=twfoundry \
    CLICKHOUSE_USER=default \
    CLICKHOUSE_PASSWORD="" \
    R2_BUCKET=twfoundry-poc-archive \
    WRANGLER_BIN=wrangler

CMD ["node", "infra/clickhouse/scripts/run-bus-service-health-pipeline.mjs"]
