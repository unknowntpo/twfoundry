const DEFAULT_URL = 'https://0b7fe481.twfoundry-poc.pages.dev';
const DEFAULT_SLOT = '09:55';
const DEFAULT_MIN_SNAPSHOTS = 1;
const DEFAULT_MIN_FEATURES = 1;

const options = parseArgs(process.argv.slice(2));
const baseUrl = normalizeBaseUrl(options.url ?? process.env.CLOUDFLARE_POC_URL ?? DEFAULT_URL);
const slot = options.slot ?? DEFAULT_SLOT;
const minSnapshots = toPositiveInteger(options['min-snapshots'], DEFAULT_MIN_SNAPSHOTS);
const minFeatures = toPositiveInteger(options['min-features'], DEFAULT_MIN_FEATURES);

const root = await fetchJsonOrText(baseUrl);
assert(root.status === 200, `expected site root HTTP 200, got ${root.status}`);

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

console.log(JSON.stringify({
  ok: true,
  url: baseUrl,
  slot,
  timeline: {
    snapshots: timeline.snapshots.length,
    latestSlotKey: timeline.latestSlotKey,
    sourceMode: timeline.source?.mode,
  },
  projection: {
    capturedAt: projection.capturedAt,
    features: projection.features.length,
    routeCount: projection.summary?.routeCount,
  },
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
