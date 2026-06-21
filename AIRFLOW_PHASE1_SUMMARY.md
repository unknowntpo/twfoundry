# Airflow Reconciliation DAG Phase 1 — Implementation Summary

**Status**: ✅ Complete  
**Timestamp**: 2026-06-18  
**Related Docs**: `docs/architecture/airflow-reconciliation-bus-v1.md`

## Deliverables

### 1. Core DAG Implementation

**File**: `infra/airflow/dags/bus_ingestion_reconcile.py`

- **DAG ID**: `bus_ingestion_reconcile`
- **Schedule**: `15 * * * *` (every hour at :15 minute, Asia/Taipei)
- **Timezone**: Asia/Taipei
- **Catchup**: Disabled
- **Max active runs**: 1

**Tasks**:
1. `compute_missing` — Load manifest, calculate missing slots for today + yesterday
2. `backfill_slots` — Trigger backfill for up to 12 missing slots (oldest first)
3. `write_report` — Write reconciliation report to local directory

**Configuration** (via Airflow Variables or environment):
```
BUS_INGEST_URL              (default: http://localhost:8080)
BUS_MANIFEST_R2_BUCKET      (default: twfoundry)
BUS_MANIFEST_R2_KEY         (default: bus/ingestion/manifest.json)
BUS_CITY                    (default: Taipei)
BUS_GRACE_MINUTES           (default: 15)
BUS_MAX_BACKFILL_PER_RUN    (default: 12)
BUS_RECONCILE_TIMEZONE      (default: Asia/Taipei)
```

### 2. Slot Utilities Library

**File**: `infra/airflow/lib/slot_utils.py` (unit testable)

Functions:
- `format_slot_key(dt)` — Convert datetime to "YYYY-MM-DDTHH:MM+08:00" format
- `parse_slot_key(slot_key)` — Parse slot key back to datetime
- `floor_to_slot(dt)` — Floor datetime to nearest 5-minute boundary
- `expected_slot_keys(service_date, now, grace_minutes)` — Generate expected slots with grace logic
- `get_expected_slots_for_reconciliation(now, grace_minutes)` — Get today + yesterday expected slots
- `compute_missing_slots(expected, complete)` — Calculate missing slots
- `slice_missing_for_backfill(missing, max_backfill_per_run)` — Respect backfill limit

**Grace Period Logic**:
- Slots where `slot_start + 15min > now` are excluded from today's reconciliation
- Reason: Covers poller 5-min cycle + manifest write latency + failover windows
- Yesterday always has all 288 slots (no grace)

### 3. Comprehensive Tests

**File**: `infra/airflow/tests/test_slot_utils.py`

**Test Coverage** (all passing):
- ✓ `TestFormatSlotKey` — Slot key formatting
- ✓ `TestParseSlotKey` — Slot key parsing
- ✓ `TestFloorToSlot` — 5-minute floor logic
- ✓ `TestExpectedSlotKeys` — Expected slot generation (today/yesterday)
- ✓ `TestComputeMissingSlots` — Missing slot calculation
- ✓ `TestSliceMissingForBackfill` — MAX_BACKFILL_PER_RUN respecting
- ✓ `TestGetExpectedSlotsForReconciliation` — Full reconciliation logic

**Example Test Results**:
```
✓ Yesterday has 288 slots
✓ Today has 124 slots (with 15-min grace at 10:30)
✓ Missing slots correctly identified
✓ Backfill slicing respects 12-slot limit
```

### 4. Standalone Reconciliation Script

**File**: `scripts/reconcile-once.sh` (executable)

Runs the same reconciliation logic without requiring Airflow deployment. **Perfect for homelab dev**.

**Usage**:
```bash
# Dry-run (no API calls)
python scripts/reconcile-once.sh --dry-run --manifest data/bus/ingestion/manifest.json

# Against local ingestion service
python scripts/reconcile-once.sh --url http://localhost:8080

# Custom manifest path
python scripts/reconcile-once.sh --url http://localhost:8080 --manifest /custom/path/manifest.json
```

**Output**: Formatted JSON report with backfill status

**Example Output**:
```
Missing today: 165, Missing yesterday: 285
Processing 2026-06-18: 12 to backfill, 153 remaining
Processing 2026-06-17: 12 to backfill, 273 remaining

RECONCILIATION REPORT
{
  "ranAt": "2026-06-18T13:58:30.676267+08:00",
  "dryRun": true,
  "dates": [
    {
      "serviceDate": "2026-06-18",
      "expectedCount": 165,
      "completeCount": 0,
      "missingCount": 165,
      "backfillAttempted": 12,
      "backfillSucceeded": 12,
      "backfillFailed": 0,
      "backfillSkipped": 0,
      "remainingMissing": 153
    }
  ]
}
```

### 5. Documentation

**File**: `infra/airflow/README.md`

Complete guide covering:
- DAG architecture and task flow
- Configuration options
- Local dev setup (standalone + Airflow)
- Running tests
- Manual operations (trigger DAG, backfill single slot, view reports)
- Failure scenarios and recovery

### 6. Test Manifest

**File**: `data/bus/ingestion/manifest.json`

Sample manifest for local testing with status variants (complete, failed).

## File Structure

```
infra/airflow/
├── dags/
│   └── bus_ingestion_reconcile.py       # Main DAG
├── lib/
│   ├── __init__.py
│   └── slot_utils.py                    # Slot utilities (unit testable)
├── tests/
│   ├── __init__.py
│   └── test_slot_utils.py               # Comprehensive tests
├── __init__.py
└── README.md                             # Setup and usage guide

scripts/
└── reconcile-once.sh                     # Standalone reconciliation tool

data/bus/ingestion/
├── manifest.json                         # Sample manifest for dev
└── reconciliation/                       # Report output directory
    └── {YYYY-MM-DD}/
        └── {run_id}.json
```

## How to Run Reconciliation Locally

### Option 1: Standalone (No Airflow Required) ⭐ KISS for Homelab

```bash
# Test with dry-run
python scripts/reconcile-once.sh --dry-run

# Run against real local ingestion service
python scripts/reconcile-once.sh

# Custom ingestion service URL
python scripts/reconcile-once.sh --url http://ingestion-service.local:8080
```

**No dependencies**: Only Python 3.12+. Works even if Airflow isn't deployed.

### Option 2: Full Airflow Setup (Optional)

```bash
# Install Airflow
pip install apache-airflow apache-airflow-providers-http

# Initialize database
airflow db init

# Create admin user
airflow users create --username admin --password admin --role Admin

# Set Airflow home
export AIRFLOW_HOME=$(pwd)/airflow_home
mkdir -p $AIRFLOW_HOME/dags

# Copy DAG files
cp infra/airflow/dags/bus_ingestion_reconcile.py $AIRFLOW_HOME/dags/
cp -r infra/airflow/lib $AIRFLOW_HOME/

# Run Airflow standalone
airflow standalone

# Access UI: http://localhost:8080
# Trigger DAG manually or wait for hourly schedule
```

## Running Tests

```bash
# Run slot utility tests (no pytest needed, manual validation also works)
python infra/airflow/tests/test_slot_utils.py

# Example output:
# ✓ ALL TESTS PASSED (8 test scenarios)
```

## Key Implementation Decisions

1. **Grace Period = 15 minutes**
   - Covers: poller cycle (5 min) + manifest write latency + failover windows
   - Only applies to today; yesterday uses all 288 slots

2. **MAX_BACKFILL_PER_RUN = 12**
   - Prevents overwhelming TDX API
   - Remaining missing slots processed in next hourly run
   - Processed in ascending order (oldest slots first)

3. **Manifest Fallback Strategy**
   - Tries local `data/bus/ingestion/manifest.json` first (dev)
   - TODO: R2 loading with read credentials
   - If missing: treats all slots as missing (safe)

4. **Standalone Script is Primary Dev Tool**
   - `reconcile-once.sh` enables testing without Airflow deployment
   - Runs identical slot logic as DAG
   - Perfect for homelab iterations before full Airflow setup

5. **Report Format**
   - Schema: `twfoundry.bus.ingestion-reconciliation.v1`
   - Includes: expected/complete/missing counts, backfill status, remaining slots
   - Stored locally: `data/bus/ingestion/reconciliation/{YYYY-MM-DD}/{run_id}.json`
   - TODO: R2 upload with write credentials

## What's NOT in Phase 1

- R2 credential integration (TODO after dev validation)
- PagerDuty/alerting (future)
- Custom service_date DAG parameter (today + yesterday only for Phase 1)
- Minute-level gap watcher (hourly reconciliation only)
- Per-route partial slot backfill (backfill full slot at a time)

## Technical Compliance

✅ Conforms to `docs/architecture/airflow-reconciliation-bus-v1.md`
✅ Follows project patterns: slot format, grace logic, max backfill
✅ KISS principle: reconcile-once.sh enables dev without Airflow
✅ Unit testable utilities with comprehensive test coverage
✅ No external service dependencies until Airflow/ingestion service online
✅ Local fallback strategy for all file dependencies

## Next Steps

1. **Deploy ingestion service** to local environment (http://localhost:8080)
2. **Test reconcile-once.sh** against running service:
   ```bash
   python scripts/reconcile-once.sh --url http://localhost:8080
   ```
3. **Add R2 credentials** to Airflow for manifest read + report write
4. **Deploy Airflow** (if full orchestration needed)
5. **Monitor reports** at `data/bus/ingestion/reconciliation/{date}/`

---

**Status**: Phase 1 skeleton complete. Ready for integration testing with ingestion service.
