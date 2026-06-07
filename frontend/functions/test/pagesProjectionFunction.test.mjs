import assert from 'node:assert/strict';
import { onRequest, selectSnapshot } from '../api/projections/[[path]].js';

const manifest = {
  latestSlotKey: '2026-06-07T09:55+08:00',
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
    {
      slotKey: '2026-06-07T09:55+08:00',
      capturedAt: '2026-06-07T01:55:00.000Z',
      timeLabel: '09:55',
      projectionPath: 'bus/projections/2026-06-07/09-55.json',
    },
  ],
};

const projection = {
  layerId: 'bus_vehicles',
  projectionType: 'vehicle_position_projection',
  features: [{ id: 'bus:EAL-3079', longitude: 121.590663, latitude: 25.06696 }],
};

const liveProjection = {
  layerId: 'bus_vehicles',
  projectionType: 'vehicle_position_projection',
  features: [{ id: 'bus:LIVE-955', longitude: 121.52, latitude: 25.04 }],
};

const fakeBucket = {
  async get(key) {
    const payloads = {
      'bus/projections/manifest.json': manifest,
      'bus/projections/2026-05-20/09-55.json': projection,
      'bus/projections/2026-06-07/09-55.json': liveProjection,
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

const fakeAssets = {
  async fetch(request) {
    const path = new URL(request.url).pathname;
    const payloads = {
      '/data/cloudflare-bus-projections/manifest.json': manifest,
      '/data/cloudflare-bus-projections/2026-05-20/09-55.json': projection,
      '/data/cloudflare-bus-projections/2026-06-07/09-55.json': liveProjection,
    };
    const payload = payloads[path];
    return new Response(payload ? JSON.stringify(payload) : 'not found', {
      status: payload ? 200 : 404,
      headers: {
        'content-type': payload ? 'application/json' : 'text/plain',
        etag: '"asset-test"',
      },
    });
  },
};

assert.equal(selectSnapshot(manifest, null).timeLabel, '09:55');
assert.equal(selectSnapshot(manifest, '09-50').slotKey, '2026-05-20T09:50+08:00');
assert.equal(selectSnapshot(manifest, '09:55').slotKey, '2026-06-07T09:55+08:00');
assert.equal(selectSnapshot(manifest, '2026-05-20T09:55+08:00').slotKey, '2026-05-20T09:55+08:00');

const timelineResponse = await onRequest({
  request: new Request('https://demo.example/api/projections/bus_vehicles/timeline'),
  params: { path: ['bus_vehicles', 'timeline'] },
  env: { BUS_PROJECTION_BUCKET: fakeBucket },
});
assert.equal(timelineResponse.status, 200);
assert.deepEqual(await timelineResponse.json(), manifest);

const projectionResponse = await onRequest({
  request: new Request('https://demo.example/api/projections/bus_vehicles?slot=09%3A55'),
  params: { path: ['bus_vehicles'] },
  env: { BUS_PROJECTION_BUCKET: fakeBucket },
});
assert.equal(projectionResponse.status, 200);
assert.deepEqual(await projectionResponse.json(), liveProjection);

const projectionBySlotKeyResponse = await onRequest({
  request: new Request('https://demo.example/api/projections/bus_vehicles?slot=2026-05-20T09%3A55%2B08%3A00'),
  params: { path: ['bus_vehicles'] },
  env: { BUS_PROJECTION_BUCKET: fakeBucket },
});
assert.equal(projectionBySlotKeyResponse.status, 200);
assert.deepEqual(await projectionBySlotKeyResponse.json(), projection);

const assetTimelineResponse = await onRequest({
  request: new Request('https://demo.example/api/projections/bus_vehicles/timeline'),
  params: { path: ['bus_vehicles', 'timeline'] },
  env: { ASSETS: fakeAssets },
});
assert.equal(assetTimelineResponse.status, 200);
assert.deepEqual(await assetTimelineResponse.json(), manifest);

const assetProjectionResponse = await onRequest({
  request: new Request('https://demo.example/api/projections/bus_vehicles?slot=09%3A55'),
  params: { path: ['bus_vehicles'] },
  env: { ASSETS: fakeAssets },
});
assert.equal(assetProjectionResponse.status, 200);
assert.deepEqual(await assetProjectionResponse.json(), liveProjection);

const missingResponse = await onRequest({
  request: new Request('https://demo.example/api/projections/bus_vehicles?slot=12%3A00'),
  params: { path: ['bus_vehicles'] },
  env: { BUS_PROJECTION_BUCKET: fakeBucket },
});
assert.equal(missingResponse.status, 404);
