import fs from 'fs';
import path from 'path';
import {
  buildManifestFromSlots,
  buildProjectionFromNormalizedRows,
  computeBounds,
  groupRowsBySlot,
  pickCapturedAt,
  slotMetaFromRow,
} from './normalizedToProjection.js';

const config = {
  lakePath: process.env.LAKE_PATH || '../../data/lake',
  outputPath: process.env.OUTPUT_PATH || '../../cloudflare/artifacts/bus-projections',
  serviceDate: process.env.SERVICE_DATE || null,
  intervalMinutes: parseInt(process.env.INGEST_INTERVAL_MINUTES || '5', 10),
  r2Prefix: process.env.R2_PREFIX || null,
};

export function readLakeRows(lakeDir, serviceDate = null) {
  const resolved = path.resolve(lakeDir);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Lake directory not found: ${resolved}`);
  }

  const files = fs.readdirSync(resolved)
    .filter((name) => name.endsWith('.jsonl'))
    .filter((name) => !serviceDate || name === `${serviceDate}.jsonl`)
    .sort();

  if (files.length === 0) {
    throw new Error(serviceDate
      ? `No lake file for service date ${serviceDate} under ${resolved}`
      : `No JSONL files under ${resolved}`);
  }

  const rows = [];
  for (const file of files) {
    const content = fs.readFileSync(path.join(resolved, file), 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      rows.push(JSON.parse(trimmed));
    }
  }
  return rows;
}

export function publishProjections(rows, outputDir, intervalMinutes = 5, r2Prefix = null) {
  const groups = groupRowsBySlot(rows);
  const slotEntries = [];

  for (const slotRows of groups.values()) {
    const slot = slotMetaFromRow(slotRows[0], intervalMinutes);
    const capturedAt = pickCapturedAt(slotRows);
    const projection = buildProjectionFromNormalizedRows(slotRows, slot, capturedAt);
    const outputFile = path.join(outputDir, slot.captureDate, `${slot.fileLabel}.json`);

    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
    fs.writeFileSync(outputFile, `${JSON.stringify(projection, null, 2)}\n`, 'utf8');

    slotEntries.push({
      slot,
      capturedAt,
      projection,
      bounds: computeBounds(slotRows),
    });
  }

  const manifest = buildManifestFromSlots(slotEntries, intervalMinutes, r2Prefix);
  const manifestFile = path.join(outputDir, 'manifest.json');
  fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  return {
    outputDir: path.resolve(outputDir),
    manifestPath: manifestFile,
    slotCount: slotEntries.length,
    featureCount: slotEntries.reduce((total, entry) => total + entry.projection.features.length, 0),
    latestSlotKey: manifest.latestSlotKey,
  };
}

export function runPublisher(opts = {}) {
  const lakePath = opts.lakePath ?? config.lakePath;
  const outputPath = opts.outputPath ?? config.outputPath;
  const serviceDate = opts.serviceDate ?? config.serviceDate;
  const intervalMinutes = opts.intervalMinutes ?? config.intervalMinutes;
  const r2Prefix = opts.r2Prefix ?? config.r2Prefix;

  const rows = readLakeRows(lakePath, serviceDate);
  const result = publishProjections(rows, outputPath, intervalMinutes, r2Prefix);
  return { ...result, rowCount: rows.length, r2Prefix };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  try {
    const result = runPublisher();
    console.log(JSON.stringify({ ok: true, ...result }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ ok: false, message: error.message }, null, 2));
    process.exit(1);
  }
}
