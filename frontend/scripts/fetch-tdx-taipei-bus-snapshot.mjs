import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const DEFAULT_AUTH_URL = 'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token';
const DEFAULT_API_BASE_URL = 'https://tdx.transportdata.tw/api/basic/v2';
const DEFAULT_ARCHIVE_ROOT = 'public/data/tdx-bus/archive';
const DEFAULT_INTERVAL_MINUTES = 5;

const options = parseArgs(process.argv.slice(2));
const env = {
  ...loadDotEnv(resolve(process.cwd(), '.env')),
  ...process.env,
};

const clientId = env.TDX_CLIENT_ID ?? '';
const clientSecret = env.TDX_CLIENT_SECRET ?? '';
const authUrl = env.TDX_AUTH_URL ?? DEFAULT_AUTH_URL;
const apiBaseUrl = stripTrailingSlash(env.TDX_API_BASE_URL ?? DEFAULT_API_BASE_URL);
const city = options.city ?? 'Taipei';
const limit = Number(options.limit ?? '1200');
const intervalMinutes = Number(options['interval-minutes'] ?? DEFAULT_INTERVAL_MINUTES);
const archiveRoot = resolve(process.cwd(), options['archive-root'] ?? DEFAULT_ARCHIVE_ROOT);
const loop = Boolean(options.loop);
const force = Boolean(options.force);
const maxCaptures = options['max-captures'] === undefined
  ? Number.POSITIVE_INFINITY
  : Number(options['max-captures']);

if (!clientId || !clientSecret) {
  throw new Error('TDX_CLIENT_ID and TDX_CLIENT_SECRET must be configured in .env or process env.');
}

if (!Number.isFinite(limit) || limit <= 0) {
  throw new Error('--limit must be a positive number.');
}

if (!Number.isFinite(intervalMinutes) || intervalMinutes <= 0) {
  throw new Error('--interval-minutes must be a positive number.');
}

if (options['max-captures'] !== undefined && (!Number.isFinite(maxCaptures) || maxCaptures <= 0)) {
  throw new Error('--max-captures must be a positive number.');
}

let completedCaptures = 0;
if ((await captureOnce()).captured) {
  completedCaptures += 1;
}

if (loop && completedCaptures < maxCaptures) {
  while (completedCaptures < maxCaptures) {
    const waitMs = millisecondsUntilNextSlot(new Date(), intervalMinutes);
    console.info(JSON.stringify({
      ok: true,
      completedCaptures,
      maxCaptures: Number.isFinite(maxCaptures) ? maxCaptures : null,
      nextFetchAt: new Date(Date.now() + waitMs).toISOString(),
      intervalMinutes,
    }, null, 2));
    await sleep(waitMs);
    if ((await captureOnce()).captured) {
      completedCaptures += 1;
    }
  }
}

if (Number.isFinite(maxCaptures) && completedCaptures >= maxCaptures) {
  console.info(JSON.stringify({
    ok: true,
    completedCaptures,
    stopped: 'max-captures reached',
  }, null, 2));
}

async function captureOnce() {
  const capturedAtDate = new Date();
  const slot = taipeiSlot(capturedAtDate, intervalMinutes);
  const snapshotPath = join(archiveRoot, slot.date, `${slot.timeLabel.replace(':', '-')}.json`);

  if (!force && existsSync(snapshotPath)) {
    console.info(JSON.stringify({
      ok: true,
      skipped: true,
      reason: 'slot already exists',
      output: snapshotPath,
      city,
      slot: slot.key,
      endpoint: 'Bus/RealTimeByFrequency/City',
    }, null, 2));
    return { captured: false, skipped: true, slot };
  }

  const accessToken = await fetchAccessToken({ authUrl, clientId, clientSecret });
  const rawRows = await fetchTdxJson({
    accessToken,
    apiBaseUrl,
    path: `/Bus/RealTimeByFrequency/City/${encodeURIComponent(city)}`,
    params: {
      '$top': String(limit),
      '$format': 'JSON',
    },
  });

  const records = normalizeSnapshotRows(Array.isArray(rawRows) ? rawRows : [], capturedAtDate);
  const snapshot = {
    schema: 'twfoundry.tdx.citybus.snapshot.v1',
    source: {
      provider: 'TDX',
      dataset: 'Bus.RealTimeByFrequency.City',
      city,
      mode: 'tdx-captured',
    },
    captureDate: slot.date,
    capturedAt: capturedAtDate.toISOString(),
    slot: {
      key: slot.key,
      date: slot.date,
      timeLabel: slot.timeLabel,
      intervalMinutes,
      timeZone: 'Asia/Taipei',
    },
    count: records.length,
    routeCount: new Set(records.map((record) => record.RouteName)).size,
    bounds: computeBounds(records),
    records,
  };

  mkdirSync(dirname(snapshotPath), { recursive: true });
  writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);

  const manifest = upsertManifest(snapshot, snapshotPath);
  writeManifest(manifest);

  console.info(JSON.stringify({
    ok: true,
    output: snapshotPath,
    manifest: manifestPath(),
    city,
    slot: slot.key,
    capturedAt: snapshot.capturedAt,
    records: records.length,
    routeCount: snapshot.routeCount,
    endpoint: 'Bus/RealTimeByFrequency/City',
  }, null, 2));

  return { captured: true, skipped: false, slot };
}

async function fetchAccessToken({ authUrl, clientId, clientSecret }) {
  const response = await fetch(authUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    }),
  });

  if (!response.ok) {
    throw new Error(`TDX token request failed with HTTP ${response.status}.`);
  }

  const payload = await response.json();
  if (!payload.access_token) {
    throw new Error('TDX token response did not include access_token.');
  }

  return payload.access_token;
}

async function fetchTdxJson({ accessToken, apiBaseUrl, path, params }) {
  const url = new URL(`${apiBaseUrl}${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`TDX API request failed with HTTP ${response.status}.`);
  }

  return response.json();
}

function normalizeSnapshotRows(rows, capturedAtDate) {
  const usableRows = rows
    .map((row) => normalizeRow(row, capturedAtDate))
    .filter((row) => row.BusPosition.PositionLat !== null && row.BusPosition.PositionLon !== null);
  const bounds = computeBounds(usableRows);

  return usableRows.map((row) => ({
    ...row,
    x: `${project(row.BusPosition.PositionLon, bounds.minLon, bounds.maxLon, 8, 92).toFixed(2)}%`,
    y: `${project(row.BusPosition.PositionLat, bounds.maxLat, bounds.minLat, 14, 86).toFixed(2)}%`,
  }));
}

function normalizeRow(row, capturedAtDate) {
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
    source: `TDX Bus RealTimeByFrequency City ${city} captured`,
    freshness: ageSeconds > 90 ? 'stale' : 'fresh',
    completeness: completenessScore(row),
    mode: 'tdx-captured',
    age: `${ageSeconds}s`,
  };
}

function upsertManifest(snapshot, snapshotPath) {
  const manifest = readManifest();
  const publicPath = toPublicPath(snapshotPath);
  const entry = {
    slotKey: snapshot.slot.key,
    captureDate: snapshot.captureDate,
    capturedAt: snapshot.capturedAt,
    timeLabel: snapshot.slot.timeLabel,
    intervalMinutes: snapshot.slot.intervalMinutes,
    path: publicPath,
    count: snapshot.count,
    routeCount: snapshot.routeCount,
    bounds: snapshot.bounds,
  };

  const snapshots = [
    ...manifest.snapshots.filter((item) => item.slotKey !== entry.slotKey),
    entry,
  ].sort((left, right) => left.capturedAt.localeCompare(right.capturedAt));

  return {
    schema: 'twfoundry.tdx.citybus.archive-manifest.v1',
    source: snapshot.source,
    intervalMinutes: snapshot.slot.intervalMinutes,
    generatedAt: new Date().toISOString(),
    latestSlotKey: snapshots.at(-1)?.slotKey ?? null,
    snapshots,
  };
}

function readManifest() {
  const path = manifestPath();
  if (!existsSync(path)) {
    return {
      schema: 'twfoundry.tdx.citybus.archive-manifest.v1',
      source: {
        provider: 'TDX',
        dataset: 'Bus.RealTimeByFrequency.City',
        city,
        mode: 'tdx-captured',
      },
      intervalMinutes,
      generatedAt: null,
      latestSlotKey: null,
      snapshots: [],
    };
  }

  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeManifest(manifest) {
  const path = manifestPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
}

function manifestPath() {
  return join(archiveRoot, 'manifest.json');
}

function toPublicPath(path) {
  const publicRoot = resolve(process.cwd(), 'public');
  const relative = path.startsWith(publicRoot)
    ? path.slice(publicRoot.length)
    : path.slice(process.cwd().length);
  return `/${relative.replace(/^\/+/, '')}`;
}

function localizedName(value) {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  return value.Zh_tw ?? value.ZhTw ?? value.En ?? value.en ?? '';
}

function completenessScore(row) {
  const fields = [
    row.PlateNumb,
    row.RouteUID,
    localizedName(row.RouteName),
    row.Direction,
    row.BusPosition?.PositionLat,
    row.BusPosition?.PositionLon,
    row.Speed,
    row.Azimuth,
    row.GPSTime ?? row.UpdateTime,
  ];
  return Number((fields.filter((field) => field !== undefined && field !== null && field !== '').length / fields.length).toFixed(2));
}

function computeBounds(records) {
  const lats = records.map((record) => record.BusPosition.PositionLat).filter((value) => value !== null);
  const lons = records.map((record) => record.BusPosition.PositionLon).filter((value) => value !== null);

  if (lats.length === 0 || lons.length === 0) {
    return {
      minLat: null,
      maxLat: null,
      minLon: null,
      maxLon: null,
    };
  }

  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLon: Math.min(...lons),
    maxLon: Math.max(...lons),
  };
}

function project(value, sourceMin, sourceMax, targetMin, targetMax) {
  if (!Number.isFinite(value) || sourceMin === sourceMax) return (targetMin + targetMax) / 2;
  const ratio = (value - sourceMin) / (sourceMax - sourceMin);
  return targetMin + clamp(ratio, 0, 1) * (targetMax - targetMin);
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function taipeiSlot(date, interval) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date).map((part) => [part.type, part.value]),
  );
  const minute = Math.floor(Number(parts.minute) / interval) * interval;
  const timeLabel = `${parts.hour}:${String(minute).padStart(2, '0')}`;
  const captureDate = `${parts.year}-${parts.month}-${parts.day}`;

  return {
    key: `${captureDate}T${timeLabel}+08:00`,
    date: captureDate,
    timeLabel,
  };
}

function millisecondsUntilNextSlot(date, interval) {
  const slotMs = interval * 60 * 1000;
  const next = Math.ceil((date.getTime() + 1000) / slotMs) * slotMs;
  return Math.max(1000, next - date.getTime());
}

function sleep(ms) {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms);
  });
}

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function loadDotEnv(path) {
  if (!existsSync(path)) return {};

  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const [key, ...value] = line.split('=');
        return [key, value.join('=').replace(/^['"]|['"]$/g, '')];
      }),
  );
}

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith('--')) {
      parsed[key] = true;
      continue;
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}
