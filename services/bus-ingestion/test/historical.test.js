import test from 'node:test';
import assert from 'node:assert';
import { considerRow, rowSlot, normalizeRows } from '../src/index.js';

const POS = { PositionLat: 25.02, PositionLon: 121.5 };
const mkRow = (plate, route, t, extra = {}) => ({
  PlateNumb: plate, RouteUID: route, Direction: 0, BusPosition: POS, UpdateTime: t, ...extra,
});

test('rowSlot - maps UpdateTime to its 5-min Taipei slot', () => {
  const s = rowSlot(mkRow('A', 'R', '2026-06-08T10:06:00+08:00'), '2026-06-08', 5);
  assert.strictEqual(s.slotKey, '2026-06-08T10:05+08:00');
  assert.strictEqual(s.serviceDate, '2026-06-08');
});

test('rowSlot - null for different service_date (midnight spillover) and bad time', () => {
  assert.strictEqual(rowSlot(mkRow('A', 'R', '2026-06-09T00:01:00+08:00'), '2026-06-08', 5), null);
  assert.strictEqual(rowSlot(mkRow('A', 'R', 'not-a-date'), '2026-06-08', 5), null);
  assert.strictEqual(rowSlot(mkRow('A', 'R', null), '2026-06-08', 5), null);
});

test('considerRow - dedups to the latest UpdateTime per (slot,vehicle,route,dir)', () => {
  const latest = new Map();
  // three samples of the same vehicle within the 10:05 slot — keep the latest (10:08:30)
  considerRow(latest, mkRow('A', 'R', '2026-06-08T10:06:00+08:00'), '2026-06-08', 5);
  considerRow(latest, mkRow('A', 'R', '2026-06-08T10:08:30+08:00'), '2026-06-08', 5);
  considerRow(latest, mkRow('A', 'R', '2026-06-08T10:05:10+08:00'), '2026-06-08', 5);
  assert.strictEqual(latest.size, 1);
  const only = [...latest.values()][0];
  assert.strictEqual(only.row.UpdateTime, '2026-06-08T10:08:30+08:00');
});

test('considerRow - separate keys for different slot / vehicle / direction', () => {
  const latest = new Map();
  considerRow(latest, mkRow('A', 'R', '2026-06-08T10:06:00+08:00'), '2026-06-08', 5); // 10:05 / A
  considerRow(latest, mkRow('A', 'R', '2026-06-08T10:12:00+08:00'), '2026-06-08', 5); // 10:10 / A
  considerRow(latest, mkRow('B', 'R', '2026-06-08T10:06:00+08:00'), '2026-06-08', 5); // 10:05 / B
  considerRow(latest, mkRow('A', 'R', '2026-06-08T10:06:00+08:00', { Direction: 1 }), '2026-06-08', 5); // dir 1
  assert.strictEqual(latest.size, 4);
});

test('considerRow - skips invalid rows and wrong-day rows', () => {
  const latest = new Map();
  considerRow(latest, { RouteUID: 'R', BusPosition: POS, UpdateTime: '2026-06-08T10:06:00+08:00' }, '2026-06-08', 5); // no PlateNumb
  considerRow(latest, mkRow('A', 'R', '2026-06-08T10:06:00+08:00', { BusPosition: { PositionLat: null, PositionLon: null } }), '2026-06-08', 5); // no position
  considerRow(latest, mkRow('A', 'R', '2026-06-09T00:01:00+08:00'), '2026-06-08', 5); // wrong day
  assert.strictEqual(latest.size, 0);
});

test('normalizeRows - historical provenance + in-context freshness', () => {
  const rows = [mkRow('550-U5', 'TPE10181', '2026-06-08T10:05:45+08:00', { RouteName: { Zh_tw: '205' }, GPSTime: '2026-06-08T10:05:40+08:00' })];
  const slot = { slotKey: '2026-06-08T10:05+08:00', serviceDate: '2026-06-08', timeLabel: '10:05' };
  const slotMs = new Date('2026-06-08T10:05:00+08:00').getTime();
  const out = normalizeRows(rows, slot, { tdxCity: 'Taipei' }, new Date(slotMs).toISOString(), {
    ingestMode: 'historical', sourceDataset: 'Historical.Bus.RealTimeByFrequency.City', referenceMs: slotMs,
  });
  assert.strictEqual(out[0].ingest_mode, 'historical');
  assert.strictEqual(out[0].source_dataset, 'Historical.Bus.RealTimeByFrequency.City');
  assert.strictEqual(out[0].freshness, 'fresh');
});

test('normalizeRows - default mode stays live (no behavior change)', () => {
  const rows = [mkRow('X', 'R', '2026-06-08T10:05:45+08:00', { RouteName: { Zh_tw: '1' } })];
  const slot = { slotKey: '2026-06-08T10:05+08:00', serviceDate: '2026-06-08', timeLabel: '10:05' };
  const out = normalizeRows(rows, slot, { tdxCity: 'Taipei' }, '2026-06-08T02:05:00.000Z');
  assert.strictEqual(out[0].ingest_mode, 'live');
  assert.strictEqual(out[0].source_dataset, 'Bus.RealTimeByFrequency.City');
});
