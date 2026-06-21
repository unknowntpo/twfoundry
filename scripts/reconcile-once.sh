#!/usr/bin/env python3
"""
reconcile-once.sh (Python version)

Standalone reconciliation trigger for local dev.
Runs the same logic as the Airflow DAG without requiring Airflow to be deployed.

Usage:
    python scripts/reconcile-once.sh [--url http://localhost:8081] [--manifest /path/to/manifest.json]

This is valuable for homelab development where Airflow may not be deployed yet.
"""

import argparse
import json
import logging
import sys
from datetime import datetime, date, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo
from typing import Dict, List, Set

try:
    import requests
except ImportError:
    requests = None

# Add airflow lib to path for utilities
REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "infra" / "airflow"))
from lib.slot_utils import (
    TAIPEI_TZ,
    expected_slot_keys,
    compute_missing_slots,
    slice_missing_for_backfill,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def load_manifest(manifest_path: str) -> Dict:
    """Load manifest from file."""
    path = Path(manifest_path)
    if not path.exists():
        logger.warning(f"Manifest file not found: {manifest_path}. Using empty manifest.")
        return {"snapshots": []}
    
    try:
        with open(path, "r") as f:
            manifest = json.load(f)
        logger.info(f"Loaded manifest with {len(manifest.get('snapshots', []))} snapshots")
        return manifest
    except Exception as e:
        logger.error(f"Failed to load manifest: {e}")
        raise


def reconcile_once(ingest_url: str, manifest_path: str, dry_run: bool = False) -> Dict:
    """
    Run reconciliation once.
    
    Args:
        ingest_url: Base URL of ingestion service
        manifest_path: Path to manifest.json
        dry_run: If True, don't actually call the API
    
    Returns:
        Reconciliation report
    """
    now = datetime.now(tz=TAIPEI_TZ)
    logger.info(f"Running reconciliation at {now.isoformat()}")
    
    # Load manifest
    manifest = load_manifest(manifest_path)
    complete_slots_raw = manifest.get("snapshots", [])
    
    # Extract complete slot keys
    complete_slots: Set[str] = {
        s["slotKey"] for s in complete_slots_raw
        if s.get("status") == "complete"
    }
    logger.info(f"Found {len(complete_slots)} complete slots")
    
    # Compute expected slots
    today = now.date()
    yesterday = today - timedelta(days=1)
    
    expected_today = expected_slot_keys(today, now, grace_minutes=15)
    expected_yesterday = expected_slot_keys(yesterday, now, grace_minutes=0)
    
    missing_today = compute_missing_slots(expected_today, complete_slots)
    missing_yesterday = compute_missing_slots(expected_yesterday, complete_slots)
    
    logger.info(f"Missing today: {len(missing_today)}, Missing yesterday: {len(missing_yesterday)}")
    
    # Prepare report structure
    report = {
        "ranAt": now.isoformat(),
        "dryRun": dry_run,
        "ingestUrl": ingest_url,
        "dates": [],
    }
    
    # Process missing slots
    for date_obj, missing_slots in [
        (today, missing_today),
        (yesterday, missing_yesterday),
    ]:
        to_backfill, remaining = slice_missing_for_backfill(missing_slots, max_backfill_per_run=12)
        
        logger.info(f"Processing {date_obj}: {len(to_backfill)} to backfill, {len(remaining)} remaining")
        
        backfill_succeeded = 0
        backfill_failed = 0
        backfill_skipped = 0
        failed_slots = []
        
        for slot_key in to_backfill:
            try:
                payload = {
                    "slotKey": slot_key,
                    "mode": "backfill",
                    "force": False,
                }
                
                if dry_run:
                    logger.info(f"[DRY RUN] Would POST {ingest_url}/ingest/slots with {slot_key}")
                    backfill_succeeded += 1
                elif requests is None:
                    logger.warning(f"[NO REQUESTS] Would POST {ingest_url}/ingest/slots with {slot_key} (requests module not available)")
                    backfill_succeeded += 1
                else:
                    logger.info(f"Backfilling slot: {slot_key}")
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
                        failed_slots.append(slot_key)
            except Exception as e:
                logger.error(f"Error backfilling {slot_key}: {e}")
                backfill_failed += 1
                failed_slots.append(slot_key)
        
        date_report = {
            "serviceDate": date_obj.isoformat(),
            "expectedCount": len(expected_today) if date_obj == today else len(expected_yesterday),
            "completeCount": len([s for s in (expected_today if date_obj == today else expected_yesterday) if s in complete_slots]),
            "missingCount": len(missing_slots),
            "backfillAttempted": len(to_backfill),
            "backfillSucceeded": backfill_succeeded,
            "backfillFailed": backfill_failed,
            "backfillSkipped": backfill_skipped,
            "remainingMissing": len(remaining),
            "failedSlots": failed_slots,
        }
        report["dates"].append(date_report)
    
    return report


def main():
    parser = argparse.ArgumentParser(
        description="Standalone reconciliation trigger for local dev",
    )
    parser.add_argument(
        "--url",
        default="http://localhost:8081",
        help="Base URL of ingestion service (default: http://localhost:8081)",
    )
    parser.add_argument(
        "--manifest",
        default=str(REPO_ROOT / "services" / "bus-ingestion" / "data" / "bus" / "ingestion" / "manifest.json"),
        help="Path to manifest.json",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be done without actually calling the API",
    )
    
    args = parser.parse_args()
    
    try:
        report = reconcile_once(args.url, args.manifest, dry_run=args.dry_run)
        
        print("\n" + "=" * 70)
        print("RECONCILIATION REPORT")
        print("=" * 70)
        print(json.dumps(report, indent=2))
        print("=" * 70 + "\n")
        
        # Exit with error if any backfills failed
        total_failed = sum(d.get("backfillFailed", 0) for d in report.get("dates", []))
        if total_failed > 0:
            logger.error(f"{total_failed} backfill attempts failed")
            sys.exit(1)
        
        logger.info("Reconciliation completed successfully")
        sys.exit(0)
    
    except Exception as e:
        logger.exception(f"Reconciliation failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
