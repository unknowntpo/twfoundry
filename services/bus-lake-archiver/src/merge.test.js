import test from 'node:test';
import assert from 'node:assert';
import { getMergeKey, compareRows, MergeTable } from './merge.js';

test('getMergeKey - builds key from row', () => {
  const row = {
    slot_key: '2026-06-17T10:05+08:00',
    vehicle_id: '550-U5',
    route_uid: 'TPE10181',
    direction: 0,
  };
  const key = getMergeKey(row);
  assert.strictEqual(key, '2026-06-17T10:05+08:00|550-U5|TPE10181|0');
});

test('getMergeKey - throws on missing field', () => {
  const row = {
    slot_key: '2026-06-17T10:05+08:00',
    vehicle_id: '550-U5',
    // missing route_uid
    direction: 0,
  };
  assert.throws(() => getMergeKey(row), /missing required fields/);
});

test('compareRows - newer update_time wins', () => {
  const existing = {
    update_time: '2026-06-17T10:04:49+08:00',
    ingested_at: '2026-06-17T02:05:10.000Z',
  };
  const incoming = {
    update_time: '2026-06-17T10:04:55+08:00',
    ingested_at: '2026-06-17T02:05:12.000Z',
  };
  const cmp = compareRows(existing, incoming);
  assert.strictEqual(cmp, 1, 'incoming (newer update_time) should win');
});

test('compareRows - same update_time, newer ingested_at wins', () => {
  const existing = {
    update_time: '2026-06-17T10:04:49+08:00',
    ingested_at: '2026-06-17T02:05:10.000Z',
  };
  const incoming = {
    update_time: '2026-06-17T10:04:49+08:00',
    ingested_at: '2026-06-17T02:05:12.000Z',
  };
  const cmp = compareRows(existing, incoming);
  assert.strictEqual(cmp, 1, 'incoming (newer ingested_at) should win');
});

test('compareRows - older update_time loses', () => {
  const existing = {
    update_time: '2026-06-17T10:04:55+08:00',
    ingested_at: '2026-06-17T02:05:10.000Z',
  };
  const incoming = {
    update_time: '2026-06-17T10:04:49+08:00',
    ingested_at: '2026-06-17T02:05:15.000Z',
  };
  const cmp = compareRows(existing, incoming);
  assert.strictEqual(cmp, -1, 'existing (newer update_time) should win');
});

test('compareRows - both equal returns 0', () => {
  const existing = {
    update_time: '2026-06-17T10:04:49+08:00',
    ingested_at: '2026-06-17T02:05:10.000Z',
  };
  const incoming = {
    update_time: '2026-06-17T10:04:49+08:00',
    ingested_at: '2026-06-17T02:05:10.000Z',
  };
  const cmp = compareRows(existing, incoming);
  assert.strictEqual(cmp, 0, 'equal rows');
});

test('MergeTable - insert new row', () => {
  const table = new MergeTable();
  const row = {
    slot_key: '2026-06-17T10:05+08:00',
    vehicle_id: '550-U5',
    route_uid: 'TPE10181',
    direction: 0,
    update_time: '2026-06-17T10:04:49+08:00',
    ingested_at: '2026-06-17T02:05:10.000Z',
    service_date: '2026-06-17',
  };
  const inserted = table.upsert(row);
  assert.strictEqual(inserted, true);
  assert.strictEqual(table.table.size, 1);
  assert.deepStrictEqual(table.getStats(), { inserts: 1, updates: 0, dedups: 0, totalRows: 1 });
});

test('MergeTable - update existing row with newer update_time', () => {
  const table = new MergeTable();
  const row1 = {
    slot_key: '2026-06-17T10:05+08:00',
    vehicle_id: '550-U5',
    route_uid: 'TPE10181',
    direction: 0,
    update_time: '2026-06-17T10:04:49+08:00',
    ingested_at: '2026-06-17T02:05:10.000Z',
    service_date: '2026-06-17',
    speed_kph: 10,
  };
  const row2 = {
    slot_key: '2026-06-17T10:05+08:00',
    vehicle_id: '550-U5',
    route_uid: 'TPE10181',
    direction: 0,
    update_time: '2026-06-17T10:04:55+08:00', // newer
    ingested_at: '2026-06-17T02:05:12.000Z',
    service_date: '2026-06-17',
    speed_kph: 25,
  };
  
  table.upsert(row1);
  const updated = table.upsert(row2);
  
  assert.strictEqual(updated, true);
  assert.strictEqual(table.table.size, 1);
  assert.strictEqual(table.table.values().next().value.speed_kph, 25);
  assert.deepStrictEqual(table.getStats(), { inserts: 1, updates: 1, dedups: 0, totalRows: 1 });
});

test('MergeTable - dedup identical row', () => {
  const table = new MergeTable();
  const row = {
    slot_key: '2026-06-17T10:05+08:00',
    vehicle_id: '550-U5',
    route_uid: 'TPE10181',
    direction: 0,
    update_time: '2026-06-17T10:04:49+08:00',
    ingested_at: '2026-06-17T02:05:10.000Z',
    service_date: '2026-06-17',
  };
  
  table.upsert(row);
  const deduped = table.upsert(row);
  
  assert.strictEqual(deduped, false);
  assert.strictEqual(table.table.size, 1);
  assert.deepStrictEqual(table.getStats(), { inserts: 1, updates: 0, dedups: 1, totalRows: 1 });
});

test('MergeTable - getRowsByDate filters correctly', () => {
  const table = new MergeTable();
  const row1 = {
    slot_key: '2026-06-17T10:05+08:00',
    vehicle_id: '550-U5',
    route_uid: 'TPE10181',
    direction: 0,
    update_time: '2026-06-17T10:04:49+08:00',
    ingested_at: '2026-06-17T02:05:10.000Z',
    service_date: '2026-06-17',
  };
  const row2 = {
    slot_key: '2026-06-18T10:05+08:00',
    vehicle_id: '550-U6',
    route_uid: 'TPE10182',
    direction: 1,
    update_time: '2026-06-18T10:04:49+08:00',
    ingested_at: '2026-06-18T02:05:10.000Z',
    service_date: '2026-06-18',
  };
  
  table.upsert(row1);
  table.upsert(row2);
  
  const rows17 = table.getRowsByDate('2026-06-17');
  const rows18 = table.getRowsByDate('2026-06-18');
  
  assert.strictEqual(rows17.length, 1);
  assert.strictEqual(rows18.length, 1);
  assert.strictEqual(rows17[0].vehicle_id, '550-U5');
  assert.strictEqual(rows18[0].vehicle_id, '550-U6');
});
