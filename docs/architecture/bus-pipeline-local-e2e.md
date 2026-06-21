# Bus Pipeline Local E2E Guide

**Last updated:** 2026-06-19

Simple ordered steps to bring up the entire Phase 1 bus pipeline locally for development.

## Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Python 3.9+
- TDX credentials (optional for smoke test, but needed for real data)

## Step-by-Step Setup

### 1. Start Kafka

```bash
cd infra/kafka

# Start broker and other containers
docker compose up -d

# Create bus topics (normalized.tdx.bus_vehicle_position + DLQ)
npm install
node scripts/create-bus-topics.mjs
```

Wait for broker to be healthy:
```bash
docker compose logs kafka | grep "started"
```

### 2. Start bus-ingestion service

```bash
cd services/bus-ingestion

npm install

# Set TDX credentials (if testing with real data; optional for dry-run)
export TDX_CLIENT_ID="<your-client-id>"
export TDX_CLIENT_SECRET="<your-client-secret>"

# HTTP_PORT defaults to 8081
npm start
```

Service listens on `http://localhost:8081`.

Verify health:
```bash
curl http://localhost:8081/health
# Expected: { "ok": true, "service": "bus-ingestion" }
```

### 3. (Optional) POST real ingest with TDX credentials

If you have TDX credentials configured:

```bash
curl -X POST http://localhost:8081/ingest/slots \
  -H 'Content-Type: application/json' \
  -d '{
    "slotKey": "2026-06-17T10:05+08:00",
    "mode": "live",
    "force": false
  }'
```

Expected response if successful (200):
```json
{
  "ok": true,
  "skipped": false,
  "slotKey": "2026-06-17T10:05+08:00",
  "mode": "live",
  "recordCount": 203,
  "manifestPath": "data/bus/ingestion/manifest.json",
  "capturedAt": "2026-06-17T02:05:15.000Z"
}
```

Check Kafka has messages:
```bash
cd infra/kafka

docker compose exec kafka-1 kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic normalized.tdx.bus_vehicle_position \
  --from-beginning \
  --max-messages 3
```

### 4. Start bus-lake-archiver

Dev Node consumer (interim; prod target is Flink + Iceberg):

```bash
cd services/bus-lake-archiver
npm install

KAFKA_BROKERS=localhost:9092 \
START_FROM_BEGINNING=true \
CHECKPOINT_INTERVAL_MS=60000 \
npm start
```

After ingest, expect `data/lake/{service_date}.jsonl` with one row per vehicle-in-slot.

Quick automated check:

```bash
bash scripts/verify-archiver-e2e.sh
```

**Note:** Topic must not use broker LZ4 compression (kafkajs consumer lacks LZ4). Use `create-bus-topics.mjs` as-is; producer sends gzip.

### 5. Build projection artifacts from lake (Track B interim)

```bash
cd services/bus-projection-publisher
npm install

SERVICE_DATE=2026-06-19 \
OUTPUT_PATH=../../cloudflare/artifacts/bus-projections-track-b \
npm start
```

Optional upload to R2 (separate bucket prefix recommended until cutover):

```bash
cd cloudflare
bun scripts/upload-bus-projections.mjs \
  --input-root artifacts/bus-projections-track-b \
  --prefix bus/projections-track-b
```

### 6. Run reconcile-once (dry-run mode)

Standalone reconciliation script for local testing (no Airflow required):

```bash
cd /path/to/twfoundry/main

# Dry-run mode (shows what would be posted without actually calling the API)
python scripts/reconcile-once.sh --dry-run --url http://localhost:8081 \
  --manifest services/bus-ingestion/data/bus/ingestion/manifest.json

# Real run (actually calls the backfill API)
python scripts/reconcile-once.sh --url http://localhost:8081 --manifest data/bus/ingestion/manifest.json
```

**Arguments:**
- `--url` (default: `http://localhost:8081`): ingestion service base URL
- `--manifest` (default: `data/bus/ingestion/manifest.json`): path to manifest.json
- `--dry-run` (flag): show what would happen without making API calls

Expected output (dry-run):
```
======================================================================
RECONCILIATION REPORT
======================================================================
{
  "ranAt": "2026-06-18T...",
  "dryRun": true,
  "ingestUrl": "http://localhost:8081",
  "dates": [
    {
      "serviceDate": "2026-06-18",
      "expectedCount": 97,
      "completeCount": 2,
      "missingCount": 95,
      "backfillAttempted": 12,
      "backfillSucceeded": 12,
      "backfillFailed": 0,
      "backfillSkipped": 0,
      "remainingMissing": 83,
      "failedSlots": []
    },
    ...
  ]
}
======================================================================
```

## Verification & Debugging

### Check Kafka Topics

```bash
cd infra/kafka

# List all topics
docker compose exec kafka-1 kafka-topics --list --bootstrap-server localhost:9092

# Describe topic
docker compose exec kafka-1 kafka-topics --describe \
  --topic normalized.tdx.bus_vehicle_position \
  --bootstrap-server localhost:9092
```

### Check Manifest

```bash
cat services/bus-ingestion/data/bus/ingestion/manifest.json | jq '.snapshots | length, .[0]'
```

### Run E2E Smoke Test

When both ingestion and archiver are ready:

```bash
# From root directory
bash scripts/smoke-local.sh
```

This runs a complete E2E flow and reports pass/fail.

### Debug Reconciliation

```bash
# Show all logs for reconciliation
python scripts/reconcile-once.sh --dry-run 2>&1 | grep -i "missing\|backfill\|error"

# Check manifest for a specific date
cat data/bus/ingestion/manifest.json | jq '.snapshots[] | select(.serviceDate == "2026-06-18")'
```

## Full Shutdown

```bash
# Stop ingestion service (Ctrl+C in its terminal)
# Stop bus-lake-archiver (if running)
# Stop Kafka
cd infra/kafka
docker compose down -v
```

## Related Docs

- Architecture: `docs/architecture/ingestion-service-v1.md`
- Airflow DAG: `docs/architecture/airflow-reconciliation-bus-v1.md`
- Manifest contract: `docs/architecture/bus-ingestion-manifest-v1.md`
- Reconciliation design: `docs/architecture/airflow-reconciliation-bus-v1.md`
- Kafka topics: `docs/architecture/kafka-topics-bus-v1.md`
- Lake archiver (pending): `docs/architecture/bus-lake-archiver-v1.md`
- E2E milestones: `docs/architecture/bus-pipeline-e2e-milestones.md`
