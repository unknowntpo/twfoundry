const PORT = Number(process.env.PORT ?? 8080);
const CLICKHOUSE_URL = stripTrailingSlash(process.env.CLICKHOUSE_URL ?? 'http://clickhouse:8123');
const CLICKHOUSE_DATABASE = process.env.CLICKHOUSE_DATABASE ?? 'twfoundry';
const CLICKHOUSE_USER = process.env.CLICKHOUSE_USER ?? 'default';
const CLICKHOUSE_PASSWORD = process.env.CLICKHOUSE_PASSWORD ?? '';
const DEFAULT_SERVICE_DATE = process.env.DEFAULT_SERVICE_DATE ?? '2026-05-20';

const routes = new Map([
  ['/health', handleHealth],
  ['/analytics/bus/route-density', handleRouteDensity],
  ['/analytics/bus/data-freshness', handleDataFreshness],
  ['/analytics/bus/bunching', handleBunching],
]);

Bun.serve({
  port: PORT,
  async fetch(request) {
    const url = new URL(request.url);
    const handler = routes.get(url.pathname);
    if (!handler) return json({ error: 'not_found', path: url.pathname }, 404);

    try {
      return await handler(url);
    } catch (error) {
      console.error(error);
      return json({
        error: 'analytics_query_failed',
        message: error.message,
      }, 500);
    }
  },
});

console.log(JSON.stringify({
  service: 'twfoundry-analytics-api',
  port: PORT,
  clickhouseUrl: CLICKHOUSE_URL,
  database: CLICKHOUSE_DATABASE,
}));

async function handleHealth() {
  const result = await clickhouse('SELECT 1 AS ok FORMAT JSON');
  return json({
    status: 'ok',
    clickhouse: result.data?.[0]?.ok === 1 ? 'ok' : 'unknown',
  });
}

async function handleRouteDensity(url) {
  const serviceDate = serviceDateParam(url);
  const limit = limitParam(url, 50);

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

  return json({
    metric: 'route_vehicle_density',
    serviceDate,
    rows: result.data ?? [],
    statistics: result.statistics ?? null,
  });
}

async function handleDataFreshness(url) {
  const serviceDate = serviceDateParam(url);
  const limit = limitParam(url, 50);

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

  return json({
    metric: 'route_data_freshness',
    serviceDate,
    rows: result.data ?? [],
    statistics: result.statistics ?? null,
  });
}

async function handleBunching(url) {
  const serviceDate = serviceDateParam(url);
  const limit = limitParam(url, 50);
  const minHeadwayMinutes = numberParam(url, 'min_headway_minutes', 14, 1, 180);

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

  return json({
    metric: 'route_bunching_signal',
    serviceDate,
    minHeadwayMinutes,
    rows: result.data ?? [],
    statistics: result.statistics ?? null,
  });
}

async function clickhouse(sql) {
  const response = await fetch(`${CLICKHOUSE_URL}/?database=${encodeURIComponent(CLICKHOUSE_DATABASE)}`, {
    method: 'POST',
    headers: clickhouseAuthHeaders(),
    body: sql,
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`ClickHouse ${response.status}: ${text.slice(0, 800)}`);
  }
  return JSON.parse(text);
}

function serviceDateParam(url) {
  const value = url.searchParams.get('service_date') ?? DEFAULT_SERVICE_DATE;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('service_date must be YYYY-MM-DD');
  }
  return value;
}

function limitParam(url, fallback) {
  return numberParam(url, 'limit', fallback, 1, 500);
}

function numberParam(url, name, fallback, min, max) {
  const raw = url.searchParams.get(name);
  const value = raw === null ? fallback : Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${name} must be between ${min} and ${max}`);
  }
  return Math.trunc(value);
}

function tableName() {
  return `${CLICKHOUSE_DATABASE}.bus_vehicle_observations`;
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
    },
  });
}

function clickhouseAuthHeaders() {
  if (!CLICKHOUSE_PASSWORD) return {};
  return {
    authorization: `Basic ${btoa(`${CLICKHOUSE_USER}:${CLICKHOUSE_PASSWORD}`)}`,
  };
}

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}
