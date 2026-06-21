import {
  BUS_PROJECTION_LAYER_ID,
  BUS_PROJECTION_TYPE,
  projectionPathForSnapshot,
  summarizeBusMapFeatures,
  toBusMapFeature,
} from '../../../frontend/functions/_shared/busProjectionContract.js';

const DEFAULT_INTERVAL_MINUTES = 5;

export function normalizedRowToTdxShape(row) {
  return {
    PlateNumb: row.vehicle_id,
    RouteUID: row.route_uid,
    RouteName: row.route_name,
    Direction: row.direction,
    BusPosition: {
      PositionLat: row.latitude,
      PositionLon: row.longitude,
    },
    Speed: row.speed_kph ?? 0,
    Azimuth: row.azimuth_deg ?? 0,
    GPSTime: row.gps_time,
    UpdateTime: row.update_time,
    freshness: row.freshness,
    completeness: row.completeness,
  };
}

export function slotMetaFromRow(row, intervalMinutes = DEFAULT_INTERVAL_MINUTES) {
  return {
    slotKey: row.slot_key,
    captureDate: row.service_date,
    timeLabel: row.slot_label,
    fileLabel: String(row.slot_label ?? '').replace(':', '-'),
    intervalMinutes,
    city: row.city ?? 'Taipei',
  };
}

export function buildProjectionFromNormalizedRows(rows, slot, capturedAt) {
  const features = rows.map((row) => toBusMapFeature(normalizedRowToTdxShape(row)));
  return {
    layerId: BUS_PROJECTION_LAYER_ID,
    projectionType: BUS_PROJECTION_TYPE,
    source: {
      provider: 'TDX',
      dataset: 'Bus.RealTimeByFrequency.City',
      city: slot.city,
      mode: 'homelab-lake-publisher',
    },
    capturedAt,
    timelineSlot: slot.timeLabel,
    features,
    summary: summarizeBusMapFeatures(features),
  };
}

export function buildManifestFromSlots(slotEntries, intervalMinutes = DEFAULT_INTERVAL_MINUTES, r2Prefix = null) {
  const prefix = r2Prefix ?? undefined;
  const snapshots = [...slotEntries]
    .map((entry) => ({
      slotKey: entry.slot.slotKey,
      captureDate: entry.slot.captureDate,
      capturedAt: entry.capturedAt,
      timeLabel: entry.slot.timeLabel,
      intervalMinutes: entry.slot.intervalMinutes ?? intervalMinutes,
      count: entry.projection.features.length,
      routeCount: entry.projection.summary.routeCount,
      bounds: entry.bounds ?? null,
      projectionPath: projectionPathForSnapshot(entry.slot, prefix),
      status: 'success',
      updatedAt: new Date().toISOString(),
    }))
    .sort((left, right) => String(left.capturedAt).localeCompare(String(right.capturedAt)));

  const latest = [...snapshots].sort((left, right) => String(right.capturedAt).localeCompare(String(left.capturedAt)))[0];

  return {
    schema: 'twfoundry.bus.vehicle-projection-manifest.v1',
    layerId: BUS_PROJECTION_LAYER_ID,
    projectionType: BUS_PROJECTION_TYPE,
    source: {
      provider: 'TDX',
      dataset: 'Bus.RealTimeByFrequency.City',
      city: snapshots[0]?.city ?? 'Taipei',
      mode: 'homelab-lake-publisher',
    },
    intervalMinutes,
    generatedAt: new Date().toISOString(),
    sourceGeneratedAt: null,
    latestSlotKey: latest?.slotKey ?? null,
    snapshots,
  };
}

export function groupRowsBySlot(rows) {
  const groups = new Map();
  for (const row of rows) {
    if (!row?.slot_key) continue;
    if (!groups.has(row.slot_key)) {
      groups.set(row.slot_key, []);
    }
    groups.get(row.slot_key).push(row);
  }
  return groups;
}

export function computeBounds(rows) {
  const coordinates = rows
    .map((row) => [row.longitude, row.latitude])
    .filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat));
  if (coordinates.length === 0) {
    return { minLat: 0, maxLat: 0, minLon: 0, maxLon: 0 };
  }
  return {
    minLon: Math.min(...coordinates.map(([lon]) => lon)),
    maxLon: Math.max(...coordinates.map(([lon]) => lon)),
    minLat: Math.min(...coordinates.map(([, lat]) => lat)),
    maxLat: Math.max(...coordinates.map(([, lat]) => lat)),
  };
}

export function pickCapturedAt(rows) {
  const timestamps = rows
    .map((row) => row.ingested_at ?? row.archived_at)
    .filter(Boolean)
    .sort();
  return timestamps[timestamps.length - 1] ?? new Date().toISOString();
}
