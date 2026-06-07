import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const DEFAULT_CITY = 'Taipei';
const DEFAULT_TOP = 500000;
const DEFAULT_INTERVAL_MINUTES = 5;
const DEFAULT_PER_SLOT_LIMIT = 1200;
const DEFAULT_CARRY_FORWARD_MINUTES = 30;
const DEFAULT_ARCHIVE_ROOT = 'public/data/tdx-bus/archive';
const DEFAULT_PROJECTION_OUTPUT_ROOT = '../cloudflare/artifacts/bus-projections';
const DEFAULT_STATIC_OUTPUT_ROOT = 'public/data/cloudflare-bus-projections';
const DEFAULT_BUCKET = 'twfoundry-poc-archive';
const DEFAULT_PREFIX = 'bus/projections';

const options = parseArgs(process.argv.slice(2));
const dates = resolveDates(options);
const city = options.city ?? DEFAULT_CITY;
const top = positiveInteger(options.top, DEFAULT_TOP, '--top');
const intervalMinutes = positiveInteger(options['interval-minutes'], DEFAULT_INTERVAL_MINUTES, '--interval-minutes');
const perSlotLimit = positiveInteger(options['per-slot-limit'], DEFAULT_PER_SLOT_LIMIT, '--per-slot-limit');
const carryForwardMinutes = nonNegativeInteger(options['carry-forward-minutes'], DEFAULT_CARRY_FORWARD_MINUTES, '--carry-forward-minutes');
const archiveRoot = options['archive-root'] ?? DEFAULT_ARCHIVE_ROOT;
const projectionOutputRoot = options['projection-output-root'] ?? DEFAULT_PROJECTION_OUTPUT_ROOT;
const staticOutputRoot = options['static-output-root'] ?? DEFAULT_STATIC_OUTPUT_ROOT;
const bucket = options.bucket ?? DEFAULT_BUCKET;
const prefix = options.prefix ?? DEFAULT_PREFIX;
const upload = Boolean(options.upload);
const dryRun = Boolean(options['dry-run']);
const force = Boolean(options.force);
const replaceManifest = Boolean(options['replace-manifest']);

const commands = [];

dates.forEach((date, index) => {
  const command = [
    'bun',
    'scripts/fetch-tdx-taipei-bus-history.mjs',
    '--date',
    date,
    '--city',
    city,
    '--top',
    String(top),
    '--interval-minutes',
    String(intervalMinutes),
    '--per-slot-limit',
    String(perSlotLimit),
    '--carry-forward-minutes',
    String(carryForwardMinutes),
    '--archive-root',
    archiveRoot,
  ];

  if (force) command.push('--force');
  if (replaceManifest && index === 0) command.push('--replace-manifest');
  commands.push({ label: `fetch historical ${date}`, cwd: process.cwd(), command });
});

commands.push({
  label: 'build Cloudflare bus projections',
  cwd: process.cwd(),
  command: [
    'bun',
    'scripts/build-cloudflare-bus-projections.mjs',
    '--archive-root',
    archiveRoot,
    '--output-root',
    projectionOutputRoot,
    '--static-output-root',
    staticOutputRoot,
  ],
});

if (upload) {
  commands.push({
    label: 'upload bus projections to R2',
    cwd: resolve(process.cwd(), '../cloudflare/worker'),
    command: [
      'node',
      '../scripts/upload-bus-projections.mjs',
      '--bucket',
      bucket,
      '--prefix',
      prefix,
      '--input-root',
      resolve(process.cwd(), projectionOutputRoot),
    ],
  });
}

for (const step of commands) {
  if (dryRun) {
    console.log(`[dry-run] ${step.label}`);
    console.log(`  cwd: ${step.cwd}`);
    console.log(`  ${step.command.map(shellQuote).join(' ')}`);
    continue;
  }

  console.info(JSON.stringify({ step: step.label, cwd: step.cwd }, null, 2));
  const result = spawnSync(step.command[0], step.command.slice(1), {
    cwd: step.cwd,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error(`Backfill step failed: ${step.label}`);
  }
}

console.info(JSON.stringify({
  ok: true,
  dates,
  city,
  archiveRoot,
  projectionOutputRoot,
  staticOutputRoot,
  upload,
  bucket: upload ? bucket : null,
  prefix: upload ? prefix : null,
  dryRun,
}, null, 2));

function resolveDates(parsed) {
  if (parsed.date && (parsed.from || parsed.to)) {
    throw new Error('Use either --date or --from/--to, not both.');
  }

  if (parsed.date) {
    assertDate(parsed.date, '--date');
    return [parsed.date];
  }

  if (!parsed.from || !parsed.to) {
    throw new Error('Backfill requires --date YYYY-MM-DD or --from YYYY-MM-DD --to YYYY-MM-DD.');
  }

  assertDate(parsed.from, '--from');
  assertDate(parsed.to, '--to');

  const dates = [];
  const current = new Date(`${parsed.from}T00:00:00Z`);
  const end = new Date(`${parsed.to}T00:00:00Z`);
  if (current.getTime() > end.getTime()) {
    throw new Error('--from must be before or equal to --to.');
  }

  while (current.getTime() <= end.getTime()) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

function assertDate(value, name) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${name} must use YYYY-MM-DD format.`);
  }
}

function positiveInteger(value, fallback, name) {
  const number = Number(value ?? fallback);
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return number;
}

function nonNegativeInteger(value, fallback, name) {
  const number = Number(value ?? fallback);
  if (!Number.isInteger(number) || number < 0) {
    throw new Error(`${name} must be zero or a positive integer.`);
  }
  return number;
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
