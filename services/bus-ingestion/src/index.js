import http from 'http';
import { dirname } from 'node:path';
import { Kafka } from 'kafkajs';

const DEFAULT_HTTP_PORT = 8081;
const DEFAULT_TDX_AUTH_URL = 'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token';
const DEFAULT_TDX_API_BASE_URL = 'https://tdx.transportdata.tw/api/basic/v2';
const DEFAULT_TDX_HISTORICAL_BASE_URL = 'https://tdx.transportdata.tw/api/historical/v2';
const DEFAULT_CITY = 'Taipei';
const DEFAULT_TOP = 1200;
// Historical days are streamed (NDJSON) and deduped on the fly — the endpoint ignores
// $skip/$filter, so $top must be large enough for the server to emit the whole day (~7M rows).
const DEFAULT_HISTORICAL_TOP = 10000000;
const DEFAULT_INTERVAL_MINUTES = 5;
const DEFAULT_KAFKA_BROKER = 'localhost:9092';
const DEFAULT_KAFKA_TOPIC = 'normalized.tdx.bus_vehicle_position';
const DEFAULT_MANIFEST_PATH = 'data/bus/ingestion/manifest.json';
const DEFAULT_POLLER_LOCK_PATH = 'data/bus/ingestion/poller-lock.json';

// Configuration
function configFromEnv() {
  return {
    httpPort: Number(process.env.HTTP_PORT ?? DEFAULT_HTTP_PORT),
    tdxAuthUrl: process.env.TDX_AUTH_URL ?? DEFAULT_TDX_AUTH_URL,
    tdxApiBaseUrl: stripTrailingSlash(process.env.TDX_API_BASE_URL ?? DEFAULT_TDX_API_BASE_URL),
    tdxHistoricalBaseUrl: stripTrailingSlash(process.env.TDX_HISTORICAL_BASE_URL ?? DEFAULT_TDX_HISTORICAL_BASE_URL),
    tdxCity: process.env.TDX_CITY ?? DEFAULT_CITY,
    tdxTop: Number(process.env.TDX_TOP ?? DEFAULT_TOP),
    tdxHistoricalTop: Number(process.env.TDX_HISTORICAL_TOP ?? DEFAULT_HISTORICAL_TOP),
    tdxClientId: process.env.TDX_CLIENT_ID,
    tdxClientSecret: process.env.TDX_CLIENT_SECRET,
    intervalMinutes: Number(process.env.INGEST_INTERVAL_MINUTES ?? DEFAULT_INTERVAL_MINUTES),
    kafkaBrokers: (process.env.KAFKA_BROKERS ?? DEFAULT_KAFKA_BROKER).split(','),
    kafkaTopic: process.env.KAFKA_TOPIC ?? DEFAULT_KAFKA_TOPIC,
    manifestPath: process.env.MANIFEST_PATH ?? DEFAULT_MANIFEST_PATH,
    pollerLockPath: process.env.POLLER_LOCK_PATH ?? DEFAULT_POLLER_LOCK_PATH,
    pollerEnabled: process.env.POLLER_ENABLED !== 'false',
    pollerLockTtlSec: Number(process.env.POLLER_LOCK_TTL_SEC ?? 30),
    pollerLockRenewSec: Number(process.env.POLLER_LOCK_RENEW_SEC ?? 10),
    pollerTickSec: Number(process.env.POLLER_TICK_SEC ?? 300), // 5 minutes
    instanceId: process.env.INSTANCE_ID ?? `ingest-${Date.now()}`,
  };
}

// Slot utilities
function taipeiSlot(date, intervalMinutes) {
  const slotMs = intervalMinutes * 60 * 1000;
  const flooredMs = Math.floor(date.getTime() / slotMs) * slotMs;
  const taipei = new Date(flooredMs + 8 * 60 * 60 * 1000);
  const serviceDate = taipei.toISOString().slice(0, 10);
  const timeLabel = taipei.toISOString().slice(11, 16);
  return {
    slotKey: `${serviceDate}T${timeLabel}+08:00`,
    serviceDate,
    timeLabel,
    intervalMinutes,
  };
}

// TDX Auth
async function fetchAccessToken(config) {
  const response = await fetch(config.tdxAuthUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.tdxClientId,
      client_secret: config.tdxClientSecret,
      grant_type: 'client_credentials',
    }),
  });

  if (!response.ok) {
    throw new Error(`TDX token request failed with HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (!payload.access_token) {
    throw new Error('TDX token response did not include access_token.');
  }
  return payload.access_token;
}

// TDX Fetch
async function fetchTdxBusRows(config, accessToken) {
  const url = new URL(`${config.tdxApiBaseUrl}/Bus/RealTimeByFrequency/City/${encodeURIComponent(config.tdxCity)}`);
  url.searchParams.set('$top', String(config.tdxTop));
  url.searchParams.set('$format', 'JSON');

  const response = await fetch(url.toString(), {
    headers: { authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`TDX bus request failed with HTTP ${response.status}`);
  }
  return response.json();
}

// Build the TDX Historical RealTimeByFrequency URL for a whole Taipei service day. The endpoint
// returns NDJSON, ignores $skip/$filter, and honors only Dates + $top — so the whole day (~7M
// rows / multi-GB) must be streamed in one request and deduped on the fly (see ingestHistoricalDay).
function historicalDayUrl(config, date) {
  const url = new URL(`${config.tdxHistoricalBaseUrl}/Historical/Bus/RealTimeByFrequency/City/${encodeURIComponent(config.tdxCity)}`);
  url.searchParams.set('Dates', date);
  url.searchParams.set('$top', String(config.tdxHistoricalTop));
  url.searchParams.set('$format', 'JSON');
  return url.toString();
}

// The slot for a row, from its own UpdateTime (Taipei). null if the timestamp is missing/invalid
// or lands on a different service_date than `date` (midnight spillover).
function rowSlot(row, date, intervalMinutes) {
  const t = row?.UpdateTime ?? row?.SrcUpdateTime ?? row?.GPSTime ?? null;
  if (!t) return null;
  const ts = new Date(t);
  if (Number.isNaN(ts.getTime())) return null;
  const slot = taipeiSlot(ts, intervalMinutes);
  return slot.serviceDate === date ? slot : null;
}

// Fold one row into the dedup map, keeping the latest UpdateTime per (slot,vehicle,route,dir).
// This collapses the ~85x oversampled historical stream to one position per vehicle per slot —
// the same shape live polling produces — with O(deduped) memory, not O(day).
function considerRow(latest, row, date, intervalMinutes) {
  if (!row || !row.PlateNumb || !row.RouteUID) return;
  if (row.BusPosition?.PositionLat == null || row.BusPosition?.PositionLon == null) return;
  const slot = rowSlot(row, date, intervalMinutes);
  if (!slot) return;
  const key = `${slot.slotKey}|${row.PlateNumb}|${row.RouteUID}|${Number(row.Direction ?? 0)}`;
  const updateMs = new Date(row.UpdateTime ?? row.GPSTime ?? 0).getTime() || 0;
  const prev = latest.get(key);
  if (!prev || updateMs >= prev.updateMs) latest.set(key, { row, slot, updateMs });
}

// Ingest a full historical day: ONE streamed NDJSON request, deduped on the fly to one position
// per vehicle per slot, then produced to the same normalized topic with historical provenance +
// correct per-slot timestamps. Memory is bounded by the deduped set (~tens of thousands of rows),
// not the raw day. Does NOT write the live ingestion manifest, so the reconcile DAG/poller are
// unaffected.
async function ingestHistoricalDay(date) {
  const config = configFromEnv();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
    return { ok: false, date, error: 'invalid_date', message: 'date must be YYYY-MM-DD' };
  }
  if (!config.tdxClientId || !config.tdxClientSecret) {
    return { ok: false, date, error: 'missing_tdx_credentials', message: 'TDX_CLIENT_ID and/or TDX_CLIENT_SECRET not set' };
  }

  try {
    const accessToken = await fetchAccessToken(config);
    const response = await fetch(historicalDayUrl(config, date), {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok || !response.body) {
      throw new Error(`TDX historical request failed with HTTP ${response.status}`);
    }

    // Stream NDJSON line-by-line; never buffer the whole (multi-GB) day.
    const latest = new Map();
    const decoder = new TextDecoder();
    const reader = response.body.getReader();
    let buf = '';
    let scanned = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        if (!line.trim()) continue;
        let row;
        try { row = JSON.parse(line); } catch { continue; }
        scanned++;
        considerRow(latest, row, date, config.intervalMinutes);
      }
    }
    if (buf.trim()) {
      try { considerRow(latest, JSON.parse(buf), date, config.intervalMinutes); scanned++; } catch { /* trailing partial */ }
    }

    // Group deduped rows by slot, then normalize + produce.
    const bySlot = new Map();
    for (const { row, slot } of latest.values()) {
      if (!bySlot.has(slot.slotKey)) bySlot.set(slot.slotKey, { slot, rows: [] });
      bySlot.get(slot.slotKey).rows.push(row);
    }

    const producer = await getKafkaProducer(config);
    let recordCount = 0;
    const routes = new Set();
    for (const { slot, rows } of bySlot.values()) {
      // Reference time = the slot's own wall-clock, so freshness is judged in-context (not vs now).
      const slotMs = new Date(`${slot.serviceDate}T${slot.timeLabel}:00+08:00`).getTime();
      const records = normalizeRows(rows, slot, config, new Date(slotMs).toISOString(), {
        ingestMode: 'historical',
        sourceDataset: 'Historical.Bus.RealTimeByFrequency.City',
        referenceMs: slotMs,
      });
      const { recordCount: n } = await produceNormalizedMessages(producer, config, slot, records, 'historical');
      recordCount += n;
      for (const r of records) routes.add(r.route_uid);
    }

    return { ok: true, date, mode: 'historical', scanned, slotCount: bySlot.size, recordCount, routeCount: routes.size };
  } catch (error) {
    console.error('ingestHistoricalDay error:', error);
    return { ok: false, date, error: error.message || 'historical_ingest_failed', message: error.message };
  }
}

// Normalize TDX rows to normalized.tdx.bus_vehicle_position.v1
// Live and historical share this normalizer; only the provenance fields and the
// freshness reference time differ (live = now, historical = the slot's own time).
function normalizeRows(rows, slot, config, capturedAt, options = {}) {
  const {
    ingestMode = 'live',
    sourceDataset = 'Bus.RealTimeByFrequency.City',
    referenceMs = Date.now(),
  } = options;
  const normalized = [];

  for (const row of (Array.isArray(rows) ? rows : [])) {
    if (!row.PlateNumb || !row.RouteUID) continue;
    if (row.BusPosition?.PositionLat === null || row.BusPosition?.PositionLat === undefined) continue;
    if (row.BusPosition?.PositionLon === null || row.BusPosition?.PositionLon === undefined) continue;

    const updateTime = row.UpdateTime ?? row.SrcUpdateTime ?? row.GPSTime ?? null;
    const gpsTime = row.GPSTime ?? updateTime;
    const routeName = localizedName(row.RouteName) || row.RouteID || row.RouteUID || 'unknown';
    const direction = Number(row.Direction ?? 0);

    normalized.push({
      schema: 'twfoundry.normalized.tdx.bus_vehicle_position.v1',
      slot_key: slot.slotKey,
      service_date: slot.serviceDate,
      slot_label: slot.timeLabel,
      city: config.tdxCity,
      vehicle_id: row.PlateNumb,
      route_uid: row.RouteUID,
      route_name: routeName,
      direction,
      longitude: Number(row.BusPosition.PositionLon),
      latitude: Number(row.BusPosition.PositionLat),
      speed_kph: row.Speed ? Number(row.Speed) : null,
      azimuth_deg: row.Azimuth ? Number(row.Azimuth) : null,
      gps_time: gpsTime,
      update_time: updateTime,
      freshness: updateTime ? (isStale(updateTime, referenceMs) ? 'stale' : 'fresh') : 'unknown',
      completeness: computeCompleteness(row),
      ingest_mode: ingestMode,
      source_dataset: sourceDataset,
      ingested_at: capturedAt,
    });
  }

  return normalized;
}

function isStale(timeStr, referenceMs = Date.now()) {
  if (!timeStr) return true;
  const ageMs = referenceMs - new Date(timeStr).getTime();
  return ageMs > 90 * 1000; // stale if > 90 seconds
}

function computeCompleteness(row) {
  const fields = [
    row.PlateNumb,
    row.RouteUID,
    localizedName(row.RouteName),
    row.BusPosition?.PositionLat,
    row.BusPosition?.PositionLon,
    row.GPSTime ?? row.UpdateTime,
  ];
  return fields.filter((f) => f !== undefined && f !== null && f !== '').length / fields.length;
}

function localizedName(value) {
  if (typeof value === 'string') return value;
  return value?.Zh_tw ?? value?.ZhTw ?? value?.En ?? value?.Name ?? '';
}

function stripTrailingSlash(value) {
  return String(value).replace(/\/+$/, '');
}

// Manifest management
async function readManifest(path) {
  try {
    const fs = await import('fs/promises');
    const data = await fs.readFile(path, 'utf8');
    return JSON.parse(data);
  } catch {
    return emptyManifest();
  }
}

function emptyManifest() {
  return {
    schema: 'twfoundry.bus.ingestion-manifest.v1',
    city: 'Taipei',
    intervalMinutes: 5,
    generatedAt: new Date().toISOString(),
    latestCompleteSlotKey: null,
    snapshots: [],
  };
}

async function upsertManifest(path, slotKey, entry) {
  const manifest = await readManifest(path);

  const newSnapshot = {
    slotKey: entry.slotKey,
    serviceDate: entry.serviceDate,
    timeLabel: entry.timeLabel,
    status: 'complete',
    ingestMode: entry.ingestMode,
    fencingToken: entry.fencingToken || 0,
    recordCount: entry.recordCount,
    routeCount: entry.routeCount || 0,
    capturedAt: entry.capturedAt,
    updatedAt: new Date().toISOString(),
    lastError: null,
  };

  manifest.snapshots = manifest.snapshots.filter((s) => s.slotKey !== slotKey);
  manifest.snapshots.push(newSnapshot);
  manifest.generatedAt = new Date().toISOString();
  manifest.latestCompleteSlotKey = slotKey;

  const fs = await import('fs/promises');
  await fs.mkdir(dirname(path), { recursive: true });
  await fs.writeFile(path, JSON.stringify(manifest, null, 2));
  
  return manifest;
}

// Kafka producer
let kafkaProducerInstance = null;

async function getKafkaProducer(config) {
  if (kafkaProducerInstance) return kafkaProducerInstance;

  const kafka = new Kafka({
    clientId: `ingest-${config.instanceId}`,
    brokers: config.kafkaBrokers,
  });

  kafkaProducerInstance = kafka.producer({
    idempotent: true,
    maxInFlightRequests: 5,
    compression: 1, // Gzip
  });

  await kafkaProducerInstance.connect();
  return kafkaProducerInstance;
}

async function produceNormalizedMessages(producer, config, slot, records, ingestMode = 'live') {
  if (records.length === 0) {
    return { recordCount: 0 };
  }

  const messages = records.map((record) => ({
    key: `${slot.slotKey}|${record.vehicle_id}|${record.route_uid}|${record.direction}`,
    value: JSON.stringify(record),
    headers: {
      schema: Buffer.from('twfoundry.kafka.normalized.tdx.bus_vehicle_position.v1'),
      ingest_mode: Buffer.from(ingestMode),
    },
  }));

  await producer.send({
    topic: config.kafkaTopic,
    messages,
    acks: -1, // all replicas
  });

  return { recordCount: records.length };
}

// Core ingest_slot function
async function ingestSlot(slotKey, mode, options = {}) {
  const config = configFromEnv();
  const { force = false } = options;

  try {
    // Parse slot key
    const slot = parseSlotKey(slotKey);
    if (!slot) {
      return {
        ok: false,
        slotKey,
        mode,
        error: 'invalid_slot_key',
        message: `Invalid slot key format: ${slotKey}`,
      };
    }

    // Check idempotency
    const manifest = await readManifest(config.manifestPath);
    const existing = manifest.snapshots.find((s) => s.slotKey === slotKey);
    if (existing?.status === 'complete' && !force) {
      return {
        ok: true,
        skipped: true,
        reason: 'slot_already_complete',
        slotKey,
        mode,
      };
    }

    // Fetch from TDX
    if (!config.tdxClientId || !config.tdxClientSecret) {
      return {
        ok: false,
        slotKey,
        mode,
        error: 'missing_tdx_credentials',
        message: 'TDX_CLIENT_ID and/or TDX_CLIENT_SECRET not set',
      };
    }

    const accessToken = await fetchAccessToken(config);
    const rawRows = await fetchTdxBusRows(config, accessToken);

    // Normalize
    const capturedAt = new Date().toISOString();
    const records = normalizeRows(rawRows, slot, config, capturedAt);

    // Produce to Kafka
    const producer = await getKafkaProducer(config);
    const { recordCount } = await produceNormalizedMessages(producer, config, slot, records);

    // Upsert manifest
    await upsertManifest(config.manifestPath, slotKey, {
      slotKey,
      serviceDate: slot.serviceDate,
      timeLabel: slot.timeLabel,
      recordCount,
      routeCount: new Set(records.map((r) => r.route_uid)).size,
      capturedAt,
      ingestMode: mode,
      fencingToken: 0, // Phase 1: no lock implementation
    });

    return {
      ok: true,
      skipped: false,
      slotKey,
      mode,
      recordCount,
      manifestPath: config.manifestPath,
      capturedAt,
    };
  } catch (error) {
    console.error('ingestSlot error:', error);
    return {
      ok: false,
      slotKey,
      mode,
      error: error.message || 'ingest_failed',
      message: error.message,
    };
  }
}

function parseSlotKey(slotKey) {
  // Expected format: YYYY-MM-DDTHH:MM+08:00
  const match = slotKey.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})\+08:00$/);
  if (!match) return null;
  return {
    serviceDate: match[1],
    timeLabel: `${match[2]}:${match[3]}`,
    slotKey,
  };
}

// HTTP Server
function createHttpServer(config) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    // Health check
    if (req.method === 'GET' && url.pathname === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, service: 'bus-ingestion' }));
      return;
    }

    // Leader health check
    if (req.method === 'GET' && url.pathname === '/health/leader') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        leader: false, // Phase 1: no poller lock
        holderId: config.instanceId,
        fencingToken: 0,
      }));
      return;
    }

    // Ingest API
    if (req.method === 'POST' && url.pathname === '/ingest/slots') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body);
          const { slotKey, mode, force } = payload;

          if (!slotKey || !mode) {
            res.writeHead(400, { 'content-type': 'application/json' });
            res.end(JSON.stringify({
              ok: false,
              error: 'missing_fields',
              message: 'slotKey and mode are required',
            }));
            return;
          }

          const result = await ingestSlot(slotKey, mode, { force });
          const statusCode = result.ok ? 200 : 500;
          res.writeHead(statusCode, { 'content-type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (error) {
          res.writeHead(400, { 'content-type': 'application/json' });
          res.end(JSON.stringify({
            ok: false,
            error: 'invalid_request',
            message: error.message,
          }));
        }
      });
      return;
    }

    // Historical backfill: ingest a whole day from TDX's Historical endpoint.
    if (req.method === 'POST' && url.pathname === '/ingest/day') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', async () => {
        try {
          const payload = body ? JSON.parse(body) : {};
          const { date } = payload;
          if (!date) {
            res.writeHead(400, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: 'missing_fields', message: 'date is required (YYYY-MM-DD)' }));
            return;
          }
          const result = await ingestHistoricalDay(date);
          res.writeHead(result.ok ? 200 : 500, { 'content-type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (error) {
          res.writeHead(400, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'invalid_request', message: error.message }));
        }
      });
      return;
    }

    // 404
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'not_found' }));
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`✗ EADDRINUSE: port ${config.httpPort} is already in use.`);
      console.error(`  Set HTTP_PORT=<different-port> or stop the process using this port.`);
      process.exit(1);
    }
    throw error;
  });

  return server;
}

// Poller loop (stub)
async function startPollerLoop(config) {
  if (!config.pollerEnabled) {
    console.log('Poller disabled');
    return;
  }

  console.log('Poller loop started (stub - Phase 1)');
  // Phase 1: stub only; would need lock implementation for real
}

// Main
async function main() {
  const config = configFromEnv();

  console.log('🚀 Bus Ingestion Service - Phase 1');
  console.log('Config:', {
    port: config.httpPort,
    kafkaBrokers: config.kafkaBrokers,
    kafkaTopic: config.kafkaTopic,
    tdxCity: config.tdxCity,
    instanceId: config.instanceId,
  });

  const server = createHttpServer(config);
  server.listen(config.httpPort, () => {
    console.log(`✓ HTTP server listening on port ${config.httpPort}`);
  });

  await startPollerLoop(config);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down...');
    server.close();
    if (kafkaProducerInstance) {
      await kafkaProducerInstance.disconnect();
    }
    process.exit(0);
  });
}

// Run only if not in test mode
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { ingestSlot, ingestHistoricalDay, considerRow, rowSlot, normalizeRows, parseSlotKey, taipeiSlot };
