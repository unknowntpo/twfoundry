#!/usr/bin/env bash
# M2 local smoke: Kafka + bus-ingestion HTTP health (steps 1-4).
# Run from anywhere: services/bus-ingestion/scripts/smoke-local.sh
#
# Step 5 (full ingest e2e) needs TDX_CLIENT_ID and TDX_CLIENT_SECRET.
# POST /ingest/slots will fail auth without them — expected in dev without creds.
#
# Step 5 (Kafka -> lake e2e): after a successful ingest, run services/bus-lake-archiver/
# (consumes normalized.tdx.bus_vehicle_position -> data/lake/bus/vehicle_observations/).
# See services/bus-lake-archiver/README.md and services/bus-ingestion/test-e2e.sh.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${SERVICE_DIR}/../.." && pwd)"
KAFKA_DIR="${REPO_ROOT}/infra/kafka"
HTTP_PORT="${HTTP_PORT:-8081}"
SERVICE_URL="http://127.0.0.1:${HTTP_PORT}"
HEALTH_PATH="/health"
STARTED_PID=""

cleanup() {
  if [[ -n "${STARTED_PID}" ]] && kill -0 "${STARTED_PID}" 2>/dev/null; then
    kill "${STARTED_PID}" 2>/dev/null || true
    wait "${STARTED_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

body_is_bus_ingestion_health() {
  local body="$1"
  echo "${body}" | grep -q '"service"[[:space:]]*:[[:space:]]*"bus-ingestion"' \
    && echo "${body}" | grep -q '"ok"[[:space:]]*:[[:space:]]*true'
}

fetch_health() {
  curl -sf "${SERVICE_URL}${HEALTH_PATH}" 2>/dev/null || true
}

echo "== M2 smoke: bus-ingestion (port ${HTTP_PORT}) =="

echo ""
echo "1/4 Kafka (docker compose up -d)..."
(cd "${KAFKA_DIR}" && docker compose up -d)

echo ""
echo "2/4 Bus topics..."
(cd "${KAFKA_DIR}" && node scripts/create-bus-topics.mjs)

echo ""
echo "3/4 bus-ingestion dependencies..."
(cd "${SERVICE_DIR}" && npm install --silent)

HEALTH_BODY="$(fetch_health)"
if body_is_bus_ingestion_health "${HEALTH_BODY}"; then
  echo ""
  echo "   bus-ingestion already responding on ${SERVICE_URL}${HEALTH_PATH}"
else
  if lsof -i ":${HTTP_PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
    echo ""
    echo "ERROR: port ${HTTP_PORT} is in use but /health is not bus-ingestion." >&2
    echo "       Free the port (e.g. stop another stack on http-alt) or set HTTP_PORT." >&2
    echo "       Current /health body: ${HEALTH_BODY}" >&2
    exit 1
  fi

  echo ""
  echo "   Starting bus-ingestion in background (POLLER_ENABLED=false)..."
  (
    cd "${SERVICE_DIR}"
    export HTTP_PORT POLLER_ENABLED=false
    npm start
  ) >"${TMPDIR:-/tmp}/bus-ingestion-smoke.log" 2>&1 &
  STARTED_PID=$!

  HEALTH_BODY=""
  for _ in $(seq 1 30); do
    HEALTH_BODY="$(fetch_health)"
    if body_is_bus_ingestion_health "${HEALTH_BODY}"; then
      break
    fi
    sleep 0.5
  done
fi

echo ""
echo "4/4 GET ${SERVICE_URL}${HEALTH_PATH}"
echo "${HEALTH_BODY}"
body_is_bus_ingestion_health "${HEALTH_BODY}" || {
  echo "ERROR: unexpected health payload" >&2
  [[ -n "${STARTED_PID}" ]] && echo "See ${TMPDIR:-/tmp}/bus-ingestion-smoke.log" >&2
  exit 1
}

echo ""
echo "Optional: Kafka broker reachability (producer connects on first ingest, not at startup)."
if (cd "${SERVICE_DIR}" && node --input-type=module <<'NODE' 2>/dev/null
import { Kafka } from 'kafkajs';
const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const kafka = new Kafka({ clientId: 'smoke-local', brokers });
const admin = kafka.admin();
await admin.connect();
await admin.listTopics();
await admin.disconnect();
console.log('kafka_admin: ok');
NODE
); then
  :
else
  echo "WARN: could not reach Kafka at ${KAFKA_BROKERS:-localhost:9092}" >&2
fi

if [[ -z "${TDX_CLIENT_ID:-}" || -z "${TDX_CLIENT_SECRET:-}" ]]; then
  echo ""
  echo "NOTE: TDX_CLIENT_ID / TDX_CLIENT_SECRET not set — skipping POST /ingest/slots."
  echo "      Export creds and run: ${SERVICE_DIR}/test-e2e.sh"
else
  echo ""
  echo "TDX creds present — for ingest e2e run: ${SERVICE_DIR}/test-e2e.sh"
fi

echo ""
echo "PASS: M2 smoke (health + Kafka infra)."
