import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DEFAULT_AUTH_URL = 'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token';

const options = parseArgs(process.argv.slice(2));
const envFile = resolve(process.cwd(), options['env-file'] ?? '.env');
const { env, duplicateKeys } = loadDotEnv(envFile);
const mergedEnv = {
  ...env,
  ...process.env,
};

const clientId = mergedEnv.TDX_CLIENT_ID ?? '';
const clientSecret = mergedEnv.TDX_CLIENT_SECRET ?? '';
const authUrl = mergedEnv.TDX_AUTH_URL ?? DEFAULT_AUTH_URL;

if (!clientId || !clientSecret) {
  console.error(JSON.stringify({
    ok: false,
    envFile,
    hasClientId: Boolean(clientId),
    hasClientSecret: Boolean(clientSecret),
    duplicateKeys,
    error: 'TDX_CLIENT_ID and TDX_CLIENT_SECRET must be configured.',
  }, null, 2));
  process.exit(1);
}

const response = await fetch(authUrl, {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials',
  }),
});

const payload = await response.json().catch(() => ({}));
const result = {
  ok: response.ok && Boolean(payload.access_token),
  status: response.status,
  envFile,
  authUrl,
  hasClientId: true,
  hasClientSecret: true,
  duplicateKeys,
  hasAccessToken: Boolean(payload.access_token),
  tokenType: payload.token_type ?? null,
  expiresIn: payload.expires_in ?? null,
  error: payload.error ?? null,
  errorDescription: payload.error_description ?? null,
};

console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);

function loadDotEnv(path) {
  if (!existsSync(path)) return { env: {}, duplicateKeys: [] };

  const env = {};
  const counts = new Map();
  for (const raw of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const [key, ...valueParts] = line.split('=');
    env[key] = valueParts.join('=').replace(/^['"]|['"]$/g, '');
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return {
    env,
    duplicateKeys: [...counts.entries()]
      .filter(([, count]) => count > 1)
      .map(([key, count]) => ({ key, count })),
  };
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
