import { spawn } from 'node:child_process';

const explicitUrl = process.env.BUS_OVERSIGHT_URL;
const port = Number(process.env.BUS_OVERSIGHT_E2E_PORT ?? 4173);
const host = '127.0.0.1';
const previewUrl = explicitUrl ?? `http://${host}:${port}/bus-oversight`;

let previewProcess = null;

try {
  if (!explicitUrl) {
    previewProcess = spawn('bunx', ['vite', 'preview', '--host', host, '--port', String(port)], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });
    previewProcess.stdout.on('data', (chunk) => process.stdout.write(chunk));
    previewProcess.stderr.on('data', (chunk) => process.stderr.write(chunk));
    await waitForHttp(previewUrl, 15_000);
  }

  await runCommand('bun', ['scripts/verify-bus-oversight-dashboard.mjs'], {
    ...process.env,
    BUS_OVERSIGHT_URL: previewUrl,
  });
} finally {
  if (previewProcess) {
    previewProcess.kill('SIGTERM');
  }
}

function runCommand(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env,
    });
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} exited with ${code}`));
    });
    child.on('error', reject);
  });
}

async function waitForHttp(url, timeoutMs) {
  const startedAt = Date.now();
  let lastError = null;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError?.message ?? 'no response'}`);
}
