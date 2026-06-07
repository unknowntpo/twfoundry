import assert from 'node:assert/strict';
import { runIngestor } from '../src/index.js';

class FakeR2Bucket {
  constructor(entries = {}) {
    this.objects = new Map(Object.entries(entries));
  }

  async get(key) {
    if (!this.objects.has(key)) return null;
    const value = this.objects.get(key);
    return {
      async json() {
        return JSON.parse(value);
      },
      async text() {
        return value;
      },
    };
  }

  async put(key, value) {
    this.objects.set(key, value);
  }
}

const tdxRows = [
  {
    PlateNumb: 'EAL-3079',
    RouteUID: 'TPE307',
    RouteName: { Zh_tw: '307' },
    Direction: 0,
    BusPosition: { PositionLat: 25.06696, PositionLon: 121.590663 },
    Speed: 28,
    Azimuth: 90,
    GPSTime: '2026-06-07T02:00:10Z',
    UpdateTime: '2026-06-07T02:00:10Z',
  },
  {
    PlateNumb: 'FAB-2050',
    RouteUID: 'TPE205',
    RouteName: { Zh_tw: '205' },
    Direction: 1,
    BusPosition: { PositionLat: 25.056, PositionLon: 121.52 },
    Speed: 10,
    Azimuth: 180,
    GPSTime: '2026-06-07T02:00:22Z',
    UpdateTime: '2026-06-07T02:00:22Z',
  },
];

function envWithBucket(bucket) {
  return {
    BUS_PROJECTION_BUCKET: bucket,
    TDX_CLIENT_ID: 'client-id',
    TDX_CLIENT_SECRET: 'client-secret',
    TDX_AUTH_URL: 'https://tdx.example/token',
    TDX_API_BASE_URL: 'https://tdx.example/api/basic/v2',
    TDX_CITY: 'Taipei',
    TDX_TOP: '1200',
    INGEST_INTERVAL_MINUTES: '5',
  };
}

function fakeFetcher(calls) {
  return async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method ?? 'GET' });
    if (String(url) === 'https://tdx.example/token') {
      return Response.json({ access_token: 'token' });
    }
    if (String(url).startsWith('https://tdx.example/api/basic/v2/Bus/RealTimeByFrequency/City/Taipei')) {
      assert.equal(init.headers.authorization, 'Bearer token');
      return Response.json(tdxRows);
    }
    return new Response('not found', { status: 404 });
  };
}

const bucket = new FakeR2Bucket();
const calls = [];
const result = await runIngestor(envWithBucket(bucket), {
  now: new Date('2026-06-07T02:02:30.000Z'),
  fetcher: fakeFetcher(calls),
});

assert.equal(result.ok, true);
assert.equal(result.skipped, false);
assert.equal(result.slotKey, '2026-06-07T10:00+08:00');
assert.equal(result.records, 2);
assert.equal(result.projectionFeatures, 2);
assert.equal(result.rawPath, 'bus/raw/tdx/taipei/2026-06-07/10-00.json');
assert.equal(result.projectionPath, 'bus/projections/2026-06-07/10-00.json');
assert.equal(calls.length, 2);

const manifest = JSON.parse(bucket.objects.get('bus/projections/manifest.json'));
assert.equal(manifest.latestSlotKey, '2026-06-07T10:00+08:00');
assert.equal(manifest.snapshots.length, 1);
assert.equal(manifest.source.city, 'Taipei');
assert.equal(manifest.snapshots[0].capturedAt, '2026-06-07T02:02:30.000Z');
assert.equal(manifest.snapshots[0].rawPath, result.rawPath);
assert.equal(manifest.snapshots[0].status, 'success');

const rawSnapshot = JSON.parse(bucket.objects.get(result.rawPath));
assert.equal(rawSnapshot.schema, 'twfoundry.tdx.citybus.snapshot.v1');
assert.equal(rawSnapshot.count, 2);
assert.equal(rawSnapshot.slot.timeLabel, '10:00');

const projection = JSON.parse(bucket.objects.get(result.projectionPath));
assert.equal(projection.layerId, 'bus_vehicles');
assert.equal(projection.features.length, 2);
assert.equal(projection.summary.vehicleCount, 2);

const runLogKeys = [...bucket.objects.keys()].filter((key) => key.startsWith('bus/ingestion-runs/2026-06-07/10-00/'));
assert.equal(runLogKeys.length, 1);
assert.equal(JSON.parse(bucket.objects.get(runLogKeys[0])).status, 'success');

const secondCalls = [];
const skipped = await runIngestor(envWithBucket(bucket), {
  now: new Date('2026-06-07T02:04:10.000Z'),
  fetcher: fakeFetcher(secondCalls),
});
assert.equal(skipped.skipped, true);
assert.equal(secondCalls.length, 0);

const forcedCalls = [];
const forced = await runIngestor(envWithBucket(bucket), {
  now: new Date('2026-06-07T02:04:10.000Z'),
  fetcher: fakeFetcher(forcedCalls),
  force: true,
});
assert.equal(forced.skipped, false);
assert.equal(forcedCalls.length, 2);

const failureBucket = new FakeR2Bucket();
const failingFetcher = async (url) => {
  if (String(url) === 'https://tdx.example/token') {
    return new Response('bad gateway', { status: 502 });
  }
  return Response.json([]);
};
await assert.rejects(
  () => runIngestor(envWithBucket(failureBucket), {
    now: new Date('2026-06-07T02:07:00.000Z'),
    fetcher: failingFetcher,
  }),
  /TDX token request failed/,
);
const failureLogKeys = [...failureBucket.objects.keys()].filter((key) => key.startsWith('bus/ingestion-runs/2026-06-07/10-05/'));
assert.equal(failureLogKeys.length, 1);
assert.equal(JSON.parse(failureBucket.objects.get(failureLogKeys[0])).status, 'failed');
