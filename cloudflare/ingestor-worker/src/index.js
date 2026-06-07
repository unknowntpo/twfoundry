import {
  BUS_PROJECTION_LAYER_ID,
  BUS_PROJECTION_MANIFEST_KEY,
  BUS_PROJECTION_TYPE,
  projectionPathForSnapshot,
  summarizeBusMapFeatures,
  toBusMapFeature,
} from '../../../frontend/functions/_shared/busProjectionContract.js';

const DEFAULT_AUTH_URL = 'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token';
const DEFAULT_API_BASE_URL = 'https://tdx.transportdata.tw/api/basic/v2';
const DEFAULT_CITY = 'Taipei';
const DEFAULT_TOP = 1200;
const DEFAULT_INTERVAL_MINUTES = 5;
const RAW_PREFIX = 'bus/raw/tdx';
const RUN_PREFIX = 'bus/ingestion-runs';

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
};

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runScheduledIngestor(env, event));
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/health') {
      return jsonResponse({ ok: true, service: 'twfoundry-bus-ingestor' });
    }

    if (request.method === 'POST' && url.pathname === '/run') {
      const auth = request.headers.get('authorization') ?? '';
      const expected = env.INGESTOR_ADMIN_TOKEN ? `Bearer ${env.INGESTOR_ADMIN_TOKEN}` : '';
      if (!expected || auth !== expected) {
        return jsonResponse({ error: 'unauthorized' }, 401);
      }

      const result = await runIngestor(env, {
        now: new Date(),
        force: url.searchParams.get('force') === '1',
      });
      return jsonResponse(result);
    }

    return jsonResponse({ error: 'not_found' }, 404);
  },
};

async function runScheduledIngestor(env, event) {
  const scheduledTime = typeof event.scheduledTime === 'number'
    ? new Date(event.scheduledTime)
    : new Date();

  try {
    await runIngestor(env, { now: scheduledTime });
  } catch (error) {
    console.error(JSON.stringify({
      ok: false,
      service: 'twfoundry-bus-ingestor',
      scheduledTime: scheduledTime.toISOString(),
      message: error.message,
    }));
    throw error;
  }
}

export async function runIngestor(env, options = {}) {
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? new Date();
  const config = configFromEnv(env);
  const slot = taipeiSlot(now, config.intervalMinutes);
  const runId = `${slot.fileLabel}-${new Date().toISOString().replaceAll(':', '').replaceAll('.', '-')}`;
  const rawPath = rawPathForSlot(config.city, slot);
  const projectionPath = projectionPathForSnapshot(slot);
  const runPath = `${RUN_PREFIX}/${slot.captureDate}/${slot.fileLabel}/${runId}.json`;

  try {
    const existingManifest = await readProjectionManifest(env.BUS_PROJECTION_BUCKET);
    const existingSlot = existingManifest.snapshots.find((entry) => entry.slotKey === slot.slotKey);
    if (existingSlot?.status === 'success' && !options.force) {
      const skipped = {
        ok: true,
        skipped: true,
        reason: 'slot already succeeded',
        slotKey: slot.slotKey,
        projectionPath: existingSlot.projectionPath,
      };
      await putJson(env.BUS_PROJECTION_BUCKET, runPath, runLog('skipped', config, slot, skipped));
      return skipped;
    }

    const accessToken = await fetchAccessToken(fetcher, config);
    const rawRows = await fetchTdxBusRows(fetcher, config, accessToken);
    const records = normalizeSnapshotRows(Array.isArray(rawRows) ? rawRows : [], now, config.city);
    const rawSnapshot = buildRawSnapshot(records, config, slot, now);
    const projection = buildProjection(rawSnapshot, slot);

    await putJson(env.BUS_PROJECTION_BUCKET, rawPath, rawSnapshot);
    await putJson(env.BUS_PROJECTION_BUCKET, projectionPath, projection);

    const manifest = upsertProjectionManifest(existingManifest, {
      ...slot,
      rawPath,
      projectionPath,
      capturedAt: rawSnapshot.capturedAt,
      city: config.city,
      count: projection.features.length,
      routeCount: projection.summary.routeCount,
      bounds: rawSnapshot.bounds,
    });
    await putJson(env.BUS_PROJECTION_BUCKET, BUS_PROJECTION_MANIFEST_KEY, manifest);

    const result = {
      ok: true,
      skipped: false,
      city: config.city,
      slotKey: slot.slotKey,
      capturedAt: rawSnapshot.capturedAt,
      records: records.length,
      projectionFeatures: projection.features.length,
      rawPath,
      projectionPath,
      manifestPath: BUS_PROJECTION_MANIFEST_KEY,
    };
    await putJson(env.BUS_PROJECTION_BUCKET, runPath, runLog('success', config, slot, result));
    return result;
  } catch (error) {
    await putJson(env.BUS_PROJECTION_BUCKET, runPath, runLog('failed', config, slot, {
      ok: false,
      message: error.message,
    })).catch((writeError) => {
      console.error(`failed to write ingestion run log: ${writeError.message}`);
    });
    throw error;
  }
}

function configFromEnv(env) {
  if (!env.BUS_PROJECTION_BUCKET) {
    throw new Error('BUS_PROJECTION_BUCKET binding is required.');
  }
  if (!env.TDX_CLIENT_ID || !env.TDX_CLIENT_SECRET) {
    throw new Error('TDX_CLIENT_ID and TDX_CLIENT_SECRET secrets are required.');
  }

  return {
    authUrl: env.TDX_AUTH_URL ?? DEFAULT_AUTH_URL,
    apiBaseUrl: stripTrailingSlash(env.TDX_API_BASE_URL ?? DEFAULT_API_BASE_URL),
    city: env.TDX_CITY ?? DEFAULT_CITY,
    top: positiveInteger(env.TDX_TOP, DEFAULT_TOP, 'TDX_TOP'),
    intervalMinutes: positiveInteger(env.INGEST_INTERVAL_MINUTES, DEFAULT_INTERVAL_MINUTES, 'INGEST_INTERVAL_MINUTES'),
    clientId: env.TDX_CLIENT_ID,
    clientSecret: env.TDX_CLIENT_SECRET,
  };
}

async function fetchAccessToken(fetcher, config) {
  const response = await fetcher(config.authUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'client_credentials',
    }),
  });

  if (!response.ok) {
    throw new Error(`TDX token request failed with HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (!payload.access_token) {
    throw new Error('TDX token response did not include access_token.');
  }
  return payload.access_token;
}

async function fetchTdxBusRows(fetcher, config, accessToken) {
  const url = new URL(`${config.apiBaseUrl}/Bus/RealTimeByFrequency/City/${encodeURIComponent(config.city)}`);
  url.searchParams.set('$top', String(config.top));
  url.searchParams.set('$format', 'JSON');

  const response = await fetcher(url.toString(), {
    headers: { authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`TDX bus request failed with HTTP ${response.status}`);
  }
  return response.json();
}

function buildRawSnapshot(records, config, slot, now) {
  return {
    schema: 'twfoundry.tdx.citybus.snapshot.v1',
    source: {
      provider: 'TDX',
      dataset: 'Bus.RealTimeByFrequency.City',
      city: config.city,
      mode: 'tdx-live-cron',
    },
    captureDate: slot.captureDate,
    capturedAt: now.toISOString(),
    slot: {
      key: slot.slotKey,
      date: slot.captureDate,
      timeLabel: slot.timeLabel,
      intervalMinutes: config.intervalMinutes,
      timeZone: 'Asia/Taipei',
    },
    count: records.length,
    routeCount: new Set(records.map((record) => record.RouteName)).size,
    bounds: computeBounds(records),
    records,
  };
}

function buildProjection(rawSnapshot, slot) {
  const features = rawSnapshot.records.map(toBusMapFeature);
  return {
    layerId: BUS_PROJECTION_LAYER_ID,
    projectionType: BUS_PROJECTION_TYPE,
    source: rawSnapshot.source,
    capturedAt: rawSnapshot.capturedAt,
    timelineSlot: slot.timeLabel,
    features,
    summary: summarizeBusMapFeatures(features),
  };
}

async function readProjectionManifest(bucket) {
  const object = await bucket.get(BUS_PROJECTION_MANIFEST_KEY);
  if (!object) {
    return emptyProjectionManifest();
  }
  return object.json();
}

function upsertProjectionManifest(manifest, slotEntry) {
  const snapshots = [
    ...(Array.isArray(manifest.snapshots) ? manifest.snapshots : []).filter((entry) => entry.slotKey !== slotEntry.slotKey),
    {
      slotKey: slotEntry.slotKey,
      captureDate: slotEntry.captureDate,
      capturedAt: slotEntry.capturedAt,
      timeLabel: slotEntry.timeLabel,
      intervalMinutes: slotEntry.intervalMinutes,
      count: slotEntry.count,
      routeCount: slotEntry.routeCount,
      bounds: slotEntry.bounds,
      rawPath: slotEntry.rawPath,
      projectionPath: slotEntry.projectionPath,
      status: 'success',
      updatedAt: new Date().toISOString(),
    },
  ].sort((left, right) => String(left.capturedAt).localeCompare(String(right.capturedAt)));

  return {
    schema: 'twfoundry.bus.vehicle-projection-manifest.v1',
    layerId: BUS_PROJECTION_LAYER_ID,
    projectionType: BUS_PROJECTION_TYPE,
    source: {
      provider: 'TDX',
      dataset: 'Bus.RealTimeByFrequency.City',
      city: slotEntry.city ?? DEFAULT_CITY,
      mode: 'tdx-live-cron',
    },
    intervalMinutes: slotEntry.intervalMinutes,
    generatedAt: new Date().toISOString(),
    sourceGeneratedAt: manifest.sourceGeneratedAt ?? null,
    latestSlotKey: latestSuccessSlotKey(snapshots),
    snapshots,
  };
}

function emptyProjectionManifest() {
  return {
    schema: 'twfoundry.bus.vehicle-projection-manifest.v1',
    layerId: BUS_PROJECTION_LAYER_ID,
    projectionType: BUS_PROJECTION_TYPE,
    source: {
      provider: 'TDX',
      dataset: 'Bus.RealTimeByFrequency.City',
      city: DEFAULT_CITY,
      mode: 'tdx-live-cron',
    },
    intervalMinutes: DEFAULT_INTERVAL_MINUTES,
    generatedAt: new Date().toISOString(),
    sourceGeneratedAt: null,
    latestSlotKey: null,
    snapshots: [],
  };
}

function latestSuccessSlotKey(snapshots) {
  return [...snapshots]
    .filter((entry) => entry.status === 'success' || !entry.status)
    .sort((left, right) => String(right.capturedAt).localeCompare(String(left.capturedAt)))[0]?.slotKey ?? null;
}

function normalizeSnapshotRows(rows, capturedAtDate, city) {
  const usableRows = rows
    .map((row) => normalizeRow(row, capturedAtDate, city))
    .filter((row) => row.BusPosition.PositionLat !== null && row.BusPosition.PositionLon !== null);
  const bounds = computeBounds(usableRows);

  return usableRows.map((row) => ({
    ...row,
    x: `${project(row.BusPosition.PositionLon, bounds.minLon, bounds.maxLon, 8, 92).toFixed(2)}%`,
    y: `${project(row.BusPosition.PositionLat, bounds.maxLat, bounds.minLat, 14, 86).toFixed(2)}%`,
  }));
}

function normalizeRow(row, capturedAtDate, city) {
  const updateTime = row.UpdateTime ?? row.SrcUpdateTime ?? row.TransTime ?? row.GPSTime ?? null;
  const gpsTime = row.GPSTime ?? updateTime;
  const ageSeconds = updateTime ? Math.max(0, Math.round((capturedAtDate.getTime() - Date.parse(updateTime)) / 1000)) : 0;
  const routeName = localizedName(row.RouteName) || row.RouteID || row.RouteUID || 'unknown';

  return {
    PlateNumb: row.PlateNumb ?? `TDX-${row.RouteUID ?? routeName}-${row.Direction ?? 0}`,
    RouteUID: row.RouteUID ?? '',
    RouteName: routeName,
    Direction: Number(row.Direction ?? 0),
    BusPosition: {
      PositionLat: toNumber(row.BusPosition?.PositionLat),
      PositionLon: toNumber(row.BusPosition?.PositionLon),
    },
    Speed: Number(row.Speed ?? 0),
    Azimuth: Number(row.Azimuth ?? 0),
    GPSTime: gpsTime,
    UpdateTime: updateTime,
    source: `TDX Bus RealTimeByFrequency City ${city} cron`,
    freshness: ageSeconds > 90 ? 'stale' : 'fresh',
    completeness: completenessScore(row),
    mode: 'tdx-live-cron',
    age: `${ageSeconds}s`,
  };
}

function taipeiSlot(date, intervalMinutes) {
  const slotMs = intervalMinutes * 60 * 1000;
  const flooredMs = Math.floor(date.getTime() / slotMs) * slotMs;
  const taipei = new Date(flooredMs + 8 * 60 * 60 * 1000);
  const captureDate = taipei.toISOString().slice(0, 10);
  const timeLabel = taipei.toISOString().slice(11, 16);
  return {
    slotKey: `${captureDate}T${timeLabel}+08:00`,
    captureDate,
    timeLabel,
    fileLabel: timeLabel.replace(':', '-'),
    intervalMinutes,
  };
}

function rawPathForSlot(city, slot) {
  return `${RAW_PREFIX}/${city.toLowerCase()}/${slot.captureDate}/${slot.fileLabel}.json`;
}

async function putJson(bucket, key, value) {
  await bucket.put(key, JSON.stringify(value, null, 2), {
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
  });
}

function runLog(status, config, slot, details) {
  return {
    schema: 'twfoundry.bus.ingestion-run.v1',
    status,
    provider: 'TDX',
    dataset: 'Bus.RealTimeByFrequency.City',
    city: config.city,
    slotKey: slot.slotKey,
    captureDate: slot.captureDate,
    timeLabel: slot.timeLabel,
    intervalMinutes: config.intervalMinutes,
    recordedAt: new Date().toISOString(),
    details,
  };
}

function computeBounds(rows) {
  const coordinates = rows
    .map((row) => [row.BusPosition.PositionLon, row.BusPosition.PositionLat])
    .filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat));
  if (coordinates.length === 0) {
    return { minLat: 0, maxLat: 0, minLon: 0, maxLon: 0 };
  }
  return {
    minLon: Math.min(...coordinates.map(([lon]) => lon)),
    maxLon: Math.max(...coordinates.map(([lon]) => lon)),
    minLat: Math.min(...coordinates.map(([, lat]) => lat)),
    maxLat: Math.max(...coordinates.map(([, lat]) => lat)),
  };
}

function project(value, min, max, outMin, outMax) {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) || min === max) {
    return (outMin + outMax) / 2;
  }
  return outMin + ((value - min) / (max - min)) * (outMax - outMin);
}

function completenessScore(row) {
  const fields = [
    row.PlateNumb,
    row.RouteUID,
    localizedName(row.RouteName),
    row.BusPosition?.PositionLat,
    row.BusPosition?.PositionLon,
    row.GPSTime ?? row.UpdateTime,
  ];
  return fields.filter((field) => field !== undefined && field !== null && field !== '').length / fields.length;
}

function localizedName(value) {
  if (typeof value === 'string') return value;
  return value?.Zh_tw ?? value?.ZhTw ?? value?.En ?? value?.Name ?? '';
}

function toNumber(value) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function positiveInteger(value, fallback, name) {
  const number = Number(value ?? fallback);
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return number;
}

function stripTrailingSlash(value) {
  return String(value).replace(/\/+$/, '');
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: jsonHeaders,
  });
}
