export const BUS_PROJECTION_LAYER_ID = 'bus_vehicles';
export const BUS_PROJECTION_TYPE = 'vehicle_position_projection';
export const BUS_PROJECTION_R2_PREFIX = 'bus/projections';
export const BUS_PROJECTION_MANIFEST_KEY = `${BUS_PROJECTION_R2_PREFIX}/manifest.json`;
export const BUS_PROJECTION_TRACK_B_R2_PREFIX = 'bus/projections-track-b';
export const BUS_PROJECTION_TRACK_B_MANIFEST_KEY = `${BUS_PROJECTION_TRACK_B_R2_PREFIX}/manifest.json`;

export function selectSnapshot(manifest, slot) {
  const requestedSlot = slot && slot.trim() ? slot.trim() : 'latest';

  if (requestedSlot.toLowerCase() === 'latest') {
    return manifest.snapshots.find((entry) => entry.slotKey === manifest.latestSlotKey)
      ?? [...manifest.snapshots].sort((left, right) => String(right.capturedAt).localeCompare(String(left.capturedAt)))[0];
  }

  const normalized = requestedSlot.replace(':', '-');
  const matches = manifest.snapshots.filter((entry) => (
    requestedSlot === entry.slotKey
    || requestedSlot === entry.timeLabel
    || normalized === String(entry.timeLabel ?? '').replace(':', '-')
  ));
  return matches.sort((left, right) => String(right.capturedAt).localeCompare(String(left.capturedAt)))[0];
}

export function toBusMapFeature(row) {
  const vehicleId = text(row, 'PlateNumb', 'unknown');
  return {
    id: `bus:${vehicleId}`,
    longitude: number(row.BusPosition, 'PositionLon', 0),
    latitude: number(row.BusPosition, 'PositionLat', 0),
    vehicleId,
    routeUid: text(row, 'RouteUID', ''),
    routeName: text(row, 'RouteName', 'unknown'),
    direction: integer(row, 'Direction', -1),
    speedKph: number(row, 'Speed', 0),
    azimuthDeg: number(row, 'Azimuth', 0),
    gpsTime: text(row, 'GPSTime', ''),
    updateTime: text(row, 'UpdateTime', ''),
    freshness: text(row, 'freshness', 'unknown'),
    completeness: number(row, 'completeness', 0),
  };
}

export function summarizeBusMapFeatures(features) {
  const routeNames = new Set(features.map((feature) => feature.routeName).filter(Boolean));
  const freshCount = features.filter((feature) => feature.freshness === 'fresh').length;
  const staleCount = features.filter((feature) => feature.freshness === 'stale').length;
  const averageCompleteness = features.length === 0
    ? 0
    : features.reduce((total, feature) => total + feature.completeness, 0) / features.length;

  return {
    vehicleCount: features.length,
    routeCount: routeNames.size,
    freshCount,
    staleCount,
    averageCompleteness,
  };
}

export function projectionPathForSnapshot(entry, r2Prefix = BUS_PROJECTION_R2_PREFIX) {
  return `${r2Prefix}/${entry.captureDate}/${entry.timeLabel.replace(':', '-')}.json`;
}

function text(row, field, fallback) {
  const value = row?.[field];
  return typeof value === 'string' ? value : fallback;
}

function integer(row, field, fallback) {
  const value = row?.[field];
  if (Number.isInteger(value)) return value;
  if (typeof value !== 'string') return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function number(row, field, fallback) {
  const value = row?.[field];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return fallback;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
