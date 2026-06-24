"""Daily bus service-health batch roll-up (KubernetesPodOperator).

Mirrors the `bus-batch-daily` CronJob: launches the verified `bus-batch-job`
image to run the same two-stage pipeline on the prior service day —

    extract+load lake -> ClickHouse  ->  publish dated dataset  ->  upload to R2

The batch logic lives in the Node/Bun scripts baked into the image
(`infra/clickhouse/scripts/*.mjs`), so the same code path runs locally, in the
CronJob, and here. This DAG only schedules + launches the pod; the Celery
worker stays vanilla and just needs pod-launch rights.

Runs in the `twfoundry-data` namespace so the launched pod can mount the
`bus-lake` PVC and read the `twfoundry-track-b-secrets` Cloudflare creds, exactly
as the CronJob does.
"""

from __future__ import annotations

import pendulum
from airflow import DAG
from airflow.providers.cncf.kubernetes.operators.pod import KubernetesPodOperator
from airflow.providers.cncf.kubernetes.secret import Secret
from kubernetes.client import models as k8s

NAMESPACE = "twfoundry-data"
IMAGE = "ghcr.io/unknowntpo/twfoundry/bus-batch-job:latest"

# The SERVICE_DATE env var is injected by the DAG (data_interval_end in
# Asia/Taipei).  Falls back to yesterday if unset, for manual `kubectl exec`.
BATCH_SCRIPT = r"""
SERVICE_DATE="${SERVICE_DATE:=$(node -e "console.log(new Date(Date.now()+8*3600e3-86400e3).toISOString().slice(0,10));")}"
echo "SERVICE_DATE=${SERVICE_DATE}"
node infra/clickhouse/scripts/run-bus-service-health-pipeline.mjs \
  --service-date "${SERVICE_DATE}" \
  --lookback-days 7 \
  --lake-dir /lake \
  --output-root /out
node infra/clickhouse/scripts/upload-bus-analytics.mjs \
  --input-root /out \
  --prefix analytics/bus \
  --wrangler wrangler
"""

# Cloudflare creds come from the existing secret, same as the CronJob.
cloudflare_secrets = [
    Secret("env", "CLOUDFLARE_API_TOKEN", "twfoundry-track-b-secrets", "CLOUDFLARE_API_TOKEN"),
    Secret("env", "CLOUDFLARE_ACCOUNT_ID", "twfoundry-track-b-secrets", "CLOUDFLARE_ACCOUNT_ID"),
]

lake_volume = k8s.V1Volume(
    name="bus-lake",
    persistent_volume_claim=k8s.V1PersistentVolumeClaimVolumeSource(
        claim_name="bus-lake", read_only=True
    ),
)
output_volume = k8s.V1Volume(
    name="output",
    empty_dir=k8s.V1EmptyDirVolumeSource(size_limit="512Mi"),
)
volume_mounts = [
    k8s.V1VolumeMount(name="bus-lake", mount_path="/lake", read_only=True),
    k8s.V1VolumeMount(name="output", mount_path="/out"),
]

default_args = {
    "retries": 2,
    "retry_delay": pendulum.duration(minutes=5),
}

with DAG(
    dag_id="bus_service_health_daily",
    description="Roll up lake observations into the rolling bus service-health dataset",
    schedule="30 3 * * *",  # 03:30 Asia/Taipei — same slot as the CronJob it replaces
    start_date=pendulum.datetime(2026, 6, 1, tz="Asia/Taipei"),
    catchup=False,
    max_active_runs=1,
    default_args=default_args,
    params={"service_date": ""},
    tags=["twfoundry", "batch", "bus"],
) as dag:
    # Priority: 1) --conf service_date  2) data_interval_end - 1d  3) empty → bash fallback
    service_date = (
        "{% if params.service_date | default('') %}"
        "{{ params.service_date }}"
        "{% elif data_interval_end is defined %}"
        "{{ (data_interval_end - macros.timedelta(days=1)).in_tz('Asia/Taipei').format('YYYY-MM-DD') }}"
        "{% endif %}"
    )

    KubernetesPodOperator(
        task_id="roll_up_and_upload",
        name="bus-batch-airflow",
        namespace=NAMESPACE,
        image=IMAGE,
        image_pull_policy="Always",
        cmds=["/bin/bash", "-ec"],
        arguments=[BATCH_SCRIPT],
        env_vars={
            "SERVICE_DATE": service_date,
            "CLICKHOUSE_URL": "http://clickhouse:8123",
            "CLICKHOUSE_DATABASE": "twfoundry",
            "CLICKHOUSE_USER": "default",
            "CLICKHOUSE_PASSWORD": "",
            "R2_BUCKET": "twfoundry-poc-archive",
        },
        secrets=cloudflare_secrets,
        volumes=[lake_volume, output_volume],
        volume_mounts=volume_mounts,
        container_resources=k8s.V1ResourceRequirements(
            requests={"cpu": "100m", "memory": "256Mi"},
            limits={"cpu": "500m", "memory": "512Mi"},
        ),
        get_logs=True,
        on_finish_action="delete_pod",
    )
