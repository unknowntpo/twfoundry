"""Daily bus service-health batch roll-up.

Orchestrates the batch-layer stages that the local
`run-bus-service-health-pipeline.mjs` runs, on a daily schedule:

    extract+load lake -> ClickHouse  ->  publish dated dataset  ->  upload to R2

The task logic lives in the verified Node/Bun scripts under
`infra/clickhouse/scripts/` and `frontend/scripts/`; this DAG only schedules and
chains them so the same code path runs locally and on the cluster.

STATUS: NOT YET DEPLOYED. This DAG is committed for review. Deploying needs an
Airflow instance on the homelab cluster with: the repo checked out at
`twfoundry_repo_root`, Node + Bun available to the workers, ClickHouse reachable
(CLICKHOUSE_* env / Airflow connection), the lake mounted/synced under
`data/lake/`, and wrangler auth + R2 access for the upload task. See
infra/clickhouse/README.md.
"""

from __future__ import annotations

import pendulum
from airflow import DAG
from airflow.operators.bash import BashOperator

# Repo root on the worker; override with `airflow variables set twfoundry_repo_root /path`.
REPO = "{{ var.value.get('twfoundry_repo_root', '/opt/twfoundry') }}"
# The just-completed service day (DAG runs early next morning for `ds`'s prior day).
SERVICE_DATE = "{{ macros.ds_add(ds, -1) }}"
OUTPUT_ROOT = f"{REPO}/data/analytics-rolling/bus"

default_args = {
    "retries": 2,
    "retry_delay": pendulum.duration(minutes=5),
}

with DAG(
    dag_id="bus_service_health_daily",
    description="Roll up lake observations into the rolling bus service-health dataset",
    schedule="0 1 * * *",  # 01:00 daily (server tz); the prior service day is complete
    start_date=pendulum.datetime(2026, 6, 1, tz="Asia/Taipei"),
    catchup=False,
    max_active_runs=1,
    default_args=default_args,
    tags=["twfoundry", "batch", "bus"],
) as dag:
    # Stage 1+2: load each lake day in the trailing window into ClickHouse, then
    # publish the dated multi-day rolling dataset. Idempotent per service_date.
    roll_up = BashOperator(
        task_id="roll_up",
        bash_command=(
            f"node {REPO}/infra/clickhouse/scripts/run-bus-service-health-pipeline.mjs "
            f"--service-date {SERVICE_DATE} --lookback-days 7 --output-root {OUTPUT_ROOT}"
        ),
    )

    # Stage 3: publish the dataset to R2 under analytics/bus/ for the dashboard.
    upload_r2 = BashOperator(
        task_id="upload_r2",
        bash_command=(
            f"node {REPO}/infra/clickhouse/scripts/upload-bus-analytics.mjs "
            f"--input-root {OUTPUT_ROOT} --prefix analytics/bus"
        ),
    )

    roll_up >> upload_r2
