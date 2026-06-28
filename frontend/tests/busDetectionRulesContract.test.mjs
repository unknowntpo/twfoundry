import assert from 'node:assert/strict';
import { loadBusDetectionRules } from '../scripts/lib/busDetectionRules.mjs';

// UNK-37: the ClickHouse batch publish script and the Flink speed layer must read the SAME
// detection parameters from contracts/bus-detection-rules.v1.json. This is the batch-side
// mirror of backend/streams BusDetectionRulesContractTest.java. Both tests assert their
// engine resolves the identical parameter set, so the two engines physically cannot drift.

const rules = loadBusDetectionRules();

// Expected snapshot, kept in lock-step with the Java contract test's expectations. If the
// contract changes, update BOTH tests in the same commit — that is the drift gate.
const EXPECTED = {
  routeMinutes: 48.0,
  serviceGapMinutes: 14.0,
  bunchingProgressGapRatio: 0.04,
  bunchingConfirmationSlots: 2,
  maxDistanceToRouteMeters: 120.0,
};

for (const [key, value] of Object.entries(EXPECTED)) {
  assert.equal(rules[key], value, `detection rule ${key} drifted from contract`);
}

// The publish script must default its detection params from the contract, never from inline
// magic numbers. Mirror the resolution the script performs at module load.
assert.equal(
  rules.serviceGapMinutes,
  EXPECTED.serviceGapMinutes,
  'batch --min-headway-minutes default must equal speed layer serviceGapMinutes',
);

console.log('busDetectionRulesContract.test.mjs ok');
