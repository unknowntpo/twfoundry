import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import {
  BUS_PROJECTION_LAYER_ID,
  BUS_PROJECTION_TYPE,
  projectionPathForSnapshot,
  summarizeBusMapFeatures,
  toBusMapFeature,
} from '../functions/_shared/busProjectionContract.js';

const DEFAULT_ARCHIVE_ROOT = 'public/data/tdx-bus/archive';
const DEFAULT_OUTPUT_ROOT = '../cloudflare/artifacts/bus-projections';

const options = parseArgs(process.argv.slice(2));
const archiveRoot = resolve(process.cwd(), options['archive-root'] ?? DEFAULT_ARCHIVE_ROOT);
const outputRoot = resolve(process.cwd(), options['output-root'] ?? DEFAULT_OUTPUT_ROOT);
const limit = options.limit ? Number(options.limit) : null;

if (!existsSync(join(archiveRoot, 'manifest.json'))) {
  throw new Error(`Archive manifest not found: ${join(archiveRoot, 'manifest.json')}`);
}

const manifest = readJson(join(archiveRoot, 'manifest.json'));
const sourceSnapshots = Array.isArray(manifest.snapshots) ? manifest.snapshots : [];
const selectedSnapshots = Number.isFinite(limit) ? sourceSnapshots.slice(0, limit) : sourceSnapshots;

const projectionManifest = {
  schema: 'twfoundry.bus.vehicle-projection-manifest.v1',
  layerId: BUS_PROJECTION_LAYER_ID,
  projectionType: BUS_PROJECTION_TYPE,
  source: manifest.source,
  intervalMinutes: manifest.intervalMinutes,
  generatedAt: new Date().toISOString(),
  sourceGeneratedAt: manifest.generatedAt ?? null,
  latestSlotKey: manifest.latestSlotKey,
  snapshots: [],
};

for (const entry of selectedSnapshots) {
  const sourcePath = resolveArchivePath(entry.path);
  const snapshot = readJson(sourcePath);
  const features = Array.isArray(snapshot.records) ? snapshot.records.map(toBusMapFeature) : [];
  const projection = {
    layerId: BUS_PROJECTION_LAYER_ID,
    projectionType: BUS_PROJECTION_TYPE,
    source: snapshot.source ?? manifest.source,
    capturedAt: snapshot.capturedAt ?? entry.capturedAt,
    timelineSlot: snapshot.slot?.timeLabel ?? entry.timeLabel,
    features,
    summary: summarizeBusMapFeatures(features),
  };

  const outputFile = join(outputRoot, entry.captureDate, `${entry.timeLabel.replace(':', '-')}.json`);
  writeJson(outputFile, projection);

  projectionManifest.snapshots.push({
    slotKey: entry.slotKey,
    captureDate: entry.captureDate,
    capturedAt: entry.capturedAt,
    timeLabel: entry.timeLabel,
    intervalMinutes: entry.intervalMinutes,
    count: features.length,
    routeCount: projection.summary.routeCount,
    bounds: entry.bounds ?? snapshot.bounds ?? null,
    projectionPath: projectionPathForSnapshot(entry),
  });
}

writeJson(join(outputRoot, 'manifest.json'), projectionManifest);

console.log(JSON.stringify({
  outputRoot: relative(process.cwd(), outputRoot),
  manifest: relative(process.cwd(), join(outputRoot, 'manifest.json')),
  snapshots: projectionManifest.snapshots.length,
}, null, 2));

function resolveArchivePath(path) {
  if (!path) throw new Error('Archive manifest entry is missing path.');
  if (path.startsWith('/data/tdx-bus/archive/')) {
    return join(archiveRoot, path.slice('/data/tdx-bus/archive/'.length));
  }
  return resolve(archiveRoot, path);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
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
