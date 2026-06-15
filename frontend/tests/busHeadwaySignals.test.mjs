import assert from 'node:assert/strict';
import {
  buildRouteServiceSummary,
  detectHeadwayGapSignals,
} from '../src/busHeadwaySignals.js';

function entry(id, progressRatio) {
  return {
    observation: {
      id,
      route: { uid: 'TPE_ROUTE_2', name: '2', direction: 0 },
      position: { longitude: 121.5 + progressRatio * 0.1, latitude: 25.05 },
    },
    routeProgress: {
      routeUID: 'TPE_ROUTE_2',
      routeName: '2',
      direction: 0,
      progressRatio,
      distanceToRouteMeters: 18,
      matchedPosition: { longitude: 121.5 + progressRatio * 0.1, latitude: 25.05 },
    },
    geometryQuality: 'good',
  };
}

const signals = detectHeadwayGapSignals([
  entry('BUS-A', 0.12),
  entry('BUS-B', 0.28),
  entry('BUS-C', 0.68),
], {
  targetHeadwayMinutes: 8,
  estimatedTripMinutes: 48,
});

assert.equal(signals.length, 1);
assert.equal(signals[0].signalType, 'headway_gap');
assert.equal(signals[0].routeName, '2');
assert.equal(signals[0].trailingVehicleId, 'BUS-B');
assert.equal(signals[0].leadingVehicleId, 'BUS-C');
assert.ok(signals[0].observedHeadwayMinutes > 19);
assert.ok(signals[0].confidence >= 0.5);

const serviceSummary = buildRouteServiceSummary([
  entry('BUS-A', 0.12),
  entry('BUS-B', 0.28),
  entry('BUS-C', 0.68),
  entry('BUS-D', 0.72),
], {
  targetHeadwayMinutes: 8,
  estimatedTripMinutes: 48,
});
assert.equal(serviceSummary.primaryRoute.routeName, '2');
assert.equal(serviceSummary.primaryRoute.sampleCount, 4);
assert.equal(serviceSummary.primaryRoute.headways.length, 3);
assert.equal(serviceSummary.primaryRoute.signals.length, 2);
assert.equal(serviceSummary.primaryRoute.signals[0].productLabel, '大空窗');
assert.equal(serviceSummary.primaryRoute.signals[1].productLabel, '車輛群聚');
assert.ok(serviceSummary.primaryRoute.maxHeadwayMinutes > 19);
assert.ok(serviceSummary.primaryRoute.minHeadwayMinutes < 3);

const normalSignals = detectHeadwayGapSignals([
  entry('BUS-A', 0.12),
  entry('BUS-B', 0.28),
  entry('BUS-C', 0.42),
], {
  targetHeadwayMinutes: 8,
  estimatedTripMinutes: 48,
});
assert.equal(normalSignals.length, 0);

console.log('busHeadwaySignals tests passed');
