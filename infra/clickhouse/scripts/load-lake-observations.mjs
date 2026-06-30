#!/usr/bin/env node
// Load lake JSONL (normalized.tdx.bus_vehicle_position) for one service day into
// ClickHouse twfoundry.bus_vehicle_observations. Idempotent per service_date:
// the day's rows are deleted (synchronous mutation) before re-insert, so re-runs
// converge. This is the batch layer's lake -> ClickHouse ingestion step.
//
// Usage:
//   node infra/clickhouse/scripts/load-lake-observations.mjs --service-date 2026-06-21
//   (defaults: --lake-dir data/lake, latest YYYY-MM-DD.jsonl if no --service-date)
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRouteProgressObservation } from '../../../frontend/src/busRouteGeometry.js';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const args = parseArgs(process.argv.slice(2));
const lakeDir = args['lake-dir'] ?? 'data/lake';
// UNK-61: map-match each lake position against its route geometry so the batch layer
// populates route_progress_ratio / distance_to_route_meters — without these the
// bunching/service-gap SQL filters out every row. Same buildRouteProgressObservation
// the frontend + offline projection exporter use. Route-context geometry is bundled in
// the batch image (see services/bus-batch-job/Dockerfile).
const routeContextRoot = resolve(
  args['route-context-root']
  ?? process.env.ROUTE_CONTEXT_ROOT
  ?? join(scriptDir, '../../../frontend/public/data/tdx-bus/route-context'),
);
const routeContextCache = new Map();
const serviceDate = args['service-date'] ?? latestServiceDate(lakeDir);
const chUrl = stripSlash(args['clickhouse-url'] ?? process.env.CLICKHOUSE_URL ?? 'http://127.0.0.1:8123');
const chDb = args.database ?? process.env.CLICKHOUSE_DATABASE ?? 'twfoundry';
const chUser = args.user ?? process.env.CLICKHOUSE_USER ?? 'default';
const chPass = args.password ?? process.env.CLICKHOUSE_PASSWORD ?? 'twfoundry_dev';
const table = `${chDb}.bus_vehicle_observations`;

if (!/^\d{4}-\d{2}-\d{2}$/.test(serviceDate)) throw new Error(`bad --service-date: ${serviceDate}`);

const lakePath = join(lakeDir, `${serviceDate}.jsonl`);
const sourceFile = basename(lakePath);
const lines = readFileSync(lakePath, 'utf8').split('\n').filter((l) => l.trim());

const rows = [];
let skipped = 0;
let mapMatched = 0;
for (const line of lines) {
  let r;
  try { r = JSON.parse(line); } catch { skipped += 1; continue; }
  if (r.service_date !== serviceDate) { skipped += 1; continue; }
  const progress = buildProgress(r);
  if (progress) mapMatched += 1;
  rows.push({
    service_date: r.service_date,
    slot_start: chDateTime(r.slot_key),
    slot_label: r.slot_label ?? '',
    captured_at: chDateTime(r.update_time ?? r.gps_time ?? r.slot_key),
    vehicle_id: String(r.vehicle_id ?? ''),
    route_uid: String(r.route_uid ?? ''),
    route_name: String(r.route_name ?? ''),
    direction: Number(r.direction ?? 0),
    longitude: Number(r.longitude),
    latitude: Number(r.latitude),
    speed_kph: numOrNull(r.speed_kph),
    azimuth_deg: numOrNull(r.azimuth_deg),
    gps_time: chDateTime(r.gps_time),
    update_time: chDateTime(r.update_time),
    gps_update_lag_seconds: lagSeconds(r.update_time, r.gps_time),
    freshness: r.freshness ?? 'unknown',
    completeness: Number(r.completeness ?? 0),
    route_progress_ratio: progress?.progressRatio ?? null,
    route_progress_meters: progress?.progressMeters ?? null,
    route_length_meters: progress?.routeLengthMeters ?? null,
    distance_to_route_meters: progress?.distanceToRouteMeters ?? null,
    nearest_stop_name: progress?.nearestStop?.name ?? null,
    between_stops_label: progress?.betweenStops?.betweenLabel ?? null,
    source_file: sourceFile,
  });
}

if (rows.length === 0) throw new Error(`no rows for ${serviceDate} in ${lakePath}`);

console.log(`[load] ${lakePath}: ${rows.length} rows (skipped ${skipped}, map-matched ${mapMatched})`);

// Idempotent: drop the day's existing rows first (synchronous mutation).
await ch(`ALTER TABLE ${table} DELETE WHERE service_date = '${serviceDate}' SETTINGS mutations_sync = 1`);
console.log(`[load] cleared existing rows for ${serviceDate}`);

const body = rows.map((row) => JSON.stringify(row)).join('\n');
await ch(`INSERT INTO ${table} FORMAT JSONEachRow`, body);

const count = (await ch(
  `SELECT count() FROM ${table} WHERE service_date = '${serviceDate}' FORMAT TabSeparated`,
)).trim();
const routes = (await ch(
  `SELECT uniqExact(route_name) FROM ${table} WHERE service_date = '${serviceDate}' FORMAT TabSeparated`,
)).trim();
console.log(`[load] done: ${count} rows in ClickHouse for ${serviceDate} across ${routes} routes`);

// --- helpers ---
function chDateTime(iso) {
  if (!iso) return null;
  const m = String(iso).match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  return `${m[1]} ${m[2]}:${m[3]}:${m[4] ?? '00'}`;
}
function lagSeconds(update, gps) {
  if (!update || !gps) return null;
  const d = Math.round((Date.parse(update) - Date.parse(gps)) / 1000);
  return Number.isFinite(d) ? d : null;
}
function numOrNull(v) { return v == null || v === '' || Number.isNaN(Number(v)) ? null : Number(v); }

// Map-match a lake row against its route geometry (route-context). Returns null when
// the route has no context file or the point can't be projected — those rows keep null
// progress and simply don't contribute to bunching/service-gap detection.
function buildProgress(r) {
  const routeName = String(r.route_name ?? '');
  if (!routeName) return null;
  const lon = Number(r.longitude);
  const lat = Number(r.latitude);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  const routeContext = getRouteContext(routeName);
  if (!routeContext) return null;
  return buildRouteProgressObservation({
    id: String(r.vehicle_id ?? ''),
    position: { longitude: lon, latitude: lat },
    route: { uid: String(r.route_uid ?? ''), name: routeName, direction: Number(r.direction ?? 0) },
  }, routeContext);
}

function getRouteContext(routeName) {
  if (routeContextCache.has(routeName)) return routeContextCache.get(routeName);
  const file = join(routeContextRoot, `${encodeURIComponent(routeName)}.json`);
  let routeContext = null;
  try { routeContext = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null; } catch { routeContext = null; }
  routeContextCache.set(routeName, routeContext);
  return routeContext;
}

async function ch(query, body) {
  const url = `${chUrl}/?database=${encodeURIComponent(chDb)}&query=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'X-ClickHouse-User': chUser,
      'X-ClickHouse-Key': chPass,
      'Content-Type': 'text/plain',
    },
    body: body ?? '',
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`ClickHouse ${res.status}: ${text.slice(0, 300)}`);
  return text;
}

function latestServiceDate(dir) {
  const dates = readdirSync(dir)
    .map((f) => f.match(/^(\d{4}-\d{2}-\d{2})\.jsonl$/)?.[1])
    .filter(Boolean)
    .sort();
  if (dates.length === 0) throw new Error(`no YYYY-MM-DD.jsonl in ${dir}`);
  return dates.at(-1);
}
function stripSlash(s) { return s.replace(/\/+$/, ''); }
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[(i += 1)] : 'true';
      out[key] = val;
    }
  }
  return out;
}
