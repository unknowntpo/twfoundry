import assert from 'node:assert/strict';
import {
  buildBusOversightModel,
  buildFreshnessQualityEvents,
  buildRouteSchematic,
  buildTimelineSlots,
} from '../src/busOversightData.js';
import { BUS_RELIABILITY_SIGNAL_TYPES } from '../src/busReliabilitySignals.js';

const bunching = {
  serviceDate: '2026-05-20',
  rows: [
    {
      slot_start: '2026-05-20 08:15:00.000',
      route_name: '303區',
      direction: 1,
      trailing_vehicle_id: 'A',
      leading_vehicle_id: 'B',
      trailing_progress: 0.2,
      leading_progress: 0.8,
      progress_gap_ratio: 0.6,
      estimated_headway_minutes: 36,
    },
  ],
};

const density = {
  serviceDate: '2026-05-20',
  rows: [
    {
      bucket_start: '2026-05-20 08:45:00',
      route_name: '棕12',
      direction: 0,
      active_vehicles: '3',
      avg_speed_kph: 4.7,
      stopped_reports: '9',
    },
  ],
};

const freshness = {
  serviceDate: '2026-05-20',
  rows: [
    {
      route_name: '303區',
      direction: 1,
      off_route_rate: 0.32,
    },
  ],
};

const model = buildBusOversightModel({ bunching, density, freshness, selectedRouteName: '303區' });

assert.equal(model.serviceDate, '2026-05-20');
assert.equal(model.timeline.length, 7 * 24);
assert.equal(model.activeSlot.date, '2026-05-20');
assert.equal(model.kpis.routes, 2);
assert.equal(model.kpis.serviceGaps, 1);
assert.equal(model.kpis.lowCapacity, 2);
assert.equal(model.watchlist[0].routeName, '303區');
assert.ok(model.activeEvents.some((event) => event.sourceKind === 'freshness'));

const activeHourSlot = model.timeline.find((slot) => slot.key === '2026-05-20T08');
assert.equal(activeHourSlot.severity, 'critical');
assert.equal(activeHourSlot.events.length, 2);
assert.equal(activeHourSlot.events[0].type, BUS_RELIABILITY_SIGNAL_TYPES.SERVICE_GAP);

const freshnessEvents = buildFreshnessQualityEvents(freshness);
assert.equal(freshnessEvents.length, 1);
assert.equal(freshnessEvents[0].slotKey, '2026-05-20T23');
assert.equal(freshnessEvents[0].type, BUS_RELIABILITY_SIGNAL_TYPES.LOW_CAPACITY);
assert.equal(freshnessEvents[0].copyKey, 'oversight.signal.low_capacity.qualityCopy');

const emptySlot = model.timeline.find((slot) => slot.key === '2026-05-19T08');
assert.equal(emptySlot.hasData, false);
assert.equal(emptySlot.severity, 'normal');

const slots = buildTimelineSlots('2026-05-20');
assert.equal(slots[0].key, '2026-05-14T00');
assert.equal(slots.at(-1).key, '2026-05-20T23');

const schematic = buildRouteSchematic({
  routeName: '303區',
  stopOfRoutes: [
    {
      Direction: 1,
      Stops: [
        { StopName: { Zh_tw: '起點', En: 'Origin' }, StopPosition: { PositionLon: 121.5, PositionLat: 25.1 } },
        { StopName: { Zh_tw: '中段', En: 'Middle' }, StopPosition: { PositionLon: 121.6, PositionLat: 25.08 } },
        { StopName: { Zh_tw: '終點', En: 'Terminal' }, StopPosition: { PositionLon: 121.7, PositionLat: 25.05 } },
      ],
    },
  ],
}, {
  routeName: '303區',
  direction: 1,
  events: activeHourSlot.events.slice(0, 1),
});

assert.equal(schematic.points.length, 3);
assert.equal(schematic.origin, '起點');
assert.equal(schematic.destination, '終點');
assert.ok(schematic.problemSegments.length > 0);
assert.ok(schematic.pins.length > 0);

console.log('busOversightData tests passed');
