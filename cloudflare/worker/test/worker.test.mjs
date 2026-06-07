import assert from 'node:assert/strict';
import { selectSnapshot, serveProjection } from '../src/index.js';

const manifest = {
  latestSlotKey: '2026-05-20T09:55+08:00',
  snapshots: [
    {
      slotKey: '2026-05-20T09:50+08:00',
      capturedAt: '2026-05-20T01:50:00.000Z',
      timeLabel: '09:50',
      projectionPath: 'bus/projections/2026-05-20/09-50.json',
    },
    {
      slotKey: '2026-05-20T09:55+08:00',
      capturedAt: '2026-05-20T01:55:00.000Z',
      timeLabel: '09:55',
      projectionPath: 'bus/projections/2026-05-20/09-55.json',
    },
  ],
};

assert.equal(selectSnapshot(manifest, null).timeLabel, '09:55');
assert.equal(selectSnapshot(manifest, 'latest').timeLabel, '09:55');
assert.equal(selectSnapshot(manifest, '09:50').slotKey, '2026-05-20T09:50+08:00');
assert.equal(selectSnapshot(manifest, '09-50').slotKey, '2026-05-20T09:50+08:00');
assert.equal(selectSnapshot(manifest, '2026-05-20T09:55+08:00').timeLabel, '09:55');
assert.equal(selectSnapshot(manifest, '12:00'), undefined);

const projection = {
  layerId: 'bus_vehicles',
  projectionType: 'vehicle_position_projection',
  features: [{ id: 'bus:EAL-3079', longitude: 121.590663, latitude: 25.06696 }],
};

const fakeBucket = {
  async get(key) {
    const payloads = {
      'bus/projections/manifest.json': manifest,
      'bus/projections/2026-05-20/09-55.json': projection,
    };
    const payload = payloads[key];
    if (!payload) return null;
    return {
      httpEtag: '"test"',
      body: JSON.stringify(payload),
      async json() {
        return payload;
      },
    };
  },
};

const response = await serveProjection(fakeBucket, '09:55');
assert.equal(response.status, 200);
assert.deepEqual(await response.json(), projection);

const missing = await serveProjection(fakeBucket, '12:00');
assert.equal(missing.status, 404);
