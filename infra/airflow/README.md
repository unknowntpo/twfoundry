# Bus Ingestion Reconciliation DAG (Phase 1)

Airflow DAG for offline reconciliation of bus ingestion slots. Compares expected slots (today + yesterday) with complete slots in the manifest, and triggers backfill for missing slots via the ingestion service.

## Overview

**DAG ID**: `bus_ingestion_reconcile`  
**Schedule**: Every hour at `:15` minute (Asia/Taipei timezone)  
**Timezone**: Asia/Taipei

### Flow

```
manifest → compute_missing → backfill_slots → write_report
```

## Architecture

See `docs/architecture/airflow-reconciliation-bus-v1.md` for full details.

### Key Parameters

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `GRACE_MINUTES` | 15 | Slots within grace period of "now" are excluded from reconciliation (today only) |
| `MAX_BACKFILL_PER_RUN` | 12 | Max backfill attempts per DAG run; prevents overwhelming TDX |
| `INTERVAL_MINUTES` | 5 | Slot duration in minutes |

### Expected Slots

- **Today**: All 5-minute slots from 00:00 to now, minus those in grace period
- **Yesterday**: All 288 slots (24 × 60 ÷ 5)
- **Not reconciled**: Tomorrow or future dates

### Grace Period

A slot is considered "in grace" if `slot_start + 15 min > now`. This avoids false positives due to:
- Poller 5-min cycle delay
- Manifest write latency
- Failover windows

### Complete vs Missing

From manifest `snapshots[]`:
- `status == "complete"` → counted as complete
- `status == "failed"` or missing → counted as missing → backfill triggered

### Backfill Behavior

- Respects `MAX_BACKFILL_PER_RUN = 12` limit
- Processes oldest slots first (ascending slot_key order)
- Remaining missing slots are processed in subsequent runs
- Uses `POST /ingest/slots` with `force=false` (idempotent)
- `200 + skipped: true` → already complete (race with poller)

## Local Development Setup

### Option 1: Standalone (KISS, no Airflow)

For homelab development where Airflow is not yet deployed:

```bash
# Make script executable
chmod +x scripts/reconcile-once.sh

# Create test manifest
mkdir -p data/bus/ingestion
cat > data/bus/ingestion/manifest.json << 'EOF'
{
  "snapshots": [
    {"slotKey": "2026-06-17T10:00+08:00", "status": "complete"},
    {"slotKey": "2026-06-17T10:05+08:00", "status": "complete"}
  ]
}
EOF

# Run reconciliation once (dry-run)
python scripts/reconcile-once.sh --dry-run

# Run against local ingestion service
python scripts/reconcile-once.sh --url http://localhost:8081
```

### Option 2: Airflow Standalone

If you have Airflow installed:

```bash
# Install airflow and dependencies
pip install apache-airflow apache-airflow-providers-http

# Set up Airflow home
export AIRFLOW_HOME=$(pwd)/airflow_home
mkdir -p $AIRFLOW_HOME

# Initialize database
airflow db init

# Create a test admin user
airflow users create \
  --username admin \
  --password admin \
  --firstname Admin \
  --lastname User \
  --role Admin \
  --email admin@twfoundry.local

# Copy DAG files to Airflow dags folder
mkdir -p $AIRFLOW_HOME/dags
cp infra/airflow/dags/bus_ingestion_reconcile.py $AIRFLOW_HOME/dags/
cp -r infra/airflow/lib $AIRFLOW_HOME/

# Run Airflow standalone
airflow standalone
```

Then access the Airflow UI at http://localhost:8080.

## Configuration

### Via Airflow Variables (Recommended)

In Airflow UI, set Admin → Variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `BUS_INGEST_URL` | `http://localhost:8081` | Ingestion service URL |
| `BUS_MANIFEST_R2_BUCKET` | `twfoundry` | R2 bucket name |
| `BUS_MANIFEST_R2_KEY` | `bus/ingestion/manifest.json` | Manifest path in R2 |
| `BUS_CITY` | `Taipei` | City name (for report) |
| `BUS_GRACE_MINUTES` | `15` | Grace period in minutes |
| `BUS_MAX_BACKFILL_PER_RUN` | `12` | Max backfill per run |
| `BUS_RECONCILE_TIMEZONE` | `Asia/Taipei` | Timezone for reconciliation |

### Via Environment

Alternatively, set as environment variables before starting Airflow:

```bash
export AIRFLOW_VAR_BUS_INGEST_URL="http://ingestion-service:8081"
export AIRFLOW_VAR_BUS_GRACE_MINUTES="15"
export AIRFLOW_VAR_BUS_MAX_BACKFILL_PER_RUN="12"
```

## Files

### DAG

- `infra/airflow/dags/bus_ingestion_reconcile.py` — Main DAG definition with tasks

### Utilities

- `infra/airflow/lib/slot_utils.py` — Slot computation logic (unit testable)
  - `expected_slot_keys()` — Generate expected slots with grace logic
  - `compute_missing_slots()` — Compare expected vs complete
  - `slice_missing_for_backfill()` — Respect MAX_BACKFILL limit

### Tests

- `infra/airflow/tests/test_slot_utils.py` — Comprehensive tests for slot logic

### Scripts

- `scripts/reconcile-once.sh` — Standalone reconciliation trigger (no Airflow needed)
- `data/bus/ingestion/manifest.json` — Local manifest fallback for dev

## Running Tests

```bash
# Install test dependencies
pip install pytest

# Run slot utility tests
pytest infra/airflow/tests/test_slot_utils.py -v

# Run specific test
pytest infra/airflow/tests/test_slot_utils.py::TestExpectedSlotKeys::test_yesterday_all_288_slots -v
```

## DAG Tasks

### 1. `compute_missing`

Reads manifest and computes missing slots for today and yesterday.

**Output (XCom)**:
```json
{
  "today": {
    "service_date": "2026-06-18",
    "expected_count": 126,
    "complete_count": 124,
    "missing_count": 2,
    "missing_slots": ["2026-06-18T10:15+08:00", "2026-06-18T10:20+08:00"]
  },
  "yesterday": { ... }
}
```

### 2. `backfill_slots`

Triggers backfill for up to 12 missing slots (oldest first).

**Output (XCom)**:
```json
{
  "dates": [
    {
      "serviceDate": "2026-06-18",
      "expectedCount": 126,
      "completeCount": 124,
      "missingCount": 2,
      "backfillAttempted": 2,
      "backfillSucceeded": 2,
      "backfillFailed": 0,
      "backfillSkipped": 0,
      "missingSlotKeys": [...],
      "remainingMissing": []
    }
  ]
}
```

### 3. `write_report`

Writes reconciliation report to local directory (R2 integration optional).

**Report Schema**:
```json
{
  "schema": "twfoundry.bus.ingestion-reconciliation.v1",
  "dagRunId": "scheduled__2026-06-18T10:15:00+08:00",
  "ranAt": "2026-06-18T10:15:03.000Z",
  "city": "Taipei",
  "graceMinutes": 15,
  "maxBackfillPerRun": 12,
  "dates": [ ... ]
}
```

**Report Location** (dev): `data/bus/ingestion/reconciliation/{YYYY-MM-DD}/{run_id}.json`

## Manifest Format (Local Fallback)

The reconciliation DAG expects a manifest.json in `data/bus/ingestion/`:

```json
{
  "snapshots": [
    {
      "slotKey": "2026-06-17T10:00+08:00",
      "status": "complete",
      "ingestedAt": "2026-06-17T10:05:00Z",
      "routes": 2457,
      "vehicles": 14567
    },
    {
      "slotKey": "2026-06-17T10:05+08:00",
      "status": "failed",
      "reason": "TDX timeout"
    }
  ]
}
```

- `slotKey`: Slot identifier (YYYY-MM-DDTHH:MM+08:00)
- `status`: One of `pending`, `complete`, `failed`
- Only `status == "complete"` are counted as complete

## Manual Operations

### Trigger DAG Immediately

```bash
# Via Airflow CLI
airflow dags trigger bus_ingestion_reconcile

# Via Airflow UI: DAG → Actions → Trigger DAG
```

### Trigger Single Slot Backfill

```bash
# Use reconcile-once.sh to trigger just one slot
curl -X POST http://localhost:8081/ingest/slots \
  -H "Content-Type: application/json" \
  -d '{
    "slotKey": "2026-06-17T10:00+08:00",
    "mode": "backfill",
    "force": true
  }'
```

### View Reports

```bash
# List all reports
ls -la data/bus/ingestion/reconciliation/2026-06-18/

# View specific report
cat data/bus/ingestion/reconciliation/2026-06-18/scheduled__2026-06-18T10:15:00+08:00.json
```

## Failure Scenarios

| Scenario | Behavior |
|----------|----------|
| Manifest not found | DAG logs warning, uses empty manifest (all slots treated as missing) |
| Backfill 5xx error | Recorded as failed, slot remains missing, next run retries |
| Backfill timeout | Recorded as failed, next run retries |
| Partial backfill > 12 | Remaining slots processed in next hourly run |
| Report write fails | DAG task fails, next run retries |

## Roadmap (Not Phase 1)

- [ ] R2 credential integration (read manifest, write reports)
- [ ] PagerDuty/alerting for reconciliation anomalies
- [ ] DAG parameter for custom `service_date`
- [ ] Minute-level gap watcher (currently hourly reconciliation only)
- [ ] Per-route partial slot backfill
- [ ] Auto-adjust `MAX_BACKFILL` based on TDX rate limit headers

## Related Documentation

- `docs/architecture/airflow-reconciliation-bus-v1.md` — Design specification
- `docs/architecture/bus-ingestion-manifest-v1.md` — Manifest schema
- `docs/architecture/ingestion-service-v1.md` — Ingestion service API
- `docs/architecture/tdx-bus-ingestion-slot-bucketing.md` — Slot bucketing logic
- `docs/architecture/technical-decisions-log.md` — Architecture decisions
