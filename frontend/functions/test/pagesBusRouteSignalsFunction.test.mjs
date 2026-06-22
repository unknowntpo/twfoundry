import assert from 'node:assert/strict';
import { onRequest } from '../api/online/bus-route-signals/index.js';

const signalBundle = {
  source: 'flink-speed-layer',
  status: 'ok',
  generatedAt: '2026-06-22T09:00:00Z',
  latestSlotKey: '2026-06-22T17:00+08:00',
  signals: [
    { type: 'suspected_gap', route_name: '307', headway_min_est: 19.2 },
    { type: 'suspected_bunching', route_name: '2', headway_min_est: 1.1 },
  ],
};

const fakeBucket = {
  async get(key) {
    assert.equal(key, 'online/bus-route-signals/latest.json');
    return {
      async json() {
        return signalBundle;
      },
    };
  },
};

const response = await onRequest({
  request: new Request('https://demo.example/api/online/bus-route-signals?limit=1'),
  env: { BUS_PROJECTION_BUCKET: fakeBucket },
});

assert.equal(response.status, 200);
const body = await response.json();
assert.equal(body.status, 'ok');
assert.equal(body.signals.length, 1);
assert.equal(body.signals[0].type, 'suspected_gap');

const emptyResponse = await onRequest({
  request: new Request('https://demo.example/api/online/bus-route-signals'),
  env: {},
});
const emptyBody = await emptyResponse.json();
assert.equal(emptyBody.status, 'waiting_for_flink');
assert.deepEqual(emptyBody.signals, []);
