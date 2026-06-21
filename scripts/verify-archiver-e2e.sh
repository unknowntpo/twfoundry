#!/bin/bash
set -e

# E2E verification script for bus-lake-archiver
#
# Demonstrates: Kafka → normalized topic → archiver → lake JSONL
#
# Usage:
#   bash scripts/verify-archiver-e2e.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
KAFKA_SERVICE="${KAFKA_SERVICE:-kafka-1}"
ARCHIVER_PID=""

cleanup() {
  if [ -n "$ARCHIVER_PID" ]; then
    kill "$ARCHIVER_PID" 2>/dev/null || true
    wait "$ARCHIVER_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT

echo "[E2E] Starting bus-lake-archiver verification..."
echo "[E2E] Repo root: ${REPO_ROOT}"

cd "${REPO_ROOT}/infra/kafka"

if ! nc -z localhost 9092 2>/dev/null; then
  echo "[E2E] Kafka not running, starting docker compose..."
  docker compose up -d
  for i in {1..30}; do
    if nc -z localhost 9092 2>/dev/null; then
      echo "[E2E] Kafka is ready"
      break
    fi
    sleep 1
  done
fi

echo "[E2E] Ensuring topics exist..."
node scripts/create-bus-topics.mjs

echo "[E2E] Posting sample normalized messages..."
cat > /tmp/sample_messages.jsonl << 'EOF'
{"schema":"twfoundry.normalized.tdx.bus_vehicle_position.v1","slot_key":"2026-06-17T10:05+08:00","service_date":"2026-06-17","slot_label":"10:05","city":"Taipei","vehicle_id":"550-U5","route_uid":"TPE10181","route_name":"205","direction":0,"longitude":121.508478,"latitude":25.02442,"speed_kph":20,"azimuth_deg":224,"gps_time":"2026-06-17T10:04:49+08:00","update_time":"2026-06-17T10:04:55+08:00","freshness":"fresh","completeness":1.0,"ingest_mode":"live","source_dataset":"Bus.RealTimeByFrequency.City","ingested_at":"2026-06-17T02:05:12.345Z"}
{"schema":"twfoundry.normalized.tdx.bus_vehicle_position.v1","slot_key":"2026-06-17T10:05+08:00","service_date":"2026-06-17","slot_label":"10:05","city":"Taipei","vehicle_id":"550-U6","route_uid":"TPE10182","route_name":"206","direction":0,"longitude":121.510000,"latitude":25.025000,"speed_kph":25,"azimuth_deg":180,"gps_time":"2026-06-17T10:04:50+08:00","update_time":"2026-06-17T10:04:56+08:00","freshness":"fresh","completeness":1.0,"ingest_mode":"live","source_dataset":"Bus.RealTimeByFrequency.City","ingested_at":"2026-06-17T02:05:13.000Z"}
{"schema":"twfoundry.normalized.tdx.bus_vehicle_position.v1","slot_key":"2026-06-17T10:10+08:00","service_date":"2026-06-17","slot_label":"10:10","city":"Taipei","vehicle_id":"550-U5","route_uid":"TPE10181","route_name":"205","direction":0,"longitude":121.509000,"latitude":25.024000,"speed_kph":22,"azimuth_deg":225,"gps_time":"2026-06-17T10:09:49+08:00","update_time":"2026-06-17T10:09:55+08:00","freshness":"fresh","completeness":1.0,"ingest_mode":"live","source_dataset":"Bus.RealTimeByFrequency.City","ingested_at":"2026-06-17T02:10:12.000Z"}
EOF

cat /tmp/sample_messages.jsonl | docker compose exec -T "${KAFKA_SERVICE}" kafka-console-producer \
  --bootstrap-server localhost:9092 \
  --topic normalized.tdx.bus_vehicle_position

cd "${REPO_ROOT}/services/bus-lake-archiver"
if [ ! -d node_modules ]; then
  npm install --quiet
fi

LAKE_DIR="${REPO_ROOT}/data/lake/e2e-verify"
rm -rf "${LAKE_DIR}"
mkdir -p "${LAKE_DIR}"

KAFKA_BROKERS=localhost:9092 \
LAKE_PATH="${LAKE_DIR}" \
CHECKPOINT_INTERVAL_MS=3000 \
START_FROM_BEGINNING=true \
KAFKA_GROUP_ID="bus-lake-archiver-e2e-$(date +%s)" \
npm start > /tmp/archiver-e2e.log 2>&1 &
ARCHIVER_PID=$!

echo "[E2E] Archiver started (PID: $ARCHIVER_PID)"
sleep 8
kill "$ARCHIVER_PID" 2>/dev/null || true
wait "$ARCHIVER_PID" 2>/dev/null || true
ARCHIVER_PID=""

echo ""
echo "=========================================="
echo "[E2E] ARCHIVER LOG (tail)"
echo "=========================================="
tail -20 /tmp/archiver-e2e.log || true
echo ""

LAKE_FILE="${LAKE_DIR}/2026-06-17.jsonl"
if [ -f "$LAKE_FILE" ]; then
  ROW_COUNT=$(wc -l < "$LAKE_FILE" | tr -d ' ')
  echo "[E2E] PASS: ${LAKE_FILE} has ${ROW_COUNT} rows"
  head -1 "$LAKE_FILE"
  exit 0
fi

echo "[E2E] FAIL: expected ${LAKE_FILE}"
exit 1
