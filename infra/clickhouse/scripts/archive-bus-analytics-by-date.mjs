#!/usr/bin/env node
// Archive immutable per-service-date bus analytics to R2 under analytics/bus/by-date/<date>/,
// so we keep a PERMANENT historical record instead of only the overwritten "latest" snapshot.
//
// ClickHouse (bus_vehicle_observations, no TTL) is the source of truth; this just re-publishes
// each day as a single-day dataset and uploads it to its own immutable prefix. Days must already
// be loaded into ClickHouse (run the daily pipeline / lake load first).
//
// Usage (from repo root; needs ClickHouse + wrangler R2 access, i.e. run in-cluster):
//   node infra/clickhouse/scripts/archive-bus-analytics-by-date.mjs --from-date 2026-06-22 --to-date 2026-06-27
//   node infra/clickhouse/scripts/archive-bus-analytics-by-date.mjs --service-date 2026-06-28        # single day
//   ... --dry-run        # print the publish/upload commands without running them
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const args = parseArgs(process.argv.slice(2));
const dryRun = args['dry-run'] === 'true';
const source = args.source ?? 'clickhouse-rolling';
const prefixBase = (args['prefix-base'] ?? 'analytics/bus/by-date').replace(/\/+$/, '');
const wrangler = args.wrangler ?? process.env.WRANGLER_BIN ?? 'bunx';

const from = args['from-date'] ?? args['service-date'];
const to = args['to-date'] ?? args['service-date'] ?? from;
if (!isDate(from) || !isDate(to)) throw new Error('need --service-date or --from-date/--to-date (YYYY-MM-DD)');

const dates = dateRange(from, to);
console.log(`[archive] ${dates.length} day(s): ${from}..${to} -> ${prefixBase}/<date>/ ${dryRun ? '(dry-run)' : ''}`);

for (const date of dates) {
  const out = dryRun ? `/tmp/archive-${date}` : mkdtempSync(join(tmpdir(), `archive-${date}-`));
  // single-day dataset (lookback 1) so each per-date file is exactly that service day
  run('bun', [
    join(repoRoot, 'frontend/scripts/publish-clickhouse-bus-analytics.mjs'),
    '--service-date', date, '--lookback-days', '1', '--source', source, '--output-root', out,
  ]);
  run('node', [
    join(repoRoot, 'infra/clickhouse/scripts/upload-bus-analytics.mjs'),
    '--input-root', out, '--prefix', `${prefixBase}/${date}`,
    '--wrangler', wrangler, ...(dryRun ? ['--dry-run'] : []),
  ]);
  console.log(`[archive] ${date} -> ${prefixBase}/${date}/`);
}
console.log(`[archive] done (${dates.length} day(s))`);

// --- helpers ---
function run(cmd, argv) {
  if (dryRun) { console.log(`  $ ${cmd} ${argv.join(' ')}`); return; }
  const res = spawnSync(cmd, argv, { stdio: 'inherit', cwd: repoRoot });
  if (res.status !== 0) throw new Error(`${cmd} ${argv.join(' ')} exited ${res.status}`);
}
function isDate(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s); }
function addDays(date, days) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function dateRange(start, end) {
  const out = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      out[key] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[(i += 1)] : 'true';
    }
  }
  return out;
}
