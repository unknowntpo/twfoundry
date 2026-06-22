import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bundleSignals } from './index.js';

test('bundles recent Flink route signals for the Pages API', () => {
  const bundle = bundleSignals([
    {
      type: 'suspected_gap',
      route_name: '307',
      slot_key: '2026-06-22T17:00+08:00',
      detected_at: '2026-06-22T09:00:00Z',
    },
    {
      type: 'suspected_bunching',
      route_name: '2',
      slot_key: '2026-06-22T16:55+08:00',
      detected_at: '2026-06-22T08:55:00Z',
    },
  ], { generatedAt: '2026-06-22T09:01:00Z' });

  assert.equal(bundle.status, 'ok');
  assert.equal(bundle.latestSlotKey, '2026-06-22T17:00+08:00');
  assert.equal(bundle.signals[0].route_name, '307');
});

test('empty bundle is explicit waiting state', () => {
  const bundle = bundleSignals([], { generatedAt: '2026-06-22T09:01:00Z' });

  assert.equal(bundle.status, 'waiting_for_flink');
  assert.equal(bundle.latestSlotKey, null);
  assert.deepEqual(bundle.signals, []);
});
