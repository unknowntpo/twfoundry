export const OPERATIONS_ARCHIVE_INTERVAL_MINUTES = 5;
export const OPERATIONS_POLL_INTERVAL_SECONDS = OPERATIONS_ARCHIVE_INTERVAL_MINUTES * 60;
export const OPERATIONS_ARCHIVE_MANIFEST_URL = '/data/tdx-bus/archive/manifest.json';

const SOURCE_FIELDS = [
  'PlateNumb',
  'RouteUID',
  'RouteName',
  'Direction',
  'BusPosition',
  'Speed',
  'Azimuth',
  'GPSTime',
  'UpdateTime',
  'source',
  'mode',
];

const DERIVED_FIELDS = [
  'freshness age',
  'stale visual state',
  'completeness score',
  'overlay visibility',
  'sample screen position',
  'playback interpolation',
];

const SAMPLE_MOVEMENT = {
  'SAMPLE-1207': { dx: 0.9, dy: -0.38, lat: 0.0001, lon: 0.00016, speed: 1, azimuth: 82 },
  'SAMPLE-0821': { dx: 0.72, dy: 0.42, lat: -0.00008, lon: 0.00015, speed: -1, azimuth: 118 },
  'SAMPLE-4419': { dx: 0.52, dy: -0.58, lat: 0.00013, lon: 0.0001, speed: 0, azimuth: 42 },
  'SAMPLE-3318': { dx: -0.82, dy: 0.36, lat: -0.00006, lon: -0.00014, speed: 1, azimuth: 286 },
  'SAMPLE-5180': { dx: 0.88, dy: 0.22, lat: -0.00004, lon: 0.00018, speed: -2, azimuth: 96 },
  'SAMPLE-2094': { dx: 0.34, dy: 0.76, lat: -0.00015, lon: 0.00006, speed: 1, azimuth: 164 },
  'SAMPLE-7740': { dx: 0.46, dy: -0.2, lat: 0.00004, lon: 0.00009, speed: 0, azimuth: 74 },
  'SAMPLE-6623': { dx: -0.58, dy: 0.64, lat: -0.00012, lon: -0.0001, speed: 1, azimuth: 218 },
  'SAMPLE-9032': { dx: 0.12, dy: -0.86, lat: 0.00016, lon: 0.00002, speed: -1, azimuth: 12 },
  'SAMPLE-1458': { dx: -0.32, dy: -0.28, lat: 0.00005, lon: -0.00006, speed: 0, azimuth: 344 },
  'SAMPLE-3901': { dx: 0.64, dy: 0.54, lat: -0.0001, lon: 0.00013, speed: 1, azimuth: 132 },
};

const LAGGED_SAMPLE_IDS = new Set(['SAMPLE-7740', 'SAMPLE-1458']);

export const cityBusA1RawFixture = [
  { PlateNumb: 'SAMPLE-1207', RouteUID: 'TPE307', RouteName: '307', Direction: 0, BusPosition: { PositionLat: 25.0478, PositionLon: 121.5170 }, Speed: 32, Azimuth: 82, GPSTime: '2026-05-20T07:11:52Z', UpdateTime: '2026-05-20T07:12:10Z', source: 'TDX CityBus A1 fixture', mode: 'fixture', freshness: 'fresh', completeness: 0.98, x: '47%', y: '55%', age: '18s' },
  { PlateNumb: 'SAMPLE-0821', RouteUID: 'TPE262', RouteName: '262', Direction: 1, BusPosition: { PositionLat: 25.0331, PositionLon: 121.5636 }, Speed: 27, Azimuth: 118, GPSTime: '2026-05-20T07:11:47Z', UpdateTime: '2026-05-20T07:12:07Z', source: 'TDX CityBus A1 fixture', mode: 'fixture', freshness: 'fresh', completeness: 0.96, x: '68%', y: '50%', age: '21s' },
  { PlateNumb: 'SAMPLE-4419', RouteUID: 'TPE604', RouteName: '604', Direction: 0, BusPosition: { PositionLat: 25.0612, PositionLon: 121.5241 }, Speed: 19, Azimuth: 42, GPSTime: '2026-05-20T07:11:57Z', UpdateTime: '2026-05-20T07:12:12Z', source: 'TDX CityBus A1 fixture', mode: 'fixture', freshness: 'fresh', completeness: 0.94, x: '51%', y: '40%', age: '16s' },
  { PlateNumb: 'SAMPLE-3318', RouteUID: 'TPE235', RouteName: '235', Direction: 1, BusPosition: { PositionLat: 25.0184, PositionLon: 121.5330 }, Speed: 24, Azimuth: 286, GPSTime: '2026-05-20T07:11:38Z', UpdateTime: '2026-05-20T07:11:59Z', source: 'TDX CityBus A1 fixture', mode: 'fixture', freshness: 'fresh', completeness: 0.97, x: '54%', y: '65%', age: '29s' },
  { PlateNumb: 'SAMPLE-5180', RouteUID: 'TPE672', RouteName: '672', Direction: 0, BusPosition: { PositionLat: 25.0687, PositionLon: 121.6110 }, Speed: 36, Azimuth: 96, GPSTime: '2026-05-20T07:11:50Z', UpdateTime: '2026-05-20T07:12:08Z', source: 'TDX CityBus A1 fixture', mode: 'fixture', freshness: 'fresh', completeness: 0.99, x: '79%', y: '38%', age: '20s' },
  { PlateNumb: 'SAMPLE-2094', RouteUID: 'TPE307', RouteName: '307', Direction: 1, BusPosition: { PositionLat: 25.0755, PositionLon: 121.5005 }, Speed: 15, Azimuth: 164, GPSTime: '2026-05-20T07:11:55Z', UpdateTime: '2026-05-20T07:12:13Z', source: 'TDX CityBus A1 fixture', mode: 'fixture', freshness: 'fresh', completeness: 0.95, x: '40%', y: '32%', age: '15s' },
  { PlateNumb: 'SAMPLE-7740', RouteUID: 'TPE262', RouteName: '262', Direction: 0, BusPosition: { PositionLat: 25.0436, PositionLon: 121.5802 }, Speed: 41, Azimuth: 74, GPSTime: '2026-05-20T07:10:47Z', UpdateTime: '2026-05-20T07:10:58Z', source: 'TDX CityBus A1 fixture', mode: 'fixture', freshness: 'stale', completeness: 0.91, x: '73%', y: '56%', age: '92s' },
  { PlateNumb: 'SAMPLE-6623', RouteUID: 'TPE604', RouteName: '604', Direction: 1, BusPosition: { PositionLat: 25.0251, PositionLon: 121.4974 }, Speed: 12, Azimuth: 218, GPSTime: '2026-05-20T07:11:51Z', UpdateTime: '2026-05-20T07:12:03Z', source: 'TDX CityBus A1 fixture', mode: 'fixture', freshness: 'fresh', completeness: 0.93, x: '37%', y: '68%', age: '25s' },
  { PlateNumb: 'SAMPLE-9032', RouteUID: 'TPE235', RouteName: '235', Direction: 0, BusPosition: { PositionLat: 25.0523, PositionLon: 121.5485 }, Speed: 29, Azimuth: 12, GPSTime: '2026-05-20T07:11:40Z', UpdateTime: '2026-05-20T07:12:01Z', source: 'TDX CityBus A1 fixture', mode: 'fixture', freshness: 'fresh', completeness: 0.96, x: '61%', y: '47%', age: '27s' },
  { PlateNumb: 'SAMPLE-1458', RouteUID: 'TPE672', RouteName: '672', Direction: 1, BusPosition: { PositionLat: 25.0360, PositionLon: 121.6140 }, Speed: 0, Azimuth: 344, GPSTime: '2026-05-20T07:10:31Z', UpdateTime: '2026-05-20T07:10:44Z', source: 'TDX CityBus A1 fixture', mode: 'fixture', freshness: 'stale', completeness: 0.88, x: '83%', y: '61%', age: '106s' },
  { PlateNumb: 'SAMPLE-3901', RouteUID: 'TPE307', RouteName: '307', Direction: 0, BusPosition: { PositionLat: 25.0852, PositionLon: 121.5602 }, Speed: 22, Azimuth: 132, GPSTime: '2026-05-20T07:11:44Z', UpdateTime: '2026-05-20T07:12:04Z', source: 'TDX CityBus A1 fixture', mode: 'fixture', freshness: 'fresh', completeness: 0.95, x: '63%', y: '28%', age: '24s' },
];

export const fallbackOperationsDataSource = {
  mode: 'fixture',
  label: 'TDX-shaped fixture',
  badge: 'fixture',
  provider: 'Fixture',
  dataset: 'CityBus A1 fixture',
  city: 'Taipei',
  captureDate: null,
  capturedAt: null,
  timeLabel: 'fixture',
  intervalMinutes: OPERATIONS_ARCHIVE_INTERVAL_MINUTES,
  count: cityBusA1RawFixture.length,
  bounds: null,
};

export const operationsDataSource = fallbackOperationsDataSource;

export function createOperationsDataSource(snapshot = null, manifestEntry = null) {
  if (!snapshot?.source || !Array.isArray(snapshot.records)) return fallbackOperationsDataSource;

  return {
    mode: snapshot.source.mode ?? 'tdx-captured',
    label: `${snapshot.source.provider ?? 'TDX'} ${snapshot.source.city ?? 'City'} Bus captured`,
    badge: snapshot.source.mode === 'tdx-captured' ? 'archive' : (snapshot.source.mode ?? 'captured'),
    provider: snapshot.source.provider ?? 'TDX',
    dataset: snapshot.source.dataset ?? 'Bus.RealTimeByFrequency.City',
    city: snapshot.source.city ?? '',
    captureDate: snapshot.captureDate ?? manifestEntry?.captureDate ?? null,
    capturedAt: snapshot.capturedAt ?? manifestEntry?.capturedAt ?? null,
    timeLabel: manifestEntry?.timeLabel ?? formatTaipeiTime(snapshot.capturedAt),
    intervalMinutes: manifestEntry?.intervalMinutes ?? OPERATIONS_ARCHIVE_INTERVAL_MINUTES,
    count: snapshot.count ?? snapshot.records.length,
    bounds: snapshot.bounds ?? manifestEntry?.bounds ?? null,
    path: manifestEntry?.path ?? null,
    slotKey: manifestEntry?.slotKey ?? null,
  };
}

export function createOperationsFixture() {
  return createOperationsFromRows(cityBusA1RawFixture, fallbackOperationsDataSource);
}

export function createOperationsFromSnapshot(snapshot, manifestEntry = null) {
  const dataSource = createOperationsDataSource(snapshot, manifestEntry);
  return createOperationsFromRows(snapshot?.records ?? [], dataSource);
}

export function createOperationsFromRows(rows, dataSource = fallbackOperationsDataSource) {
  return rows.map((raw, index) => normalizeVehicleObservation(raw, index, dataSource));
}

export function normalizeVehicleObservation(raw, index = 0, dataSource = fallbackOperationsDataSource) {
  const ageSeconds = deriveAgeSeconds(raw);
  const freshness = raw.freshness ?? (ageSeconds > 60 ? 'stale' : 'fresh');
  const latitude = toFiniteNumber(raw.BusPosition?.PositionLat);
  const longitude = toFiniteNumber(raw.BusPosition?.PositionLon);

  return {
    id: raw.PlateNumb,
    ontologyType: 'VehicleObservation',
    objectType: 'BusVehicle',
    source: {
      provider: dataSource.provider ?? 'TDX',
      dataset: dataSource.dataset ?? 'CityBus A1',
      mode: raw.mode ?? dataSource.mode,
      displayName: raw.source ?? dataSource.label,
      capturedAt: dataSource.capturedAt,
    },
    route: {
      uid: raw.RouteUID,
      name: String(raw.RouteName ?? 'unknown'),
      direction: raw.Direction,
      directionLabel: raw.Direction === 0 ? 'Outbound' : 'Inbound',
    },
    position: {
      latitude,
      longitude,
      screenX: raw.x ?? `${40 + index * 3}%`,
      screenY: raw.y ?? `${50 + index * 2}%`,
    },
    motion: {
      speedKph: Number(raw.Speed ?? 0),
      azimuthDeg: Number(raw.Azimuth ?? 0),
    },
    timestamps: {
      gpsTime: raw.GPSTime,
      updateTime: raw.UpdateTime,
      captureTime: dataSource.capturedAt,
    },
    status: {
      freshness,
      ageSeconds,
      ageLabel: `${ageSeconds}s`,
      completeness: raw.completeness ?? null,
    },
    ui: {
      selected: false,
    },
    evidence: {
      level: raw.mode ?? dataSource.mode,
      sourceFields: SOURCE_FIELDS,
      derivedFields: DERIVED_FIELDS,
      missingConcepts: ['Citizen', 'SimulatedCrowd', 'DemandSignal', 'CrowdPressure', 'Incident'],
    },
    raw: toRawObservation(raw),
  };
}

export function toRawObservation(raw) {
  return {
    PlateNumb: raw.PlateNumb,
    RouteUID: raw.RouteUID,
    RouteName: raw.RouteName,
    Direction: raw.Direction,
    BusPosition: raw.BusPosition,
    Speed: raw.Speed,
    Azimuth: raw.Azimuth,
    GPSTime: raw.GPSTime,
    UpdateTime: raw.UpdateTime,
    source: raw.source,
    freshness: raw.freshness,
    completeness: raw.completeness,
    mode: raw.mode,
  };
}

export function listRouteOptions(observations) {
  return [...new Set(observations.map((observation) => observation.route.name))]
    .sort((left, right) => left.localeCompare(right, 'en', { numeric: true }));
}

export function filterOperationsObservations(observations, { routeName = 'all', hideStale = false } = {}) {
  return observations.filter((observation) => {
    const routeMatches = routeName === 'all' || observation.route.name === routeName;
    const staleHidden = hideStale && observation.status.freshness === 'stale';
    return routeMatches && !staleHidden;
  });
}

export function summarizeOperations(observations) {
  const active = observations.length;
  const stale = observations.filter((observation) => observation.status.freshness === 'stale').length;
  const minAge = observations.reduce((minimum, observation) => (
    Math.min(minimum, observation.status.ageSeconds)
  ), Number.POSITIVE_INFINITY);
  const completeness = observations.reduce((sum, observation) => (
    sum + (observation.status.completeness ?? 0)
  ), 0) / Math.max(1, observations.length);

  return {
    active,
    stale,
    fresh: active - stale,
    minAgeSeconds: Number.isFinite(minAge) ? minAge : 0,
    completeness,
  };
}

export function ageOperationsObservations(observations, seconds = 1) {
  return observations.map((observation) => {
    const ageSeconds = observation.status.ageSeconds + seconds;
    const freshness = ageSeconds > 90 ? 'stale' : 'fresh';

    return updateObservationStatus(observation, {
      ageSeconds,
      freshness,
    });
  });
}

export function advanceOperationsFixtureTick(observations, frame = 1, now = new Date()) {
  return observations.map((observation, index) => {
    const movement = movementForObservation(observation);
    const direction = frame % 4 === 0 ? -1 : 1;
    const routeOffset = ((index % 3) - 1) * 0.18;
    const nextX = clamp(percentNumber(observation.position.screenX) + (movement.dx + routeOffset) * direction, 8, 92);
    const nextY = clamp(percentNumber(observation.position.screenY) + (movement.dy - routeOffset) * direction, 14, 86);
    const ageSeconds = observation.id && LAGGED_SAMPLE_IDS.has(observation.id) ? 74 + (index % 4) * 8 : 4 + (index % 6) * 3;
    const isoNow = now.toISOString();
    const nextLatitude = Number((safeNumber(observation.position.latitude) + movement.lat * direction).toFixed(6));
    const nextLongitude = Number((safeNumber(observation.position.longitude) + movement.lon * direction).toFixed(6));
    const nextSpeed = clamp(observation.motion.speedKph + movement.speed * direction, 0, 80);
    const freshness = ageSeconds > 90 ? 'stale' : 'fresh';

    return {
      ...observation,
      position: {
        ...observation.position,
        latitude: nextLatitude,
        longitude: nextLongitude,
        screenX: `${nextX.toFixed(2)}%`,
        screenY: `${nextY.toFixed(2)}%`,
      },
      motion: {
        speedKph: nextSpeed,
        azimuthDeg: movement.azimuth,
      },
      timestamps: {
        ...observation.timestamps,
        gpsTime: isoNow,
        updateTime: isoNow,
      },
      status: {
        ...observation.status,
        freshness,
        ageSeconds,
        ageLabel: `${ageSeconds}s`,
      },
      raw: {
        ...observation.raw,
        BusPosition: {
          PositionLat: nextLatitude,
          PositionLon: nextLongitude,
        },
        Speed: nextSpeed,
        Azimuth: movement.azimuth,
        GPSTime: isoNow,
        UpdateTime: isoNow,
        freshness,
      },
    };
  });
}

export function advanceOperationsMotionFrame(observations, frame = 1, now = new Date()) {
  return observations.map((observation, index) => {
    const movement = movementForObservation(observation);
    const phase = frame % 12;
    const direction = phase < 6 ? 1 : -1;
    const routeOffset = ((index % 3) - 1) * 0.08;
    const motionFactor = 0.24;
    const nextLatitude = Number((safeNumber(observation.position.latitude) + movement.lat * direction * motionFactor).toFixed(6));
    const nextLongitude = Number((safeNumber(observation.position.longitude) + movement.lon * direction * motionFactor).toFixed(6));
    const nextSpeed = clamp(observation.motion.speedKph + movement.speed * direction * 0.2, 0, 80);
    const isoNow = now.toISOString();

    return {
      ...observation,
      position: {
        ...observation.position,
        latitude: nextLatitude,
        longitude: nextLongitude,
        screenX: `${clamp(percentNumber(observation.position.screenX) + (movement.dx + routeOffset) * direction * motionFactor, 8, 92).toFixed(2)}%`,
        screenY: `${clamp(percentNumber(observation.position.screenY) + (movement.dy - routeOffset) * direction * motionFactor, 14, 86).toFixed(2)}%`,
      },
      motion: {
        speedKph: Number(nextSpeed.toFixed(1)),
        azimuthDeg: movement.azimuth,
      },
      timestamps: {
        ...observation.timestamps,
        updateTime: isoNow,
      },
      raw: {
        ...observation.raw,
        BusPosition: {
          PositionLat: nextLatitude,
          PositionLon: nextLongitude,
        },
        Speed: Number(nextSpeed.toFixed(1)),
        Azimuth: movement.azimuth,
        UpdateTime: isoNow,
      },
    };
  });
}

function updateObservationStatus(observation, { ageSeconds, freshness }) {
  return {
    ...observation,
    status: {
      ...observation.status,
      ageSeconds,
      ageLabel: `${ageSeconds}s`,
      freshness,
    },
    raw: {
      ...observation.raw,
      freshness,
    },
  };
}

function movementForObservation(observation) {
  if (SAMPLE_MOVEMENT[observation.id]) return SAMPLE_MOVEMENT[observation.id];

  const speed = Number(observation.motion?.speedKph ?? 0);
  const azimuth = Number(observation.motion?.azimuthDeg ?? 0);
  const radians = azimuth * Math.PI / 180;
  const screenMagnitude = clamp(speed / 42, 0.08, 1.2);
  const geoMagnitude = clamp(speed / 36, 0.04, 1);

  return {
    dx: Math.sin(radians) * screenMagnitude,
    dy: -Math.cos(radians) * screenMagnitude,
    lat: Math.cos(radians) * 0.00008 * geoMagnitude,
    lon: Math.sin(radians) * 0.00008 * geoMagnitude,
    speed: speed > 0 ? 0 : 0.15,
    azimuth,
  };
}

function deriveAgeSeconds(raw) {
  const explicitAge = Number.parseInt(raw.age, 10);
  if (Number.isFinite(explicitAge)) return explicitAge;
  const timestamp = raw.UpdateTime ?? raw.GPSTime;
  const epoch = timestamp ? Date.parse(timestamp) : Number.NaN;
  if (!Number.isFinite(epoch)) return 0;
  return Math.max(0, Math.round((Date.now() - epoch) / 1000));
}

function formatTaipeiTime(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Taipei',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

function percentNumber(value) {
  return Number.parseFloat(String(value).replace('%', ''));
}

function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function safeNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
