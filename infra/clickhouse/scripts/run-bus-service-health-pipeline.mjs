#!/usr/bin/env node
// Local orchestration of the bus service-health batch roll-up — the same stages
// the Airflow DAG runs (extract+load lake -> ClickHouse, then publish the dated
// dataset). Runnable end-to-end on a laptop against local ClickHouse + the lake
// under data/lake/. Idempotent: each day's load replaces that day's rows.
//
// Usage (from repo root):
//   node infra/clickhouse/scripts/run-bus-service-health-pipeline.mjs
//   node infra/clickhouse/scripts/run-bus-service-health-pipeline.mjs \
//     --service-date 2026-06-21 --lookback-days 7 \
//     --output-root data/analytics-rolling/bus
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const args = parseArgs(process.argv.slice(2));
const lakeDir = args['lake-dir'] ?? join(repoRoot, 'data/lake');
const lookbackDays = positiveInt(args['lookback-days'], 7);
const serviceDate = args['service-date'] ?? latestLakeDate(lakeDir);
const outputRoot = args['output-root'] ?? join(repoRoot, 'data/analytics-rolling/bus');
const source = args.source ?? 'clickhouse-rolling';

if (!/^\d{4}-\d{2}-\d{2}$/.test(serviceDate)) throw new Error(`bad --service-date: ${serviceDate}`);

const windowDates = Array.from({ length: lookbackDays }, (_, i) => addDays(serviceDate, i - lookbackDays + 1));
console.log(`[pipeline] service_date=${serviceDate} lookback=${lookbackDays} window=${windowDates[0]}..${serviceDate}`);

// Stage 1: load each lake day in the window that is present (lake -> ClickHouse).
let loaded = 0;
for (const date of windowDates) {
  if (!existsSync(join(lakeDir, `${date}.jsonl`))) {
    console.log(`[pipeline] skip ${date} (no lake file)`);
    continue;
  }
  run('node', [join(repoRoot, 'infra/clickhouse/scripts/load-lake-observations.mjs'), '--service-date', date, '--lake-dir', lakeDir]);
  loaded += 1;
}
console.log(`[pipeline] loaded ${loaded} lake day(s) into ClickHouse`);

// Stage 2: publish the dated, multi-day rolling dataset from ClickHouse.
run('bun', [
  join(repoRoot, 'frontend/scripts/publish-clickhouse-bus-analytics.mjs'),
  '--service-date', serviceDate,
  '--lookback-days', String(lookbackDays),
  '--source', source,
  '--output-root', outputRoot,
]);
console.log(`[pipeline] published dataset -> ${outputRoot} (serviceDate=${serviceDate}, source=${source})`);

// --- helpers ---
function run(cmd, argv) {
  const res = spawnSync(cmd, argv, { stdio: 'inherit', cwd: repoRoot });
  if (res.status !== 0) throw new Error(`${cmd} ${argv.join(' ')} exited ${res.status}`);
}
function latestLakeDate(dir) {
  const dates = readdirSync(dir)
    .map((f) => f.match(/^(\d{4}-\d{2}-\d{2})\.jsonl$/)?.[1])
    .filter(Boolean)
    .sort();
  if (dates.length === 0) throw new Error(`no YYYY-MM-DD.jsonl in ${dir}`);
  return dates.at(-1);
}
function addDays(date, days) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function positiveInt(v, fallback) {
  const n = Number(v ?? fallback);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : fallback;
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
