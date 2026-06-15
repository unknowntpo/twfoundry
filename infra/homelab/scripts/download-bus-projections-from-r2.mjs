import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const DEFAULT_BUCKET = 'twfoundry-poc-archive';
const DEFAULT_PREFIX = 'bus/projections';
const DEFAULT_OUTPUT_ROOT = 'infra/homelab/staging/bus-projections';

const options = parseArgs(process.argv.slice(2));
const bucket = options.bucket ?? DEFAULT_BUCKET;
const prefix = trimSlashes(options.prefix ?? DEFAULT_PREFIX);
const outputRoot = resolve(process.cwd(), options['output-root'] ?? DEFAULT_OUTPUT_ROOT);
const wrangler = options.wrangler ?? process.env.WRANGLER_BIN ?? 'bunx';
const wranglerCommand = resolveWranglerCommand(wrangler);
const dryRun = Boolean(options['dry-run']);
const local = Boolean(options.local);
const persistTo = options['persist-to'];
const limitSnapshots = options.limit ? Number(options.limit) : null;

mkdirSync(outputRoot, { recursive: true });

const manifestKey = `${prefix}/manifest.json`;
const manifestPath = join(outputRoot, 'manifest.json');
downloadObject(manifestKey, manifestPath);

if (dryRun) {
  console.log(JSON.stringify({
    dryRun,
    bucket,
    prefix,
    outputRoot: relative(process.cwd(), outputRoot),
    manifestKey,
  }, null, 2));
  process.exit(0);
}

if (!existsSync(manifestPath)) {
  throw new Error(`Manifest download did not create ${manifestPath}`);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const snapshots = Array.isArray(manifest.snapshots) ? manifest.snapshots : [];
const selectedSnapshots = Number.isFinite(limitSnapshots)
  ? snapshots.slice(0, limitSnapshots)
  : snapshots;

for (const snapshot of selectedSnapshots) {
  const key = String(snapshot.projectionPath ?? '');
  if (!key) throw new Error(`Missing projectionPath in manifest entry: ${JSON.stringify(snapshot)}`);
  const relativePath = stripPrefix(key, prefix);
  downloadObject(key, join(outputRoot, relativePath));
}

console.log(JSON.stringify({
  bucket,
  prefix,
  outputRoot: relative(process.cwd(), outputRoot),
  manifest: relative(process.cwd(), manifestPath),
  snapshots: selectedSnapshots.length,
  local,
  persistTo: persistTo ?? null,
}, null, 2));

function downloadObject(key, outputPath) {
  mkdirSync(dirname(outputPath), { recursive: true });
  const target = `${bucket}/${key}`;
  const command = [
    wranglerCommand.executable,
    ...wranglerCommand.prefixArgs,
    'r2',
    'object',
    'get',
    target,
    '--file',
    outputPath,
  ];
  if (local) {
    command.push('--local');
  } else {
    command.push('--remote');
  }
  if (persistTo) command.push('--persist-to', persistTo);

  if (dryRun) {
    console.log(command.map(shellQuote).join(' '));
    return;
  }

  const result = spawnSync(command[0], command.slice(1), { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`Download failed: ${target}`);
  }
}

function resolveWranglerCommand(command) {
  const name = basename(command);
  if (name === 'bunx' || name === 'npx') {
    return { executable: command, prefixArgs: ['wrangler'] };
  }
  return { executable: command, prefixArgs: [] };
}

function stripPrefix(key, prefix) {
  const normalizedPrefix = `${trimSlashes(prefix)}/`;
  if (!key.startsWith(normalizedPrefix)) return key;
  return key.slice(normalizedPrefix.length);
}

function trimSlashes(value) {
  return String(value).replace(/^\/+|\/+$/g, '');
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

function shellQuote(value) {
  if (/^[A-Za-z0-9_./:=@-]+$/.test(value)) return value;
  return `'${value.replaceAll("'", "'\\''")}'`;
}
