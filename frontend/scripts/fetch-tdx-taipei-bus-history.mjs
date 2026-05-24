import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const DEFAULT_AUTH_URL = 'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token';
const DEFAULT_HISTORICAL_BASE_URL = 'https://tdx.transportdata.tw/api/historical/v2';
const DEFAULT_ARCHIVE_ROOT = 'public/data/tdx-bus/archive';
const DEFAULT_INTERVAL_MINUTES = 5;
const DEFAULT_TOP = 200000;
const DEFAULT_PER_SLOT_LIMIT = 1200;
const DEFAULT_CARRY_FORWARD_MINUTES = 30;

const options = parseArgs(process.argv.slice(2));
const env = {
  ...loadDotEnv(resolve(process.cwd(), '.env')),
  ...process.env,
};

const clientId = env.TDX_CLIENT_ID ?? '';
const clientSecret = env.TDX_CLIENT_SECRET ?? '';
const authUrl = env.TDX_AUTH_URL ?? DEFAULT_AUTH_URL;
const historicalBaseUrl = stripTrailingSlash(env.TDX_HISTORICAL_API_BASE_URL ?? DEFAULT_HISTORICAL_BASE_URL);
const city = options.city ?? 'Taipei';
const date = options.date ?? previousTaipeiDate();
const top = Number(options.top ?? DEFAULT_TOP);
const intervalMinutes = Number(options['interval-minutes'] ?? DEFAULT_INTERVAL_MINUTES);
const perSlotLimit = Number(options['per-slot-limit'] ?? DEFAULT_PER_SLOT_LIMIT);
const carryForwardMinutes = Number(options['carry-forward-minutes'] ?? DEFAULT_CARRY_FORWARD_MINUTES);
const archiveRoot = resolve(process.cwd(), options['archive-root'] ?? DEFAULT_ARCHIVE_ROOT);
const force = Boolean(options.force);
const replaceManifest = Boolean(options['replace-manifest']);

if (!clientId || !clientSecret) {
  throw new Error('TDX_CLIENT_ID and TDX_CLIENT_SECRET must be configured in .env or process env.');
}

if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  throw new Error('--date must use YYYY-MM-DD format.');
}

if (!Number.isFinite(top) || top <= 0) {
  throw new Error('--top must be a positive number.');
}

if (!Number.isFinite(intervalMinutes) || intervalMinutes <= 0) {
  throw new Error('--interval-minutes must be a positive number.');
}

if (!Number.isFinite(perSlotLimit) || perSlotLimit <= 0) {
  throw new Error('--per-slot-limit must be a positive number.');
}

if (!Number.isFinite(carryForwardMinutes) || carryForwardMinutes < 0) {
  throw new Error('--carry-forward-minutes must be zero or a positive number.');
}

const accessToken = await fetchAccessToken({ authUrl, clientId, clientSecret });
const csvText = await fetchHistoricalCsv({
  accessToken,
  historicalBaseUrl,
  city,
  date,
  top,
});

const csvRows = parseCsv(csvText);
const recordsBySlot = groupRowsBySlot(csvRows, date);
const playbackRecordsBySlot = buildCarryForwardSlots(recordsBySlot, date);
const manifest = replaceManifest ? emptyManifest() : readManifest();
const writtenSnapshots = [];

for (const [slotKey, slotRecords] of [...playbackRecordsBySlot.entries()].sort(([left], [right]) => left.localeCompare(right))) {
  const slot = slotFromKey(slotKey);
  const snapshotPath = join(archiveRoot, slot.date, `${slot.timeLabel.replace(':', '-')}.json`);

  if (!force && existsSync(snapshotPath)) {
    continue;
  }

  const records = normalizeSnapshotRows(slotRecords.slice(0, perSlotLimit), new Date(`${slot.date}T${slot.timeLabel}:00+08:00`));
  const snapshot = {
    schema: 'twfoundry.tdx.citybus.snapshot.v1',
    source: {
      provider: 'TDX',
      dataset: 'Historical.Bus.RealTimeByFrequency.City',
      city,
      mode: 'tdx-historical',
    },
    captureDate: slot.date,
    capturedAt: new Date(`${slot.date}T${slot.timeLabel}:00+08:00`).toISOString(),
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
  upsertManifestEntry(manifest, snapshot, snapshotPath);
  writtenSnapshots.push(snapshot);
}

manifest.snapshots.sort((left, right) => left.capturedAt.localeCompare(right.capturedAt));
manifest.generatedAt = new Date().toISOString();
manifest.latestSlotKey = manifest.snapshots.at(-1)?.slotKey ?? null;
manifest.source = {
  provider: 'TDX',
  dataset: 'Historical.Bus.RealTimeByFrequency.City',
  city,
  mode: 'tdx-historical',
};
writeManifest(manifest);

console.info(JSON.stringify({
  ok: true,
  city,
  date,
  endpoint: 'Historical/Bus/RealTimeByFrequency/City',
  requestedRows: top,
  csvRows: Math.max(0, csvRows.length - 1),
  slotsFromApi: recordsBySlot.size,
  playbackSlots: playbackRecordsBySlot.size,
  expectedSlots: Math.ceil((24 * 60) / intervalMinutes),
  writtenSnapshots: writtenSnapshots.length,
  manifest: manifestPath(),
}, null, 2));

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

async function fetchHistoricalCsv({ accessToken, historicalBaseUrl, city, date, top }) {
  const url = new URL(`${historicalBaseUrl}/Historical/Bus/RealTimeByFrequency/City/${encodeURIComponent(city)}`);
  url.searchParams.set('Dates', date);
  url.searchParams.set('$top', String(top));
  url.searchParams.set('$format', 'CSV');

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`TDX historical API request failed with HTTP ${response.status}.`);
  }

  return response.text();
}

function groupRowsBySlot(csvRows, captureDate) {
  const [header, ...rows] = csvRows;
  if (!header?.length) return new Map();

  const indexes = Object.fromEntries(header.map((name, index) => [name, index]));
  const slotMaps = new Map();

  for (const row of rows) {
    const updateTime = cell(row, indexes.UpdateTime) || cell(row, indexes.SrcUpdateTime) || cell(row, indexes.GPSTime);
    const slot = slotFromTaipeiTime(updateTime);
    if (!slot || slot.date !== captureDate) continue;

    const record = normalizeCsvRow(row, indexes);
    if (record.BusPosition.PositionLat === null || record.BusPosition.PositionLon === null) continue;

    const perVehicle = slotMaps.get(slot.key) ?? new Map();
    const previous = perVehicle.get(record.PlateNumb);
    if (!previous || String(record.UpdateTime).localeCompare(String(previous.UpdateTime)) > 0) {
      perVehicle.set(record.PlateNumb, record);
    }
    slotMaps.set(slot.key, perVehicle);
  }

  return new Map([...slotMaps.entries()].map(([slotKey, perVehicle]) => [
    slotKey,
    [...perVehicle.values()].sort((left, right) => String(right.UpdateTime).localeCompare(String(left.UpdateTime))),
  ]));
}

function buildCarryForwardSlots(recordsBySlot, captureDate) {
  const carriedByPlate = new Map();
  const slots = new Map();
  const carryForwardMs = carryForwardMinutes * 60 * 1000;

  for (const slot of allDaySlots(captureDate)) {
    const directRecords = recordsBySlot.get(slot.key) ?? [];
    for (const record of directRecords) {
      carriedByPlate.set(record.PlateNumb, record);
    }

    const slotTime = new Date(`${slot.date}T${slot.timeLabel}:00+08:00`).getTime();
    const carriedRecords = [...carriedByPlate.values()]
      .filter((record) => slotTime - Date.parse(record.UpdateTime) <= carryForwardMs)
      .sort((left, right) => String(right.UpdateTime).localeCompare(String(left.UpdateTime)))
      .slice(0, perSlotLimit)
      .map((record) => ({
        ...record,
        source: directRecords.some((item) => item.PlateNumb === record.PlateNumb)
          ? record.source
          : `${record.source} carried forward ${carryForwardMinutes}m`,
        mode: directRecords.some((item) => item.PlateNumb === record.PlateNumb)
          ? record.mode
          : 'tdx-historical-carried',
      }));

    if (directRecords.length > 0 || carriedRecords.length > 0) {
      slots.set(slot.key, carriedRecords);
    }
  }

  return slots;
}

function allDaySlots(captureDate) {
  const slots = [];
  const totalSlots = Math.ceil((24 * 60) / intervalMinutes);
  const startMs = new Date(`${captureDate}T00:00:00+08:00`).getTime();

  for (let index = 0; index < totalSlots; index += 1) {
    const dateValue = new Date(startMs + index * intervalMinutes * 60 * 1000);
    slots.push(slotFromTaipeiTime(dateValue.toISOString()));
  }

  return slots;
}

function normalizeCsvRow(row, indexes) {
  const routeName = cell(row, indexes.RouteNameZh_tw) || cell(row, indexes.RouteNameEn) || cell(row, indexes.RouteID) || 'unknown';
  const updateTime = cell(row, indexes.UpdateTime) || cell(row, indexes.SrcUpdateTime) || cell(row, indexes.GPSTime);
  const gpsTime = cell(row, indexes.GPSTime) || updateTime;

  return {
    PlateNumb: cell(row, indexes.PlateNumb) || `TDX-${cell(row, indexes.RouteUID) || routeName}`,
    RouteUID: cell(row, indexes.RouteUID) || '',
    RouteName: routeName,
    Direction: directionCode(cell(row, indexes.Direction)),
    BusPosition: {
      PositionLat: toNumber(cell(row, indexes.PositionLat)),
      PositionLon: toNumber(cell(row, indexes.PositionLon)),
    },
    Speed: Number(cell(row, indexes.Speed) || 0),
    Azimuth: Number(cell(row, indexes.Azimuth) || 0),
    GPSTime: gpsTime,
    UpdateTime: updateTime,
    source: `TDX Historical Bus RealTimeByFrequency City ${city}`,
    freshness: 'fresh',
    completeness: 1,
    mode: 'tdx-historical',
    age: '0s',
  };
}

function normalizeSnapshotRows(rows, capturedAtDate) {
  const bounds = computeBounds(rows);

  return rows.map((row) => ({
    ...row,
    x: `${project(row.BusPosition.PositionLon, bounds.minLon, bounds.maxLon, 8, 92).toFixed(2)}%`,
    y: `${project(row.BusPosition.PositionLat, bounds.maxLat, bounds.minLat, 14, 86).toFixed(2)}%`,
    age: `${Math.max(0, Math.round((capturedAtDate.getTime() - Date.parse(row.UpdateTime)) / 1000))}s`,
  }));
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (quoted) {
      if (char === '"' && nextChar === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((item) => item.length > 1 || item[0]);
}

function slotFromTaipeiTime(value) {
  const dateValue = new Date(value);
  if (!Number.isFinite(dateValue.getTime())) return null;

  const taipeiMs = dateValue.getTime() + 8 * 60 * 60 * 1000;
  const floored = new Date(Math.floor(taipeiMs / (intervalMinutes * 60 * 1000)) * intervalMinutes * 60 * 1000);
  const dateLabel = `${floored.getUTCFullYear()}-${String(floored.getUTCMonth() + 1).padStart(2, '0')}-${String(floored.getUTCDate()).padStart(2, '0')}`;
  const timeLabel = `${String(floored.getUTCHours()).padStart(2, '0')}:${String(floored.getUTCMinutes()).padStart(2, '0')}`;

  return {
    key: `${dateLabel}T${timeLabel}+08:00`,
    date: dateLabel,
    timeLabel,
  };
}

function slotFromKey(key) {
  const match = key.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})\+08:00$/);
  if (!match) throw new Error(`Invalid slot key: ${key}`);
  return {
    key,
    date: match[1],
    timeLabel: match[2],
  };
}

function upsertManifestEntry(manifest, snapshot, snapshotPath) {
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

  manifest.snapshots = [
    ...manifest.snapshots.filter((item) => item.slotKey !== entry.slotKey),
    entry,
  ];
}

function emptyManifest() {
  return {
    schema: 'twfoundry.tdx.citybus.archive-manifest.v1',
    source: {
      provider: 'TDX',
      dataset: 'Historical.Bus.RealTimeByFrequency.City',
      city,
      mode: 'tdx-historical',
    },
    intervalMinutes,
    generatedAt: null,
    latestSlotKey: null,
    snapshots: [],
  };
}

function readManifest() {
  const path = manifestPath();
  if (!existsSync(path)) return emptyManifest();
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

function directionCode(value) {
  if (value === '去程' || value === '0') return 0;
  if (value === '返程' || value === '1') return 1;
  if (value === '循環' || value === '2') return 2;
  return Number.isFinite(Number(value)) ? Number(value) : 255;
}

function cell(row, index) {
  if (index === undefined || index < 0) return '';
  return row[index] ?? '';
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function previousTaipeiDate() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return formatter.format(yesterday);
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
