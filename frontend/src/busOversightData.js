import {
  BUS_RELIABILITY_SEVERITIES,
  BUS_RELIABILITY_SIGNAL_TYPES,
  DEFAULT_EXPECTED_HEADWAY_MINUTES,
  normalizeHeadwaySignal,
  normalizeLowCapacitySignal,
} from './busReliabilitySignals.js';

export const OVERSIGHT_HOURS = Array.from({ length: 24 }, (_, hour) => hour);
export const OVERSIGHT_LOOKBACK_DAYS = 7;
export const RELIABILITY_WEIGHTS = {
  serviceGap: 0.7,
  bunching: 0.5,
  lowCapacity: 0.5,
};

const DATE_TIME_PATTERN = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})/;
const SEVERITY_SCORE = {
  critical: 3,
  warning: 2,
  watch: 1,
  normal: 0,
  ok: 0,
};

export function buildBusOversightModel({
  bunching = null,
  freshness = null,
  density = null,
  selectedRouteName = null,
  selectedSlotIndex = null,
} = {}) {
  const serviceDate = chooseServiceDate([bunching, freshness, density]);
  const slots = buildTimelineSlots(serviceDate);
  const events = [
    ...buildHeadwayEvents(bunching),
    ...buildLowCapacityEvents(density),
    ...buildFreshnessQualityEvents(freshness),
  ];
  const freshnessRows = normalizeRows(freshness);
  const dataDates = new Set(events.map((event) => event.date));
  if (serviceDate && freshnessRows.length > 0) dataDates.add(serviceDate);

  const timeline = slots.map((slot) => {
    const slotEvents = events.filter((event) => event.slotKey === slot.key);
    return {
      ...slot,
      hasData: dataDates.has(slot.date),
      severity: maxSeverity(slotEvents),
      events: slotEvents,
    };
  });

  const liveIndex = Math.max(0, timeline.findLastIndex((slot) => slot.hasData));
  const activeSlotIndex = clampSlotIndex(
    selectedSlotIndex === null || selectedSlotIndex === undefined ? liveIndex : selectedSlotIndex,
    timeline.length,
  );
  const activeSlot = timeline[activeSlotIndex] ?? timeline[0];
  const watchlist = buildWatchlist({ events, freshnessRows, date: activeSlot?.date });
  const selectedRoute = chooseSelectedRoute({ watchlist, selectedRouteName });
  const activeEvents = activeSlot
    ? activeSlot.events.filter((event) => event.routeName === selectedRoute?.routeName)
    : [];
  const kpis = buildKpis({ events, freshnessRows, date: activeSlot?.date, previousDate: previousDate(activeSlot?.date) });

  return {
    serviceDate,
    activeSlotIndex,
    liveIndex,
    activeSlot,
    timeline,
    events,
    watchlist,
    selectedRoute,
    activeEvents,
    kpis,
  };
}

export function buildHeadwayEvents(dataset) {
  return normalizeRows(dataset).map((row, index) => {
    const slot = parseSlot(row.slot_start);
    const observedHeadwayMinutes = finiteNumber(row.estimated_headway_minutes);
    const progressGapRatio = finiteNumber(row.progress_gap_ratio);
    const signal = normalizeHeadwaySignal({
      observedHeadwayMinutes,
      expectedHeadwayMinutes: DEFAULT_EXPECTED_HEADWAY_MINUTES,
      progressGapRatio,
    });
    const progressStart = clampProgress(Math.min(
      finiteNumber(row.trailing_progress) ?? 0,
      finiteNumber(row.leading_progress) ?? 1,
    ));
    const progressEnd = clampProgress(Math.max(
      finiteNumber(row.trailing_progress) ?? 0,
      finiteNumber(row.leading_progress) ?? 1,
    ));

    return {
      id: `headway-${slot.key}-${row.route_name}-${row.direction}-${index}`,
      sourceKind: 'headway',
      routeName: String(row.route_name ?? ''),
      direction: normalizeDirection(row.direction),
      date: slot.date,
      hour: slot.hour,
      slotKey: slot.key,
      type: signal.type,
      severity: signal.severity,
      labelKey: signal.labelKey,
      severityKey: signal.severityKey,
      progressStart,
      progressEnd,
      observedHeadwayMinutes,
      expectedHeadwayMinutes: DEFAULT_EXPECTED_HEADWAY_MINUTES,
      progressGapRatio,
      vehicles: [row.trailing_vehicle_id, row.leading_vehicle_id].filter(Boolean),
    };
  }).filter((event) => event.routeName && event.date);
}

export function buildLowCapacityEvents(dataset) {
  return normalizeRows(dataset).map((row, index) => {
    const slot = parseSlot(row.bucket_start);
    const signal = normalizeLowCapacitySignal({
      activeVehicles: row.active_vehicles,
      avgSpeedKph: row.avg_speed_kph,
      stoppedReports: row.stopped_reports,
    });
    if (signal.severity === BUS_RELIABILITY_SEVERITIES.NORMAL) return null;

    return {
      id: `capacity-${slot.key}-${row.route_name}-${row.direction}-${index}`,
      sourceKind: 'density',
      routeName: String(row.route_name ?? ''),
      direction: normalizeDirection(row.direction),
      date: slot.date,
      hour: slot.hour,
      slotKey: slot.key,
      type: BUS_RELIABILITY_SIGNAL_TYPES.LOW_CAPACITY,
      severity: signal.severity,
      labelKey: signal.labelKey,
      severityKey: signal.severityKey,
      progressStart: 0.52,
      progressEnd: 0.68,
      activeVehicles: finiteNumber(row.active_vehicles),
      avgSpeedKph: finiteNumber(row.avg_speed_kph),
      stoppedReports: finiteNumber(row.stopped_reports),
    };
  }).filter(Boolean).filter((event) => event.routeName && event.date);
}

export function buildFreshnessQualityEvents(dataset) {
  const serviceDate = dataset?.serviceDate;
  if (!serviceDate) return [];
  return normalizeRows(dataset).map((row, index) => {
    const offRouteRate = finiteNumber(row.off_route_rate) ?? 0;
    if (offRouteRate < 0.2) return null;
    const hour = 23;
    const severity = offRouteRate >= 0.35
      ? BUS_RELIABILITY_SEVERITIES.WARNING
      : BUS_RELIABILITY_SEVERITIES.WATCH;

    return {
      id: `freshness-${serviceDate}T${String(hour).padStart(2, '0')}-${row.route_name}-${row.direction}-${index}`,
      sourceKind: 'freshness',
      routeName: String(row.route_name ?? ''),
      direction: normalizeDirection(row.direction),
      date: serviceDate,
      hour,
      slotKey: slotKey(serviceDate, hour),
      type: BUS_RELIABILITY_SIGNAL_TYPES.LOW_CAPACITY,
      severity,
      labelKey: 'oversight.signal.low_capacity',
      severityKey: `oversight.severity.${severity}`,
      copyKey: 'oversight.signal.low_capacity.qualityCopy',
      progressStart: 0.74,
      progressEnd: 0.9,
      reports: finiteNumber(row.reports),
      vehicles: finiteNumber(row.vehicles),
      offRouteRate,
    };
  }).filter(Boolean).filter((event) => event.routeName && event.date);
}

export function buildTimelineSlots(serviceDate, {
  lookbackDays = OVERSIGHT_LOOKBACK_DAYS,
  hours = OVERSIGHT_HOURS,
} = {}) {
  if (!serviceDate) return [];
  const dates = Array.from({ length: lookbackDays }, (_, index) => addDays(serviceDate, index - lookbackDays + 1));
  return dates.flatMap((date) => hours.map((hour) => ({
    date,
    hour,
    key: slotKey(date, hour),
    label: `${date} ${String(hour).padStart(2, '0')}:00`,
    weekday: weekdayIndex(date),
  })));
}

export function buildKpis({ events = [], freshnessRows = [], date, previousDate: prevDate } = {}) {
  const current = kpiSnapshot(events, freshnessRows, date);
  const previous = kpiSnapshot(events, freshnessRows, prevDate);
  const hasData = current.hasData;

  return {
    reliability: hasData ? reliabilityScore(current) : null,
    routes: current.routes,
    serviceGaps: current.serviceGaps,
    bunching: current.bunching,
    lowCapacity: current.lowCapacity,
    deltas: {
      reliability: delta(current.hasData ? reliabilityScore(current) : null, previous.hasData ? reliabilityScore(previous) : null),
      routes: delta(current.routes, previous.routes),
      serviceGaps: delta(current.serviceGaps, previous.serviceGaps),
      bunching: delta(current.bunching, previous.bunching),
      lowCapacity: delta(current.lowCapacity, previous.lowCapacity),
    },
    hasData,
  };
}

export function buildWatchlist({ events = [], freshnessRows = [], date } = {}) {
  if (!date) return [];
  const byRoute = new Map();
  events.filter((event) => event.date === date).forEach((event) => {
    const current = byRoute.get(event.routeName) ?? {
      routeName: event.routeName,
      direction: event.direction,
      severity: BUS_RELIABILITY_SEVERITIES.NORMAL,
      counts: {
        [BUS_RELIABILITY_SIGNAL_TYPES.SERVICE_GAP]: 0,
        [BUS_RELIABILITY_SIGNAL_TYPES.BUNCHING]: 0,
        [BUS_RELIABILITY_SIGNAL_TYPES.LOW_CAPACITY]: 0,
      },
      metric: '',
      events: [],
    };
    current.events.push(event);
    current.counts[event.type] = (current.counts[event.type] ?? 0) + 1;
    if (severityScore(event.severity) > severityScore(current.severity)) {
      current.severity = event.severity;
      current.direction = event.direction;
      current.metric = eventMetric(event);
    }
    byRoute.set(event.routeName, current);
  });

  freshnessRows.forEach((row) => {
    const routeName = String(row.route_name ?? '');
    if (!routeName || byRoute.has(routeName)) return;
    const offRouteRate = finiteNumber(row.off_route_rate) ?? 0;
    if (offRouteRate < 0.2) return;
    byRoute.set(routeName, {
      routeName,
      direction: normalizeDirection(row.direction),
      severity: BUS_RELIABILITY_SEVERITIES.WATCH,
      counts: {
        [BUS_RELIABILITY_SIGNAL_TYPES.SERVICE_GAP]: 0,
        [BUS_RELIABILITY_SIGNAL_TYPES.BUNCHING]: 0,
        [BUS_RELIABILITY_SIGNAL_TYPES.LOW_CAPACITY]: 1,
      },
      metric: `${Math.round(offRouteRate * 100)}%`,
      events: [],
    });
  });

  return Array.from(byRoute.values()).sort((a, b) => (
    severityScore(b.severity) - severityScore(a.severity)
    || totalSignals(b.counts) - totalSignals(a.counts)
    || a.routeName.localeCompare(b.routeName, 'zh-Hant')
  ));
}

export function buildRouteSchematic(routeContext, {
  routeName = '',
  direction = null,
  events = [],
  locale = 'zh-TW',
  width = 940,
  height = 600,
  padding = 70,
} = {}) {
  const stopOfRoute = selectStopOfRoute(routeContext, direction) ?? routeContext?.stopOfRoutes?.[0];
  const stops = Array.isArray(stopOfRoute?.Stops) ? stopOfRoute.Stops : [];
  const rawPoints = stops.map((stop, index) => ({
    index,
    name: localizedName(stop.StopName, locale),
    lon: finiteNumber(stop.StopPosition?.PositionLon),
    lat: finiteNumber(stop.StopPosition?.PositionLat),
  })).filter((point) => point.lon !== null && point.lat !== null);

  if (rawPoints.length === 0) {
    return {
      routeName: routeName || routeContext?.routeName || '',
      direction: normalizeDirection(stopOfRoute?.Direction),
      origin: '',
      destination: '',
      points: [],
      segments: [],
      problemSegments: [],
      pins: [],
      vehicles: [],
    };
  }

  const projected = projectPoints(rawPoints, { width, height, padding });
  const segments = projected.slice(0, -1).map((point, index) => ({
    index,
    from: point,
    to: projected[index + 1],
  }));
  const problemSegments = events.flatMap((event, problemIndex) => {
    const start = progressToSegment(event.progressStart, segments.length);
    const end = progressToSegment(event.progressEnd, segments.length);
    return Array.from({ length: Math.max(1, end - start + 1) }, (_, offset) => ({
      eventId: event.id,
      problemIndex,
      segmentIndex: Math.min(segments.length - 1, start + offset),
      severity: event.severity,
      type: event.type,
    }));
  });
  const pins = events.map((event, index) => {
    const segment = segments[progressToSegment((event.progressStart + event.progressEnd) / 2, segments.length)] ?? segments[0];
    const middle = segmentMidpoint(segment);
    return {
      eventId: event.id,
      index,
      severity: event.severity,
      x: Math.min(width - 28, middle.x + 30),
      y: Math.max(28, middle.y - 24),
      anchorX: middle.x,
      anchorY: middle.y,
    };
  });
  const vehicles = events.flatMap((event) => vehicleMarkersForEvent(event, segments));

  return {
    routeName: routeName || routeContext?.routeName || '',
    direction: normalizeDirection(stopOfRoute?.Direction),
    origin: projected[0]?.name ?? '',
    destination: projected.at(-1)?.name ?? '',
    points: projected,
    segments,
    problemSegments,
    pins,
    vehicles,
  };
}

export function eventMetric(event) {
  if (!event) return '';
  if (event.type === BUS_RELIABILITY_SIGNAL_TYPES.SERVICE_GAP) {
    return `${formatNumber(event.observedHeadwayMinutes, 1)} min`;
  }
  if (event.type === BUS_RELIABILITY_SIGNAL_TYPES.BUNCHING) {
    return `${formatNumber(event.progressGapRatio, 2)}`;
  }
  if (event.type === BUS_RELIABILITY_SIGNAL_TYPES.LOW_CAPACITY) {
    if (event.sourceKind === 'freshness') return `${Math.round((event.offRouteRate ?? 0) * 100)}%`;
    return `${formatNumber(event.activeVehicles, 0)} vehicles`;
  }
  return '';
}

function kpiSnapshot(events, freshnessRows, date) {
  const dayEvents = events.filter((event) => event.date === date);
  const dayRoutes = new Set([
    ...dayEvents.map((event) => event.routeName),
    ...freshnessRows.map((row) => String(row.route_name ?? '')).filter(Boolean),
  ]);
  return {
    hasData: Boolean(date) && (dayEvents.length > 0 || freshnessRows.length > 0),
    routes: dayRoutes.size,
    serviceGaps: dayEvents.filter((event) => event.type === BUS_RELIABILITY_SIGNAL_TYPES.SERVICE_GAP).length,
    bunching: dayEvents.filter((event) => event.type === BUS_RELIABILITY_SIGNAL_TYPES.BUNCHING).length,
    lowCapacity: dayEvents.filter((event) => event.type === BUS_RELIABILITY_SIGNAL_TYPES.LOW_CAPACITY).length,
  };
}

function reliabilityScore(snapshot) {
  return Math.max(60, Math.min(100, Math.round(
    100
    - snapshot.serviceGaps * RELIABILITY_WEIGHTS.serviceGap
    - snapshot.bunching * RELIABILITY_WEIGHTS.bunching
    - snapshot.lowCapacity * RELIABILITY_WEIGHTS.lowCapacity,
  )));
}

function chooseSelectedRoute({ watchlist, selectedRouteName }) {
  if (selectedRouteName) {
    const selected = watchlist.find((route) => route.routeName === selectedRouteName);
    if (selected) return selected;
  }
  return watchlist[0] ?? null;
}

function chooseServiceDate(datasets) {
  return datasets.map((dataset) => dataset?.serviceDate).filter(Boolean).sort().at(-1) ?? null;
}

function parseSlot(value) {
  const match = String(value ?? '').match(DATE_TIME_PATTERN);
  if (!match) return { date: '', hour: 0, key: '' };
  const hour = Number(match[2]);
  return { date: match[1], hour, key: slotKey(match[1], hour) };
}

function slotKey(date, hour) {
  return `${date}T${String(hour).padStart(2, '0')}`;
}

function previousDate(date) {
  return date ? addDays(date, -1) : null;
}

function addDays(date, offset) {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + offset);
  return parsed.toISOString().slice(0, 10);
}

function weekdayIndex(date) {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

function normalizeRows(dataset) {
  return Array.isArray(dataset?.rows) ? dataset.rows : [];
}

function normalizeDirection(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clampProgress(value) {
  const number = finiteNumber(value);
  if (number === null) return 0;
  return Math.max(0, Math.min(1, number));
}

function clampSlotIndex(index, length) {
  if (length <= 0) return 0;
  const number = Number(index);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(length - 1, Math.round(number)));
}

function maxSeverity(events) {
  return events.reduce((severity, event) => (
    severityScore(event.severity) > severityScore(severity) ? event.severity : severity
  ), BUS_RELIABILITY_SEVERITIES.NORMAL);
}

function severityScore(severity) {
  return SEVERITY_SCORE[severity] ?? 0;
}

function totalSignals(counts) {
  return Object.values(counts ?? {}).reduce((sum, count) => sum + Number(count || 0), 0);
}

function delta(current, previous) {
  if (current === null || current === undefined || previous === null || previous === undefined) return null;
  return current - previous;
}

function selectStopOfRoute(routeContext, direction) {
  const rows = Array.isArray(routeContext?.stopOfRoutes) ? routeContext.stopOfRoutes : [];
  if (direction === null || direction === undefined) return rows[0] ?? null;
  return rows.find((row) => Number(row.Direction) === Number(direction)) ?? rows[0] ?? null;
}

function localizedName(name, locale) {
  if (!name) return '';
  if (locale === 'en') return name.En || name.Zh_tw || '';
  return name.Zh_tw || name.En || '';
}

function projectPoints(points, { width, height, padding }) {
  const minLon = Math.min(...points.map((point) => point.lon));
  const maxLon = Math.max(...points.map((point) => point.lon));
  const minLat = Math.min(...points.map((point) => point.lat));
  const maxLat = Math.max(...points.map((point) => point.lat));
  const lonRange = maxLon - minLon || 1;
  const latRange = maxLat - minLat || 1;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  return points.map((point, index) => ({
    ...point,
    progress: points.length <= 1 ? 0 : index / (points.length - 1),
    x: padding + ((point.lon - minLon) / lonRange) * usableWidth,
    y: padding + ((maxLat - point.lat) / latRange) * usableHeight,
  }));
}

function progressToSegment(progress, segmentCount) {
  if (segmentCount <= 0) return 0;
  return Math.max(0, Math.min(segmentCount - 1, Math.floor(clampProgress(progress) * segmentCount)));
}

function segmentMidpoint(segment) {
  return {
    x: (segment.from.x + segment.to.x) / 2,
    y: (segment.from.y + segment.to.y) / 2,
  };
}

function vehicleMarkersForEvent(event, segments) {
  if (segments.length === 0) return [];
  if (event.type === BUS_RELIABILITY_SIGNAL_TYPES.BUNCHING) {
    const middle = segmentMidpoint(segments[progressToSegment(event.progressStart, segments.length)]);
    return [
      { eventId: event.id, className: 'bunch', x: middle.x - 10, y: middle.y + 7 },
      { eventId: event.id, className: 'bunch', x: middle.x + 9, y: middle.y - 7 },
    ];
  }
  if (event.type === BUS_RELIABILITY_SIGNAL_TYPES.SERVICE_GAP) {
    const start = segmentMidpoint(segments[progressToSegment(event.progressStart, segments.length)]);
    const end = segmentMidpoint(segments[progressToSegment(event.progressEnd, segments.length)]);
    return [
      { eventId: event.id, className: 'normal', x: start.x, y: start.y },
      { eventId: event.id, className: 'normal', x: end.x, y: end.y },
    ];
  }
  const middle = segmentMidpoint(segments[progressToSegment((event.progressStart + event.progressEnd) / 2, segments.length)]);
  return [{ eventId: event.id, className: 'capacity', x: middle.x, y: middle.y }];
}

function formatNumber(value, digits) {
  const number = finiteNumber(value);
  return number === null ? '0' : number.toFixed(digits).replace(/\.0$/, '');
}
