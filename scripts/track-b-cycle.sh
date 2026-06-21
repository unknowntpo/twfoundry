#!/usr/bin/env bash

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

INGEST_URL="${TRACK_B_INGEST_URL:-http://localhost:8081}"
INTERVAL_MINUTES="${INGEST_INTERVAL_MINUTES:-5}"
FORCE="${TRACK_B_FORCE:-false}"
DRY_RUN="${TRACK_B_DRY_RUN:-false}"
ARCHIVER_SETTLE_SECONDS="${TRACK_B_ARCHIVER_SETTLE_SECONDS:-70}"
LAKE_PATH="${TRACK_B_LAKE_PATH:-${REPO_ROOT}/data/lake}"
PROJECTION_OUTPUT_PATH="${TRACK_B_PROJECTION_OUTPUT_PATH:-${REPO_ROOT}/cloudflare/artifacts/bus-projections-track-b}"
R2_PREFIX="${TRACK_B_R2_PREFIX:-bus/projections-track-b}"
# Track B #1 cutover goal = keep R2 projection fresh → upload defaults ON.
# ClickHouse import is the separate gap/bunching detection layer → defaults OFF
# (opt in with TRACK_B_IMPORT_CLICKHOUSE=true).
UPLOAD_R2="${TRACK_B_UPLOAD_R2:-true}"
IMPORT_CLICKHOUSE="${TRACK_B_IMPORT_CLICKHOUSE:-false}"
PUBLISH_ANALYTICS="${TRACK_B_PUBLISH_ANALYTICS:-false}"
ANALYTICS_LIMIT="${TRACK_B_ANALYTICS_LIMIT:-50}"

json_escape() {
  local value="${1:-}"
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  value="${value//$'\n'/\\n}"
  value="${value//$'\r'/\\r}"
  printf '%s' "${value}"
}

log_json() {
  local level="$1"
  local event="$2"
  shift 2
  local timestamp
  timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  printf '{"ts":"%s","level":"%s","event":"%s"' "${timestamp}" "${level}" "${event}"
  while (($# > 0)); do
    local key="$1"
    local value="${2:-}"
    shift 2
    printf ',"%s":"%s"' "$(json_escape "${key}")" "$(json_escape "${value}")"
  done
  printf '}\n'
}

bool_value() {
  case "${1:-}" in
    true|TRUE|1|yes|YES) printf 'true' ;;
    *) printf 'false' ;;
  esac
}

compute_slot() {
  TRACK_B_INTERVAL_MINUTES="${INTERVAL_MINUTES}" node <<'NODE'
const interval = Number(process.env.TRACK_B_INTERVAL_MINUTES || '5');
if (!Number.isFinite(interval) || interval <= 0) {
  throw new Error('INGEST_INTERVAL_MINUTES must be a positive number');
}
const now = process.env.TRACK_B_NOW ? new Date(process.env.TRACK_B_NOW) : new Date();
if (Number.isNaN(now.getTime())) {
  throw new Error('TRACK_B_NOW must be parseable as a Date');
}
const flooredMs = Math.floor(now.getTime() / (interval * 60 * 1000)) * interval * 60 * 1000;
const taipei = new Date(flooredMs + 8 * 60 * 60 * 1000);
const serviceDate = taipei.toISOString().slice(0, 10);
const timeLabel = taipei.toISOString().slice(11, 16);
console.log(`${serviceDate}T${timeLabel}+08:00 ${serviceDate}`);
NODE
}

slot_key="${TRACK_B_SLOT_KEY:-}"
service_date=""
if [[ -z "${slot_key}" ]]; then
  slot_info="$(compute_slot)" || exit 2
  slot_key="${slot_info%% *}"
  service_date="${slot_info##* }"
else
  if [[ ! "${slot_key}" =~ ^([0-9]{4}-[0-9]{2}-[0-9]{2})T[0-9]{2}:[0-9]{2}\+08:00$ ]]; then
    log_json error invalid_slot_key slotKey "${slot_key}"
    exit 2
  fi
  service_date="${BASH_REMATCH[1]}"
fi

cycle_started_ms="$(date +%s000)"
log_json info cycle_start slotKey "${slot_key}" serviceDate "${service_date}" dryRun "${DRY_RUN}"

run_or_dry() {
  local step="$1"
  shift
  log_json info step_start step "${step}"
  if [[ "$(bool_value "${DRY_RUN}")" == "true" ]]; then
    log_json info dry_run step "${step}" command "$*"
    log_json info step_end step "${step}" exitStatus "0" durationMs "0"
    return 0
  fi

  local started_ms
  started_ms="$(date +%s000)"
  "$@"
  local status=$?
  local ended_ms
  ended_ms="$(date +%s000)"
  log_json info step_end step "${step}" exitStatus "${status}" durationMs "$((ended_ms - started_ms))"
  return "${status}"
}

run_publish_projections() {
  local step="publish_projections"
  local command_text="cd ${REPO_ROOT}/services/bus-projection-publisher && LAKE_PATH=${LAKE_PATH} OUTPUT_PATH=${PROJECTION_OUTPUT_PATH} SERVICE_DATE=${service_date} R2_PREFIX=${R2_PREFIX} npm start"
  log_json info step_start step "${step}"
  if [[ "$(bool_value "${DRY_RUN}")" == "true" ]]; then
    log_json info dry_run step "${step}" command "${command_text}"
    log_json info step_end step "${step}" exitStatus "0" durationMs "0"
    return 0
  fi

  local started_ms
  started_ms="$(date +%s000)"
  (
    cd "${REPO_ROOT}/services/bus-projection-publisher" || exit 1
    LAKE_PATH="${LAKE_PATH}" \
      OUTPUT_PATH="${PROJECTION_OUTPUT_PATH}" \
      SERVICE_DATE="${service_date}" \
      R2_PREFIX="${R2_PREFIX}" \
      npm start
  )
  local status=$?
  local ended_ms
  ended_ms="$(date +%s000)"
  log_json info step_end step "${step}" exitStatus "${status}" durationMs "$((ended_ms - started_ms))"
  return "${status}"
}

run_publish_analytics() {
  local step="publish_analytics"
  local command_text="cd ${REPO_ROOT}/frontend && bun run publish:clickhouse-bus-analytics -- --service-date ${service_date} --limit ${ANALYTICS_LIMIT}"
  log_json info step_start step "${step}"
  if [[ "$(bool_value "${DRY_RUN}")" == "true" ]]; then
    log_json info dry_run step "${step}" command "${command_text}"
    log_json info step_end step "${step}" exitStatus "0" durationMs "0"
    return 0
  fi

  local started_ms
  started_ms="$(date +%s000)"
  (
    cd "${REPO_ROOT}/frontend" || exit 1
    bun run publish:clickhouse-bus-analytics -- --service-date "${service_date}" --limit "${ANALYTICS_LIMIT}"
  )
  local status=$?
  local ended_ms
  ended_ms="$(date +%s000)"
  log_json info step_end step "${step}" exitStatus "${status}" durationMs "$((ended_ms - started_ms))"
  return "${status}"
}

run_upload_r2() {
  local step="upload_r2"
  local command_text="cd ${REPO_ROOT}/cloudflare && bun scripts/upload-bus-projections.mjs --input-root ${PROJECTION_OUTPUT_PATH} --prefix ${R2_PREFIX}"
  log_json info step_start step "${step}"
  if [[ "$(bool_value "${DRY_RUN}")" == "true" ]]; then
    log_json info dry_run step "${step}" command "${command_text}"
    log_json info step_end step "${step}" exitStatus "0" durationMs "0"
    return 0
  fi

  local started_ms
  started_ms="$(date +%s000)"
  (
    cd "${REPO_ROOT}/cloudflare" || exit 1
    bun scripts/upload-bus-projections.mjs \
      --input-root "${PROJECTION_OUTPUT_PATH}" \
      --prefix "${R2_PREFIX}"
  )
  local status=$?
  local ended_ms
  ended_ms="$(date +%s000)"
  log_json info step_end step "${step}" exitStatus "${status}" durationMs "$((ended_ms - started_ms))"
  return "${status}"
}

ingest_slot() {
  local force_json
  force_json="$(bool_value "${FORCE}")"
  local body
  body="$(TRACK_B_SLOT_KEY="${slot_key}" TRACK_B_FORCE="${force_json}" node <<'NODE'
console.log(JSON.stringify({
  slotKey: process.env.TRACK_B_SLOT_KEY,
  mode: 'live',
  force: process.env.TRACK_B_FORCE === 'true',
}));
NODE
)"

  log_json info step_start step ingest_slot url "${INGEST_URL}/ingest/slots" slotKey "${slot_key}"
  if [[ "$(bool_value "${DRY_RUN}")" == "true" ]]; then
    log_json info dry_run step ingest_slot command "curl -fsS -X POST ${INGEST_URL}/ingest/slots -H content-type:application/json --data ${body}"
    log_json info step_end step ingest_slot exitStatus "0" durationMs "0"
    return 0
  fi

  local started_ms
  started_ms="$(date +%s000)"
  local response
  response="$(curl -fsS -X POST "${INGEST_URL}/ingest/slots" \
    -H 'Content-Type: application/json' \
    --data "${body}")"
  local curl_status=$?
  if [[ "${curl_status}" -ne 0 ]]; then
    local ended_ms
    ended_ms="$(date +%s000)"
    log_json error step_end step ingest_slot exitStatus "${curl_status}" durationMs "$((ended_ms - started_ms))"
    return "${curl_status}"
  fi

  local validate_output
  validate_output="$(TRACK_B_INGEST_RESPONSE="${response}" node <<'NODE'
const response = JSON.parse(process.env.TRACK_B_INGEST_RESPONSE);
if (!response.ok) {
  console.error(JSON.stringify({
    ok: false,
    error: response.error || 'ingest_failed',
    message: response.message || null,
  }));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  skipped: Boolean(response.skipped),
  recordCount: response.recordCount ?? null,
  reason: response.reason ?? null,
}));
NODE
)"
  local validate_status=$?
  local ended_ms
  ended_ms="$(date +%s000)"
  if [[ "${validate_status}" -ne 0 ]]; then
    log_json error ingest_result response "${validate_output}"
    log_json error step_end step ingest_slot exitStatus "${validate_status}" durationMs "$((ended_ms - started_ms))"
    return "${validate_status}"
  fi

  log_json info ingest_result response "${validate_output}"
  log_json info step_end step ingest_slot exitStatus "0" durationMs "$((ended_ms - started_ms))"
  return 0
}

fail_cycle() {
  local status="$1"
  local step="$2"
  local cycle_ended_ms
  cycle_ended_ms="$(date +%s000)"
  log_json error cycle_end slotKey "${slot_key}" serviceDate "${service_date}" exitStatus "${status}" failedStep "${step}" durationMs "$((cycle_ended_ms - cycle_started_ms))"
  exit "${status}"
}

ingest_slot || fail_cycle "$?" ingest_slot

if [[ "$(bool_value "${DRY_RUN}")" != "true" && "${ARCHIVER_SETTLE_SECONDS}" -gt 0 ]]; then
  log_json info archiver_settle_start seconds "${ARCHIVER_SETTLE_SECONDS}"
  sleep "${ARCHIVER_SETTLE_SECONDS}"
  log_json info archiver_settle_end seconds "${ARCHIVER_SETTLE_SECONDS}"
elif [[ "$(bool_value "${DRY_RUN}")" == "true" ]]; then
  log_json info dry_run step archiver_settle command "sleep ${ARCHIVER_SETTLE_SECONDS}"
fi

run_publish_projections || fail_cycle "$?" publish_projections

if [[ "$(bool_value "${IMPORT_CLICKHOUSE}")" == "true" ]]; then
  run_or_dry import_clickhouse bun "${REPO_ROOT}/infra/homelab/scripts/import-bus-observations.mjs" \
    --projection-root "${PROJECTION_OUTPUT_PATH}" || fail_cycle "$?" import_clickhouse
else
  log_json info step_skip step import_clickhouse reason TRACK_B_IMPORT_CLICKHOUSE_false
fi

if [[ "$(bool_value "${PUBLISH_ANALYTICS}")" == "true" ]]; then
  run_publish_analytics || fail_cycle "$?" publish_analytics
else
  log_json info step_skip step publish_analytics reason TRACK_B_PUBLISH_ANALYTICS_false
fi

if [[ "$(bool_value "${UPLOAD_R2}")" == "true" ]]; then
  run_upload_r2 || fail_cycle "$?" upload_r2
else
  log_json info step_skip step upload_r2 reason TRACK_B_UPLOAD_R2_false
fi

cycle_ended_ms="$(date +%s000)"
log_json info cycle_end slotKey "${slot_key}" serviceDate "${service_date}" exitStatus "0" durationMs "$((cycle_ended_ms - cycle_started_ms))"
