const DEFAULT_URL = 'https://twfoundry-poc.pages.dev';
const DEFAULT_SLOT = 'latest';
const DEFAULT_MIN_SNAPSHOTS = 1;
const DEFAULT_MIN_FEATURES = 1;
const DEFAULT_MIN_ANALYTICS_ROWS = 1;
const DEFAULT_ROUTE_EVIDENCE_CASES = [
  '307:frequency_wait_excess',
];

const options = parseArgs(process.argv.slice(2));
const baseUrl = normalizeBaseUrl(options.url ?? process.env.CLOUDFLARE_POC_URL ?? DEFAULT_URL);
const slot = options.slot ?? DEFAULT_SLOT;
const minSnapshots = toPositiveInteger(options['min-snapshots'], DEFAULT_MIN_SNAPSHOTS);
const minFeatures = toPositiveInteger(options['min-features'], DEFAULT_MIN_FEATURES);
const minAnalyticsRows = toPositiveInteger(options['min-analytics-rows'], DEFAULT_MIN_ANALYTICS_ROWS);
const routeEvidenceCases = parseRouteEvidenceCases(options['route-evidence-cases'], DEFAULT_ROUTE_EVIDENCE_CASES);
const skipProjections = Boolean(options['skip-projections']);
const skipAnalytics = Boolean(options['skip-analytics']);
const skipRouteEvidence = Boolean(options['skip-route-evidence']);

const root = await fetchJsonOrText(baseUrl);
assert(root.status === 200, `expected site root HTTP 200, got ${root.status}`);

let timelineResult = null;
let projectionResult = null;
if (!skipProjections) {
  const timelineUrl = `${baseUrl}/api/projections/bus_vehicles/timeline`;
  const timeline = await fetchJson(timelineUrl);
  assert(timeline.schema === 'twfoundry.bus.vehicle-projection-manifest.v1', `unexpected timeline schema: ${timeline.schema}`);
  assert(timeline.layerId === 'bus_vehicles', `unexpected layerId: ${timeline.layerId}`);
  assert(Array.isArray(timeline.snapshots), 'timeline snapshots must be an array');
  assert(timeline.snapshots.length >= minSnapshots, `expected at least ${minSnapshots} snapshots, got ${timeline.snapshots.length}`);
  assert(timeline.source?.mode && timeline.source.mode !== 'fixture', `unexpected source mode: ${timeline.source?.mode}`);

  const projectionUrl = `${baseUrl}/api/projections/bus_vehicles?slot=${encodeURIComponent(slot)}`;
  const projection = await fetchJson(projectionUrl);
  assert(projection.layerId === 'bus_vehicles', `unexpected projection layerId: ${projection.layerId}`);
  assert(projection.projectionType === 'vehicle_position_projection', `unexpected projection type: ${projection.projectionType}`);
  assert(Array.isArray(projection.features), 'projection features must be an array');
  assert(projection.features.length >= minFeatures, `expected at least ${minFeatures} features, got ${projection.features.length}`);
  assert(projection.summary?.vehicleCount === projection.features.length, 'summary.vehicleCount must match features.length');

  timelineResult = {
    snapshots: timeline.snapshots.length,
    latestSlotKey: timeline.latestSlotKey,
    sourceMode: timeline.source?.mode,
  };
  projectionResult = {
    capturedAt: projection.capturedAt,
    features: projection.features.length,
    routeCount: projection.summary?.routeCount,
  };
}

const analyticsResults = [];
if (!skipAnalytics) {
  const analyticsManifestUrl = `${baseUrl}/data/analytics/bus/manifest.json`;
  const analyticsManifest = await fetchJson(analyticsManifestUrl);
  assert(analyticsManifest.source === 'clickhouse-static-snapshot', `unexpected analytics source: ${analyticsManifest.source}`);
  assert(Array.isArray(analyticsManifest.metrics), 'analytics manifest metrics must be an array');
  assert(analyticsManifest.metrics.length >= 3, `expected at least 3 analytics metrics, got ${analyticsManifest.metrics.length}`);

  for (const metric of analyticsManifest.metrics) {
    assert(metric.path, `analytics metric ${metric.metric ?? '<unknown>'} missing path`);
    const payload = await fetchJson(`${baseUrl}${metric.path}`);
    assert(payload.source === 'clickhouse-static-snapshot', `${metric.path} source must be clickhouse-static-snapshot`);
    assert(Array.isArray(payload.rows), `${metric.path} rows must be an array`);
    assert(payload.rows.length >= minAnalyticsRows, `${metric.path} expected at least ${minAnalyticsRows} rows, got ${payload.rows.length}`);
    analyticsResults.push({
      metric: payload.metric,
      rows: payload.rows.length,
      serviceDate: payload.serviceDate,
    });
  }
}

const routeEvidenceResults = [];
if (!skipRouteEvidence) {
  for (const routeCase of routeEvidenceCases) {
    const evidencePath = `/data/tdx-bus/reliability-evidence/route-${safeFileName(routeCase.route)}.json`;
    const payload = await fetchJson(`${baseUrl}${evidencePath}`);
    assert(payload.ok === true, `${evidencePath} must be an ok route evidence payload`);
    assert(payload.schema === 'twfoundry.bus.delay-poc.v1', `${evidencePath} unexpected schema: ${payload.schema}`);
    assert(payload.source?.route === routeCase.route, `${evidencePath} route mismatch: ${payload.source?.route}`);
    assert(Array.isArray(payload.delayCandidates), `${evidencePath} delayCandidates must be an array`);
    const matchingCandidates = payload.delayCandidates.filter((candidate) => (
      candidate.signalSubtype === routeCase.signalSubtype
    ));
    assert(
      matchingCandidates.length >= routeCase.minCandidates,
      `${evidencePath} expected at least ${routeCase.minCandidates} ${routeCase.signalSubtype} candidates, got ${matchingCandidates.length}`,
    );
    routeEvidenceResults.push({
      route: routeCase.route,
      signalSubtype: routeCase.signalSubtype,
      candidates: matchingCandidates.length,
      generatedAt: payload.generatedAt,
    });
  }
}

console.log(JSON.stringify({
  ok: true,
  url: baseUrl,
  slot,
  timeline: timelineResult,
  projection: projectionResult,
  analytics: analyticsResults,
  routeEvidence: routeEvidenceResults,
}, null, 2));

function normalizeBaseUrl(value) {
  if (!value) return DEFAULT_URL;
  return value.replace(/\/+$/, '');
}

async function fetchJson(url) {
  const response = await fetch(url);
  assert(response.ok, `${url} returned HTTP ${response.status}`);
  const contentType = response.headers.get('content-type') ?? '';
  assert(contentType.includes('application/json'), `${url} returned non-JSON content-type: ${contentType}`);
  return response.json();
}

async function fetchJsonOrText(url) {
  const response = await fetch(url);
  return {
    status: response.status,
    contentType: response.headers.get('content-type') ?? '',
    body: await response.text(),
  };
}

function toPositiveInteger(value, fallback) {
  const number = Number(value ?? fallback);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

function parseRouteEvidenceCases(value, fallback) {
  const entries = String(value || fallback.join(','))
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  return entries.map((entry) => {
    const [route, signalSubtype, minCandidates] = entry.split(':');
    assert(route, `invalid route evidence case: ${entry}`);
    assert(signalSubtype, `route evidence case ${entry} missing signal subtype`);
    return {
      route,
      signalSubtype,
      minCandidates: toPositiveInteger(minCandidates, 1),
    };
  });
}

function safeFileName(value) {
  return encodeURIComponent(String(value)).replace(/%20/g, '-');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
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
