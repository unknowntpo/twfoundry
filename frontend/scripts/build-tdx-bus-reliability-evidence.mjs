import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { buildDelayPoc } from '../functions/api/tdx/bus-delay-poc.js';

const DEFAULT_AUTH_URL = 'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token';
const DEFAULT_BASIC_BASE_URL = 'https://tdx.transportdata.tw/api/basic/v2';
const DEFAULT_OUTPUT_ROOT = 'public/data/tdx-bus/reliability-evidence';

const options = parseArgs(process.argv.slice(2));
const envFile = resolve(process.cwd(), options['env-file'] ?? '.env');
const env = {
  ...loadDotEnv(envFile),
  ...process.env,
};

const clientId = env.TDX_CLIENT_ID ?? '';
const clientSecret = env.TDX_CLIENT_SECRET ?? '';
const authUrl = env.TDX_AUTH_URL ?? DEFAULT_AUTH_URL;
const basicBaseUrl = stripTrailingSlash(env.TDX_BASIC_API_BASE_URL ?? env.TDX_API_BASE_URL ?? DEFAULT_BASIC_BASE_URL);
const city = options.city ?? 'Taipei';
const route = String(options.route ?? '1');
const outputRoot = options['output-root'] ?? DEFAULT_OUTPUT_ROOT;
const requestDelayMs = Number(options['request-delay-ms'] ?? '650');
const maxRetries = Number(options['max-retries'] ?? '3');

if (!clientId || !clientSecret) {
  console.error(JSON.stringify({
    ok: false,
    envFile,
    hasClientId: Boolean(clientId),
    hasClientSecret: Boolean(clientSecret),
    error: 'TDX_CLIENT_ID and TDX_CLIENT_SECRET must be configured.',
  }, null, 2));
  process.exit(1);
}

if (!Number.isFinite(requestDelayMs) || requestDelayMs < 0) {
  throw new Error('--request-delay-ms must be a non-negative number.');
}

if (!Number.isInteger(maxRetries) || maxRetries < 0) {
  throw new Error('--max-retries must be a non-negative integer.');
}

const accessToken = await fetchAccessToken({ authUrl, clientId, clientSecret });
const fetchedAt = new Date().toISOString();

const etaRows = await fetchEndpointRows('EstimatedTimeOfArrival', accessToken);
await delay(requestDelayMs);
const scheduleRows = await fetchEndpointRows('Schedule', accessToken);
await delay(requestDelayMs);
const stopOfRouteRows = await fetchEndpointRows('StopOfRoute', accessToken);

const projection = buildDelayPoc({
  city,
  route,
  generatedAt: fetchedAt,
  etaRows,
  scheduleRows,
  stopOfRouteRows,
});

const outputPath = join(outputRoot, `route-${safeFileName(route)}.json`);
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(projection, null, 2)}\n`);

const manifestPath = join(outputRoot, 'manifest.json');
const manifest = mergeManifest(manifestPath, {
  generatedAt: fetchedAt,
  city,
  routes: [{
    route,
    path: `/${outputPath.replace(/^public\//, '')}`,
    rowCounts: projection.rowCounts,
    joinQuality: projection.joinQuality,
    signalPolicy: projection.signalPolicy,
  }],
});
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(JSON.stringify({
  ok: true,
  outputPath,
  manifestPath,
  rowCounts: projection.rowCounts,
  joinQuality: projection.joinQuality,
  signalPolicy: projection.signalPolicy,
}, null, 2));

async function fetchEndpointRows(endpointName, accessToken) {
  const path = `/Bus/${endpointName}/City/${encodeURIComponent(city)}/${encodeURIComponent(route)}`;
  const url = new URL(`${basicBaseUrl}${path}`);
  url.searchParams.set('$format', 'JSON');
  const response = await fetchWithRetry(url, accessToken);
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`${endpointName} HTTP ${response.status}: ${JSON.stringify(errorSummary(payload))}`);
  }
  const rows = normalizeRows(payload).filter((row) => routeNameMatches(row.RouteName, route));
  if (rows.length === 0) {
    throw new Error(`${endpointName} returned no exact RouteName matches for route ${route}.`);
  }
  return rows;
}

function buildReliabilityEvidenceProjection({ city: cityName, route: routeName, fetchedAt: generatedAt, etaRows, scheduleRows, stopOfRouteRows }) {
  const stopIndex = buildStopIndex(stopOfRouteRows);
  const evidenceRows = etaRows.map((eta) => {
    const stopMatch = findStopMatch(stopIndex, eta);
    return {
      routeUID: eta.RouteUID ?? null,
      routeName: localizedName(eta.RouteName) ?? routeName,
      direction: numberOrNull(eta.Direction),
      stopUID: eta.StopUID ?? null,
      stopID: eta.StopID ?? null,
      stopName: localizedName(eta.StopName),
      stopSequence: stopMatch?.sequence ?? numberOrNull(eta.StopSequence),
      stopJoined: Boolean(stopMatch),
      estimateSeconds: numberOrNull(eta.EstimateTime),
      estimateMinutes: secondsToMinutes(eta.EstimateTime),
      stopStatus: numberOrNull(eta.StopStatus),
      sourceUpdateTime: eta.SrcUpdateTime ?? null,
      updateTime: eta.UpdateTime ?? null,
      evidenceKind: 'eta-stop',
    };
  });

  const joinedCount = evidenceRows.filter((row) => row.stopJoined).length;
  const directionSummaries = summarizeDirections({
    evidenceRows,
    stopOfRouteRows,
    scheduleRows,
  });
  const scheduleSummary = summarizeSchedule(scheduleRows);
  const hasEtaStopEvidence = evidenceRows.length > 0 && joinedCount > 0;
  const hasScheduleRows = scheduleRows.length > 0;

  return {
    schemaVersion: 1,
    generatedAt,
    source: {
      provider: 'TDX',
      city: cityName,
      route: routeName,
      endpoints: [
        'Bus.EstimatedTimeOfArrival.City',
        'Bus.Schedule.City',
        'Bus.StopOfRoute.City',
      ],
    },
    signalPolicy: {
      currentUserFacingSignal: 'Possible service gap',
      delayAllowed: false,
      reason: hasEtaStopEvidence
        ? 'ETA joins to StopOfRoute, but schedule semantics still need validation before calling this delay.'
        : 'ETA could not be joined to route stops, so this cannot support delay wording.',
      nextPromotionGate: 'Validate Schedule Timetables/Frequencys semantics against ETA or observed stop events.',
    },
    rowCounts: {
      estimatedTimeOfArrival: etaRows.length,
      schedule: scheduleRows.length,
      stopOfRoute: stopOfRouteRows.length,
      evidenceRows: evidenceRows.length,
    },
    joinQuality: {
      etaRows: evidenceRows.length,
      etaStopJoinedRows: joinedCount,
      etaStopJoinRate: ratio(joinedCount, evidenceRows.length),
      missingStopRows: evidenceRows
        .filter((row) => !row.stopJoined)
        .slice(0, 10)
        .map((row) => ({
          direction: row.direction,
          stopUID: row.stopUID,
          stopID: row.stopID,
          stopName: row.stopName,
        })),
    },
    directionSummaries,
    scheduleSummary,
    evidenceRows: evidenceRows
      .sort((left, right) => (
        (left.direction ?? 999) - (right.direction ?? 999)
        || (left.stopSequence ?? 9999) - (right.stopSequence ?? 9999)
        || String(left.stopUID ?? '').localeCompare(String(right.stopUID ?? ''))
      )),
  };
}

function buildStopIndex(stopOfRouteRows) {
  const byStopUID = new Map();
  const byStopID = new Map();

  for (const stopOfRoute of stopOfRouteRows) {
    const direction = numberOrNull(stopOfRoute.Direction);
    for (const stop of stopOfRoute.Stops ?? []) {
      const record = {
        direction,
        routeUID: stopOfRoute.RouteUID ?? null,
        stopUID: stop.StopUID ?? null,
        stopID: stop.StopID ?? null,
        name: localizedName(stop.StopName),
        sequence: numberOrNull(stop.StopSequence),
      };
      if (record.stopUID) byStopUID.set(joinKey(direction, record.stopUID), record);
      if (record.stopID) byStopID.set(joinKey(direction, record.stopID), record);
    }
  }

  return { byStopUID, byStopID };
}

function findStopMatch(stopIndex, eta) {
  const direction = numberOrNull(eta.Direction);
  if (eta.StopUID) {
    const match = stopIndex.byStopUID.get(joinKey(direction, eta.StopUID));
    if (match) return match;
  }
  if (eta.StopID) {
    const match = stopIndex.byStopID.get(joinKey(direction, eta.StopID));
    if (match) return match;
  }
  return null;
}

function summarizeDirections({ evidenceRows, stopOfRouteRows, scheduleRows }) {
  const directions = new Set([
    ...evidenceRows.map((row) => row.direction),
    ...stopOfRouteRows.map((row) => numberOrNull(row.Direction)),
    ...scheduleRows.map((row) => numberOrNull(row.Direction)),
  ].filter((value) => value !== null));

  return [...directions].sort((left, right) => left - right).map((direction) => {
    const etaForDirection = evidenceRows.filter((row) => row.direction === direction);
    const stopOfRoute = stopOfRouteRows.find((row) => numberOrNull(row.Direction) === direction);
    const schedule = scheduleRows.find((row) => numberOrNull(row.Direction) === direction);
    const joined = etaForDirection.filter((row) => row.stopJoined).length;
    return {
      direction,
      stopCount: stopOfRoute?.Stops?.length ?? 0,
      etaCount: etaForDirection.length,
      etaStopJoinRate: ratio(joined, etaForDirection.length),
      timetableCount: schedule?.Timetables?.length ?? 0,
      frequencyCount: schedule?.Frequencys?.length ?? 0,
      firstStop: localizedName(stopOfRoute?.Stops?.[0]?.StopName) ?? null,
      lastStop: localizedName(stopOfRoute?.Stops?.at?.(-1)?.StopName) ?? null,
    };
  });
}

function summarizeSchedule(scheduleRows) {
  return scheduleRows.map((row) => ({
    routeUID: row.RouteUID ?? null,
    routeName: localizedName(row.RouteName),
    direction: numberOrNull(row.Direction),
    timetableCount: row.Timetables?.length ?? 0,
    frequencyCount: row.Frequencys?.length ?? 0,
    serviceDay: row.ServiceDay ?? null,
    updateTime: row.UpdateTime ?? null,
    hasTimetables: Array.isArray(row.Timetables) && row.Timetables.length > 0,
    hasFrequencies: Array.isArray(row.Frequencys) && row.Frequencys.length > 0,
    firstTimetable: summarizeTimetable(row.Timetables?.[0]),
    firstFrequency: summarizeFrequency(row.Frequencys?.[0]),
  }));
}

function summarizeTimetable(value) {
  if (!value || typeof value !== 'object') return null;
  return {
    stopUID: value.StopUID ?? null,
    stopID: value.StopID ?? null,
    stopName: localizedName(value.StopName),
    arrivalTime: value.ArrivalTime ?? null,
    departureTime: value.DepartureTime ?? null,
    sequence: numberOrNull(value.StopSequence),
  };
}

function summarizeFrequency(value) {
  if (!value || typeof value !== 'object') return null;
  return {
    startTime: value.StartTime ?? null,
    endTime: value.EndTime ?? null,
    minHeadwayMins: numberOrNull(value.MinHeadwayMins),
    maxHeadwayMins: numberOrNull(value.MaxHeadwayMins),
  };
}

async function fetchAccessToken({ authUrl: url, clientId: id, clientSecret: secret }) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: id,
      client_secret: secret,
      grant_type: 'client_credentials',
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    console.error(JSON.stringify({
      ok: false,
      status: response.status,
      authUrl: url,
      hasClientId: true,
      hasClientSecret: true,
      hasAccessToken: Boolean(payload.access_token),
      error: payload.error ?? null,
      errorDescription: payload.error_description ?? null,
    }, null, 2));
    process.exit(1);
  }

  return payload.access_token;
}

async function fetchWithRetry(url, accessToken) {
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (response.status !== 429 || attempt === maxRetries) return response;

    const retryAfterSeconds = Number(response.headers.get('retry-after'));
    const backoffMs = Number.isFinite(retryAfterSeconds)
      ? retryAfterSeconds * 1000
      : requestDelayMs * 2 ** (attempt + 1);
    await delay(backoffMs);
  }

  throw new Error('unreachable retry state');
}

function mergeManifest(path, entry) {
  const current = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {
    schemaVersion: 1,
    generatedAt: entry.generatedAt,
    city: entry.city,
    routes: [],
  };
  const routes = [
    ...current.routes.filter((routeEntry) => routeEntry.route !== entry.routes[0].route),
    entry.routes[0],
  ].sort((left, right) => String(left.route).localeCompare(String(right.route)));
  return {
    ...current,
    generatedAt: entry.generatedAt,
    city: entry.city,
    routes,
  };
}

function normalizeRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.value)) return payload.value;
  return [];
}

function localizedName(value) {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return null;
  return value.Zh_tw ?? value.En ?? value.zh_tw ?? value.en ?? null;
}

function routeNameMatches(value, expectedRoute) {
  return localizedName(value) === expectedRoute;
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function secondsToMinutes(value) {
  const number = numberOrNull(value);
  return number === null ? null : Math.round((number / 60) * 10) / 10;
}

function ratio(numerator, denominator) {
  return denominator > 0 ? Math.round((numerator / denominator) * 1000) / 1000 : null;
}

function joinKey(direction, id) {
  return `${direction ?? 'unknown'}:${id}`;
}

function safeFileName(value) {
  return encodeURIComponent(String(value)).replace(/%20/g, '-');
}

function errorSummary(payload) {
  if (!payload || typeof payload !== 'object') return null;
  return {
    error: payload.error ?? null,
    message: payload.message ?? payload.error_description ?? null,
  };
}

function loadDotEnv(path) {
  if (!existsSync(path)) return {};

  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const [key, ...valueParts] = line.split('=');
        return [key, valueParts.join('=').replace(/^['"]|['"]$/g, '')];
      }),
  );
}

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
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
