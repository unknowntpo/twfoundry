# Bus Ingestion Service — Phase 1 Implementation Summary

## Files Created

```
services/bus-ingestion/
├── package.json              # Dependencies, scripts
├── package-lock.json         # Lock file (auto-generated)
├── README.md                 # Full documentation
├── .gitignore                # Git ignore rules
├── src/
│   └── index.js             # Main service (HTTP, TDX, Kafka, manifest)
├── test/
│   └── normalize.test.js    # Unit tests (7 tests, 100% pass)
└── test-e2e.sh              # End-to-end test helper script
```

## What's Implemented (Real)

### Core Ingest Flow
- ✅ `ingest_slot(slotKey, mode, { force })` function
- ✅ TDX OAuth2 token fetch
- ✅ TDX Bus.RealTimeByFrequency API call (full city snapshot)
- ✅ Normalization to `twfoundry.normalized.tdx.bus_vehicle_position.v1` schema
  - Snake_case field names per spec
  - Slot bucketing with `slot_key`, `service_date`, `slot_label`
  - Freshness detection (stale > 90s)
  - Completeness score calculation
  - Field filtering (skips missing coords, vehicle_id, route_uid)

### Kafka Producer
- ✅ KafkaJS producer with idempotence enabled (`idempotent: true`)
- ✅ Messages with correct key format: `{slot_key}|{vehicle_id}|{route_uid}|{direction}`
- ✅ Headers: `schema`, `ingest_mode`
- ✅ Acks=all (wait for all replicas)

### Manifest Management
- ✅ Read/write local JSON: `data/bus/ingestion/manifest.json`
- ✅ Schema: `twfoundry.bus.ingestion-manifest.v1`
- ✅ Snapshot tracking: `slotKey`, `serviceDate`, `timeLabel`, `status`, `ingestMode`, `recordCount`, `routeCount`, `capturedAt`, `updatedAt`

### Idempotency
- ✅ Check if slot already in manifest with `status=complete`
- ✅ Skip if complete && !force
- ✅ Allow `force=true` to re-ingest

### HTTP API
- ✅ `GET /health` → `{ ok: true, service: "bus-ingestion" }`
- ✅ `GET /health/leader` → `{ leader: false, holderId, fencingToken }`
- ✅ `POST /ingest/slots` → full async flow
  - Request: `{ slotKey, mode, force }`
  - Response (200 success): `{ ok, skipped, slotKey, mode, recordCount, manifestPath, capturedAt }`
  - Response (200 skip): `{ ok, skipped: true, reason, slotKey, mode }`
  - Response (500 error): `{ ok: false, error, message }`

### Configuration
- ✅ All env vars per spec (TDX credentials, Kafka brokers, ports, etc.)
- ✅ Sensible defaults (localhost:9092, Taipei, 5min intervals)

### Tests
- ✅ 7 unit tests (100% pass)
  - Slot key parsing (valid/invalid formats)
  - Row normalization (fields, filtering, completeness)
  - Slot bucketing (5-minute floor)
  - Edge cases (missing coords, stale timestamps)

## What's Stubbed (Phase 1 Only)

### Poller Lock & Leader Election
- 📌 Returns `leader: false` always
- 📌 Poller loop disabled by default (`POLLER_ENABLED=false`)
- 📌 No R2 ETag CAS or `fencingToken` enforcement
- 📌 No K8s Lease integration

### On-Demand (Backfill) vs Live
- 📌 `POST /ingest/slots` works for backfill (no lock needed)
- 📌 `ingest_mode` in normalized records always set to `"live"` (should vary per mode)

### R2 Storage
- 📌 Manifest uses local filesystem only
- 📌 R2 client not instantiated (easy to add with `wrangler` or AWS SDK)

### Observability
- 📌 No Prometheus metrics
- 📌 No structured logging framework
- 📌 Console logs only

## How to Run Locally (End-to-End)

### 1. Setup Kafka

```bash
cd infra/kafka
docker compose up -d
node scripts/create-bus-topics.mjs
```

Topics created: `normalized.tdx.bus_vehicle_position`, `ops.ingestion.slot_status` (if scripts create them)

### 2. Install Service

```bash
cd services/bus-ingestion
npm install
```

### 3. Start Service

```bash
export TDX_CLIENT_ID="your-client-id"
export TDX_CLIENT_SECRET="your-client-secret"
npm start
# Listens on http://localhost:8080
```

### 4. Test API

```bash
# Health
curl http://localhost:8080/health

# Ingest
curl -X POST http://localhost:8080/ingest/slots \
  -H 'Content-Type: application/json' \
  -d '{
    "slotKey": "2026-06-17T10:05+08:00",
    "mode": "backfill",
    "force": false
  }'

# Verify manifest was written
cat data/bus/ingestion/manifest.json | jq .
```

### 5. Verify Kafka Topic

```bash
cd infra/kafka
docker compose exec kafka kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic normalized.tdx.bus_vehicle_position \
  --from-beginning \
  --max-messages 5
```

Each message: `{ vehicle_id, route_uid, lat, lon, ... }`

## Architecture Compliance

- ✅ Follows `docs/architecture/ingestion-service-v1.md` HTTP API spec
- ✅ Normalizes per `docs/architecture/normalized-bus-vehicle-position-v1.md`
- ✅ Manifest schema per `docs/architecture/bus-ingestion-manifest-v1.md`
- ✅ Slot bucketing per `docs/architecture/tdx-bus-ingestion-slot-bucketing.md`
- ✅ Poller lock spec documented (not implemented Phase 1)
- ⚠️  `fencingToken` is set to 0 (not enforced; future Phase 1.5)

## Reusable from Cloudflare Worker

Adapted from `cloudflare/ingestor-worker/src/index.js`:
- ✅ `taipeiSlot(date, intervalMinutes)` — slot bucketing logic
- ✅ `fetchAccessToken()` — TDX OAuth2 flow
- ✅ `fetchTdxBusRows()` — API call & error handling
- ✅ `normalizeSnapshotRows()` → `normalizeRows()` — field mapping
- ✅ Manifest structure (simplified for JSON)

## Testing

```bash
npm test
# Output: ✔ 7 tests passed
```

## What's NOT Done (Out of Scope)

- ❌ Flink bus-lake-archiver (consumes from Kafka, not part of ingest)
- ❌ Airflow reconciliation job (consumes manifest, not part of ingest)
- ❌ Historical CSV backfill API endpoint (Phase 2+)
- ❌ Multi-region leader election
- ❌ Postgres-backed manifest
- ❌ Metrics/observability

## Next Steps (Phase 1.5+)

1. **Poller Lock**: Implement R2 ETag CAS or K8s Lease
2. **Live Ingest Mode**: Trigger `ingest_slot(..., live)` every 5 minutes from poller
3. **Fencing Token**: Enforce in manifest upsert
4. **R2 Storage**: Add manifest persistence to R2
5. **Metrics**: Prometheus counters/histograms
6. **Error Recovery**: Alerting & reconciliation hooks
