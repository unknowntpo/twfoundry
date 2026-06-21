import test from 'node:test';
import assert from 'node:assert';
import { normalizeRows, parseSlotKey, taipeiSlot } from '../src/index.js';

test('normalizeRows - basic normalization', (_t) => {
  const rawRows = [
    {
      PlateNumb: '550-U5',
      RouteUID: 'TPE10181',
      RouteName: { Zh_tw: '205' },
      Direction: 0,
      BusPosition: { PositionLat: 25.02442, PositionLon: 121.508478 },
      Speed: 20,
      Azimuth: 224,
      GPSTime: '2026-06-17T10:04:49+08:00',
      UpdateTime: '2026-06-17T10:04:55+08:00',
    },
  ];

  const slot = {
    slotKey: '2026-06-17T10:05+08:00',
    serviceDate: '2026-06-17',
    timeLabel: '10:05',
  };

  const config = { tdxCity: 'Taipei' };
  const capturedAt = '2026-06-17T10:05:12.000Z';

  const normalized = normalizeRows(rawRows, slot, config, capturedAt);

  assert.equal(normalized.length, 1);
  assert.equal(normalized[0].schema, 'twfoundry.normalized.tdx.bus_vehicle_position.v1');
  assert.equal(normalized[0].vehicle_id, '550-U5');
  assert.equal(normalized[0].route_uid, 'TPE10181');
  assert.equal(normalized[0].route_name, '205');
  assert.equal(normalized[0].slot_key, '2026-06-17T10:05+08:00');
  assert.equal(normalized[0].latitude, 25.02442);
  assert.equal(normalized[0].longitude, 121.508478);
  assert.equal(normalized[0].speed_kph, 20);
  assert.equal(normalized[0].direction, 0);
  assert.equal(normalized[0].ingest_mode, 'live');
});

test('normalizeRows - filters out missing coordinates', (_t) => {
  const rawRows = [
    {
      PlateNumb: '550-U5',
      RouteUID: 'TPE10181',
      RouteName: '205',
      Direction: 0,
      BusPosition: { PositionLat: null, PositionLon: 121.508478 },
    },
    {
      PlateNumb: '550-U6',
      RouteUID: 'TPE10182',
      RouteName: '206',
      Direction: 0,
      BusPosition: { PositionLat: 25.02442, PositionLon: 121.508478 },
    },
  ];

  const slot = { slotKey: '2026-06-17T10:05+08:00', serviceDate: '2026-06-17', timeLabel: '10:05' };
  const config = { tdxCity: 'Taipei' };
  const normalized = normalizeRows(rawRows, slot, config, new Date().toISOString());

  // Only second row should pass (has valid coords)
  assert.equal(normalized.length, 1);
  assert.equal(normalized[0].vehicle_id, '550-U6');
});

test('normalizeRows - filters out missing vehicle_id or route_uid', (_t) => {
  const rawRows = [
    {
      PlateNumb: '',
      RouteUID: 'TPE10181',
      RouteName: '205',
      BusPosition: { PositionLat: 25.02442, PositionLon: 121.508478 },
    },
  ];

  const slot = { slotKey: '2026-06-17T10:05+08:00', serviceDate: '2026-06-17', timeLabel: '10:05' };
  const config = { tdxCity: 'Taipei' };
  const normalized = normalizeRows(rawRows, slot, config, new Date().toISOString());

  assert.equal(normalized.length, 0);
});

test('parseSlotKey - valid format', (_t) => {
  const slotKey = '2026-06-17T10:05+08:00';
  const parsed = parseSlotKey(slotKey);

  assert.ok(parsed);
  assert.equal(parsed.serviceDate, '2026-06-17');
  assert.equal(parsed.timeLabel, '10:05');
  assert.equal(parsed.slotKey, slotKey);
});

test('parseSlotKey - invalid format', (_t) => {
  assert.equal(parseSlotKey('invalid'), null);
  assert.equal(parseSlotKey('2026-06-17T10:05'), null);
  assert.equal(parseSlotKey('2026-06-17'), null);
});

test('taipeiSlot - floor to 5-minute boundary', (_t) => {
  // 10:07:32 should floor to 10:05
  const date = new Date('2026-06-17T10:07:32+08:00');
  const slot = taipeiSlot(date, 5);

  assert.equal(slot.slotKey, '2026-06-17T10:05+08:00');
  assert.equal(slot.serviceDate, '2026-06-17');
  assert.equal(slot.timeLabel, '10:05');
});

test('normalizeRows - completeness score', (_t) => {
  const row = {
    PlateNumb: '550-U5',
    RouteUID: 'TPE10181',
    RouteName: '205',
    Direction: 0,
    BusPosition: { PositionLat: 25.02442, PositionLon: 121.508478 },
    GPSTime: '2026-06-17T10:04:49+08:00',
  };

  const slot = { slotKey: '2026-06-17T10:05+08:00', serviceDate: '2026-06-17', timeLabel: '10:05' };
  const config = { tdxCity: 'Taipei' };
  const normalized = normalizeRows([row], slot, config, new Date().toISOString());

  assert.equal(normalized.length, 1);
  assert.ok(normalized[0].completeness > 0);
  assert.ok(normalized[0].completeness <= 1);
});
