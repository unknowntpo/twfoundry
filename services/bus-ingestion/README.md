# Bus Ingestion Service — Phase 1 Skeleton

Minimal Node.js service for ingesting TDX real-time bus position data into Kafka, with manifest tracking and HTTP API.

## Architecture

- **Core**: `ingest_slot(slotKey, mode, options)` → TDX fetch → normalize → Kafka produce → manifest upsert
- **HTTP**: `POST /ingest/slots` for on-demand backfill (Airflow), `GET /health` checks
- **Manifest**: Local JSON (`data/bus/ingestion/manifest.json`) or R2 when env vars present
- **Poller**: Stub only in Phase 1 (no HA lock yet)

## Local Development

### Prerequisites

- Node.js 18+
- Kafka running (see setup below)
- TDX credentials (optional for testing health check only)

### Setup Kafka & Topics

```bash
cd infra/kafka

# Start containers
docker compose up -d

# Create bus topics
node scripts/create-bus-topics.mjs
```

### Install & Run Service

```bash
cd services/bus-ingestion

npm install

# Start the service (requires TDX credentials for /ingest/slots to work)
export TDX_CLIENT_ID="<your-tdx-client-id>"
export TDX_CLIENT_SECRET="<your-tdx-client-secret>"
npm start
```

Service will listen on `http://localhost:8081`.

## HTTP API

### Health Check

```bash
curl http://localhost:8081/health
# Response:
# { "ok": true, "service": "bus-ingestion" }
```

### Leader Health Check (stub)

```bash
curl http://localhost:8081/health/leader
# Response:
# { "leader": false, "holderId": "ingest-...", "fencingToken": 0 }
```

### Ingest Slot (On-Demand)

```bash
curl -X POST http://localhost:8081/ingest/slots \
  -H 'Content-Type: application/json' \
  -d '{
    "slotKey": "2026-06-17T10:05+08:00",
    "mode": "backfill",
    "force": false
  }'
```

**Response (success)**:
```json
{
  "ok": true,
  "skipped": false,
  "slotKey": "2026-06-17T10:05+08:00",
  "mode": "backfill",
  "recordCount": 203,
  "manifestPath": "data/bus/ingestion/manifest.json",
  "capturedAt": "2026-06-17T02:05:15.000Z"
}
```

**Response (idempotent skip)**:
```json
{
  "ok": true,
  "skipped": true,
  "reason": "slot_already_complete",
  "slotKey": "2026-06-17T10:05+08:00",
  "mode": "backfill"
}
```

## Manifest

Lives at `data/bus/ingestion/manifest.json` (default) or `$MANIFEST_PATH`.

Schema: `twfoundry.bus.ingestion-manifest.v1`

```json
{
  "schema": "twfoundry.bus.ingestion-manifest.v1",
  "city": "Taipei",
  "intervalMinutes": 5,
  "generatedAt": "2026-06-17T12:00:00.000Z",
  "latestCompleteSlotKey": "2026-06-17T11:55+08:00",
  "snapshots": [
    {
      "slotKey": "2026-06-17T10:05+08:00",
      "serviceDate": "2026-06-17",
      "timeLabel": "10:05",
      "status": "complete",
      "ingestMode": "backfill",
      "fencingToken": 0,
      "recordCount": 203,
      "routeCount": 17,
      "capturedAt": "2026-06-17T02:05:12.345Z",
      "updatedAt": "2026-06-17T02:05:15.000Z",
      "lastError": null
    }
  ]
}
```

## Kafka Topic

Topic: `normalized.tdx.bus_vehicle_position`

Each message contains one vehicle-in-slot observation, normalized to `twfoundry.normalized.tdx.bus_vehicle_position.v1`.

### Message Key
```
{slot_key}|{vehicle_id}|{route_uid}|{direction}
```

### Example Message Value
```json
{
  "schema": "twfoundry.normalized.tdx.bus_vehicle_position.v1",
  "slot_key": "2026-06-17T10:05+08:00",
  "service_date": "2026-06-17",
  "slot_label": "10:05",
  "city": "Taipei",
  "vehicle_id": "550-U5",
  "route_uid": "TPE10181",
  "route_name": "205",
  "direction": 0,
  "longitude": 121.508478,
  "latitude": 25.02442,
  "speed_kph": 20,
  "azimuth_deg": 224,
  "gps_time": "2026-06-17T10:04:49+08:00",
  "update_time": "2026-06-17T10:04:55+08:00",
  "freshness": "fresh",
  "completeness": 1.0,
  "ingest_mode": "live",
  "source_dataset": "Bus.RealTimeByFrequency.City",
  "ingested_at": "2026-06-17T02:05:12.345Z"
}
```

## Verify End-to-End

### 1. Check Kafka topic has messages

```bash
cd infra/kafka

docker compose exec kafka kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic normalized.tdx.bus_vehicle_position \
  --from-beginning \
  --max-messages 5
```

### 2. Check manifest was written

```bash
cat data/bus/ingestion/manifest.json | jq .
```

### 3. Trigger another ingest with force

```bash
curl -X POST http://localhost:8081/ingest/slots \
  -H 'Content-Type: application/json' \
  -d '{
    "slotKey": "2026-06-17T10:10+08:00",
    "mode": "live",
    "force": false
  }'
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HTTP_PORT` | `8081` | HTTP server port |
| `TDX_CLIENT_ID` | (required) | TDX API client ID |
| `TDX_CLIENT_SECRET` | (required) | TDX API client secret |
| `TDX_AUTH_URL` | `https://tdx.transportdata.tw/auth/...` | TDX auth endpoint |
| `TDX_API_BASE_URL` | `https://tdx.transportdata.tw/api/basic/v2` | TDX API base URL |
| `TDX_CITY` | `Taipei` | City for TDX API |
| `TDX_TOP` | `1200` | Max records per TDX request |
| `INGEST_INTERVAL_MINUTES` | `5` | Slot interval (minutes) |
| `KAFKA_BROKERS` | `localhost:9092` | Comma-separated Kafka brokers |
| `KAFKA_TOPIC` | `normalized.tdx.bus_vehicle_position` | Target Kafka topic |
| `MANIFEST_PATH` | `data/bus/ingestion/manifest.json` | Manifest file path |
| `POLLER_LOCK_PATH` | `data/bus/ingestion/poller-lock.json` | Poller lock file (unused Phase 1) |
| `POLLER_ENABLED` | `false` | Enable poller (stub in Phase 1) |
| `INSTANCE_ID` | `ingest-{timestamp}` | Instance identifier |

## Tests

```bash
npm test
```

Tests cover:
- Slot key parsing and validation
- Row normalization (fields, filtering, completeness)
- Slot bucketing (5-minute floor)

## Stubbed vs Real

### ✓ Real
- HTTP server + request routing
- TDX OAuth2 token fetch and API call
- Row normalization (fields, filtering)
- Kafka produce with idempotence & acks=all
- Manifest read/write (local JSON or R2 if env vars present)
- Idempotency check (skip if already complete)

### 📌 Stubbed (Phase 1)
- Poller lock & leader election (returns `leader: false` always)
- Poller background loop (no-op)
- `force=true` override still works but doesn't enforce additional validation
- R2 integration (uses local file system; can add R2 client later)
- Fencing token enforcement (set to 0; manifest accepts all upserts)

## Integration Notes

### Airflow
Call `POST /ingest/slots` with `mode: backfill` for missing slots (use `BUS_INGEST_URL` env var or default to `http://bus-ingestion:8081`):
```python
requests.post(
  f'{os.getenv("BUS_INGEST_URL", "http://bus-ingestion:8081")}/ingest/slots',
  json={'slotKey': slot_key, 'mode': 'backfill', 'force': False}
)
```

### Flink / bus-lake-archiver
Consumes from `normalized.tdx.bus_vehicle_position` topic. Merge key: `(slot_key, vehicle_id, route_uid, direction)`.

### Dashboard
Reads manifest to display data latency via `latestCompleteSlotKey`.

## Future (Phase 1.5+)

- [ ] Poller lock via R2 ETag CAS or K8s Lease
- [ ] Live ingest mode in poller loop
- [ ] R2 manifest storage
- [ ] Fencing token enforcement
- [ ] Multi-region leader election
- [ ] Prometheus metrics

## Architecture Docs

- `docs/architecture/ingestion-service-v1.md` — service modes & API spec
- `docs/architecture/normalized-bus-vehicle-position-v1.md` — message schema
- `docs/architecture/bus-ingestion-manifest-v1.md` — manifest contract
- `docs/architecture/poller-lock-v1.md` — leader election (not yet implemented)
- `docs/architecture/tdx-bus-ingestion-slot-bucketing.md` — slot semantics & TDX fetch logic
