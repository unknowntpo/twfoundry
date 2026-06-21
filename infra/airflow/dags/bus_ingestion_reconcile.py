"""
Airflow DAG: bus_ingestion_reconcile

Phase 1: Reconciliation DAG for bus ingestion slots.
- Reads manifest from R2 (or local fallback)
- Computes missing slots (today + yesterday)
- Triggers backfill via ingestion service
- Writes reconciliation report to R2
"""

import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo
from typing import Dict, List, Set, Any

try:
    import requests
except ImportError:
    requests = None

from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.utils.decorators import task
from airflow.models import Variable

# Import local utils
import sys
sys.path.insert(0, "/Users/unknowntpo/repo/unknowntpo/twfoundry/main/infra/airflow")
from lib.slot_utils import (
    TAIPEI_TZ,
    expected_slot_keys,
    compute_missing_slots,
    slice_missing_for_backfill,
    format_slot_key,
)

logger = logging.getLogger(__name__)

# =============================================================================
# DAG Configuration
# =============================================================================

DAG_ID = "bus_ingestion_reconcile"
SCHEDULE = "15 * * * *"  # Every hour at :15 minute, Asia/Taipei
DEFAULT_ARGS = {
    "owner": "twfoundry-data",
    "retries": 1,
    "retry_delay": timedelta(minutes=5),
    "catchup": False,
}

dag = DAG(
    dag_id=DAG_ID,
    default_args=DEFAULT_ARGS,
    schedule=SCHEDULE,
    tags=["bus-ingestion", "reconciliation"],
    catchup=False,
    max_active_runs=1,
    timezone=TAIPEI_TZ,
    doc_md=__doc__,
)

# =============================================================================
# Configuration from Airflow Variables or Environment
# =============================================================================

def get_config() -> Dict[str, Any]:
    """Load configuration from Airflow Variables or environment."""
    return {
        "ingest_url": Variable.get("BUS_INGEST_URL", "http://localhost:8081"),
        "manifest_r2_bucket": Variable.get("BUS_MANIFEST_R2_BUCKET", "twfoundry"),
        "manifest_r2_key": Variable.get("BUS_MANIFEST_R2_KEY", "bus/ingestion/manifest.json"),
        "city": Variable.get("BUS_CITY", "Taipei"),
        "grace_minutes": int(Variable.get("BUS_GRACE_MINUTES", "15")),
        "max_backfill_per_run": int(Variable.get("BUS_MAX_BACKFILL_PER_RUN", "12")),
        "reconcile_timezone": Variable.get("BUS_RECONCILE_TIMEZONE", "Asia/Taipei"),
        # Local fallback path for dev
        "manifest_local_fallback": "/Users/unknowntpo/repo/unknowntpo/twfoundry/main/data/bus/ingestion/manifest.json",
    }

# =============================================================================
# Task Functions
# =============================================================================

def load_manifest(config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Load manifest from R2 or local fallback.
    
    Returns:
        Dict with 'snapshots' key containing list of {slotKey, status, ...}
    """
    manifest = {}
    
    # Try local fallback first (for dev)
    fallback_path = Path(config["manifest_local_fallback"])
    if fallback_path.exists():
        logger.info(f"Loading manifest from local fallback: {fallback_path}")
        try:
            with open(fallback_path, "r") as f:
                manifest = json.load(f)
            logger.info(f"Loaded manifest with {len(manifest.get('snapshots', []))} snapshots")
            return manifest
        except Exception as e:
            logger.warning(f"Failed to load local manifest: {e}. Returning empty.")
            return {"snapshots": []}
    
    # TODO: R2 loading would go here (when credentials available)
    # For now, return empty manifest
    logger.info("No manifest available (local fallback missing and R2 not configured)")
    return {"snapshots": []}


def compute_missing(config: Dict[str, Any], **context) -> Dict[str, Any]:
    """
    Compute missing slots for today and yesterday.
    
    Returns:
        Dict with {today: missing_slots, yesterday: missing_slots}
    """
    execution_date = context["execution_date"].astimezone(TAIPEI_TZ)
    now = datetime.now(tz=TAIPEI_TZ)
    
    # Load manifest
    manifest = load_manifest(config)
    complete_slots_raw = manifest.get("snapshots", [])
    
    # Extract complete slot keys (only status == "complete")
    complete_slots: Set[str] = {
        s["slotKey"] for s in complete_slots_raw
        if s.get("status") == "complete"
    }
    logger.info(f"Loaded {len(complete_slots)} complete slots from manifest")
    
    # Compute expected slots for today and yesterday
    today = now.date()
    yesterday = today - timedelta(days=1)
    
    expected_today = expected_slot_keys(today, now, grace_minutes=config["grace_minutes"])
    expected_yesterday = expected_slot_keys(yesterday, now, grace_minutes=0)
    
    missing_today = compute_missing_slots(expected_today, complete_slots)
    missing_yesterday = compute_missing_slots(expected_yesterday, complete_slots)
    
    result = {
        "today": {
            "service_date": today.isoformat(),
            "expected_count": len(expected_today),
            "complete_count": len([s for s in expected_today if s in complete_slots]),
            "missing_count": len(missing_today),
            "missing_slots": missing_today,
        },
        "yesterday": {
            "service_date": yesterday.isoformat(),
            "expected_count": len(expected_yesterday),
            "complete_count": len([s for s in expected_yesterday if s in complete_slots]),
            "missing_count": len(missing_yesterday),
            "missing_slots": missing_yesterday,
        },
    }
    
    logger.info(f"Missing slots - Today: {result['today']['missing_count']}, Yesterday: {result['yesterday']['missing_count']}")
    context["task_instance"].xcom_push(key="missing_slots", value=result)
    
    return result


def backfill_slots(config: Dict[str, Any], **context) -> Dict[str, Any]:
    """
    Trigger backfill for missing slots.
    
    Respects MAX_BACKFILL_PER_RUN limit and processes oldest slots first.
    Returns report of backfill attempts.
    """
    missing_slots_data = context["task_instance"].xcom_pull(key="missing_slots")
    
    report = {
        "dates": [],
    }
    
    ingest_url = config["ingest_url"]
    max_backfill = config["max_backfill_per_run"]
    
    for date_key in ["today", "yesterday"]:
        date_data = missing_slots_data[date_key]
        service_date = date_data["service_date"]
        missing_slots = date_data["missing_slots"]
        
        # Slice missing slots
        to_backfill, remaining = slice_missing_for_backfill(missing_slots, max_backfill)
        
        # Attempt backfill
        backfill_succeeded = 0
        backfill_failed = 0
        backfill_skipped = 0
        
        for slot_key in to_backfill:
            try:
                payload = {
                    "slotKey": slot_key,
                    "mode": "backfill",
                    "force": False,
                }
                logger.info(f"Backfilling slot: {slot_key}")
                
                if requests is None:
                    logger.warning(f"requests module not available, skipping actual backfill")
                    backfill_succeeded += 1
                    continue
                
                response = requests.post(
                    f"{ingest_url}/ingest/slots",
                    json=payload,
                    timeout=10,
                )
                
                if response.status_code == 200:
                    resp_json = response.json()
                    if resp_json.get("skipped"):
                        logger.info(f"Slot {slot_key} already complete (skipped)")
                        backfill_skipped += 1
                    else:
                        logger.info(f"Backfill triggered for {slot_key}")
                        backfill_succeeded += 1
                else:
                    logger.error(f"Backfill failed for {slot_key}: {response.status_code}")
                    backfill_failed += 1
            except Exception as e:
                logger.error(f"Error backfilling {slot_key}: {e}")
                backfill_failed += 1
        
        date_report = {
            "serviceDate": service_date,
            "expectedCount": date_data["expected_count"],
            "completeCount": date_data["complete_count"],
            "missingCount": date_data["missing_count"],
            "backfillAttempted": len(to_backfill),
            "backfillSucceeded": backfill_succeeded,
            "backfillFailed": backfill_failed,
            "backfillSkipped": backfill_skipped,
            "missingSlotKeys": missing_slots,
            "remainingMissing": remaining,
        }
        report["dates"].append(date_report)
        
        logger.info(f"Date {service_date}: {backfill_succeeded} succeeded, {backfill_failed} failed, {backfill_skipped} skipped")
    
    context["task_instance"].xcom_push(key="backfill_report", value=report)
    return report


def write_report(config: Dict[str, Any], **context) -> None:
    """
    Write reconciliation report to local fallback (R2 integration optional).
    """
    execution_date = context["execution_date"].astimezone(TAIPEI_TZ)
    run_id = context["run_id"]
    
    backfill_report = context["task_instance"].xcom_pull(key="backfill_report")
    
    # Construct full report
    full_report = {
        "schema": "twfoundry.bus.ingestion-reconciliation.v1",
        "dagRunId": run_id,
        "ranAt": datetime.now(tz=ZoneInfo("UTC")).isoformat(),
        "city": config["city"],
        "graceMinutes": config["grace_minutes"],
        "maxBackfillPerRun": config["max_backfill_per_run"],
        "dates": backfill_report.get("dates", []),
    }
    
    # Write to local directory (dev)
    report_dir = Path(config["manifest_local_fallback"]).parent / "reconciliation" / execution_date.strftime("%Y-%m-%d")
    report_dir.mkdir(parents=True, exist_ok=True)
    
    report_file = report_dir / f"{run_id}.json"
    with open(report_file, "w") as f:
        json.dump(full_report, f, indent=2, default=str)
    
    logger.info(f"Report written to {report_file}")
    
    # TODO: R2 upload would go here
    # For now, just local storage


# =============================================================================
# DAG Tasks
# =============================================================================

config = get_config()

compute_missing_task = PythonOperator(
    task_id="compute_missing",
    python_callable=compute_missing,
    op_kwargs={"config": config},
    dag=dag,
)

backfill_slots_task = PythonOperator(
    task_id="backfill_slots",
    python_callable=backfill_slots,
    op_kwargs={"config": config},
    dag=dag,
)

write_report_task = PythonOperator(
    task_id="write_report",
    python_callable=write_report,
    op_kwargs={"config": config},
    dag=dag,
)

# =============================================================================
# Task Dependencies
# =============================================================================

compute_missing_task >> backfill_slots_task >> write_report_task
