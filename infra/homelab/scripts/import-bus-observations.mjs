import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const DEFAULT_CLICKHOUSE_URL = 'http://127.0.0.1:8123';
const DEFAULT_DATABASE = 'twfoundry';
const DEFAULT_JSONL = 'infra/clickhouse/out/bus_vehicle_observations.jsonl';
const DEFAULT_SCHEMA = 'infra/clickhouse/sql/schema.sql';

const options = parseArgs(process.argv.slice(2));
const clickhouseUrl = stripTrailingSlash(options['clickhouse-url'] ?? process.env.CLICKHOUSE_URL ?? DEFAULT_CLICKHOUSE_URL);
const database = options.database ?? process.env.CLICKHOUSE_DATABASE ?? DEFAULT_DATABASE;
const user = options.user ?? process.env.CLICKHOUSE_USER ?? 'default';
const password = options.password ?? process.env.CLICKHOUSE_PASSWORD ?? 'twfoundry_dev';
const jsonlPath = resolve(process.cwd(), options.input ?? DEFAULT_JSONL);
const schemaPath = resolve(process.cwd(), options.schema ?? DEFAULT_SCHEMA);
const projectionRoot = options['projection-root'];
const skipExport = Boolean(options['skip-export']);

if (!skipExport) {
  const exportArgs = ['infra/clickhouse/scripts/export-bus-observations-jsonl.mjs', '--output', jsonlPath];
  if (projectionRoot) exportArgs.push('--projection-root', projectionRoot);
  run('bun', exportArgs);
}

if (!existsSync(schemaPath)) throw new Error(`Schema file not found: ${schemaPath}`);
if (!existsSync(jsonlPath)) throw new Error(`JSONL file not found: ${jsonlPath}`);

for (const statement of splitSqlStatements(readFileSync(schemaPath, 'utf8'))) {
  await postSql(clickhouseUrl, statement);
}
await postSql(
  clickhouseUrl,
  `TRUNCATE TABLE IF EXISTS ${database}.bus_vehicle_observations`,
);
await postSql(
  clickhouseUrl,
  `INSERT INTO ${database}.bus_vehicle_observations FORMAT JSONEachRow\n${readFileSync(jsonlPath, 'utf8')}`,
);

const count = await postSql(
  clickhouseUrl,
  `SELECT count() AS rows FROM ${database}.bus_vehicle_observations FORMAT JSON`,
  true,
);

console.log(JSON.stringify({
  clickhouseUrl,
  database,
  input: jsonlPath,
  rows: count.data?.[0]?.rows ?? null,
}, null, 2));

async function postSql(url, sql, parseJson = false) {
  const response = await fetch(`${url}/`, {
    method: 'POST',
    headers: authHeaders(),
    body: sql,
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`ClickHouse ${response.status}: ${text.slice(0, 1000)}`);
  }
  return parseJson ? JSON.parse(text) : text;
}

function splitSqlStatements(sql) {
  return sql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function authHeaders() {
  if (!password) return {};
  return {
    authorization: `Basic ${btoa(`${user}:${password}`)}`,
  };
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with ${result.status}`);
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

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}
