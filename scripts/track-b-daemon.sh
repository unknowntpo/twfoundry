#!/usr/bin/env bash

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

INTERVAL_SECONDS="${TRACK_B_INTERVAL_SECONDS:-300}"
BACKOFF_SECONDS="${TRACK_B_BACKOFF_SECONDS:-30}"
MAX_BACKOFF_SECONDS="${TRACK_B_MAX_BACKOFF_SECONDS:-300}"
CYCLE_COMMAND="${TRACK_B_CYCLE_COMMAND:-${REPO_ROOT}/scripts/track-b-cycle.sh}"
MAX_CYCLES="${TRACK_B_MAX_CYCLES:-0}"

stop_requested=0
active_child=""

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

positive_int_or_exit() {
  local name="$1"
  local value="$2"
  if [[ ! "${value}" =~ ^[0-9]+$ ]] || [[ "${value}" -lt 0 ]]; then
    log_json error invalid_config name "${name}" value "${value}"
    exit 2
  fi
}

handle_shutdown() {
  local signal="$1"
  stop_requested=1
  log_json info shutdown_requested signal "${signal}" activeChild "${active_child}"
  if [[ -n "${active_child}" ]] && kill -0 "${active_child}" 2>/dev/null; then
    kill -TERM "${active_child}" 2>/dev/null || true
  fi
}

sleep_interruptibly() {
  local seconds="$1"
  if [[ "${seconds}" -le 0 ]]; then
    return 0
  fi
  sleep "${seconds}" &
  active_child="$!"
  wait "${active_child}"
  local status=$?
  active_child=""
  return "${status}"
}

trap 'handle_shutdown SIGINT' INT
trap 'handle_shutdown SIGTERM' TERM

positive_int_or_exit TRACK_B_INTERVAL_SECONDS "${INTERVAL_SECONDS}"
positive_int_or_exit TRACK_B_BACKOFF_SECONDS "${BACKOFF_SECONDS}"
positive_int_or_exit TRACK_B_MAX_BACKOFF_SECONDS "${MAX_BACKOFF_SECONDS}"
positive_int_or_exit TRACK_B_MAX_CYCLES "${MAX_CYCLES}"

if [[ ! -x "${CYCLE_COMMAND}" ]]; then
  log_json error missing_cycle_command command "${CYCLE_COMMAND}"
  exit 2
fi

log_json info daemon_start intervalSeconds "${INTERVAL_SECONDS}" backoffSeconds "${BACKOFF_SECONDS}" maxBackoffSeconds "${MAX_BACKOFF_SECONDS}" cycleCommand "${CYCLE_COMMAND}"

cycle_number=0
consecutive_failures=0

while [[ "${stop_requested}" -eq 0 ]]; do
  cycle_number=$((cycle_number + 1))
  started_ms="$(date +%s000)"
  log_json info scheduler_cycle_start cycle "${cycle_number}"

  "${CYCLE_COMMAND}" &
  active_child="$!"
  wait "${active_child}"
  status=$?
  active_child=""

  ended_ms="$(date +%s000)"
  log_json info scheduler_cycle_end cycle "${cycle_number}" exitStatus "${status}" durationMs "$((ended_ms - started_ms))"

  if [[ "${stop_requested}" -ne 0 ]]; then
    break
  fi

  if [[ "${status}" -eq 0 ]]; then
    consecutive_failures=0
    delay="${INTERVAL_SECONDS}"
  else
    consecutive_failures=$((consecutive_failures + 1))
    delay=$((BACKOFF_SECONDS * consecutive_failures))
    if [[ "${delay}" -gt "${MAX_BACKOFF_SECONDS}" ]]; then
      delay="${MAX_BACKOFF_SECONDS}"
    fi
    log_json warn cycle_failed_backoff cycle "${cycle_number}" consecutiveFailures "${consecutive_failures}" backoffSeconds "${delay}"
  fi

  if [[ "${MAX_CYCLES}" -gt 0 && "${cycle_number}" -ge "${MAX_CYCLES}" ]]; then
    log_json info max_cycles_reached maxCycles "${MAX_CYCLES}"
    break
  fi

  log_json info scheduler_sleep seconds "${delay}"
  sleep_interruptibly "${delay}" || true
done

log_json info daemon_stop cycles "${cycle_number}"
