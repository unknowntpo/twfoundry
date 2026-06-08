import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { basename, join, relative, resolve, sep } from 'node:path';

const options = parseArgs(process.argv.slice(2));
const bucket = options.bucket ?? 'twfoundry-poc-archive';
const prefix = stripSlashes(options.prefix ?? 'data/tdx-bus');
const wrangler = options.wrangler ?? process.env.WRANGLER_BIN ?? resolveDefaultWrangler();
const wranglerCommand = resolveWranglerCommand(wrangler);
const dryRun = Boolean(options['dry-run']);
const local = Boolean(options.local);
const persistTo = options['persist-to'];

const inputRoots = options['input-root']
  ? [{ root: resolve(process.cwd(), options['input-root']), prefix }]
  : [
      {
        root: resolve(process.cwd(), '../../frontend/public/data/tdx-bus/route-context'),
        prefix: `${prefix}/route-context`,
      },
      {
        root: resolve(process.cwd(), '../../frontend/public/data/tdx-bus/route-quality'),
        prefix: `${prefix}/route-quality`,
      },
    ];

let uploaded = 0;
for (const input of inputRoots) {
  if (!existsSync(input.root)) {
    throw new Error(`Route context artifact root does not exist: ${input.root}`);
  }

  const files = listJsonFiles(input.root);
  if (files.length === 0) {
    throw new Error(`No JSON route context artifacts found under ${input.root}`);
  }

  for (const file of files) {
    const relativePath = relative(input.root, file).split(sep).join('/');
    const target = `${bucket}/${input.prefix}/${relativePath}`;
    const command = [
      wranglerCommand.executable,
      ...wranglerCommand.prefixArgs,
      'r2',
      'object',
      'put',
      target,
      '--file',
      file,
      '--content-type',
      'application/json',
    ];
    if (local) {
      command.push('--local');
    } else {
      command.push('--remote');
    }
    if (persistTo) command.push('--persist-to', persistTo);

    if (dryRun) {
      console.log(command.map(shellQuote).join(' '));
      uploaded += 1;
      continue;
    }

    const result = spawnSync(command[0], command.slice(1), { stdio: 'inherit' });
    if (result.status !== 0) {
      throw new Error(`Upload failed: ${target}`);
    }
    uploaded += 1;
  }
}

console.log(JSON.stringify({
  bucket,
  prefix,
  uploaded,
  local,
  persistTo: persistTo ?? null,
}, null, 2));

function resolveWranglerCommand(command) {
  const name = basename(command);
  if (name === 'bunx' || name === 'npx') {
    return { executable: command, prefixArgs: ['wrangler'] };
  }
  return { executable: command, prefixArgs: [] };
}

function resolveDefaultWrangler() {
  const localWrangler = resolve(process.cwd(), 'node_modules/.bin/wrangler');
  return existsSync(localWrangler) ? localWrangler : 'bunx';
}

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

function stripSlashes(value) {
  return value.replace(/^\/+|\/+$/g, '');
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
