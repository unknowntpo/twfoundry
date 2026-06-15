import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const DEFAULT_CLICKHOUSE_URL = 'http://127.0.0.1:8123';
const DEFAULT_DATABASE = 'twfoundry';
const DEFAULT_SERVICE_DATE = '2026-05-20';
const DEFAULT_OUTPUT_ROOT = 'public/data/analytics/bus';

const options = parseArgs(process.argv.slice(2));
const clickhouseUrl = stripTrailingSlash(options['clickhouse-url'] ?? process.env.CLICKHOUSE_URL ?? DEFAULT_CLICKHOUSE_URL);
const database = options.database ?? process.env.CLICKHOUSE_DATABASE ?? DEFAULT_DATABASE;
const user = options.user ?? process.env.CLICKHOUSE_USER ?? 'default';
const password = options.password ?? process.env.CLICKHOUSE_PASSWORD ?? 'twfoundry_dev';
const serviceDate = options['service-date'] ?? process.env.TWFOUNDRY_ANALYTICS_SERVICE_DATE ?? DEFAULT_SERVICE_DATE;
const outputRoot = options['output-root'] ?? DEFAULT_OUTPUT_ROOT;
const limit = positiveInteger(options.limit, 50);
const minHeadwayMinutes = positiveInteger(options['min-headway-minutes'], 14);
const publishedAt = new Date().toISOString();

if (!/^\d{4}-\d{2}-\d{2}$/.test(serviceDate)) {
  throw new Error('--service-date must be YYYY-MM-DD.');
}

const metrics = [
  {
    file: 'route-density.json',
    payload: await buildRouteDensity(),
  },
  {
    file: 'data-freshness.json',
    payload: await buildDataFreshness(),
  },
  {
    file: 'bunching.json',
    payload: await buildBunching(),
  },
];

for (const metric of metrics) {
  const path = join(outputRoot, metric.file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(metric.payload, null, 2)}\n`);
}

const manifestPath = join(outputRoot, 'manifest.json');
writeFileSync(manifestPath, `${JSON.stringify({
  schemaVersion: 1,
  source: 'clickhouse-static-snapshot',
  publishedAt,
  serviceDate,
  clickhouse: {
    url: publicClickhouseLabel(clickhouseUrl),
    database,
  },
  metrics: metrics.map((metric) => ({
    metric: metric.payload.metric,
    path: `/data/analytics/bus/${metric.file}`,
    rows: metric.payload.rows.length,
  })),
}, null, 2)}\n`);

console.log(JSON.stringify({
  ok: true,
  outputRoot,
  manifestPath,
  serviceDate,
  metrics: metrics.map((metric) => ({
    file: metric.file,
    metric: metric.payload.metric,
    rows: metric.payload.rows.length,
  })),
}, null, 2));

async function buildRouteDensity() {
  const result = await clickhouse(`
    SELECT
      toStartOfInterval(slot_start, INTERVAL 15 MINUTE) AS bucket_start,
      route_name,
      direction,
      uniqExact(vehicle_id) AS active_vehicles,
      round(avg(speed_kph), 1) AS avg_speed_kph,
      countIf(speed_kph = 0) AS stopped_reports
    FROM ${tableName()}
    WHERE service_date = toDate('${serviceDate}')
    GROUP BY bucket_start, route_name, direction
    HAVING active_vehicles >= 3
    ORDER BY bucket_start ASC, active_vehicles DESC
    LIMIT ${limit}
    FORMAT JSON
  `);

  return metricPayload('route_vehicle_density', result);
}

async function buildDataFreshness() {
  const result = await clickhouse(`
    SELECT
      route_name,
      direction,
      count() AS reports,
      uniqExact(vehicle_id) AS vehicles,
      round(avg(completeness), 3) AS avg_completeness,
      quantileExact(0.95)(gps_update_lag_seconds) AS p95_gps_update_lag_seconds,
      countIf(freshness != 'fresh') AS non_fresh_reports,
      countIf(distance_to_route_meters > 120) AS off_route_reports,
      round(non_fresh_reports / reports, 4) AS non_fresh_rate,
      round(off_route_reports / reports, 4) AS off_route_rate
    FROM ${tableName()}
    WHERE service_date = toDate('${serviceDate}')
    GROUP BY route_name, direction
    HAVING reports >= 20
    ORDER BY non_fresh_rate DESC, off_route_rate DESC, p95_gps_update_lag_seconds DESC
    LIMIT ${limit}
    FORMAT JSON
  `);

  return metricPayload('route_data_freshness', result);
}

async function buildBunching() {
  const result = await clickhouse(`
    WITH ordered AS (
      SELECT
        slot_start,
        route_uid,
        route_name,
        direction,
        vehicle_id AS trailing_vehicle_id,
        route_progress_ratio AS trailing_progress,
        leadInFrame(vehicle_id) OVER route_window AS leading_vehicle_id,
        leadInFrame(route_progress_ratio) OVER route_window AS leading_progress
      FROM ${tableName()}
      WHERE service_date = toDate('${serviceDate}')
        AND route_progress_ratio IS NOT NULL
        AND distance_to_route_meters <= 120
      WINDOW route_window AS (
        PARTITION BY slot_start, route_uid, direction
        ORDER BY route_progress_ratio
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
      )
    )
    SELECT
      slot_start,
      route_name,
      direction,
      trailing_vehicle_id,
      leading_vehicle_id,
      round(trailing_progress, 4) AS trailing_progress,
      round(leading_progress, 4) AS leading_progress,
      round(leading_progress - trailing_progress, 4) AS progress_gap_ratio,
      round((leading_progress - trailing_progress) * 48, 1) AS estimated_headway_minutes
    FROM ordered
    WHERE leading_vehicle_id != ''
      AND leading_progress > trailing_progress
      AND estimated_headway_minutes >= ${minHeadwayMinutes}
    ORDER BY estimated_headway_minutes DESC
    LIMIT ${limit}
    FORMAT JSON
  `);

  return {
    ...metricPayload('route_bunching_signal', result),
    minHeadwayMinutes,
  };
}

function metricPayload(metric, result) {
  return {
    metric,
    serviceDate,
    source: 'clickhouse-static-snapshot',
    publishedAt,
    rows: result.data ?? [],
    statistics: result.statistics ?? null,
  };
}

async function clickhouse(sql) {
  const response = await fetch(`${clickhouseUrl}/?database=${encodeURIComponent(database)}`, {
    method: 'POST',
    headers: authHeaders(),
    body: sql,
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`ClickHouse ${response.status}: ${text.slice(0, 1000)}`);
  }
  return JSON.parse(text);
}

function tableName() {
  return `${database}.bus_vehicle_observations`;
}

function authHeaders() {
  if (!password) return {};
  return {
    authorization: `Basic ${btoa(`${user}:${password}`)}`,
  };
}

function positiveInteger(value, fallback) {
  const number = Number(value ?? fallback);
  return Number.isFinite(number) && number > 0 ? Math.trunc(number) : fallback;
}

function publicClickhouseLabel(value) {
  return value.replace(/\/\/[^:@/]+:[^@/]+@/, '//***:***@');
}

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, '');
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
