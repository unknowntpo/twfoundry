import test from 'node:test';
import assert from 'node:assert';
import { bucketRowsBySlot, normalizeRows } from '../src/index.js';

test('bucketRowsBySlot - groups by UpdateTime into 5-min slots', () => {
  const rows = [
    { PlateNumb: 'A', UpdateTime: '2026-06-08T10:06:00+08:00' }, // -> 10:05 slot
    { PlateNumb: 'B', UpdateTime: '2026-06-08T10:08:30+08:00' }, // -> 10:05 slot
    { PlateNumb: 'C', UpdateTime: '2026-06-08T10:12:00+08:00' }, // -> 10:10 slot
  ];
  const buckets = bucketRowsBySlot(rows, '2026-06-08', 5);

  assert.strictEqual(buckets.size, 2);
  assert.strictEqual(buckets.get('2026-06-08T10:05+08:00').rows.length, 2);
  assert.strictEqual(buckets.get('2026-06-08T10:10+08:00').rows.length, 1);
  assert.strictEqual(buckets.get('2026-06-08T10:05+08:00').slot.serviceDate, '2026-06-08');
});

test('bucketRowsBySlot - drops midnight spillover into the next day', () => {
  const rows = [
    { PlateNumb: 'A', UpdateTime: '2026-06-08T23:58:00+08:00' }, // 06-08 23:55 slot
    { PlateNumb: 'B', UpdateTime: '2026-06-09T00:01:00+08:00' }, // 06-09 -> dropped
  ];
  const buckets = bucketRowsBySlot(rows, '2026-06-08', 5);
  assert.strictEqual(buckets.size, 1);
  assert.ok(buckets.has('2026-06-08T23:55+08:00'));
});

test('bucketRowsBySlot - skips rows with missing/invalid UpdateTime', () => {
  const rows = [
    { PlateNumb: 'A' },
    { PlateNumb: 'B', UpdateTime: 'not-a-date' },
    { PlateNumb: 'C', UpdateTime: '2026-06-08T10:06:00+08:00' },
  ];
  const buckets = bucketRowsBySlot(rows, '2026-06-08', 5);
  assert.strictEqual(buckets.size, 1);
  assert.strictEqual(buckets.get('2026-06-08T10:05+08:00').rows.length, 1);
});

test('normalizeRows - historical provenance + in-context freshness', () => {
  const rows = [{
    PlateNumb: '550-U5',
    RouteUID: 'TPE10181',
    RouteName: { Zh_tw: '205' },
    Direction: 0,
    BusPosition: { PositionLat: 25.02442, PositionLon: 121.508478 },
    GPSTime: '2026-06-08T10:05:40+08:00',
    UpdateTime: '2026-06-08T10:05:45+08:00',
  }];
  const slot = { slotKey: '2026-06-08T10:05+08:00', serviceDate: '2026-06-08', timeLabel: '10:05' };
  const slotMs = new Date('2026-06-08T10:05:00+08:00').getTime();

  const out = normalizeRows(rows, slot, { tdxCity: 'Taipei' }, new Date(slotMs).toISOString(), {
    ingestMode: 'historical',
    sourceDataset: 'Historical.Bus.RealTimeByFrequency.City',
    referenceMs: slotMs,
  });

  assert.strictEqual(out.length, 1);
  assert.strictEqual(out[0].ingest_mode, 'historical');
  assert.strictEqual(out[0].source_dataset, 'Historical.Bus.RealTimeByFrequency.City');
  assert.strictEqual(out[0].service_date, '2026-06-08');
  // update 10:05:45 vs slot ref 10:05:00 => within 90s => fresh (not judged against "now")
  assert.strictEqual(out[0].freshness, 'fresh');
});

test('normalizeRows - default mode stays live (no behavior change)', () => {
  const rows = [{
    PlateNumb: 'X', RouteUID: 'R', RouteName: { Zh_tw: '1' }, Direction: 0,
    BusPosition: { PositionLat: 25, PositionLon: 121 }, UpdateTime: '2026-06-08T10:05:45+08:00',
  }];
  const slot = { slotKey: '2026-06-08T10:05+08:00', serviceDate: '2026-06-08', timeLabel: '10:05' };
  const out = normalizeRows(rows, slot, { tdxCity: 'Taipei' }, '2026-06-08T02:05:00.000Z');
  assert.strictEqual(out[0].ingest_mode, 'live');
  assert.strictEqual(out[0].source_dataset, 'Bus.RealTimeByFrequency.City');
});
