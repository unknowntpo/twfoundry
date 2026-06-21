"""
Slot utilities for Airflow reconciliation DAG.

Handles expected slot generation with grace period logic,
and comparison with complete slots from manifest.
"""

from datetime import datetime, timedelta, date
from zoneinfo import ZoneInfo
from typing import List, Set


TAIPEI_TZ = ZoneInfo("Asia/Taipei")
INTERVAL_MINUTES = 5
GRACE_MINUTES = 15


def format_slot_key(dt: datetime) -> str:
    """
    Format a datetime as slot_key: YYYY-MM-DDTHH:MM+08:00
    Assumes dt is in Asia/Taipei timezone.
    """
    if dt.tzinfo is None or dt.tzinfo != TAIPEI_TZ:
        raise ValueError("datetime must be in Asia/Taipei timezone")
    return dt.strftime("%Y-%m-%dT%H:%M%z").replace("+0800", "+08:00")


def parse_slot_key(slot_key: str) -> datetime:
    """Parse slot_key back to datetime in Asia/Taipei timezone."""
    # Format: 2026-06-17T10:05+08:00
    dt_str = slot_key.replace("+08:00", "")
    dt = datetime.fromisoformat(dt_str)
    return dt.replace(tzinfo=TAIPEI_TZ)


def floor_to_slot(dt: datetime) -> datetime:
    """Floor datetime to nearest 5-minute slot start in Asia/Taipei."""
    if dt.tzinfo is None:
        raise ValueError("datetime must be timezone-aware")
    if dt.tzinfo != TAIPEI_TZ:
        dt = dt.astimezone(TAIPEI_TZ)
    
    # Floor to 5-minute interval
    minute = (dt.minute // INTERVAL_MINUTES) * INTERVAL_MINUTES
    return dt.replace(minute=minute, second=0, microsecond=0)


def expected_slot_keys(
    service_date: date,
    now: datetime,
    grace_minutes: int = GRACE_MINUTES,
) -> List[str]:
    """
    Compute expected slot keys for a given service_date.
    
    Args:
        service_date: Date to compute slots for (Asia/Taipei date)
        now: Current time (must be Asia/Taipei)
        grace_minutes: Grace period in minutes (for today only)
    
    Returns:
        List of slot_keys in ascending order.
    
    Logic:
    - For yesterday and older: all 288 slots (5 min × 288 = 1440 min = 24 hours)
    - For today: all slots where slot_start + grace_minutes <= now
    - Returns slots as YYYY-MM-DDTHH:MM+08:00 format
    """
    if now.tzinfo is None or now.tzinfo != TAIPEI_TZ:
        raise ValueError("now must be in Asia/Taipei timezone")
    
    today = now.date()
    slots = []
    
    day_start = datetime(
        service_date.year,
        service_date.month,
        service_date.day,
        0,
        0,
        0,
        tzinfo=TAIPEI_TZ,
    )
    
    for i in range(288):  # 24 * 60 / 5 = 288 slots per day
        slot_start = day_start + timedelta(minutes=INTERVAL_MINUTES * i)
        
        # Break if slot crosses into next day
        if slot_start.date() > service_date:
            break
        
        # Apply grace period for today
        if service_date == today:
            slot_grace_end = slot_start + timedelta(minutes=grace_minutes)
            if slot_grace_end > now:
                # Slot still within grace period, skip it
                continue
        
        slots.append(format_slot_key(slot_start))
    
    return slots


def get_expected_slots_for_reconciliation(
    now: datetime,
    grace_minutes: int = GRACE_MINUTES,
) -> dict:
    """
    Get expected slots for today and yesterday.
    
    Args:
        now: Current time (must be Asia/Taipei)
        grace_minutes: Grace period in minutes
    
    Returns:
        Dict with keys "today" and "yesterday", each mapping to list of slot_keys.
    """
    if now.tzinfo is None or now.tzinfo != TAIPEI_TZ:
        raise ValueError("now must be in Asia/Taipei timezone")
    
    today = now.date()
    yesterday = today - timedelta(days=1)
    
    return {
        "today": expected_slot_keys(today, now, grace_minutes),
        "yesterday": expected_slot_keys(yesterday, now, grace_minutes=0),
    }


def compute_missing_slots(
    expected_slots: List[str],
    complete_slots: Set[str],
) -> List[str]:
    """
    Compute missing slots: expected - complete.
    
    Args:
        expected_slots: List of expected slot_keys (ascending order)
        complete_slots: Set of complete slot_keys from manifest
    
    Returns:
        List of missing slot_keys (ascending order).
    """
    expected_set = set(expected_slots)
    missing = expected_set - complete_slots
    return sorted(list(missing))


def slice_missing_for_backfill(
    missing_slots: List[str],
    max_backfill_per_run: int,
) -> tuple:
    """
    Slice missing slots respecting MAX_BACKFILL_PER_RUN limit.
    
    Args:
        missing_slots: List of missing slot_keys (ascending)
        max_backfill_per_run: Maximum backfill per run
    
    Returns:
        Tuple (to_backfill, remaining) where:
        - to_backfill: slots to process now (up to max_backfill_per_run)
        - remaining: slots to process in future runs
    """
    to_backfill = missing_slots[:max_backfill_per_run]
    remaining = missing_slots[max_backfill_per_run:]
    return to_backfill, remaining
