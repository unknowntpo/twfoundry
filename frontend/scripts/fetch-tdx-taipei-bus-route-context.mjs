import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const DEFAULT_AUTH_URL = 'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token';
const DEFAULT_BASIC_BASE_URL = 'https://tdx.transportdata.tw/api/basic/v2';
const DEFAULT_ARCHIVE_MANIFEST = 'public/data/tdx-bus/archive/manifest.json';
const DEFAULT_OUTPUT_ROOT = 'public/data/tdx-bus/route-context';

const options = parseArgs(process.argv.slice(2));
const env = {
  ...loadDotEnv(resolve(process.cwd(), '.env')),
  ...process.env,
};

const clientId = env.TDX_CLIENT_ID ?? '';
const clientSecret = env.TDX_CLIENT_SECRET ?? '';
const authUrl = env.TDX_AUTH_URL ?? DEFAULT_AUTH_URL;
const basicBaseUrl = stripTrailingSlash(env.TDX_BASIC_API_BASE_URL ?? DEFAULT_BASIC_BASE_URL);
const city = options.city ?? 'Taipei';
const outputRoot = resolve(process.cwd(), options['output-root'] ?? DEFAULT_OUTPUT_ROOT);
const limitRoutes = Number(options['limit-routes'] ?? Number.POSITIVE_INFINITY);
const requestDelayMs = Number(options['request-delay-ms'] ?? 650);
const maxRetries = Number(options['max-retries'] ?? 4);

if (!clientId || !clientSecret) {
  throw new Error('TDX_CLIENT_ID and TDX_CLIENT_SECRET must be configured in .env or process env.');
}

const routeNames = routeNamesFromOptions();
if (routeNames.length === 0) {
  throw new Error('No routes requested. Use --routes 234,307 or --from-archive.');
}

const accessToken = await fetchAccessToken({ authUrl, clientId, clientSecret });
const routeContexts = [];

for (const routeName of routeNames) {
  const shapes = filterExactRoute(
    await fetchJson(`/Bus/Shape/City/${city}/${routeName}`, accessToken),
    routeName,
  );
  await delay(requestDelayMs);
  const stopOfRoutes = filterExactRoute(
    await fetchJson(`/Bus/StopOfRoute/City/${city}/${routeName}`, accessToken),
    routeName,
  );
  await delay(requestDelayMs);

  const routeContext = {
    schema: 'twfoundry.tdx.citybus.route-context.v1',
    source: {
      provider: 'TDX',
      city,
      datasets: ['Bus.Shape.City', 'Bus.StopOfRoute.City'],
    },
    routeName,
    generatedAt: new Date().toISOString(),
    shapes,
    stopOfRoutes,
    shapeCount: shapes.length,
    stopOfRouteCount: stopOfRoutes.length,
  };

  const outputPath = join(outputRoot, `${encodeURIComponent(routeName)}.json`);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(routeContext, null, 2)}\n`);
  routeContexts.push({
    routeName,
    path: toPublicPath(outputPath),
    shapeCount: shapes.length,
    stopOfRouteCount: stopOfRoutes.length,
    directions: [...new Set([
      ...shapes.map((shape) => shape.Direction),
      ...stopOfRoutes.map((route) => route.Direction),
    ])].sort(),
  });
}

const manifest = {
  schema: 'twfoundry.tdx.citybus.route-context-manifest.v1',
  source: {
    provider: 'TDX',
    city,
    datasets: ['Bus.Shape.City', 'Bus.StopOfRoute.City'],
  },
  generatedAt: new Date().toISOString(),
  routes: mergeManifestRoutes(outputRoot, routeContexts),
};

writeFileSync(join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

console.info(JSON.stringify({
  ok: true,
  city,
  requestedRoutes: routeNames.length,
  writtenRoutes: routeContexts.length,
  outputRoot,
  manifest: join(outputRoot, 'manifest.json'),
}, null, 2));

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

  if (!response.ok) {
    throw new Error(`TDX token request failed with HTTP ${response.status}.`);
  }

  const payload = await response.json();
  if (!payload.access_token) throw new Error('TDX token response did not include access_token.');
  return payload.access_token;
}

async function fetchJson(path, accessToken) {
  const url = new URL(`${basicBaseUrl}${path}`);
  url.searchParams.set('$format', 'JSON');
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (response.ok) {
      const payload = await response.json();
      return Array.isArray(payload) ? payload : (payload.value ?? []);
    }
    if (response.status !== 429 || attempt === maxRetries) {
      throw new Error(`TDX request failed for ${path} with HTTP ${response.status}.`);
    }
    const retryAfterSeconds = Number(response.headers.get('retry-after'));
    const backoffMs = Number.isFinite(retryAfterSeconds)
      ? retryAfterSeconds * 1000
      : requestDelayMs * 2 ** (attempt + 1);
    await delay(backoffMs);
  }

  return [];
}

function routeNamesFromOptions() {
  if (options.routes) {
    return uniqueRouteNames(String(options.routes).split(',').map((route) => route.trim()));
  }

  if (!options['from-archive']) return [];

  const manifestPath = resolve(process.cwd(), options['archive-manifest'] ?? DEFAULT_ARCHIVE_MANIFEST);
  const archiveManifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const entries = [...(archiveManifest.snapshots ?? [])]
    .filter((snapshot) => snapshot.path)
    .sort((left, right) => Number(right.count ?? 0) - Number(left.count ?? 0));
  const routeNames = new Set();

  for (const entry of entries) {
    const snapshotPath = resolve(process.cwd(), `public${entry.path}`);
    if (!existsSync(snapshotPath)) continue;
    const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'));
    for (const record of snapshot.records ?? []) {
      const routeName = routeNameFromRecord(record);
      if (routeName) routeNames.add(routeName);
      if (routeNames.size >= limitRoutes) return [...routeNames];
    }
  }

  return [...routeNames];
}

function routeNameFromRecord(record) {
  if (typeof record.RouteName === 'string') return record.RouteName;
  return record.RouteName?.Zh_tw ?? record.RouteName?.En ?? '';
}

function filterExactRoute(rows, routeName) {
  return rows.filter((row) => {
    const name = row.RouteName;
    return name === routeName || name?.Zh_tw === routeName || name?.En === routeName;
  });
}

function uniqueRouteNames(routeNames) {
  return [...new Set(routeNames.filter(Boolean))].slice(0, limitRoutes);
}

function toPublicPath(path) {
  const publicRoot = resolve(process.cwd(), 'public');
  const relative = path.startsWith(publicRoot)
    ? path.slice(publicRoot.length)
    : path.slice(process.cwd().length);
  return `/${relative.replace(/^\/+/, '')}`;
}

function mergeManifestRoutes(root, nextRoutes) {
  const manifestPath = join(root, 'manifest.json');
  const routesByName = new Map();

  if (existsSync(manifestPath)) {
    const previousManifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    for (const route of previousManifest.routes ?? []) {
      if (route.routeName) routesByName.set(route.routeName, route);
    }
  }

  for (const route of nextRoutes) {
    routesByName.set(route.routeName, route);
  }

  return [...routesByName.values()].sort((left, right) => (
    left.routeName.localeCompare(right.routeName, 'en', { numeric: true })
  ));
}

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
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
