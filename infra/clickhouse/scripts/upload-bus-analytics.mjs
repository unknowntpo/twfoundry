#!/usr/bin/env node
// Upload a published bus service-health dataset directory to R2 under
// analytics/bus/, so the dashboard can consume the rolling dataset
// (VITE_TWFOUNDRY_ANALYTICS_BASE) instead of the bundled static fallback.
// Mirrors cloudflare/scripts/upload-bus-projections.mjs (wrangler r2 object put).
//
// Requires wrangler auth + R2 access (account-scoped token). Use --dry-run to
// print the commands without uploading.
//
// Usage:
//   node infra/clickhouse/scripts/upload-bus-analytics.mjs \
//     --input-root data/analytics-rolling/bus --prefix analytics/bus [--dry-run]
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const options = parseArgs(process.argv.slice(2));
const bucket = options.bucket ?? process.env.R2_BUCKET ?? 'twfoundry-poc-archive';
const inputRoot = resolve(process.cwd(), options['input-root'] ?? 'data/analytics-rolling/bus');
const prefix = (options.prefix ?? 'analytics/bus').replace(/\/+$/, '');
const wrangler = options.wrangler ?? process.env.WRANGLER_BIN ?? 'bunx';
const dryRun = Boolean(options['dry-run']);

const files = readdirSync(inputRoot).filter((f) => f.endsWith('.json'));
if (files.length === 0) throw new Error(`No JSON files under ${inputRoot}`);

for (const file of files) {
  const target = `${bucket}/${prefix}/${file}`;
  const command = [
    wrangler, 'wrangler', 'r2', 'object', 'put', target,
    '--file', join(inputRoot, file),
    '--content-type', 'application/json',
    '--remote',
  ];
  // bunx invokes `bunx wrangler ...`; a direct wrangler bin drops the extra arg.
  if (wrangler !== 'bunx') command.splice(1, 1);

  if (dryRun) {
    console.log(command.join(' '));
    continue;
  }
  const result = spawnSync(command[0], command.slice(1), { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`Upload failed: ${target}`);
}

console.log(`[upload] ${files.length} object(s) -> ${bucket}/${prefix}/ ${dryRun ? '(dry-run)' : ''}`);

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      out[key] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[(i += 1)] : true;
    }
  }
  return out;
}
