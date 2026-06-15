import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { buildRouteProgressObservation } from '../../../frontend/src/busRouteGeometry.js';

const DEFAULT_PROJECTION_ROOT = 'frontend/public/data/cloudflare-bus-projections';
const DEFAULT_ROUTE_CONTEXT_ROOT = 'frontend/public/data/tdx-bus/route-context';
const DEFAULT_OUTPUT = 'infra/clickhouse/out/bus_vehicle_observations.jsonl';

const options = parseArgs(process.argv.slice(2));
const projectionRoot = resolve(process.cwd(), options['projection-root'] ?? DEFAULT_PROJECTION_ROOT);
const routeContextRoot = resolve(process.cwd(), options['route-context-root'] ?? DEFAULT_ROUTE_CONTEXT_ROOT);
const outputPath = resolve(process.cwd(), options.output ?? DEFAULT_OUTPUT);
const limitFiles = options['limit-files'] ? Number(options['limit-files']) : null;

const projectionFiles = listProjectionFiles(projectionRoot);
const selectedFiles = Number.isFinite(limitFiles) ? projectionFiles.slice(0, limitFiles) : projectionFiles;
const routeContextCache = new Map();
const rows = [];
const importedAt = formatTaipeiDateTime(new Date());

for (const file of selectedFiles) {
  const projection = readJson(file);
  const captureDate = file.split('/').at(-2);
  const slotLabel = projection.timelineSlot ?? file.split('/').at(-1)?.replace('.json', '').replace('-', ':');
  const slotStart = `${captureDate} ${slotLabel}:00.000`;
  const capturedAt = formatTaipeiDateTime(projection.capturedAt) ?? slotStart;

  for (const feature of projection.features ?? []) {
    const routeProgress = buildProgress(feature, routeContextCache);
    const gpsTime = formatTaipeiDateTime(feature.gpsTime);
    const updateTime = formatTaipeiDateTime(feature.updateTime);
    const gpsUpdateLagSeconds = secondsBetween(feature.gpsTime, feature.updateTime);

    rows.push({
      service_date: captureDate,
      slot_start: slotStart,
      slot_label: slotLabel,
      captured_at: capturedAt,
      vehicle_id: stringOrEmpty(feature.vehicleId),
      route_uid: stringOrEmpty(feature.routeUid),
      route_name: stringOrEmpty(feature.routeName),
      direction: integerOrDefault(feature.direction, -1),
      longitude: numberOrNull(feature.longitude),
      latitude: numberOrNull(feature.latitude),
      speed_kph: numberOrNull(feature.speedKph),
      azimuth_deg: numberOrNull(feature.azimuthDeg),
      gps_time: gpsTime,
      update_time: updateTime,
      gps_update_lag_seconds: gpsUpdateLagSeconds,
      freshness: stringOrDefault(feature.freshness, 'unknown'),
      completeness: numberOrDefault(feature.completeness, 0),
      route_progress_ratio: routeProgress?.progressRatio ?? null,
      route_progress_meters: routeProgress?.progressMeters ?? null,
      route_length_meters: routeProgress?.routeLengthMeters ?? null,
      distance_to_route_meters: routeProgress?.distanceToRouteMeters ?? null,
      nearest_stop_name: routeProgress?.nearestStop?.name ?? null,
      between_stops_label: routeProgress?.betweenStops?.betweenLabel ?? null,
      source_file: relative(process.cwd(), file),
      imported_at: importedAt,
    });
  }
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`);

console.log(JSON.stringify({
  output: relative(process.cwd(), outputPath),
  projectionFiles: selectedFiles.length,
  rows: rows.length,
  routeContextsLoaded: routeContextCache.size,
}, null, 2));

function buildProgress(feature, routeContextCache) {
  const routeName = stringOrEmpty(feature.routeName);
  if (!routeName) return null;

  const routeContext = getRouteContext(routeName, routeContextCache);
  if (!routeContext) return null;

  return buildRouteProgressObservation({
    id: stringOrEmpty(feature.vehicleId),
    position: {
      longitude: Number(feature.longitude),
      latitude: Number(feature.latitude),
    },
    route: {
      uid: stringOrEmpty(feature.routeUid),
      name: routeName,
      direction: Number(feature.direction),
    },
  }, routeContext);
}

function getRouteContext(routeName, routeContextCache) {
  if (routeContextCache.has(routeName)) return routeContextCache.get(routeName);

  const file = join(routeContextRoot, `${encodeURIComponent(routeName)}.json`);
  const routeContext = existsSync(file) ? readJson(file) : null;
  routeContextCache.set(routeName, routeContext);
  return routeContext;
}

function listProjectionFiles(root) {
  if (!existsSync(root)) throw new Error(`Projection root not found: ${root}`);
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((dateDir) => {
      const dateRoot = join(root, dateDir.name);
      return readdirSync(dateRoot, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
        .map((entry) => join(dateRoot, entry.name));
    })
    .sort();
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function formatTaipeiDateTime(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});

  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}.000`;
}

function secondsBetween(start, end) {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return null;
  return Math.round((endTime - startTime) / 1000);
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function numberOrDefault(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function integerOrDefault(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) ? number : fallback;
}

function stringOrEmpty(value) {
  return value === undefined || value === null ? '' : String(value);
}

function stringOrDefault(value, fallback) {
  return value === undefined || value === null || value === '' ? fallback : String(value);
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
    } else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}
