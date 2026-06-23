import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const DEFAULT_TOPIC = 'online.tdx.bus_route_signal';
const DEFAULT_OUTPUT = 'cloudflare/artifacts/online/bus-route-signals/latest.json';
const DEFAULT_R2_KEY = 'online/bus-route-signals/latest.json';

if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs(process.argv.slice(2));
  const loop = options.loop || process.env.BUS_ROUTE_SIGNAL_PUBLISH_LOOP === 'true';
  if (loop && !options['input-file']) {
    // Live mode: ONE persistent consumer continuously fills a rolling buffer, decoupled from a
    // periodic publish. The old model opened a fresh short-lived consumer each cycle (stopped after
    // ~5s idle), so it routinely missed the sentinel's bursty per-slot flushes -> empty bundles.
    await runContinuous(options);
  } else if (loop) {
    const sleepMs = Number(options['sleep-ms'] ?? process.env.BUS_ROUTE_SIGNAL_PUBLISH_SLEEP_MS ?? 30_000);
    while (true) {
      await publishOnce(options);
      await new Promise((resolve) => setTimeout(resolve, sleepMs));
    }
  } else {
    await publishOnce(options);
  }
}

async function runContinuous(options) {
  const brokers = splitCsv(options.brokers ?? process.env.KAFKA_BROKERS ?? 'localhost:9092');
  const topic = options.topic ?? process.env.BUS_ROUTE_SIGNAL_TOPIC ?? DEFAULT_TOPIC;
  const groupId = options.group ?? process.env.BUS_ROUTE_SIGNAL_PUBLISHER_GROUP_ID ?? 'bus-route-signal-publisher';
  const limit = Number(options.limit ?? process.env.BUS_ROUTE_SIGNAL_BUNDLE_LIMIT ?? 50);
  const sleepMs = Number(options['sleep-ms'] ?? process.env.BUS_ROUTE_SIGNAL_PUBLISH_SLEEP_MS ?? 30_000);
  const output = resolve(process.cwd(), options.output ?? process.env.BUS_ROUTE_SIGNAL_OUTPUT ?? DEFAULT_OUTPUT);
  const doUpload = Boolean(options.upload || process.env.BUS_ROUTE_SIGNAL_UPLOAD_R2 === 'true');
  const retain = Math.max(limit * 4, 200);

  const { Kafka, logLevel } = await import('kafkajs');
  const kafka = new Kafka({ clientId: 'twfoundry-bus-route-signal-publisher', brokers, logLevel: logLevel.WARN });
  const consumer = kafka.consumer({ groupId });
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: false });

  // rolling buffer of the most-recent signals, filled in the background as messages arrive
  const buffer = [];
  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      try {
        buffer.push(JSON.parse(message.value.toString('utf8')));
        if (buffer.length > retain) buffer.splice(0, buffer.length - retain);
      } catch { /* skip malformed */ }
    },
  });

  // periodic publish of whatever has accumulated so far
  for (;;) {
    const bundle = bundleSignals(buffer.slice(), { limit });
    writeBundle(output, bundle);
    if (doUpload) {
      try {
        uploadBundle(output, {
          bucket: options.bucket ?? process.env.BUS_ROUTE_SIGNAL_BUCKET ?? 'twfoundry-poc-archive',
          key: options.key ?? process.env.BUS_ROUTE_SIGNAL_R2_KEY ?? DEFAULT_R2_KEY,
          wrangler: options.wrangler ?? process.env.WRANGLER_BIN ?? 'bunx',
          local: Boolean(options.local),
        });
      } catch (err) {
        console.error(JSON.stringify({ ok: false, step: 'upload_r2', error: String(err?.message ?? err) }));
      }
    }
    console.log(JSON.stringify({
      ok: true,
      mode: 'continuous',
      buffered: buffer.length,
      signals: bundle.signals.length,
      latestSlotKey: bundle.latestSlotKey,
      uploaded: doUpload,
    }));
    await new Promise((resolve) => setTimeout(resolve, sleepMs));
  }
}

async function publishOnce(options) {
  const signals = options['input-file']
    ? readSignalsFromFile(resolve(process.cwd(), options['input-file']))
    : await consumeSignals({
      brokers: splitCsv(options.brokers ?? process.env.KAFKA_BROKERS ?? 'localhost:9092'),
      topic: options.topic ?? process.env.BUS_ROUTE_SIGNAL_TOPIC ?? DEFAULT_TOPIC,
      groupId: options.group ?? process.env.BUS_ROUTE_SIGNAL_PUBLISHER_GROUP_ID ?? 'bus-route-signal-publisher',
      maxWaitMs: Number(options['max-wait-ms'] ?? process.env.BUS_ROUTE_SIGNAL_MAX_WAIT_MS ?? 30_000),
      idleMs: Number(options['idle-ms'] ?? process.env.BUS_ROUTE_SIGNAL_IDLE_MS ?? 5_000),
    });

  const bundle = bundleSignals(signals, {
    limit: Number(options.limit ?? process.env.BUS_ROUTE_SIGNAL_BUNDLE_LIMIT ?? 50),
  });
  const output = resolve(process.cwd(), options.output ?? process.env.BUS_ROUTE_SIGNAL_OUTPUT ?? DEFAULT_OUTPUT);
  writeBundle(output, bundle);

  if (options.upload || process.env.BUS_ROUTE_SIGNAL_UPLOAD_R2 === 'true') {
    uploadBundle(output, {
      bucket: options.bucket ?? process.env.BUS_ROUTE_SIGNAL_BUCKET ?? 'twfoundry-poc-archive',
      key: options.key ?? process.env.BUS_ROUTE_SIGNAL_R2_KEY ?? DEFAULT_R2_KEY,
      wrangler: options.wrangler ?? process.env.WRANGLER_BIN ?? 'bunx',
      local: Boolean(options.local),
    });
  }

  console.log(JSON.stringify({
    ok: true,
    output,
    signals: bundle.signals.length,
    latestSlotKey: bundle.latestSlotKey,
    uploaded: Boolean(options.upload || process.env.BUS_ROUTE_SIGNAL_UPLOAD_R2 === 'true'),
  }, null, 2));
}

export function bundleSignals(signals, { limit = 50, generatedAt = new Date().toISOString() } = {}) {
  const normalized = signals
    .filter((signal) => signal && typeof signal === 'object')
    .sort((left, right) => String(right.detected_at ?? '').localeCompare(String(left.detected_at ?? '')))
    .slice(0, limit);

  return {
    schema: 'twfoundry.online.tdx.bus_route_signal_bundle.v1',
    source: 'flink-speed-layer',
    status: normalized.length > 0 ? 'ok' : 'waiting_for_flink',
    generatedAt,
    latestSlotKey: latestSlotKey(normalized),
    signals: normalized,
  };
}

export function readSignalsFromFile(path) {
  const text = readFileSync(path, 'utf8').trim();
  if (!text) return [];
  if (text.startsWith('[')) return JSON.parse(text);
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function consumeSignals({ brokers, topic, groupId, maxWaitMs, idleMs }) {
  const { Kafka, logLevel } = await import('kafkajs');
  const kafka = new Kafka({ clientId: 'twfoundry-bus-route-signal-publisher', brokers, logLevel: logLevel.INFO });
  const consumer = kafka.consumer({ groupId });
  const signals = [];
  let lastMessageAt = Date.now();
  let stopped = false;

  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: false });

  const stopTimer = setTimeout(() => {
    stopped = true;
  }, maxWaitMs);

  const idleTimer = setInterval(() => {
    if (Date.now() - lastMessageAt >= idleMs) stopped = true;
  }, Math.min(idleMs, 1_000));

  await consumer.run({
    eachMessage: async ({ message }) => {
      lastMessageAt = Date.now();
      if (!message.value) return;
      signals.push(JSON.parse(message.value.toString('utf8')));
      if (stopped) await consumer.stop();
    },
  });

  while (!stopped) {
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  await consumer.stop();
  clearTimeout(stopTimer);
  clearInterval(idleTimer);
  await consumer.disconnect();
  return signals;
}

function writeBundle(path, bundle) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(bundle, null, 2)}\n`);
}

function uploadBundle(file, { bucket, key, wrangler, local }) {
  const command = [
    ...resolveWranglerCommand(wrangler),
    'r2',
    'object',
    'put',
    `${bucket}/${key}`,
    '--file',
    file,
    '--content-type',
    'application/json',
    local ? '--local' : '--remote',
  ];
  const result = spawnSync(command[0], command.slice(1), { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`R2 upload failed for ${bucket}/${key}`);
  }
}

function resolveWranglerCommand(command) {
  const executable = command || 'bunx';
  return executable.endsWith('bunx') || executable.endsWith('npx') ? [executable, 'wrangler'] : [executable];
}

function latestSlotKey(signals) {
  return signals
    .map((signal) => signal.slot_key)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;
}

function splitCsv(value) {
  return String(value).split(',').map((item) => item.trim()).filter(Boolean);
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
