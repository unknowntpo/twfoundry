import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// UNK-37: single source of truth for bus anomaly-detection parameters. This loads the
// SAME contract the Flink speed layer reads (backend/streams BusDetectionRules), so the
// gap threshold, bunching ratio, confirmation slots, route minutes, and map-match distance
// gate cannot drift between the ClickHouse batch layer and the Flink speed layer.
//
// Repo layout: this file is frontend/scripts/lib/, the contract is repo-root contracts/.
const CONTRACT_SCHEMA = 'twfoundry.contracts.bus_detection_rules.v1';
const here = dirname(fileURLToPath(import.meta.url));
const CONTRACT_PATH = resolve(here, '../../../contracts/bus-detection-rules.v1.json');

export function loadBusDetectionRules(contractPath = CONTRACT_PATH) {
  const raw = JSON.parse(readFileSync(contractPath, 'utf8'));
  if (raw.schema !== CONTRACT_SCHEMA) {
    throw new Error(
      `Unexpected detection-rule contract schema: '${raw.schema}', expected ${CONTRACT_SCHEMA}`,
    );
  }
  const p = raw.parameters ?? {};
  for (const key of [
    'routeMinutes',
    'serviceGapMinutes',
    'bunchingProgressGapRatio',
    'bunchingConfirmationSlots',
    'maxDistanceToRouteMeters',
  ]) {
    if (typeof p[key] !== 'number' || !Number.isFinite(p[key])) {
      throw new Error(`Detection-rule contract missing numeric parameter: ${key}`);
    }
  }
  return {
    routeMinutes: p.routeMinutes,
    serviceGapMinutes: p.serviceGapMinutes,
    bunchingProgressGapRatio: p.bunchingProgressGapRatio,
    bunchingConfirmationSlots: p.bunchingConfirmationSlots,
    maxDistanceToRouteMeters: p.maxDistanceToRouteMeters,
  };
}

export { CONTRACT_PATH, CONTRACT_SCHEMA };
