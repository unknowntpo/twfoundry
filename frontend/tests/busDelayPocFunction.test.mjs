import assert from 'node:assert/strict';
import { buildDelayPoc } from '../functions/api/tdx/bus-delay-poc.js';

const payload = buildDelayPoc({
  route: 'TEST',
  city: 'Taipei',
  generatedAt: '2026-06-12T00:00:00.000Z',
  etaRows: [{
    RouteUID: 'TPE_TEST',
    RouteName: { Zh_tw: 'TEST' },
    Direction: 0,
    StopUID: 'STOP_A',
    StopID: '100',
    StopName: { Zh_tw: '測試站' },
    EstimateTime: 12 * 60,
    StopStatus: 0,
    SrcUpdateTime: '2026-06-12T08:00:00+08:00',
    UpdateTime: '2026-06-12T08:00:00+08:00',
  }],
  scheduleRows: [{
    RouteName: { Zh_tw: 'TEST' },
    Direction: 0,
    Timetables: [{
      TripID: 'TRIP_1',
      ServiceDay: {
        Sunday: 0,
        Monday: 0,
        Tuesday: 0,
        Wednesday: 0,
        Thursday: 0,
        Friday: 1,
        Saturday: 0,
      },
      StopTimes: [{
        StopSequence: 1,
        StopUID: 'STOP_A',
        StopID: '100',
        StopName: { Zh_tw: '測試站' },
        ArrivalTime: '08:04',
        DepartureTime: '08:04',
      }],
    }],
  }],
  stopOfRouteRows: [{
    Direction: 0,
    Stops: [{
      StopSequence: 1,
      StopUID: 'STOP_A',
      StopID: '100',
      StopName: { Zh_tw: '測試站' },
    }],
  }],
});

assert.equal(payload.ok, true);
assert.equal(payload.joinQuality.timetableEtaRows, 1);
assert.equal(payload.joinQuality.frequencyEtaRows, 0);
assert.equal(payload.delayCandidates.length, 1);
assert.equal(payload.delayCandidates[0].signalSubtype, 'timetable_delay');
assert.equal(payload.delayCandidates[0].userFacingSignal, '發車誤點');
assert.equal(payload.delayCandidates[0].signalVariant, 'departure_delay');
assert.equal(payload.delayCandidates[0].scheduledArrivalTime, '08:04');
assert.equal(payload.delayCandidates[0].predictedDelayMinutes, 8);
assert.equal(payload.delayCandidates[0].severity, 'warning');

console.log('busDelayPocFunction tests passed');
