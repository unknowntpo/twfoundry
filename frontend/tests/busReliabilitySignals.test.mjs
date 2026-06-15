import assert from 'node:assert/strict';
import {
  BUS_RELIABILITY_SIGNAL_TYPES,
  buildFrequencyWaitSignal,
  buildTimetableDelaySignal,
  delaySeverity,
  normalizeHeadwaySignal,
  normalizeLowCapacitySignal,
} from '../src/busReliabilitySignals.js';

assert.equal(delaySeverity(5), 'ok');
assert.equal(delaySeverity(5.1), 'warning');
assert.equal(delaySeverity(10), 'critical');
assert.equal(delaySeverity(30, { candidateEligible: false }), 'ok');

const waitSignal = buildFrequencyWaitSignal({
  etaMinutes: 18,
  expectedMaxWaitMinutes: 10,
  stopStatus: 0,
  scheduleWindow: '05:00-21:00',
});

assert.equal(waitSignal.signalSubtype, 'frequency_wait_excess');
assert.equal(waitSignal.userFacingSignal, '候車超時');
assert.equal(waitSignal.predictedDelayMinutes, 8);
assert.equal(waitSignal.severity, 'warning');
assert.equal(waitSignal.candidateEligible, true);

const timetableSignal = buildTimetableDelaySignal({
  etaMinutes: 12,
  currentMinutes: 8 * 60,
  scheduledArrivalMinutes: 8 * 60 + 4,
  scheduledArrivalTime: '08:04',
  stopSequence: 2,
  stopStatus: 0,
});

assert.equal(timetableSignal.signalSubtype, 'timetable_delay');
assert.equal(timetableSignal.userFacingSignal, '表定誤點');
assert.equal(timetableSignal.predictedArrivalMinutes, 8 * 60 + 12);
assert.equal(timetableSignal.predictedDelayMinutes, 8);
assert.equal(timetableSignal.severity, 'warning');
assert.equal(timetableSignal.claimStatus, 'candidate');

const departureReviewSignal = buildTimetableDelaySignal({
  etaMinutes: 23.5,
  currentMinutes: 19 * 60 + 25,
  scheduledArrivalMinutes: 18 * 60 + 10,
  scheduledArrivalTime: '18:10',
  stopSequence: 1,
  stopStatus: 0,
});

assert.equal(departureReviewSignal.userFacingSignal, '發車誤點');
assert.equal(departureReviewSignal.signalVariant, 'departure_delay');
assert.equal(departureReviewSignal.predictedDelayMinutes, 98.5);
assert.equal(departureReviewSignal.severity, 'watch');
assert.equal(departureReviewSignal.claimStatus, 'needs_manual_trip_check');

const skippedStopSignal = buildTimetableDelaySignal({
  etaMinutes: 30,
  currentMinutes: 8 * 60,
  scheduledArrivalMinutes: 8 * 60,
  stopSequence: 2,
  stopStatus: 2,
});

assert.equal(skippedStopSignal.predictedDelayMinutes, 30);
assert.equal(skippedStopSignal.severity, 'ok');
assert.equal(skippedStopSignal.candidateEligible, false);

const relativeGapSignal = normalizeHeadwaySignal({
  observedHeadwayMinutes: 36,
  expectedHeadwayMinutes: 15,
  progressGapRatio: 0.6,
});

assert.equal(relativeGapSignal.type, BUS_RELIABILITY_SIGNAL_TYPES.SERVICE_GAP);
assert.equal(relativeGapSignal.severity, 'critical');
assert.equal(relativeGapSignal.label, '大空窗');

const relativeBunchingSignal = normalizeHeadwaySignal({
  observedHeadwayMinutes: 4,
  expectedHeadwayMinutes: 12,
  progressGapRatio: 0.04,
});

assert.equal(relativeBunchingSignal.type, BUS_RELIABILITY_SIGNAL_TYPES.BUNCHING);
assert.equal(relativeBunchingSignal.severity, 'warning');

const lowCapacitySignal = normalizeLowCapacitySignal({
  activeVehicles: 3,
  avgSpeedKph: 4.7,
  stoppedReports: 9,
});

assert.equal(lowCapacitySignal.type, BUS_RELIABILITY_SIGNAL_TYPES.LOW_CAPACITY);
assert.equal(lowCapacitySignal.severity, 'warning');

console.log('busReliabilitySignals tests passed');
