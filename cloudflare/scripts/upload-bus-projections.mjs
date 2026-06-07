import { spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const options = parseArgs(process.argv.slice(2));
const bucket = options.bucket ?? 'twfoundry-poc-archive';
const inputRoot = resolve(process.cwd(), options['input-root'] ?? '../artifacts/bus-projections');
const prefix = options.prefix ?? 'bus/projections';
const wrangler = options.wrangler ?? process.env.WRANGLER_BIN ?? 'wrangler';
const dryRun = Boolean(options['dry-run']);

const files = listJsonFiles(inputRoot);
if (files.length === 0) {
  throw new Error(`No JSON projection artifacts found under ${inputRoot}`);
}

for (const file of files) {
  const relativePath = relative(inputRoot, file).split(sep).join('/');
  const key = relativePath === 'manifest.json'
    ? `${prefix}/manifest.json`
    : `${prefix}/${relativePath}`;
  const target = `${bucket}/${key}`;
  const command = [wrangler, 'r2', 'object', 'put', target, '--file', file, '--content-type', 'application/json'];

  if (dryRun) {
    console.log(command.map(shellQuote).join(' '));
    continue;
  }

  const result = spawnSync(wrangler, command.slice(1), { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`Upload failed: ${target}`);
  }
}

console.log(JSON.stringify({ bucket, prefix, uploaded: files.length }, null, 2));

function listJsonFiles(root) {
  const files = [];
  for (const name of readdirSync(root)) {
    const path = join(root, name);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      files.push(...listJsonFiles(path));
    } else if (name.endsWith('.json')) {
      files.push(path);
    }
  }
  return files.sort();
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
