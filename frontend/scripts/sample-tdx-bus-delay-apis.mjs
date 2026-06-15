import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DEFAULT_AUTH_URL = 'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token';
const DEFAULT_BASIC_BASE_URL = 'https://tdx.transportdata.tw/api/basic/v2';
const DEFAULT_ROUTES = ['1', '2', '南京幹線'];
const DEFAULT_ENDPOINTS = [
  'EstimatedTimeOfArrival',
  'Schedule',
  'StopOfRoute',
  'RealTimeNearStop',
];

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
const top = Number(options.top ?? '2');
const requestDelayMs = Number(options['request-delay-ms'] ?? '650');
const maxRetries = Number(options['max-retries'] ?? '3');
const routes = parseList(options.routes, DEFAULT_ROUTES);
const endpointNames = parseList(options.endpoints, DEFAULT_ENDPOINTS);

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

if (!Number.isInteger(top) || top <= 0) {
  throw new Error('--top must be a positive integer.');
}

if (!Number.isFinite(requestDelayMs) || requestDelayMs < 0) {
  throw new Error('--request-delay-ms must be a non-negative number.');
}

if (!Number.isInteger(maxRetries) || maxRetries < 0) {
  throw new Error('--max-retries must be a non-negative integer.');
}

const accessToken = await fetchAccessToken({ authUrl, clientId, clientSecret });
const samples = [];

for (const route of routes) {
  for (const endpointName of endpointNames) {
    samples.push(await sampleEndpoint({
      accessToken,
      endpointName,
      route,
    }));
    if (requestDelayMs > 0) await delay(requestDelayMs);
  }
}

console.log(JSON.stringify({
  ok: samples.every((sample) => sample.ok),
  sampledAt: new Date().toISOString(),
  city,
  routes,
  top,
  requestDelayMs,
  maxRetries,
  samples,
}, null, 2));

if (samples.some((sample) => !sample.ok)) process.exit(1);

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

async function sampleEndpoint({ accessToken, endpointName, route }) {
  const path = `/Bus/${endpointName}/City/${encodeURIComponent(city)}/${encodeURIComponent(route)}`;
  const url = new URL(`${basicBaseUrl}${path}`);
  url.searchParams.set('$top', String(top));
  url.searchParams.set('$format', 'JSON');

  const response = await fetchWithRetry(url, accessToken);
  const payload = await response.json().catch(() => null);
  const rows = normalizeRows(payload);
  const firstRow = rows[0] ?? null;

  return {
    ok: response.ok,
    endpoint: path,
    status: response.status,
    rowCount: rows.length,
    payloadKind: payloadKind(payload),
    topLevelFields: fieldNames(payload),
    firstRowFields: fieldNames(firstRow),
    firstRowNestedFields: nestedFieldNames(firstRow),
    error: response.ok ? null : errorSummary(payload),
  };
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

function normalizeRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.value)) return payload.value;
  return [];
}

function fieldNames(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.keys(value).sort();
}

function nestedFieldNames(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, nested]) => nested && typeof nested === 'object' && !Array.isArray(nested))
      .map(([key, nested]) => [key, fieldNames(nested)]),
  );
}

function payloadKind(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

function errorSummary(payload) {
  if (!payload || typeof payload !== 'object') return null;
  return {
    error: payload.error ?? null,
    message: payload.message ?? payload.error_description ?? null,
  };
}

function parseList(value, fallback) {
  if (!value) return fallback;
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
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
