<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import BusDeckMap from './BusDeckMap.vue';
import {
  buildRouteServiceSummary,
  detectHeadwayGapSignals,
} from './busHeadwaySignals.js';
import {
  headwaySeverity,
  headwaySeverityRank,
} from './busReliabilitySignals.js';
import { buildRouteProgressObservation } from './busRouteGeometry.js';
import {
  formatRouteOperatorNames,
  routeOperatorsFromContext,
} from './busRouteOperators.js';
import { SUPPORTED_LOCALES, locale, setLocale, t } from './i18n.js';
import { OPERATIONS_LAYER_IDS, getOperationsLayer, operationsLayerRegistry } from './layerRegistry.js';
import {
  OPERATIONS_ARCHIVE_MANIFEST_URL,
  BUS_VEHICLE_PROJECTION_TIMELINE_URL,
  BUS_VEHICLE_PROJECTION_URL,
  OPERATIONS_BASELINE_ARCHIVE_MANIFEST_URL,
  OPERATIONS_ARCHIVE_INTERVAL_MINUTES,
  OPERATIONS_POLL_INTERVAL_SECONDS,
  OPERATIONS_ROUTE_CONTEXT_MANIFEST_URL,
  OPERATIONS_ROUTE_QUALITY_MANIFEST_URL,
  advanceOperationsFixtureTick,
  advanceOperationsMotionFrame,
  ageOperationsObservations,
  createRouteQualityIndex,
  createOperationsDataSource,
  createOperationsDataSourceFromProjection,
  createOperationsFromArchivePayload,
  createOperationsFixture,
  fallbackOperationsDataSource,
  filterOperationsObservations,
  getObservationRouteQuality,
  isRouteGeometrySignalReady,
  listRouteOptions,
  summarizeOperations,
} from './operationsWorkflowData.js';

const PLAYBACK_SPEED_OPTIONS = [1, 1.5, 2, 4];
const LIVE_FOLLOW_POLL_MS = 60_000;
const ANALYTICS_API_BASE_URL = (
  import.meta.env.VITE_TWFOUNDRY_ANALYTICS_API_URL ?? ''
).replace(/\/+$/, '');
const ANALYTICS_STATIC_BASE_URL = '/data/analytics';
const ANALYTICS_SERVICE_DATE = import.meta.env.VITE_TWFOUNDRY_ANALYTICS_SERVICE_DATE ?? '';
const ANALYTICS_ROW_LIMIT = 5;
const USE_PROJECTION_API = import.meta.env.VITE_TWFOUNDRY_USE_PROJECTION_API === '1';

const observations = ref(createOperationsFixture());
const ghostObservations = ref([]);
const routeStopLocations = ref([]);
const routeProgressObservation = ref(null);
const routeProgressEncodingMap = ref(new Map());
const selectedObservationId = ref('');
const selectedTransitSignalId = ref('');
const activeLayerId = ref(OPERATIONS_LAYER_IDS.BUS_VEHICLES);
const activeDataSource = ref(fallbackOperationsDataSource);
const activeSnapshot = ref(null);
const activeSnapshotIndex = ref(0);
const timelineScrubIndex = ref(null);
const playbackCursorIndex = ref(0);
const timelineSnapshots = ref([]);
const baselineSnapshots = ref([]);
const routeContextManifest = ref(null);
const routeQualityManifest = ref(null);
const routeOperatorIndex = ref(new Map());
const baselineArchiveError = ref('');
const routeQualityError = ref('');
const routeProgressError = ref('');
const trackVehicleMode = ref(false);
const trackedVehicleId = ref('');
const lastTrackedObservation = ref(null);
const ghostMode = ref(false);
const routeProgressEncoding = ref(false);
const routeFilter = ref('all');
const hideStale = ref(false);
const layerVisible = ref(true);
const pointSize = ref(0.86);
const pointOpacity = ref(0.74);
const healthDrawerOpen = ref(false);
const pulseLayer = ref(false);
const movingLayer = ref(true);
const countdown = ref(OPERATIONS_POLL_INTERVAL_SECONDS);
const elapsed = ref(0);
const cycle = ref(1);
const sampleFrame = ref(0);
const lastTickLabel = ref('--:--');
const archiveLoading = ref(false);
const archiveError = ref('');
const playbackRunning = ref(false);
const followLiveEnabled = ref(false);
const playbackSpeed = ref(2);
const mapRendererStatus = ref('initializing renderer');
const tooltip = ref({ visible: false, x: 0, y: 0, observation: null, routeStop: null });
const timelineHover = ref({ visible: false, left: 0, label: '', index: 0 });
const mapRef = ref(null);
const mapState = ref({ zoom: 11, pitch: 34, bearing: -8, center: [121.56, 25.05] });
const mapFitKey = ref('initial');
const pollStatusKey = ref('status.loadingArchive');
const pollStatusParams = ref({});
const analyticsLoading = ref(false);
const analyticsError = ref('');
const analyticsLoadedAt = ref(null);
const analyticsData = ref({
  dataFreshness: [],
  bunching: [],
  serviceDate: '',
});

let intervalId = 0;
let liveFollowTimerId = 0;
let pulseTimeoutId = 0;
let playbackFrameId = 0;
let playbackLastFrameMs = 0;
let playbackPendingIndex = -1;
let timelineCommitPendingIndex = -1;
let initialArchiveFitApplied = false;
let ghostRequestId = 0;
let routeStopRequestId = 0;
let routeProgressRequestId = 0;
let routeProgressEncodingRequestId = 0;
const ghostSnapshotCache = new Map();
const routeContextCache = new Map();
const routeQualityRetryRoutes = new Set();
const routeOperatorPendingRoutes = new Set();

const operationsDataSource = computed(() => activeDataSource.value);
const routeQualityIndex = computed(() => createRouteQualityIndex(routeQualityManifest.value));
const observedRouteOptions = computed(() => listRouteOptions(observations.value));
const routeOptions = computed(() => {
  const routes = new Set(observedRouteOptions.value);
  for (const row of routeContextManifest.value?.routes ?? []) {
    if (row.routeName) routes.add(String(row.routeName));
  }
  for (const row of routeQualityManifest.value?.routes ?? []) {
    if (row.routeName) routes.add(String(row.routeName));
  }
  for (const row of analyticsData.value.bunching) {
    if (row.route_name) routes.add(String(row.route_name));
  }
  for (const row of analyticsData.value.dataFreshness) {
    if (row.route_name) routes.add(String(row.route_name));
  }
  return [...routes].sort((left, right) => left.localeCompare(right, 'zh-Hant-u-kn-true'));
});
const routeQualitySummary = computed(() => {
  const summary = routeQualityManifest.value?.summary;
  if (!summary) return null;
  return {
    total: Number(summary.routeDirectionCount ?? 0),
    good: Number(summary.good ?? 0),
    usable: Number(summary.usable ?? 0),
    bad: Number(summary.bad ?? 0),
  };
});
const selectedRouteQualityRows = computed(() => (
  routeFilter.value === 'all'
    ? []
    : routeQualityIndex.value.byRouteName.get(routeFilter.value) ?? []
));
const selectedRouteContextRows = computed(() => (
  routeFilter.value === 'all'
    ? []
    : (routeContextManifest.value?.routes ?? []).filter((route) => route.routeName === routeFilter.value)
));
const selectedRouteGeometryReady = computed(() => (
  routeFilter.value !== 'all'
  && selectedRouteQualityRows.value.some((routeQuality) => isRouteGeometrySignalReady(routeQuality))
));
const selectedRouteQualityLabel = computed(() => {
  if (routeFilter.value === 'all') {
    if (!routeQualitySummary.value) return routeQualityError.value ? t('routeQuality.unavailable') : t('routeQuality.loading');
    return t('routeQuality.summary', {
      ready: routeQualitySummary.value.good + routeQualitySummary.value.usable,
      total: routeQualitySummary.value.total,
    });
  }
  if (selectedRouteQualityRows.value.length === 0) return t('routeQuality.notAudited');
  const readyRows = selectedRouteQualityRows.value.filter((routeQuality) => isRouteGeometrySignalReady(routeQuality));
  if (readyRows.length === 0) return t('routeQuality.blocked');
  const p95 = Math.max(...readyRows.map((routeQuality) => Number(routeQuality.p95DistanceToRouteMeters ?? 0)));
  return t('routeQuality.ready', { count: readyRows.length, p95: Math.round(p95) });
});
const routeProgressEncodingEnabled = computed(() => (
  routeProgressEncoding.value
  && routeFilter.value !== 'all'
  && selectedRouteGeometryReady.value
));
const visibleObservations = computed(() => filterOperationsObservations(observations.value, {
  routeName: routeFilter.value,
  hideStale: hideStale.value,
}));
const carriedTrackedObservation = computed(() => {
  if (!trackVehicleMode.value || !trackedVehicleId.value || !lastTrackedObservation.value) return null;
  if (visibleObservations.value.some((observation) => observation.id === trackedVehicleId.value)) return null;
  return carryForwardObservation(lastTrackedObservation.value);
});
const mapObservations = computed(() => (
  carriedTrackedObservation.value
    ? [...visibleObservations.value, carriedTrackedObservation.value]
    : visibleObservations.value
));
const selectedObservation = computed(() => (
  mapObservations.value.find((observation) => observation.id === selectedObservationId.value) ?? null
));
const selectedObservationRouteQuality = computed(() => (
  getObservationRouteQuality(selectedObservation.value, routeQualityIndex.value)
));
const selectedObservationGeometryReady = computed(() => (
  isRouteGeometrySignalReady(selectedObservationRouteQuality.value)
));
const routeFocusActive = computed(() => Boolean(ghostMode.value && selectedObservation.value && ghostObservations.value.length > 0));
const routeStopLabel = computed(() => (
  routeFilter.value !== 'all' && routeStopLocations.value.length > 0
    ? t('routeStops.summary', {
      route: routeFilter.value,
      count: routeStopLocations.value.length,
    })
    : routeFilter.value !== 'all' && routeContextManifest.value && selectedRouteContextRows.value.length === 0
      ? t('routeStops.missingContext')
    : ''
));
const displayMapObservations = computed(() => {
  const selected = selectedObservation.value;
  const baseObservations = !routeFocusActive.value || !selected
    ? mapObservations.value
    : mapObservations.value.filter((observation) => (
      observation.id === selected.id
      || (
        observation.route.uid === selected.route.uid
        && observation.route.direction === selected.route.direction
      )
    ));
  if (!routeProgressEncodingEnabled.value || routeProgressEncodingMap.value.size === 0) return baseObservations;
  return baseObservations.map((observation) => ({
    ...observation,
    routeProgress: routeProgressEncodingMap.value.get(observation.id) ?? null,
  }));
});
const transitSignalEntries = computed(() => (
  routeFilter.value === 'all'
    ? []
    : visibleObservations.value
      .map((observation) => {
        const routeProgress = routeProgressEncodingMap.value.get(observation.id);
        const routeQuality = getObservationRouteQuality(observation, routeQualityIndex.value);
        return routeProgress
          ? { observation, routeProgress, geometryQuality: routeQuality?.quality ?? null }
          : null;
      })
      .filter(Boolean)
));
const transitSignals = computed(() => detectHeadwayGapSignals(transitSignalEntries.value));
const routeServiceSummary = computed(() => buildRouteServiceSummary(transitSignalEntries.value).primaryRoute);
const routeServiceSignalRows = computed(() => routeServiceSummary.value?.signals ?? []);
const routeServiceHeadwayRows = computed(() => routeServiceSummary.value?.headways ?? []);
const routeServiceStatusLabel = computed(() => {
  if (routeFilter.value === 'all') return t('routeService.selectRoute');
  if (!selectedRouteGeometryReady.value) return t('routeService.geometryPending');
  if (routeServiceSummary.value && routeServiceSummary.value.sampleCount >= 2) return t('routeService.ready');
  return t('routeService.insufficientVehicles');
});
const primaryTransitSignal = computed(() => transitSignals.value[0] ?? null);
const selectedTransitSignal = computed(() => (
  transitSignals.value.find((signal) => signal.id === selectedTransitSignalId.value) ?? null
));
const transitSignalSummaryLabel = computed(() => {
  const signal = primaryTransitSignal.value;
  if (!signal) return '';
  return t('signal.alertSummary', {
    route: signal.routeName,
    observed: Math.round(signal.observedHeadwayMinutes),
    expected: Math.round(signal.expectedHeadwayMinutes),
  });
});
const visibleSummary = computed(() => summarizeOperations(visibleObservations.value));
const rootStyle = computed(() => ({
  '--point-scale': pointSize.value,
  '--point-opacity': pointOpacity.value,
  '--poll-progress': `${Math.min(100, Math.max(0, (elapsed.value / OPERATIONS_POLL_INTERVAL_SECONDS) * 100))}%`,
  '--timeline-progress': `${timelineProgressPercent.value}%`,
  '--timeline-coverage': `${timelineCoveragePercent.value}%`,
}));
const timelineProgressPercent = computed(() => {
  if (timelineSnapshots.value.length <= 1) return timelineSnapshots.value.length === 1 ? 100 : 0;
  const displayIndex = timelineScrubIndex.value ?? playbackCursorIndex.value;
  return Math.min(100, Math.max(0, (displayIndex / (timelineSnapshots.value.length - 1)) * 100));
});
const zoomLabel = computed(() => `${mapState.value.zoom.toFixed(1)}z`);
const sourceModeLabel = computed(() => formatSourceMode(operationsDataSource.value.mode));
const nextTickLabel = computed(() => {
  if (timelineSnapshots.value.length > 1) return playbackRunning.value ? `${playbackSpeed.value}x` : t('status.paused');
  return playbackRunning.value ? `${Math.ceil(countdown.value)}s` : t('status.paused');
});
const mapStatusLabel = computed(() => (
  mapRendererStatus.value.toLowerCase().includes('ready') ? t('map.ready') : t('map.loading')
));
const activeLayer = computed(() => getOperationsLayer(activeLayerId.value));
// Show the active layer plus the planned ones (rendered disabled as "coming soon"), active first.
const layerOptions = computed(() => operationsLayerRegistry
  .filter((layer) => layer.status === 'active' || layer.status === 'planned')
  .sort((left, right) => (left.status === 'active' ? -1 : 1) - (right.status === 'active' ? -1 : 1)));
const activeLayerFilterLabel = computed(() => t(activeLayer.value.primaryFilter.labelKey));
const timelineMax = computed(() => Math.max(0, timelineSnapshots.value.length - 1));
const timelineDisabled = computed(() => timelineSnapshots.value.length <= 1);
const timelineSliderValue = computed(() => timelineScrubIndex.value ?? activeSnapshotIndex.value);
const canStepBackward = computed(() => timelineSnapshots.value.length > 1 && activeSnapshotIndex.value > 0);
const canStepForward = computed(() => timelineSnapshots.value.length > 1 && activeSnapshotIndex.value < timelineSnapshots.value.length - 1);
const timelineStartLabel = computed(() => formatSnapshotCompactDateTime(timelineSnapshots.value[0]) || '00:00');
const timelineEndLabel = computed(() => formatSnapshotCompactDateTime(timelineSnapshots.value.at(-1)) || '23:55');
const activeSnapshotLabel = computed(() => formatDataSourceDateTime(operationsDataSource.value) || '--:--');
const activeSnapshotTimeZoneLabel = computed(() => (operationsDataSource.value.capturedAt ? 'TPE UTC+8' : ''));
const timelineStatusDetail = computed(() => (
  [activeSnapshotTimeZoneLabel.value, timelineCoverageLabel.value].filter(Boolean).join(' · ')
));
const isLiveSnapshot = computed(() => (
  operationsDataSource.value.mode === 'tdx-live-cron'
  && activeSnapshotIndex.value === timelineSnapshots.value.length - 1
));
const elapsedLabel = computed(() => formatDuration(elapsed.value));
const pollIntervalLabel = computed(() => formatDuration(OPERATIONS_POLL_INTERVAL_SECONDS));
const timelineCapturedMinutes = computed(() => timelineSnapshots.value.length * OPERATIONS_ARCHIVE_INTERVAL_MINUTES);
const timelineCoveragePercent = computed(() => {
  if (timelineSnapshots.value.length === 0) return 0;
  return 100;
});
const timelineCoverageLabel = computed(() => (
  `${t('timeline.samples', { count: timelineSnapshots.value.length })} · ${formatHourDuration(timelineCapturedMinutes.value)}`
));
const archiveRangeLabel = computed(() => {
  if (timelineSnapshots.value.length === 0) return t('timeline.noArchive');
  return `${timelineStartLabel.value}-${timelineEndLabel.value}`;
});
const playbackToggleLabel = computed(() => (playbackRunning.value ? t('timeline.pause') : t('timeline.play')));
const followLiveLabel = computed(() => {
  if (archiveLoading.value) return t('timeline.syncing');
  return followLiveEnabled.value ? t('timeline.followLiveOn') : t('timeline.followLive');
});
const liveStateLabel = computed(() => {
  if (followLiveEnabled.value) return t('timeline.followingLive');
  if (isLiveSnapshot.value) return t('timeline.live');
  return t('timeline.archive');
});
const trackingActiveForSelected = computed(() => (
  trackVehicleMode.value && trackedVehicleId.value === selectedObservation.value?.id
));
const trackToggleLabel = computed(() => (
  trackingActiveForSelected.value ? t('inspector.stopTrack') : t('inspector.track')
));
const ghostToggleLabel = computed(() => (
  ghostMode.value ? t('ghost.hide') : t('ghost.show')
));
const ghostBaselineLabel = computed(() => {
  if (!ghostMode.value || !selectedObservation.value || ghostObservations.value.length === 0) return '';
  return t('ghost.baseline', {
    route: selectedObservation.value.route.name,
    count: ghostObservations.value.length,
    days: baselineDayCount.value,
  });
});
const baselineDayCount = computed(() => (
  new Set(baselineSnapshots.value.map((snapshot) => snapshot.captureDate).filter(Boolean)).size
));
const selectedDirectionLabel = computed(() => (
  selectedObservation.value?.route?.direction === 0 ? t('direction.outbound') : t('direction.inbound')
));
const routeProgressPercentLabel = computed(() => (
  Number.isFinite(routeProgressObservation.value?.progressRatio)
    ? `${Math.round(routeProgressObservation.value.progressRatio * 100)}%`
    : '--'
));
const routeProgressDistanceLabel = computed(() => (
  Number.isFinite(routeProgressObservation.value?.distanceToRouteMeters)
    ? `${Math.round(routeProgressObservation.value.distanceToRouteMeters)} m`
    : '--'
));
const routeProgressStopLabel = computed(() => (
  routeProgressObservation.value?.nearestStop?.name ?? routeProgressStatusLabel.value
));
const routeProgressNextStopLabel = computed(() => (
  routeProgressObservation.value?.betweenStops?.next?.name ?? '--'
));
const routeProgressStatusLabel = computed(() => {
  if (!selectedObservation.value) return '--';
  if (routeProgressError.value) return t('routeProgress.unavailable');
  if (!selectedObservationRouteQuality.value) return t('routeProgress.notAudited');
  if (!selectedObservationGeometryReady.value) return t('routeProgress.blocked');
  if (!routeProgressObservation.value) return t('routeProgress.loading');
  return t('routeProgress.ready');
});
const selectedFreshnessLabel = computed(() => formatFreshness(selectedObservation.value?.status?.freshness));
const pollStatusLabel = computed(() => t(pollStatusKey.value, pollStatusParams.value));
const healthSources = computed(() => [
  {
    id: 'tdx-bus',
    name: t('healthSource.bus'),
    type: t('healthSource.vehiclePositions'),
    status: archiveError.value ? 'error' : (visibleSummary.value.active > 0 ? 'ok' : 'empty'),
    mode: sourceModeLabel.value,
    cadence: `${OPERATIONS_ARCHIVE_INTERVAL_MINUTES} min`,
    coverage: t('healthSource.busCoverage', {
      visible: visibleSummary.value.active,
      sampled: operationsDataSource.value.count,
    }),
    updated: activeSnapshotLabel.value,
  },
  {
    id: 'route-geometry',
    name: t('healthSource.routeGeometry'),
    type: t('healthSource.qualityGate'),
    status: routeQualityError.value ? 'error' : (routeQualityManifest.value ? 'ok' : 'syncing'),
    mode: t('healthSource.routeAudit'),
    cadence: t('healthSource.buildTime'),
    coverage: routeQualitySummary.value
      ? t('routeQuality.summary', {
        ready: routeQualitySummary.value.good + routeQualitySummary.value.usable,
        total: routeQualitySummary.value.total,
      })
      : '--',
    updated: routeQualityManifest.value?.generatedAt
      ? formatTaipeiTime(routeQualityManifest.value.generatedAt, true)
      : '--',
  },
  {
    id: 'basemap',
    name: t('healthSource.basemap'),
    type: t('healthSource.mapContext'),
    status: mapRendererStatus.value.toLowerCase().includes('ready') ? 'ok' : 'syncing',
    mode: 'MapLibre',
    cadence: t('healthSource.providerManaged'),
    coverage: mapStatusLabel.value,
    updated: zoomLabel.value,
  },
  {
    id: 'youbike',
    name: t('healthSource.youbike'),
    type: t('healthSource.availability'),
    status: 'planned',
    mode: t('healthStatus.planned'),
    cadence: '--',
    coverage: '--',
    updated: '--',
  },
]);
const activeHealthSourceCount = computed(() => (
  healthSources.value.filter((source) => source.status === 'ok' || source.status === 'syncing').length
));
const vehicleTelemetrySummary = computed(() => [
  t('filters.route', { route: selectedObservation.value?.route?.name ?? '--' }),
  `${selectedObservation.value?.motion?.speedKph ?? 0} km/h`,
  selectedFreshnessLabel.value,
].join(' · '));
const routeHealthWatchlist = computed(() => {
  const items = [];

  for (const row of analyticsData.value.bunching) {
    const route = String(row.route_name ?? '');
    if (!route) continue;
    const minutes = Number(row.estimated_headway_minutes);
    const severity = headwaySeverity(minutes);
    items.push({
      id: `gap-${route}-${row.direction}-${row.slot_start}-${row.trailing_vehicle_id}-${row.leading_vehicle_id}`,
      route,
      direction: row.direction,
      severity,
      type: 'service-gap',
      sortRank: headwaySeverityRank(severity),
      sortValue: Number.isFinite(minutes) ? minutes : 0,
      typeLabel: t('routeHealth.serviceGap'),
      operatorLabel: routeOperatorLabelForRoute(route),
      metricLabel: t('analytics.headway', { minutes: formatAnalyticsNumber(minutes) }),
      detailLabel: formatAnalyticsTime(row.slot_start),
      href: routeMonitorHref(route),
    });
  }

  for (const row of analyticsData.value.dataFreshness) {
    const route = String(row.route_name ?? '');
    if (!route) continue;
    const rate = Number(row.off_route_rate);
    items.push({
      id: `quality-${route}-${row.direction}`,
      route,
      direction: row.direction,
      severity: 'watch',
      type: 'data-quality',
      sortRank: headwaySeverityRank('watch'),
      sortValue: Number.isFinite(rate) ? rate : 0,
      typeLabel: t('routeHealth.telemetryQuality'),
      operatorLabel: routeOperatorLabelForRoute(route),
      metricLabel: t('analytics.offRouteRate', { rate: formatAnalyticsPercent(row.off_route_rate) }),
      detailLabel: t('analytics.reports', { count: formatAnalyticsNumber(row.reports) }),
      href: routeMonitorHref(route),
    });
  }

  return items
    .sort((left, right) => (
      left.sortRank - right.sortRank
      || right.sortValue - left.sortValue
      || left.route.localeCompare(right.route)
    ))
    .slice(0, 4);
});
const routeHealthRouteNames = computed(() => (
  [...new Set(routeHealthWatchlist.value.map((item) => item.route).filter(Boolean))]
));
const routeHealthHasOverflow = computed(() => (
  analyticsData.value.bunching.length + analyticsData.value.dataFreshness.length > routeHealthWatchlist.value.length
));
function setPollStatusKey(key, params = {}) {
  pollStatusKey.value = key;
  pollStatusParams.value = params;
}

async function loadAnalytics() {
  analyticsLoading.value = true;
  analyticsError.value = '';
  try {
    const [dataFreshness, bunching] = await Promise.all([
      fetchAnalytics('/analytics/bus/data-freshness'),
      fetchAnalytics('/analytics/bus/bunching', { min_headway_minutes: '14' }),
    ]);
    analyticsData.value = {
      dataFreshness: dataFreshness.rows ?? [],
      bunching: bunching.rows ?? [],
      serviceDate: dataFreshness.serviceDate ?? bunching.serviceDate ?? '',
    };
    void ensureRouteOperatorsForWatchlist();
    analyticsLoadedAt.value = new Date();
  } catch (error) {
    analyticsError.value = t('analytics.unavailable', {
      message: error instanceof Error ? error.message : String(error),
    });
  } finally {
    analyticsLoading.value = false;
  }
}

async function fetchAnalytics(path, params = {}) {
  const url = new URL(analyticsUrl(path), window.location.origin);
  const serviceDate = analyticsQueryServiceDate();
  if (serviceDate) url.searchParams.set('service_date', serviceDate);
  url.searchParams.set('limit', String(ANALYTICS_ROW_LIMIT));
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${response.status} ${body.slice(0, 120)}`);
  }
  return response.json();
}

function analyticsUrl(path) {
  if (ANALYTICS_API_BASE_URL) return `${ANALYTICS_API_BASE_URL}${path}`;
  return `${ANALYTICS_STATIC_BASE_URL}${path.replace(/^\/analytics/, '')}.json`;
}

function analyticsQueryServiceDate() {
  return ANALYTICS_SERVICE_DATE;
}

function routeMonitorHref(route) {
  return `/route-geometry?route=${encodeURIComponent(route)}`;
}

function routeOperatorLabelForRoute(route) {
  const operators = routeOperatorIndex.value.get(route) ?? [];
  return formatRouteOperatorNames(operators, { fallback: t('routeOperators.pending') });
}

async function ensureRouteOperatorsForWatchlist() {
  if (!routeContextManifest.value || routeHealthRouteNames.value.length === 0) return;

  const routeEntries = routeContextManifest.value.routes ?? [];
  const routesToLoad = routeHealthRouteNames.value
    .filter((route) => !routeOperatorIndex.value.has(route) && !routeOperatorPendingRoutes.has(route))
    .slice(0, 6);
  if (routesToLoad.length === 0) return;

  const nextIndex = new Map(routeOperatorIndex.value);

  await Promise.all(routesToLoad.map(async (route) => {
    routeOperatorPendingRoutes.add(route);
    try {
      const routeContextEntry = routeEntries.find((entry) => entry.routeName === route);
      if (!routeContextEntry?.path) {
        nextIndex.set(route, []);
        return;
      }
      const routeContext = await loadRouteContextFromPath(routeContextEntry.path);
      nextIndex.set(route, routeOperatorsFromContext(routeContext));
    } catch {
      nextIndex.set(route, []);
    } finally {
      routeOperatorPendingRoutes.delete(route);
    }
  }));

  routeOperatorIndex.value = nextIndex;
}

function selectObservation(id) {
  selectedObservationId.value = id;
  selectedTransitSignalId.value = '';
  const observation = mapObservations.value.find((item) => item.id === id);
  if (trackVehicleMode.value) {
    trackedVehicleId.value = id;
    if (observation) lastTrackedObservation.value = observation;
    followTrackedVehicle(observation ?? lastTrackedObservation.value);
  }
}

function clearSelectedObservation() {
  selectedObservationId.value = '';
  trackVehicleMode.value = false;
  trackedVehicleId.value = '';
  lastTrackedObservation.value = null;
}

function selectTransitSignal(signal) {
  if (!signal?.id) return;
  selectedTransitSignalId.value = signal.id;
  selectedObservationId.value = '';
}

function clearTransitSignal() {
  selectedTransitSignalId.value = '';
}

function toggleTrackSelectedVehicle() {
  const target = selectedObservation.value;
  if (!target?.id) return;
  if (trackingActiveForSelected.value) {
    trackVehicleMode.value = false;
    trackedVehicleId.value = '';
    return;
  }
  trackVehicleMode.value = true;
  trackedVehicleId.value = target.id;
  selectedObservationId.value = target.id;
  lastTrackedObservation.value = target;
  followTrackedVehicle(target, false);
}

function syncTrackedVehicleSelection(trigger = 'timeline') {
  if (!trackVehicleMode.value || !trackedVehicleId.value) return false;
  selectedObservationId.value = trackedVehicleId.value;
  const current = observations.value.find((observation) => observation.id === trackedVehicleId.value);
  if (current) {
    lastTrackedObservation.value = current;
    followTrackedVehicle(current, trigger === 'auto');
    return true;
  }
  followTrackedVehicle(lastTrackedObservation.value, false);
  return true;
}

function followTrackedVehicle(observation, animate = true) {
  if (!observation) return;
  window.requestAnimationFrame(() => {
    mapRef.value?.followObservation(observation, { animate });
  });
}

function carryForwardObservation(observation) {
  return {
    ...observation,
    source: {
      ...observation.source,
      mode: 'tdx-historical-carried',
    },
    status: {
      ...observation.status,
      freshness: 'stale',
      ageLabel: 'carried',
    },
  };
}

function showDeckTooltip({ observation, x, y }) {
  tooltip.value = {
    visible: true,
    observation,
    routeStop: null,
    ...tooltipPosition(x, y),
  };
}

function showRouteStopTooltip({ stop, x, y }) {
  tooltip.value = {
    visible: true,
    observation: null,
    routeStop: stop,
    ...tooltipPosition(x, y),
  };
}

function hideTooltip() {
  tooltip.value = { visible: false, x: 0, y: 0, observation: null, routeStop: null };
}

function tooltipPosition(x, y) {
  return {
    x: Math.min(window.innerWidth - 220, x + 14),
    y: Math.max(62, y + 14),
  };
}

async function applySampleTick(trigger) {
  sampleFrame.value += 1;
  cycle.value += 1;
  countdown.value = OPERATIONS_POLL_INTERVAL_SECONDS;
  elapsed.value = 0;

  if (timelineSnapshots.value.length > 1) {
    const nextIndex = (activeSnapshotIndex.value + 1) % timelineSnapshots.value.length;
    await loadTimelineSnapshot(nextIndex, trigger);
    setPollStatusKey(trigger === 'manual' ? 'status.selectedLoaded' : 'status.nextLoaded');
    return;
  }

  observations.value = advanceOperationsFixtureTick(observations.value, sampleFrame.value, new Date());
  lastTickLabel.value = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  setPollStatusKey(trigger === 'manual' ? 'status.selectedLoaded' : 'status.nextLoaded');
  pulseLayer.value = true;
  movingLayer.value = true;
  window.clearTimeout(pulseTimeoutId);
  pulseTimeoutId = window.setTimeout(() => {
    pulseLayer.value = false;
  }, 760);
}

function tickFixtureClock() {
  if (!playbackRunning.value) return;
  if (timelineSnapshots.value.length > 1) return;

  const tickSeconds = playbackSpeed.value;
  if (countdown.value <= tickSeconds) {
    void applySampleTick('auto');
    return;
  }
  countdown.value = Math.max(0, countdown.value - tickSeconds);
  elapsed.value = OPERATIONS_POLL_INTERVAL_SECONDS - countdown.value;
  observations.value = advanceOperationsMotionFrame(
    ageOperationsObservations(observations.value, tickSeconds),
    sampleFrame.value * OPERATIONS_POLL_INTERVAL_SECONDS + elapsed.value,
    new Date(),
  );
  setPollStatusKey(
    countdown.value <= 3 ? 'status.loadingNext' : 'status.playingPositions',
    countdown.value <= 3 ? {} : { source: sourceModeLabel.value },
  );
}

function runPlaybackFrame(timestamp) {
  playbackFrameId = window.requestAnimationFrame(runPlaybackFrame);
  if (timelineSnapshots.value.length <= 1) {
    playbackLastFrameMs = timestamp;
    return;
  }
  if (!playbackRunning.value) {
    playbackLastFrameMs = timestamp;
    return;
  }
  if (!playbackLastFrameMs) {
    playbackLastFrameMs = timestamp;
    return;
  }

  const deltaSeconds = Math.min(0.25, (timestamp - playbackLastFrameMs) / 1000);
  playbackLastFrameMs = timestamp;
  playbackCursorIndex.value += deltaSeconds * playbackSpeed.value;
  if (playbackCursorIndex.value >= timelineSnapshots.value.length) {
    playbackCursorIndex.value %= timelineSnapshots.value.length;
  }

  const nextIndex = Math.floor(playbackCursorIndex.value);
  if (nextIndex !== activeSnapshotIndex.value && playbackPendingIndex < 0) {
    cycle.value += 1;
    playbackPendingIndex = nextIndex;
    void loadTimelineSnapshot(nextIndex, 'auto', {
      showLoading: false,
      syncCursor: false,
    }).finally(() => {
      if (playbackPendingIndex === nextIndex) playbackPendingIndex = -1;
    });
  }
  setPollStatusKey('status.playingPositions', { source: sourceModeLabel.value });
}

function zoomMap(delta) {
  mapRef.value?.zoomBy(delta);
}

function resetMapViewport() {
  mapRef.value?.resetView();
}

function onMapState(nextState) {
  mapState.value = nextState;
}

function onMapStatus(status) {
  mapRendererStatus.value = status.message;
}

watch(
  () => [
    selectedObservation.value?.id ?? '',
    selectedObservation.value?.route.uid ?? '',
    selectedObservation.value?.route.direction ?? '',
    activeSnapshotIndex.value,
    timelineSnapshots.value.length,
  ],
  () => {
    void refreshGhostOverlay();
    void refreshSelectedRouteProgress();
  },
);

watch(
  () => routeQualityManifest.value?.generatedAt ?? '',
  () => {
    void refreshSelectedRouteProgress();
  },
);

async function refreshGhostOverlay() {
  const target = selectedObservation.value;
  if (!ghostMode.value || !target || timelineSnapshots.value.length === 0) {
    ghostObservations.value = [];
    return;
  }

  const requestId = ++ghostRequestId;
  const manifestEntries = ghostBaselineEntries();

  try {
    const snapshots = await Promise.all(manifestEntries.map((entry) => loadGhostSnapshotEntry(entry)));
    if (requestId !== ghostRequestId) return;

    ghostObservations.value = snapshots
      .flatMap(({ snapshot, manifestEntry }) => createOperationsFromArchivePayload(snapshot, manifestEntry))
      .filter((observation) => (
        observation.route.uid === target.route.uid
        && observation.route.direction === target.route.direction
      ));
  } catch {
    if (requestId === ghostRequestId) ghostObservations.value = [];
  }
}

function ghostBaselineEntries() {
  const activeEntry = timelineSnapshots.value[activeSnapshotIndex.value];
  if (!activeEntry) return [];

  const baselineEntries = matchingBaselineEntries(activeEntry);
  if (baselineEntries.length > 0) return baselineEntries;

  return [
    activeSnapshotIndex.value - 1,
    activeSnapshotIndex.value,
    activeSnapshotIndex.value + 1,
  ]
    .filter((index) => index >= 0 && index < timelineSnapshots.value.length)
    .map((index) => timelineSnapshots.value[index]);
}

function matchingBaselineEntries(activeEntry) {
  if (baselineSnapshots.value.length === 0) return [];

  const centerMinutes = timeLabelToMinutes(activeEntry.timeLabel);
  if (!Number.isFinite(centerMinutes)) return [];

  const allowedMinutes = new Set([
    centerMinutes - OPERATIONS_ARCHIVE_INTERVAL_MINUTES,
    centerMinutes,
    centerMinutes + OPERATIONS_ARCHIVE_INTERVAL_MINUTES,
  ].map((value) => moduloMinutes(value)));

  const candidates = baselineSnapshots.value.filter((snapshot) => (
    snapshot.path
    && allowedMinutes.has(timeLabelToMinutes(snapshot.timeLabel))
  ));

  const historicalOnly = candidates.filter((snapshot) => snapshot.captureDate !== activeEntry.captureDate);
  return historicalOnly.length > 0 ? historicalOnly : candidates;
}

async function loadGhostSnapshot(index) {
  const manifestEntry = timelineSnapshots.value[index];
  return loadGhostSnapshotEntry(manifestEntry);
}

async function loadGhostSnapshotEntry(manifestEntry) {
  if (!manifestEntry?.path) throw new Error('missing ghost snapshot path');
  if (manifestEntry.slotKey === timelineSnapshots.value[activeSnapshotIndex.value]?.slotKey && activeSnapshot.value) {
    return { snapshot: activeSnapshot.value, manifestEntry };
  }
  const cached = ghostSnapshotCache.get(manifestEntry.path);
  if (cached) return { snapshot: cached, manifestEntry };

  const response = await fetch(cacheBustedUrl(manifestEntry.path), { cache: 'no-store' });
  if (!response.ok) throw new Error(`ghost snapshot HTTP ${response.status}`);
  const snapshot = await response.json();
  ghostSnapshotCache.set(manifestEntry.path, snapshot);
  return { snapshot, manifestEntry };
}

function cacheBustedUrl(path) {
  const separator = String(path).includes('?') ? '&' : '?';
  return `${path}${separator}v=${Date.now()}`;
}

function timeLabelToMinutes(value) {
  const match = String(value ?? '').match(/^(\d{2}):(\d{2})$/);
  if (!match) return Number.NaN;
  return Number(match[1]) * 60 + Number(match[2]);
}

function moduloMinutes(value) {
  const day = 24 * 60;
  return ((value % day) + day) % day;
}

function showTimelineHover(event) {
  if (timelineSnapshots.value.length === 0) return;
  const rect = event.currentTarget.getBoundingClientRect();
  const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
  const index = Math.round(ratio * Math.max(0, timelineSnapshots.value.length - 1));
  const snapshot = timelineSnapshots.value[index];
  timelineHover.value = {
    visible: true,
    left: ratio * 100,
    index,
    label: formatTimelineHoverLabel(snapshot),
  };
}

function hideTimelineHover() {
  timelineHover.value = { ...timelineHover.value, visible: false };
}

function formatTimelineHoverLabel(snapshot) {
  if (!snapshot) return '';
  const serviceDate = snapshot.captureDate ?? snapshot.slotKey?.slice(0, 10) ?? operationsDataSource.value.captureDate ?? '';
  const timeLabel = snapshot.timeLabel ?? snapshot.slotKey?.slice(11, 16) ?? '--:--';
  const count = Number.isFinite(snapshot.count) ? ` · ${snapshot.count} ${t('timeline.vehicles')}` : '';
  return `${serviceDate} ${timeLabel}${count}`;
}

function togglePlayback() {
  if (!playbackRunning.value) disableFollowLive();
  playbackRunning.value = !playbackRunning.value;
  playbackLastFrameMs = 0;
}

function toggleGhostMode() {
  ghostMode.value = !ghostMode.value;
  if (!ghostMode.value) {
    ghostObservations.value = [];
    return;
  }
  void refreshGhostOverlay();
}

watch(
  () => [
    routeFilter.value,
    routeContextManifest.value?.generatedAt ?? '',
    routeQualityManifest.value?.generatedAt ?? '',
  ],
  () => {
    void ensureRouteQualityForSelectedRoute();
    void refreshRouteStopLocations();
    void refreshRouteProgressEncoding();
  },
);

watch(
  () => routeFilter.value,
  () => {
    selectedTransitSignalId.value = '';
  },
);

watch(
  () => routeHealthRouteNames.value.join('|'),
  () => {
    void ensureRouteOperatorsForWatchlist();
  },
);

watch(
  () => [
    routeProgressEncoding.value,
    activeSnapshotIndex.value,
    observations.value,
    routeQualityManifest.value?.generatedAt ?? '',
  ],
  () => {
    void refreshRouteProgressEncoding();
  },
);

async function refreshRouteStopLocations() {
  if (routeFilter.value === 'all' || selectedRouteContextRows.value.length === 0) {
    routeStopLocations.value = [];
    return;
  }

  const requestId = ++routeStopRequestId;
  const stops = [];

  try {
    for (const routeIndexEntry of selectedRouteContextRows.value) {
      const routeContext = await loadRouteContextFromPath(routeIndexEntry.path);

      for (const stopOfRoute of routeContext.stopOfRoutes ?? []) {
        const sortedStops = [...(stopOfRoute.Stops ?? [])].sort(compareStopSequence);
        const terminalStopName = getStopDisplayName(sortedStops.at(-1));
        const directionLabel = terminalStopName
          ? t('direction.toward', { stop: terminalStopName })
          : (Number(stopOfRoute.Direction) === 0 ? t('direction.outbound') : t('direction.inbound'));

        for (const stop of sortedStops) {
          const longitude = Number(stop.StopPosition?.PositionLon);
          const latitude = Number(stop.StopPosition?.PositionLat);
          if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) continue;

          stops.push({
            id: `${stopOfRoute.RouteUID}:${stopOfRoute.Direction}:${stop.StopUID ?? stop.StopID ?? stop.StopSequence}`,
            routeUID: stopOfRoute.RouteUID,
            routeName: routeIndexEntry.routeName,
            direction: Number(stopOfRoute.Direction),
            directionLabel,
            sequence: Number(stop.StopSequence ?? 0),
            stopID: stop.StopID ?? stop.StopUID ?? '',
            name: getStopDisplayName(stop),
            position: { longitude, latitude },
          });
        }
      }
    }

    if (requestId !== routeStopRequestId) return;
    routeStopLocations.value = stops;
  } catch {
    if (requestId === routeStopRequestId) routeStopLocations.value = [];
  }
}

async function ensureRouteQualityForSelectedRoute() {
  const routeName = routeFilter.value;
  if (
    routeName === 'all'
    || selectedRouteQualityRows.value.length > 0
    || routeQualityRetryRoutes.has(routeName)
  ) {
    return;
  }

  routeQualityRetryRoutes.add(routeName);
  await loadRouteQualityManifest();
}

function findRouteStops(routeContext, routeQuality) {
  const stopOfRoutes = routeContext?.stopOfRoutes ?? [];
  return stopOfRoutes.find((route) => (
    route.RouteUID === routeQuality.routeUID
    && Number(route.Direction) === Number(routeQuality.direction)
  )) ?? stopOfRoutes.find((route) => Number(route.Direction) === Number(routeQuality.direction));
}

function compareStopSequence(left, right) {
  return Number(left.StopSequence ?? 0) - Number(right.StopSequence ?? 0);
}

function getStopDisplayName(stop) {
  return stop?.StopName?.Zh_tw ?? stop?.StopName?.En ?? stop?.StopID ?? '';
}

async function refreshSelectedRouteProgress() {
  const target = selectedObservation.value;
  const routeQuality = selectedObservationRouteQuality.value;
  if (!target || !isRouteGeometrySignalReady(routeQuality)) {
    routeProgressObservation.value = null;
    routeProgressError.value = '';
    return;
  }

  const requestId = ++routeProgressRequestId;
  routeProgressError.value = '';
  try {
    const routeContext = await loadRouteContextForQuality(routeQuality);
    if (requestId !== routeProgressRequestId) return;
    routeProgressObservation.value = buildRouteProgressObservation(target, routeContext);
    if (!routeProgressObservation.value) routeProgressError.value = 'route progress unavailable';
  } catch (error) {
    if (requestId !== routeProgressRequestId) return;
    routeProgressObservation.value = null;
    routeProgressError.value = error.message;
  }
}

async function refreshRouteProgressEncoding() {
  if (routeFilter.value === 'all' || !selectedRouteGeometryReady.value || visibleObservations.value.length === 0) {
    routeProgressEncodingMap.value = new Map();
    return;
  }

  const requestId = ++routeProgressEncodingRequestId;
  try {
    const contextByRouteKey = new Map();
    const progressEntries = [];

    for (const observation of visibleObservations.value) {
      const routeQuality = getObservationRouteQuality(observation, routeQualityIndex.value);
      if (!isRouteGeometrySignalReady(routeQuality)) continue;
      const routeKey = `${routeQuality.routeUID}:${routeQuality.direction}`;
      let routeContext = contextByRouteKey.get(routeKey);
      if (!routeContext) {
        routeContext = await loadRouteContextForQuality(routeQuality);
        contextByRouteKey.set(routeKey, routeContext);
      }
      const routeProgress = buildRouteProgressObservation(observation, routeContext);
      if (routeProgress) progressEntries.push([observation.id, routeProgress]);
    }

    if (requestId !== routeProgressEncodingRequestId) return;
    routeProgressEncodingMap.value = new Map(progressEntries);
  } catch {
    if (requestId === routeProgressEncodingRequestId) routeProgressEncodingMap.value = new Map();
  }
}

async function loadRouteContextForQuality(routeQuality) {
  const path = routeQuality?.routeContextPath;
  if (!path) throw new Error('missing route context path');
  return loadRouteContextFromPath(path);
}

async function loadRouteContextFromPath(path) {
  const cached = routeContextCache.get(path);
  if (cached) return cached;

  const response = await fetch(`${path}?v=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`route context HTTP ${response.status}`);
  const routeContext = await response.json();
  routeContextCache.set(path, routeContext);
  return routeContext;
}

async function reloadArchive() {
  await loadArchiveManifest({ preserveSelection: true });
}

async function liveUpdateArchive() {
  await loadArchiveManifest({ preserveSelection: false, preferLatest: true });
  playbackRunning.value = false;
  playbackLastFrameMs = 0;
  setPollStatusKey('status.latestLoaded');
}

async function toggleFollowLive() {
  if (followLiveEnabled.value) {
    disableFollowLive();
    return;
  }

  followLiveEnabled.value = true;
  playbackRunning.value = false;
  playbackLastFrameMs = 0;
  startFollowLiveTimer();
  await liveUpdateArchive();
}

async function refreshFollowLive() {
  if (!followLiveEnabled.value || archiveLoading.value) return;
  await liveUpdateArchive();
}

function startFollowLiveTimer() {
  window.clearInterval(liveFollowTimerId);
  liveFollowTimerId = window.setInterval(() => {
    void refreshFollowLive();
  }, LIVE_FOLLOW_POLL_MS);
}

function disableFollowLive() {
  followLiveEnabled.value = false;
  window.clearInterval(liveFollowTimerId);
  liveFollowTimerId = 0;
}

async function loadArchiveManifest({ preserveSelection = false, preferLatest = false } = {}) {
  archiveLoading.value = true;
  archiveError.value = '';
  try {
    const { manifest, sourceKind } = await fetchArchiveManifest();
    const snapshots = Array.isArray(manifest.snapshots)
      ? manifest.snapshots
        .filter((snapshot) => snapshot.capturedAt)
        .map((snapshot) => ({
          ...snapshot,
          source: manifest.source,
          path: sourceKind === 'projection-api'
            ? `${BUS_VEHICLE_PROJECTION_URL}?slot=${encodeURIComponent(snapshot.slotKey ?? snapshot.timeLabel)}`
            : snapshot.path,
        }))
        .filter((snapshot) => snapshot.path)
        .sort((left, right) => left.capturedAt.localeCompare(right.capturedAt))
      : [];
    timelineSnapshots.value = snapshots;

    if (snapshots.length === 0) {
      useFallbackFixture('archive manifest has no snapshots');
      return;
    }

    const selectedKey = timelineSnapshots.value[activeSnapshotIndex.value]?.slotKey;
    const preservedIndex = preserveSelection && selectedKey
      ? snapshots.findIndex((snapshot) => snapshot.slotKey === selectedKey)
      : -1;
    const defaultIndex = preferLatest
      ? snapshots.length - 1
      : manifest.source?.mode === 'tdx-historical'
      ? densestSnapshotIndex(snapshots)
      : snapshots.length - 1;
    await loadTimelineSnapshot(preservedIndex >= 0 ? preservedIndex : defaultIndex, 'manifest');
    if (!initialArchiveFitApplied) {
      initialArchiveFitApplied = true;
      mapFitKey.value = `archive-${manifest.source?.captureDate ?? 'loaded'}`;
    }
  } catch (error) {
    useFallbackFixture(error.message);
  } finally {
    archiveLoading.value = false;
  }
}

async function fetchArchiveManifest() {
  if (!USE_PROJECTION_API) return fetchStaticArchiveManifest();

  try {
    const response = await fetch(cacheBustedUrl(BUS_VEHICLE_PROJECTION_TIMELINE_URL), {
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`projection manifest HTTP ${response.status}`);
    return {
      manifest: await response.json(),
      sourceKind: 'projection-api',
    };
  } catch (projectionError) {
    return fetchStaticArchiveManifest(`projection fallback failed: ${projectionError.message}`);
  }
}

async function fetchStaticArchiveManifest(fallbackReason = '') {
  const response = await fetch(cacheBustedUrl(OPERATIONS_ARCHIVE_MANIFEST_URL), {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(fallbackReason
      ? `archive manifest HTTP ${response.status}; ${fallbackReason}`
      : `archive manifest HTTP ${response.status}`);
  }
  return {
    manifest: await response.json(),
    sourceKind: 'static-archive',
  };
}

async function loadBaselineManifest() {
  baselineArchiveError.value = '';
  try {
    const response = await fetch(`${OPERATIONS_BASELINE_ARCHIVE_MANIFEST_URL}?v=${Date.now()}`, {
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`baseline manifest HTTP ${response.status}`);
    const manifest = await response.json();
    baselineSnapshots.value = Array.isArray(manifest.snapshots)
      ? manifest.snapshots
        .filter((snapshot) => snapshot.path && snapshot.capturedAt)
        .sort((left, right) => left.capturedAt.localeCompare(right.capturedAt))
      : [];
  } catch (error) {
    baselineSnapshots.value = [];
    baselineArchiveError.value = error.message;
  }
}

async function loadRouteContextManifest() {
  try {
    const response = await fetch(`${OPERATIONS_ROUTE_CONTEXT_MANIFEST_URL}?v=${Date.now()}`, {
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`route context manifest HTTP ${response.status}`);
    routeContextManifest.value = await response.json();
    void refreshRouteStopLocations();
    void ensureRouteOperatorsForWatchlist();
  } catch {
    routeContextManifest.value = null;
  }
}

async function loadRouteQualityManifest() {
  routeQualityError.value = '';
  try {
    const response = await fetch(`${OPERATIONS_ROUTE_QUALITY_MANIFEST_URL}?v=${Date.now()}`, {
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`route quality manifest HTTP ${response.status}`);
    routeQualityManifest.value = await response.json();
    void refreshRouteStopLocations();
  } catch (error) {
    routeQualityManifest.value = null;
    routeQualityError.value = error.message;
  }
}

async function loadTimelineSnapshot(index, trigger = 'timeline', { showLoading = true, syncCursor = true } = {}) {
  if (timelineSnapshots.value.length === 0) return;
  const safeIndex = clamp(index, 0, timelineSnapshots.value.length - 1);
  const manifestEntry = timelineSnapshots.value[safeIndex];
  if (showLoading) archiveLoading.value = true;
  archiveError.value = '';
  try {
    const response = await fetch(cacheBustedUrl(manifestEntry.path), {
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`snapshot HTTP ${response.status}`);

    const payload = await response.json();
    activeSnapshot.value = payload;
    activeSnapshotIndex.value = safeIndex;
    if (syncCursor) playbackCursorIndex.value = safeIndex;
    activeDataSource.value = Array.isArray(payload?.features)
      ? createOperationsDataSourceFromProjection(payload, manifestEntry)
      : createOperationsDataSource(payload, manifestEntry);
    observations.value = createOperationsFromArchivePayload(payload, manifestEntry);
    if (!syncTrackedVehicleSelection(trigger)) {
      selectedObservationId.value = selectedObservationId.value
        && observations.value.some((observation) => observation.id === selectedObservationId.value)
        ? selectedObservationId.value
        : '';
    }
    countdown.value = OPERATIONS_POLL_INTERVAL_SECONDS;
    elapsed.value = 0;
    lastTickLabel.value = activeDataSource.value.timeLabel || formatTaipeiTime(activeDataSource.value.capturedAt, true);
    setPollStatusKey(
      trigger === 'timeline' ? 'status.selectedLoaded' : 'status.playingPositions',
      trigger === 'timeline' ? {} : { source: sourceModeLabel.value },
    );
    pulseLayer.value = true;
    window.clearTimeout(pulseTimeoutId);
    pulseTimeoutId = window.setTimeout(() => {
      pulseLayer.value = false;
    }, 760);
  } catch (error) {
    archiveError.value = error.message;
    setPollStatusKey('status.archiveFailed', { message: error.message });
  } finally {
    if (showLoading) archiveLoading.value = false;
  }
}

function previewTimelineSnapshot(event) {
  disableFollowLive();
  playbackRunning.value = false;
  playbackLastFrameMs = 0;
  timelineScrubIndex.value = clamp(Number(event.target.value), 0, timelineSnapshots.value.length - 1);
}

function commitTimelineSnapshot(event) {
  disableFollowLive();
  playbackRunning.value = false;
  playbackLastFrameMs = 0;
  const fallbackValue = Number(event?.target?.value ?? activeSnapshotIndex.value);
  const targetIndex = clamp(timelineScrubIndex.value ?? fallbackValue, 0, timelineSnapshots.value.length - 1);
  timelineScrubIndex.value = null;
  if (timelineCommitPendingIndex === targetIndex) return;
  timelineCommitPendingIndex = targetIndex;
  void loadTimelineSnapshot(targetIndex, 'timeline').finally(() => {
    if (timelineCommitPendingIndex === targetIndex) timelineCommitPendingIndex = -1;
  });
}

function densestSnapshotIndex(snapshots) {
  return snapshots.reduce((bestIndex, snapshot, index) => (
    snapshot.count > (snapshots[bestIndex]?.count ?? -1) ? index : bestIndex
  ), 0);
}

async function stepTimeline(delta) {
  if (timelineSnapshots.value.length <= 1) return;
  disableFollowLive();
  playbackRunning.value = false;
  playbackLastFrameMs = 0;
  timelineScrubIndex.value = null;
  await loadTimelineSnapshot(activeSnapshotIndex.value + delta, 'timeline');
}

function useFallbackFixture(reason) {
  activeSnapshot.value = null;
  activeDataSource.value = fallbackOperationsDataSource;
  observations.value = createOperationsFixture();
  ghostObservations.value = [];
  routeStopLocations.value = [];
  routeProgressEncodingMap.value = new Map();
  selectedObservationId.value = '';
  selectedTransitSignalId.value = '';
  trackVehicleMode.value = false;
  trackedVehicleId.value = '';
  ghostMode.value = false;
  lastTrackedObservation.value = null;
  archiveError.value = reason;
  lastTickLabel.value = 'unavailable';
  setPollStatusKey('status.archiveUnavailable', { message: reason });
}

function formatTaipeiTime(value, withSeconds = false) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Taipei',
    hour: '2-digit',
    minute: '2-digit',
    second: withSeconds ? '2-digit' : undefined,
    hour12: false,
  }).format(new Date(value));
}

function formatDataSourceDateTime(source) {
  if (!source) return '';
  const date = source.captureDate ?? source.slotKey?.slice(0, 10);
  const time = source.timeLabel ?? source.slotKey?.slice(11, 16);
  if (date && time) return `${date} ${time}`;
  if (source.capturedAt) return formatTaipeiDateTime(source.capturedAt);
  return time ?? '';
}

function formatSnapshotCompactDateTime(snapshot) {
  if (!snapshot) return '';
  const date = snapshot.captureDate ? snapshot.captureDate.slice(5) : snapshot.slotKey?.slice(5, 10);
  const time = snapshot.timeLabel ?? snapshot.slotKey?.slice(11, 16);
  if (date && time) return `${date} ${time}`;
  if (snapshot.capturedAt) return formatTaipeiDateTime(snapshot.capturedAt).slice(5);
  return time ?? '';
}

function formatTaipeiDateTime(value) {
  if (!value) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(value));
  const pick = (type) => parts.find((part) => part.type === type)?.value ?? '';
  return `${pick('year')}-${pick('month')}-${pick('day')} ${pick('hour')}:${pick('minute')}`;
}

function formatDuration(seconds) {
  const wholeSeconds = Math.round(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  const remainingSeconds = wholeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function formatSourceMode(mode) {
  if (mode === 'tdx-historical' || mode === 'tdx-historical-carried') return t('source.historical');
  if (mode === 'tdx-captured') return t('source.liveArchive');
  return t('source.tdx');
}

function formatFreshness(freshness) {
  if (freshness === 'fresh') return t('freshness.fresh');
  if (freshness === 'stale') return t('freshness.stale');
  return t('freshness.unknown');
}

function formatAgeLabel(ageLabel) {
  return ageLabel === 'carried' ? t('age.carried') : ageLabel;
}

function formatHealthStatus(status) {
  if (status === 'ok') return t('healthStatus.ok');
  if (status === 'empty') return t('healthStatus.empty');
  if (status === 'syncing') return t('healthStatus.syncing');
  if (status === 'planned') return t('healthStatus.planned');
  if (status === 'error') return t('healthStatus.error');
  return status;
}

function formatHourDuration(minutes) {
  if (minutes >= 60 && minutes % 60 === 0) return `${minutes / 60}h`;
  if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return `${minutes}m`;
}

function formatAnalyticsTime(value) {
  if (!value) return '--';
  return String(value).slice(5, 16).replace('T', ' ');
}

function formatAnalyticsNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString('en-US') : '--';
}

function formatAnalyticsPercent(rate) {
  const number = Number(rate);
  if (!Number.isFinite(number)) return '--';
  return `${(number * 100).toFixed(number >= 0.1 ? 1 : 2)}%`;
}

function formatAnalyticsDirection(direction) {
  return Number(direction) === 0 ? t('direction.outbound') : t('direction.inbound');
}

function formatRouteServiceSignalType(signalType) {
  if (signalType === 'vehicle_bunching') return t('routeService.vehicleBunching');
  if (signalType === 'headway_gap') return t('routeService.serviceGap');
  return t('routeService.spacing');
}

function routeServiceHeadwayClass(headway) {
  const ratio = Number(headway?.ratioToTarget);
  if (Number.isFinite(ratio) && ratio >= 1.8) return 'gap';
  if (Number.isFinite(ratio) && ratio <= 0.5) return 'bunching';
  return 'normal';
}

function routeServiceHeadwayStyle(headway) {
  const ratio = Number(headway?.ratioToTarget);
  const width = Number.isFinite(ratio) ? clamp((ratio / 2.4) * 100, 18, 100) : 24;
  return { '--route-service-width': `${width}%` };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

onMounted(() => {
  void loadRouteContextManifest();
  void loadRouteQualityManifest();
  void loadBaselineManifest();
  void loadArchiveManifest();
  void loadAnalytics();
  intervalId = window.setInterval(tickFixtureClock, 1000);
  playbackFrameId = window.requestAnimationFrame(runPlaybackFrame);
});

onBeforeUnmount(() => {
  window.clearInterval(intervalId);
  window.clearInterval(liveFollowTimerId);
  window.clearTimeout(pulseTimeoutId);
  window.cancelAnimationFrame(playbackFrameId);
});
</script>

<template>
  <main
    class="operations-explorer app"
    :class="{ 'inspector-open': selectedObservation || selectedTransitSignal }"
    :style="rootStyle"
  >
    <header class="status-bar">
      <div class="brand" aria-label="TWFoundry">
        <div class="brand-mark" aria-hidden="true"></div>
        <div>
          <div class="brand-title">TWFoundry</div>
          <div class="brand-sub">{{ t('app.subtitle') }}</div>
        </div>
      </div>
      <div class="top-layer-switcher">
        <span class="top-layer-eyebrow">{{ t('layer.label') }}</span>
        <select id="topLayerSelect" v-model="activeLayerId" :aria-label="t('filters.layerFilter')">
          <option
            v-for="layer in layerOptions"
            :key="layer.id"
            :value="layer.id"
            :disabled="layer.status !== 'active'"
          >
            {{ t(layer.shortLabelKey) }}{{ layer.status !== 'active' ? ` · ${t('layer.planned')}` : '' }}
          </option>
        </select>
      </div>
      <div class="status-strip" :aria-label="t('status.aria')">
        <div class="metric metric-time"><span>{{ t('status.time') }}</span><strong>{{ activeSnapshotLabel }}</strong><em v-if="activeSnapshotTimeZoneLabel">{{ activeSnapshotTimeZoneLabel }}</em></div>
        <div class="metric"><span>{{ t('status.playback') }}</span><strong>{{ nextTickLabel }}</strong></div>
      </div>
      <div class="actions">
        <div class="locale-switch" :aria-label="t('app.language')">
          <button
            v-for="option in SUPPORTED_LOCALES"
            :key="option.code"
            class="locale-btn"
            type="button"
            :class="{ active: locale === option.code }"
            :aria-pressed="locale === option.code"
            @click="setLocale(option.code)"
          >
            {{ option.label }}
          </button>
        </div>
        <a class="btn primary" href="/bus-oversight">{{ t('nav.busOversight') }}</a>
        <button class="btn" type="button" @click="healthDrawerOpen = true">{{ t('drawer.title') }}</button>
      </div>
    </header>

    <section class="map-shell" :aria-label="t('map.aria')">
      <div class="basemap">
        <BusDeckMap
          ref="mapRef"
          :observations="displayMapObservations"
          :ghost-observations="ghostObservations"
          :route-stop-locations="routeStopLocations"
          :route-progress-encoding="routeProgressEncodingEnabled"
          :selected-observation-id="selectedObservation?.id ?? ''"
          :visible="layerVisible"
          :point-scale="pointSize"
          :point-opacity="pointOpacity"
          :fit-key="mapFitKey"
          @select-observation="selectObservation"
          @clear-observation="clearSelectedObservation"
          @hover-observation="showDeckTooltip"
          @leave-observation="hideTooltip"
          @hover-route-stop="showRouteStopTooltip"
          @leave-route-stop="hideTooltip"
          @map-state="onMapState"
          @status="onMapStatus"
        />
        <div class="map-chip-row" :aria-label="t('map.annotations')">
          <div class="map-chip"><strong>{{ t('map.vehicleReports', { count: operationsDataSource.count }) }}</strong> {{ t('map.currentSample') }}</div>
          <div class="map-chip">{{ t('map.basemap') }}</div>
          <div class="map-chip">{{ t('map.vehicleLayer') }}</div>
          <div class="map-chip">{{ t('map.serviceDay', { range: archiveRangeLabel }) }}</div>
          <div v-if="routeStopLabel" class="map-chip route-stop-chip">{{ routeStopLabel }}</div>
          <div v-if="routeFocusActive" class="map-chip">{{ t('ghost.focus') }}</div>
          <div v-if="ghostBaselineLabel" class="map-chip ghost-chip">{{ ghostBaselineLabel }}</div>
        </div>
        <div v-if="primaryTransitSignal" class="signal-alert-stack" :aria-label="t('signal.alerts')">
          <button class="signal-alert-pill" type="button" @click="selectTransitSignal(primaryTransitSignal)">
            <span class="signal-alert-icon" aria-hidden="true">!</span>
            <span>
              <strong>{{ t('signal.headwayGap') }}</strong>
              <small>{{ transitSignalSummaryLabel }}</small>
            </span>
          </button>
        </div>
        <div class="zoom-controls" :aria-label="t('map.zoomControls')">
          <button class="zoom-btn" type="button" :aria-label="t('map.zoomOut')" @click="zoomMap(-1)">-</button>
          <div class="zoom-readout">{{ zoomLabel }}</div>
          <button class="zoom-btn" type="button" :aria-label="t('map.zoomIn')" @click="zoomMap(1)">+</button>
          <button class="zoom-btn zoom-reset" type="button" @click="resetMapViewport">{{ t('map.resetZoom') }}</button>
        </div>
      </div>
    </section>

    <aside class="panel left-panel" :aria-label="t('layer.aria')">
      <div class="panel-header">
        <div class="eyebrow"><span>{{ t('layer.activeLabel') }}</span><span>{{ layerVisible ? t('layer.visible') : t('layer.hidden') }}</span></div>
        <h1 class="panel-title">{{ t(activeLayer.labelKey) }}</h1>
        <p class="panel-copy">{{ t(activeLayer.descriptionKey) }}</p>
        <div class="badge-row">
          <span class="badge source">交通部 TDX</span>
          <span class="badge sample">{{ sourceModeLabel }}</span>
          <span class="badge">{{ t(activeLayer.shortLabelKey) }}</span>
        </div>
        <div class="layer-metric">
          <strong>{{ visibleSummary.active }}</strong>
          <span>{{ t(activeLayer.shortLabelKey) }}</span>
        </div>
      </div>
      <div class="panel-body">
        <section class="section route-service-section">
          <div class="section-title">
            <span>{{ t('routeService.title') }}</span>
            <span>{{ routeFilter === 'all' ? t('filters.allRoutes') : t('filters.route', { route: routeFilter }) }}</span>
          </div>
          <p class="route-health-copy">{{ t('routeService.copy') }}</p>
          <div v-if="!routeServiceSummary" class="analytics-empty">{{ routeServiceStatusLabel }}</div>
          <div v-else class="route-service-panel">
            <div class="route-service-kpis">
              <div>
                <strong>{{ formatAnalyticsNumber(routeServiceSummary.sampleCount) }}</strong>
                <span>{{ t('routeService.vehicleSample') }}</span>
              </div>
              <div>
                <strong>{{ formatAnalyticsNumber(routeServiceSummary.maxHeadwayMinutes) }}</strong>
                <span>{{ t('routeService.maxGapMinutes') }}</span>
              </div>
              <div>
                <strong>{{ formatAnalyticsNumber(routeServiceSummary.minHeadwayMinutes) }}</strong>
                <span>{{ t('routeService.minGapMinutes') }}</span>
              </div>
            </div>
            <div class="route-service-headways" :aria-label="t('routeService.headwayDistribution')">
              <div
                v-for="(headway, index) in routeServiceHeadwayRows"
                :key="`${headway.trailing.observation.id}-${headway.leading.observation.id}`"
                class="route-service-headway"
                :class="routeServiceHeadwayClass(headway)"
              >
                <span>{{ t('routeService.segmentLabel', { from: index + 1, to: index + 2 }) }}</span>
                <div class="route-service-bar-track">
                  <div class="route-service-bar" :style="routeServiceHeadwayStyle(headway)"></div>
                </div>
                <b>{{ t('analytics.headway', { minutes: formatAnalyticsNumber(headway.observedHeadwayMinutes) }) }}</b>
              </div>
            </div>
            <div class="route-service-signals">
              <div
                v-for="signal in routeServiceSignalRows"
                :key="signal.id"
                class="route-service-signal"
                :class="signal.signalType"
              >
                <strong>{{ formatRouteServiceSignalType(signal.signalType) }}</strong>
                <span>{{ t('routeService.signalDetail', {
                  observed: formatAnalyticsNumber(signal.observedHeadwayMinutes),
                  expected: formatAnalyticsNumber(signal.expectedHeadwayMinutes),
                }) }}</span>
              </div>
              <div v-if="routeServiceSignalRows.length === 0" class="route-service-signal stable">
                <strong>{{ t('routeService.stable') }}</strong>
                <span>{{ t('routeService.stableDetail') }}</span>
              </div>
            </div>
            <p class="route-service-note">{{ t('routeService.note') }}</p>
          </div>
        </section>

        <section class="section route-health-section">
          <div class="section-title">
            <span>{{ t('routeHealth.title') }}</span>
            <span>{{ analyticsLoading ? t('analytics.loading') : t('routeHealth.source') }}</span>
          </div>
          <p class="route-health-copy">{{ t('routeHealth.copy') }}</p>
          <div v-if="analyticsError" class="inline-warning">{{ analyticsError }}</div>
          <div v-else-if="analyticsLoading && routeHealthWatchlist.length === 0" class="analytics-empty">{{ t('routeHealth.loading') }}</div>
          <div v-else-if="routeHealthWatchlist.length === 0" class="analytics-empty">{{ t('routeHealth.noRows') }}</div>
          <div v-else class="route-health-list">
            <a
              v-for="item in routeHealthWatchlist"
              :key="item.id"
              class="route-health-row"
              :class="[item.severity, item.type]"
              :href="item.href"
            >
              <span class="route-health-status">{{ t(`routeHealth.severity.${item.severity}`) }}</span>
              <span class="route-health-main">
                <strong>{{ t('filters.route', { route: item.route }) }}</strong>
                <small><b class="route-health-type">{{ item.typeLabel }}</b> · {{ formatAnalyticsDirection(item.direction) }}</small>
                <small>{{ t('routeOperators.label') }}：{{ item.operatorLabel }}</small>
              </span>
              <span class="route-health-metric">
                <b>{{ item.metricLabel }}</b>
                <small>{{ item.detailLabel }}</small>
              </span>
              <span class="route-health-open">{{ t('routeHealth.detail') }}</span>
            </a>
            <div v-if="routeHealthHasOverflow" class="route-health-overflow">
              {{ t('routeHealth.more') }}
            </div>
          </div>
        </section>

        <section class="section">
          <div class="section-title"><span>{{ t('filters.title') }}</span><span>{{ activeLayerFilterLabel }}</span></div>
          <div class="mobile-layer-context" aria-hidden="true">
            <span>{{ t('layer.currentLayer') }}</span>
            <strong>{{ t(activeLayer.shortLabelKey) }}</strong>
          </div>
          <div class="filter-grid">
            <div class="field route-field">
              <label for="routeFilter">{{ t('filters.routeFilter') }}</label>
              <select id="routeFilter" v-model="routeFilter">
                <option value="all">{{ t('filters.allRoutes') }}</option>
                <option v-for="route in routeOptions" :key="route" :value="route">{{ t('filters.route', { route }) }}</option>
              </select>
              <a
                v-if="routeFilter !== 'all'"
                class="route-detail-link"
                :href="routeMonitorHref(routeFilter)"
              >
                {{ t('routeHealth.selectedDetail', { route: routeFilter }) }}
              </a>
            </div>
          </div>
          <label class="checkbox">
            <input v-model="hideStale" type="checkbox">
            <span class="check-label">{{ t('filters.hideStale') }}</span>
          </label>
          <label class="checkbox experimental-toggle">
            <input
              v-model="routeProgressEncoding"
              type="checkbox"
              :disabled="routeFilter === 'all'"
            >
            <span class="check-label">
              <strong>{{ t('routeProgressEncoding.title') }}</strong>
              <small>{{ t('routeProgressEncoding.copy') }}</small>
            </span>
          </label>
        </section>

        <section class="section">
          <div class="section-title"><span>{{ t('data.title') }}</span><span>TDX</span></div>
          <table class="mini-table">
            <tbody>
              <tr><td>{{ t('data.provider') }}</td><td>TDX</td></tr>
              <tr><td>{{ t('data.service') }}</td><td>{{ t('data.serviceValue') }}</td></tr>
              <tr><td>{{ t('data.serviceDay') }}</td><td>{{ operationsDataSource.captureDate ?? t('data.current') }}</td></tr>
              <tr><td>{{ t('data.sampleInterval') }}</td><td>{{ OPERATIONS_ARCHIVE_INTERVAL_MINUTES }} min</td></tr>
              <tr><td>{{ t('data.records') }}</td><td>{{ t('data.recordsValue', { visible: visibleSummary.active, sampled: operationsDataSource.count }) }}</td></tr>
              <tr><td>{{ t('routeQuality.title') }}</td><td>{{ selectedRouteQualityLabel }}</td></tr>
            </tbody>
          </table>
          <p v-if="archiveError" class="inline-warning">{{ archiveError }}</p>
        </section>
      </div>
    </aside>

    <aside v-if="selectedTransitSignal" class="panel right-panel signal-panel" :aria-label="t('signal.inspectorAria')">
      <div class="panel-header">
        <div class="panel-headline">
          <div class="inspector-summary">
            <div class="eyebrow"><span>{{ t('signal.inspectorKicker') }}</span><span>{{ sourceModeLabel }}</span></div>
            <h2 class="panel-title">{{ t('signal.inspectorTitle', { route: selectedTransitSignal.routeName }) }}</h2>
            <p class="panel-copy">{{ t('signal.inspectorCopy') }}</p>
          </div>
          <button class="track-btn" type="button" :aria-label="t('drawer.close')" :title="t('drawer.close')" @click="clearTransitSignal">
            <svg class="control-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      </div>
      <div class="panel-body">
        <section class="signal-detail-panel">
          <div class="signal-detail-head">
            <div>
              <strong>{{ t('signal.headwayGap') }}</strong>
              <p>{{ t('signal.statusCopy') }}</p>
            </div>
            <span class="badge sample">{{ t('signal.evidenceStrength') }}</span>
          </div>
          <div class="route-progress-grid">
            <div>
              <span>{{ t('signal.expectedHeadway') }}</span>
              <strong>{{ Math.round(selectedTransitSignal.expectedHeadwayMinutes) }} min</strong>
            </div>
            <div>
              <span>{{ t('signal.observedHeadway') }}</span>
              <strong>{{ Math.round(selectedTransitSignal.observedHeadwayMinutes) }} min</strong>
            </div>
            <div>
              <span>{{ t('routeQuality.title') }}</span>
              <strong>{{ selectedTransitSignal.geometryQuality }}</strong>
            </div>
          </div>
        </section>
        <div class="evidence-list">
          <div class="evidence-item"><strong>{{ t('signal.baseline') }}:</strong> {{ t('signal.prototypeBaseline', { minutes: Math.round(selectedTransitSignal.expectedHeadwayMinutes) }) }}.</div>
          <div class="evidence-item"><strong>{{ t('signal.gapVehicles') }}:</strong> {{ selectedTransitSignal.trailingVehicleId }} {{ t('signal.followsVehicle') }} {{ selectedTransitSignal.leadingVehicleId }}.</div>
          <div class="evidence-item"><strong>{{ t('signal.note') }}:</strong> {{ t('signal.noteCopy') }}</div>
        </div>
        <details class="technical-details">
          <summary>{{ t('signal.technicalDetails') }}</summary>
          <div class="evidence-list">
            <div class="evidence-item"><strong>{{ t('signal.confidence') }}:</strong> {{ Math.round(selectedTransitSignal.confidence * 100) }}%</div>
            <div class="evidence-item"><strong>{{ t('signal.sampleCount') }}:</strong> {{ selectedTransitSignal.sampleCount }}</div>
          </div>
        </details>
      </div>
    </aside>

    <aside v-if="selectedObservation && !selectedTransitSignal" class="panel right-panel" :aria-label="t('inspector.aria')">
      <div class="panel-header">
        <div class="panel-headline">
          <div class="inspector-summary">
            <div class="eyebrow"><span>{{ t('inspector.title') }}</span><span>{{ sourceModeLabel }}</span></div>
            <h2 class="panel-title">{{ t('inspector.heading') }}</h2>
            <p class="panel-copy">{{ t('inspector.copy') }}</p>
          </div>
        </div>
      </div>
      <div id="inspectorBody" class="panel-body">
        <div class="record-title">
          <div>
            <div class="plate">{{ selectedObservation.id }}</div>
            <div class="route">{{ t('filters.route', { route: selectedObservation.route.name }) }} / {{ selectedObservation.route.uid }}</div>
          </div>
          <div class="record-actions">
            <button
              class="track-btn"
              type="button"
              :class="{ active: trackingActiveForSelected }"
              :aria-pressed="String(trackingActiveForSelected)"
              :aria-label="trackToggleLabel"
              :title="trackToggleLabel"
              @click="toggleTrackSelectedVehicle"
            >
              <svg class="control-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3v4" />
                <path d="M12 17v4" />
                <path d="M3 12h4" />
                <path d="M17 12h4" />
                <circle cx="12" cy="12" r="4" />
              </svg>
            </button>
            <span class="badge" :class="{ live: selectedObservation.status.freshness === 'fresh' }">{{ selectedFreshnessLabel }}</span>
          </div>
        </div>
        <section class="inspector-tool inspector-ghost-tool">
          <div>
            <strong>{{ t('ghost.title') }}</strong>
            <p>{{ t('ghost.copy') }}</p>
          </div>
          <button
            class="track-btn"
            type="button"
            :class="{ active: ghostMode }"
            :aria-pressed="String(ghostMode)"
            :aria-label="ghostToggleLabel"
            :title="ghostToggleLabel"
            @click="toggleGhostMode"
          >
            <svg class="control-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 12c2.4-4.2 5.1-6.3 8-6.3s5.6 2.1 8 6.3c-2.4 4.2-5.1 6.3-8 6.3S6.4 16.2 4 12Z" />
              <circle cx="12" cy="12" r="2.8" />
            </svg>
          </button>
        </section>
        <section class="route-progress-panel">
          <div class="route-progress-head">
            <div>
              <strong>{{ t('routeProgress.title') }}</strong>
              <p>{{ routeProgressStatusLabel }}</p>
            </div>
            <span class="badge" :class="{ source: routeProgressObservation }">{{ routeProgressPercentLabel }}</span>
          </div>
          <div class="route-progress-grid">
            <div>
              <span>{{ t('routeProgress.nearestStop') }}</span>
              <strong>{{ routeProgressStopLabel }}</strong>
            </div>
            <div>
              <span>{{ t('routeProgress.nextStop') }}</span>
              <strong>{{ routeProgressNextStopLabel }}</strong>
            </div>
            <div>
              <span>{{ t('routeProgress.distance') }}</span>
              <strong>{{ routeProgressDistanceLabel }}</strong>
            </div>
            <div>
              <span>{{ t('routeQuality.title') }}</span>
              <strong>{{ selectedObservationRouteQuality?.quality ?? t('routeQuality.notAudited') }}</strong>
            </div>
          </div>
        </section>
        <div class="kv">
          <div class="kv-card"><span>{{ t('inspector.direction') }}</span><strong>{{ selectedDirectionLabel }}</strong></div>
          <div class="kv-card"><span>{{ t('inspector.speed') }}</span><strong>{{ selectedObservation.motion.speedKph }} km/h</strong></div>
          <div class="kv-card"><span>{{ t('inspector.gpsTime') }}</span><strong>{{ selectedObservation.timestamps.gpsTime }}</strong></div>
          <div class="kv-card"><span>{{ t('inspector.updateTime') }}</span><strong>{{ selectedObservation.timestamps.updateTime }}</strong></div>
          <div class="kv-card"><span>{{ t('inspector.positionAge') }}</span><strong>{{ formatAgeLabel(selectedObservation.status.ageLabel) }}</strong></div>
          <div class="kv-card"><span>{{ t('data.title') }}</span><strong>{{ sourceModeLabel }}</strong></div>
        </div>
        <div class="badge-row">
          <span class="badge source">{{ sourceModeLabel }}</span>
          <span class="badge">{{ t('inspector.busVehicle') }}</span>
          <span class="badge">{{ t('inspector.positionReport') }}</span>
        </div>
        <div class="evidence-list">
          <div class="evidence-item"><strong>{{ t('inspector.telemetry') }}:</strong> {{ vehicleTelemetrySummary }}.</div>
          <div class="evidence-item"><strong>{{ t('inspector.position') }}:</strong> {{ selectedObservation.position.latitude }}, {{ selectedObservation.position.longitude }}.</div>
          <div class="evidence-item"><strong>{{ t('inspector.updated') }}:</strong> {{ selectedObservation.timestamps.updateTime }}.</div>
        </div>
      </div>
    </aside>

    <footer class="timeline" :aria-label="t('timeline.aria')">
      <div class="timeline-status">
        <div class="timeline-title-row">
          <div class="timeline-title">{{ t('timeline.title') }}</div>
          <span class="live-pill" :class="{ active: followLiveEnabled, idle: isLiveSnapshot && !followLiveEnabled }">
            <span class="live-dot"></span>{{ liveStateLabel }}
          </span>
        </div>
        <strong>{{ activeSnapshotLabel }}</strong>
        <span class="timeline-detail">{{ timelineStatusDetail }}</span>
        <span class="timeline-zone">{{ activeSnapshotTimeZoneLabel }}</span>
      </div>
      <div class="timeline-center">
        <div
          class="track"
          :aria-label="t('timeline.currentArchive')"
          @pointermove="showTimelineHover"
          @pointerleave="hideTimelineHover"
        >
          <input
            class="timeline-slider"
            type="range"
            min="0"
            :max="timelineMax"
            :value="timelineSliderValue"
            :disabled="timelineDisabled"
            :aria-label="t('timeline.selectSnapshot')"
            @input="previewTimelineSnapshot"
            @change="commitTimelineSnapshot"
            @pointerup="commitTimelineSnapshot"
            @touchend="commitTimelineSnapshot"
          >
          <div class="coverage-fill"></div>
          <div class="track-fill"></div>
          <div class="now-marker"></div>
          <div
            v-if="timelineHover.visible"
            class="timeline-hover"
            :style="{ left: `${timelineHover.left}%` }"
          >
            {{ timelineHover.label }}
          </div>
          <span class="track-label start">{{ timelineStartLabel }}</span>
          <span class="track-label now">{{ timelineEndLabel }}</span>
        </div>
        <div class="timeline-meta">
          <span>{{ archiveRangeLabel }}</span>
          <span id="pollStatus">{{ pollStatusLabel }}</span>
        </div>
      </div>
      <div class="timeline-actions">
        <div class="speed-control" :aria-label="t('timeline.speed')">
          <button
            v-for="speed in PLAYBACK_SPEED_OPTIONS"
            :key="speed"
            class="btn speed-btn"
            type="button"
            :class="{ primary: playbackSpeed === speed }"
            :aria-pressed="playbackSpeed === speed"
            :title="t('timeline.speedTitle', { speed })"
            @click="playbackSpeed = speed"
          >{{ speed }}x</button>
        </div>
        <button class="btn icon-btn" type="button" :disabled="!canStepBackward" :aria-label="t('timeline.back5')" :title="t('timeline.back5')" @click="stepTimeline(-1)">
          <svg class="control-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M11 6 5 12l6 6" />
            <path d="M19 6 13 12l6 6" />
          </svg>
        </button>
        <button class="btn icon-btn primary" type="button" :aria-label="playbackToggleLabel" :title="playbackToggleLabel" @click="togglePlayback">
          <svg v-if="playbackRunning" class="control-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5v14" />
            <path d="M16 5v14" />
          </svg>
          <svg v-else class="control-icon play-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5v14l11-7Z" />
          </svg>
        </button>
        <button class="btn icon-btn" type="button" :disabled="!canStepForward" :aria-label="t('timeline.forward5')" :title="t('timeline.forward5')" @click="stepTimeline(1)">
          <svg class="control-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="m5 6 6 6-6 6" />
            <path d="m13 6 6 6-6 6" />
          </svg>
        </button>
        <button
          class="btn icon-btn live-follow-btn"
          type="button"
          :class="{ primary: followLiveEnabled, live: followLiveEnabled || isLiveSnapshot }"
          :disabled="archiveLoading"
          :aria-label="followLiveLabel"
          :title="followLiveLabel"
          :aria-pressed="followLiveEnabled"
          @click="toggleFollowLive"
        >
          <svg class="control-icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="2.5" />
            <path d="M8.5 8.5a5 5 0 0 0 0 7" />
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            <path d="M5.5 5.5a9.2 9.2 0 0 0 0 13" />
            <path d="M18.5 5.5a9.2 9.2 0 0 1 0 13" />
          </svg>
        </button>
      </div>
    </footer>

    <div
      v-if="tooltip.visible && tooltip.observation"
      class="tooltip"
      :style="{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }"
    >
      <strong>{{ tooltip.observation.id }}</strong>
      <div>{{ t('tooltip.route', { route: tooltip.observation.route.name, speed: tooltip.observation.motion.speedKph }) }}</div>
      <div class="muted">{{ formatFreshness(tooltip.observation.status.freshness) }} / {{ formatSourceMode(tooltip.observation.source.mode) }} / {{ formatAgeLabel(tooltip.observation.status.ageLabel) }}</div>
    </div>
    <div
      v-if="tooltip.visible && tooltip.routeStop"
      class="tooltip"
      :style="{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }"
    >
      <strong>{{ tooltip.routeStop.name || t('routeStops.stop') }}</strong>
      <div>{{ t('routeStops.tooltip', { route: tooltip.routeStop.routeName, sequence: tooltip.routeStop.sequence }) }}</div>
      <div class="muted">{{ tooltip.routeStop.directionLabel }} · {{ t('routeStops.stopId', { id: tooltip.routeStop.stopID }) }}</div>
    </div>

    <section class="health-drawer" :class="{ open: healthDrawerOpen }" :aria-label="t('drawer.aria')">
      <div class="drawer-head">
        <div>
          <div class="eyebrow">{{ t('drawer.kicker') }}</div>
          <h2 class="panel-title">{{ t('drawer.title') }}</h2>
          <p class="panel-copy">{{ t('drawer.copy', { active: activeHealthSourceCount, total: healthSources.length }) }}</p>
        </div>
        <button class="btn" type="button" @click="healthDrawerOpen = false">{{ t('drawer.close') }}</button>
      </div>
      <div class="source-health-list" role="table" :aria-label="t('drawer.sourceTable')">
        <div class="source-health-row source-health-head" role="row">
          <span role="columnheader">{{ t('drawer.source') }}</span>
          <span role="columnheader">{{ t('drawer.status') }}</span>
          <span role="columnheader">{{ t('drawer.cadence') }}</span>
          <span role="columnheader">{{ t('drawer.coverage') }}</span>
          <span role="columnheader">{{ t('drawer.updated') }}</span>
        </div>
        <div
          v-for="source in healthSources"
          :key="source.id"
          class="source-health-row"
          role="row"
          :class="`status-${source.status}`"
        >
          <span class="source-name" role="cell">
            <strong>{{ source.name }}</strong>
            <small>{{ source.type }} · {{ source.mode }}</small>
          </span>
          <span role="cell"><b class="health-status">{{ formatHealthStatus(source.status) }}</b></span>
          <span role="cell">{{ source.cadence }}</span>
          <span role="cell">{{ source.coverage }}</span>
          <span role="cell">{{ source.updated }}</span>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.operations-explorer {
  --bg: oklch(12% 0.02 250);
  --surface: oklch(20% 0.026 250);
  --fg: oklch(92% 0.018 230);
  --muted: oklch(68% 0.03 245);
  --border: oklch(34% 0.03 250);
  --accent: oklch(73% 0.14 215);
  --blue-soft: oklch(70% 0.11 225);
  --cyan-hot: oklch(78% 0.145 205);
  --ok: oklch(70% 0.14 155);
  --warn: oklch(76% 0.135 78);
  --critical: oklch(62% 0.22 25);
  --panel: color-mix(in oklch, var(--surface) 84%, black);
  --font-display: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter Variable", system-ui, sans-serif;
  --font-body: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter Variable", system-ui, sans-serif;
  --font-mono: "Berkeley Mono", "JetBrains Mono", "IBM Plex Mono", ui-monospace, Menlo, monospace;
  --timeline-height: 76px;
  --timeline-gap: 10px;
  --panel-top: 68px;
  --panel-bottom-offset: calc(var(--timeline-height) + var(--timeline-gap) + 28px);
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  overflow: hidden;
  background: #050811;
  color: var(--fg);
  font-family: var(--font-body);
  font-feature-settings: "cv01", "ss03";
  letter-spacing: 0;
  isolation: isolate;
}

.operations-explorer *,
.operations-explorer *::before,
.operations-explorer *::after {
  box-sizing: border-box;
}

.operations-explorer h1,
.operations-explorer h2,
.operations-explorer h3,
.operations-explorer p {
  margin: 0;
}

.operations-explorer button,
.operations-explorer input,
.operations-explorer select {
  font: inherit;
  color: inherit;
}

.operations-explorer button {
  cursor: pointer;
}

.status-bar {
  position: fixed;
  inset: 0 0 auto 0;
  z-index: 40;
  height: 52px;
  display: grid;
  grid-template-columns: max-content max-content 1fr max-content;
  align-items: center;
  gap: 14px;
  padding: 0 14px;
  border-bottom: 1px solid color-mix(in oklch, var(--border) 56%, transparent);
  background: color-mix(in oklch, var(--bg) 88%, black);
  backdrop-filter: blur(18px);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  white-space: nowrap;
}

.brand-mark {
  width: 26px;
  height: 26px;
  border: 1px solid color-mix(in oklch, var(--accent) 70%, transparent);
  border-radius: 6px;
  background:
    linear-gradient(90deg, transparent 48%, color-mix(in oklch, var(--accent) 58%, transparent) 49% 51%, transparent 52%),
    linear-gradient(0deg, transparent 48%, color-mix(in oklch, var(--accent) 58%, transparent) 49% 51%, transparent 52%),
    color-mix(in oklch, var(--surface) 80%, black);
  box-shadow: 0 0 18px color-mix(in oklch, var(--accent) 22%, transparent);
}

.brand-title {
  font-size: 14px;
  font-weight: 590;
}

.brand-sub {
  margin-top: 2px;
  color: var(--muted);
  font: 11px/1.1 var(--font-mono);
}

/* Top-level layer switcher: cross-layer navigation lives in the chrome,
   separated from the selected layer's content in the left panel. */
.top-layer-switcher {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 14px;
  border-left: 1px solid color-mix(in oklch, var(--border) 56%, transparent);
}

.top-layer-eyebrow {
  color: var(--muted);
  font: 10px/1 var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.top-layer-switcher select {
  width: auto;
  min-width: 152px;
  height: 30px;
}

.status-strip {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  overflow-x: auto;
  scrollbar-width: none;
}

.status-strip::-webkit-scrollbar {
  display: none;
}

.metric {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 30px;
  padding: 0 9px;
  border: 1px solid color-mix(in oklch, var(--border) 52%, transparent);
  border-radius: 7px;
  background: color-mix(in oklch, var(--surface) 46%, transparent);
  color: color-mix(in oklch, var(--fg) 86%, var(--muted));
  font-size: 12px;
  white-space: nowrap;
}

.metric span:not(.dot) {
  color: var(--muted);
}

.metric strong {
  color: var(--fg);
  font-weight: 590;
}

.metric em {
  color: color-mix(in oklch, var(--muted) 84%, var(--accent));
  font: 9px/1 var(--font-mono);
  font-style: normal;
}

.metric-time strong {
  font-family: var(--font-mono);
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--ok);
  box-shadow: 0 0 12px color-mix(in oklch, var(--ok) 60%, transparent);
}

.dot.warn {
  background: var(--warn);
  box-shadow: none;
}

.dot.accent {
  background: var(--accent);
  box-shadow: 0 0 14px color-mix(in oklch, var(--accent) 55%, transparent);
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.locale-switch {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border: 1px solid color-mix(in oklch, var(--border) 56%, transparent);
  border-radius: 8px;
  background: color-mix(in oklch, var(--surface) 38%, transparent);
}

.locale-btn {
  height: 26px;
  min-width: 40px;
  padding: 0 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  font-size: 11px;
  font-weight: 650;
}

.locale-btn.active {
  background: color-mix(in oklch, var(--accent) 18%, var(--surface));
  color: color-mix(in oklch, var(--accent) 18%, white);
}

.locale-btn:focus-visible {
  outline: 1px solid color-mix(in oklch, var(--accent) 60%, transparent);
  outline-offset: 1px;
}

.btn {
  display: inline-flex;
  align-items: center;
  height: 32px;
  border: 1px solid color-mix(in oklch, var(--border) 64%, transparent);
  border-radius: 7px;
  background: color-mix(in oklch, var(--surface) 62%, transparent);
  color: color-mix(in oklch, var(--fg) 90%, var(--muted));
  padding: 0 11px;
  font-size: 12px;
  font-weight: 510;
  text-decoration: none;
}

.btn:hover,
.btn:focus-visible {
  border-color: color-mix(in oklch, var(--accent) 58%, var(--border));
  color: var(--fg);
  outline: none;
}

.btn.primary {
  background: color-mix(in oklch, var(--accent) 18%, var(--surface));
  border-color: color-mix(in oklch, var(--accent) 56%, transparent);
  color: color-mix(in oklch, var(--accent) 18%, white);
}

.btn.live {
  border-color: color-mix(in oklch, var(--ok) 50%, var(--border));
}

.btn.compact {
  padding-inline: 10px;
}

.icon-btn {
  width: 42px;
  padding: 0;
  display: inline-grid;
  place-items: center;
}

.control-icon {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
}

.play-icon {
  fill: currentColor;
  stroke: none;
}

.live-follow-btn.primary .control-icon {
  stroke: color-mix(in oklch, var(--ok) 24%, white);
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.42;
}

.map-shell {
  position: fixed;
  inset: 52px 0 calc(var(--timeline-height) + var(--timeline-gap)) 0;
  z-index: 0;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(4, 8, 18, 0.99), rgba(2, 5, 11, 0.99)),
    var(--bg);
  user-select: none;
}

.basemap {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 42%, rgba(24, 41, 60, 0.28), transparent 46%),
    #040812;
  background-size: auto, auto;
}

.basemap::after {
  position: absolute;
  inset: 0;
  content: "";
  pointer-events: none;
  background:
    linear-gradient(180deg, rgba(1, 4, 10, 0.04), transparent 34%, rgba(1, 4, 10, 0.08)),
    radial-gradient(circle at 50% 50%, transparent 58%, rgba(1, 4, 10, 0.14));
  box-shadow: inset 0 0 44px rgba(0, 0, 0, 0.32);
}

.map-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0.86;
  transform: translate(var(--map-x), var(--map-y)) scale(var(--map-scale));
  transform-origin: 50% 50%;
  transition: transform 0.12s ease;
}

.district {
  fill: rgba(31, 45, 64, 0.28);
  stroke: rgba(130, 154, 180, 0.13);
  stroke-width: 1;
}

.river {
  fill: none;
  stroke: rgba(58, 111, 150, 0.26);
  stroke-width: 18;
  stroke-linecap: round;
}

.road-major {
  fill: none;
  stroke: rgba(170, 190, 210, 0.11);
  stroke-width: 3;
  stroke-linecap: round;
}

.road-minor {
  fill: none;
  stroke: rgba(170, 190, 210, 0.065);
  stroke-width: 1.2;
  stroke-linecap: round;
}

.label {
  fill: rgba(208, 222, 238, 0.28);
  font: 11px var(--font-mono);
  letter-spacing: 0.2px;
  text-transform: uppercase;
}

.points-layer {
  position: absolute;
  inset: 0;
  opacity: var(--point-opacity);
  transform: translate(var(--map-x), var(--map-y)) scale(var(--map-scale));
  transform-origin: 50% 50%;
  transition: opacity 0.18s ease, transform 0.12s ease;
}

.points-layer.hidden {
  opacity: 0.06;
  pointer-events: none;
}

.bus-point {
  position: absolute;
  left: var(--x);
  top: var(--y);
  width: calc(12px * var(--point-scale));
  height: calc(12px * var(--point-scale));
  padding: 0;
  border: 1px solid rgba(214, 247, 255, 0.82);
  border-radius: 50%;
  background: radial-gradient(circle, white 0 10%, var(--cyan-hot) 28%, var(--blue-soft) 64%, transparent 70%);
  box-shadow:
    0 0 12px color-mix(in oklch, var(--accent) 72%, transparent),
    0 0 26px color-mix(in oklch, var(--blue-soft) 36%, transparent);
  transform: translate(-50%, -50%);
  transition: left 0.86s linear, top 0.86s linear, transform 0.16s ease, opacity 0.16s ease, filter 0.16s ease;
}

.bus-point::before {
  position: absolute;
  left: 50%;
  top: 50%;
  width: calc(28px * var(--point-scale));
  height: 2px;
  content: "";
  background: linear-gradient(90deg, color-mix(in oklch, var(--accent) 46%, transparent), transparent);
  filter: blur(0.4px);
  transform: rotate(var(--azimuth)) translateX(-2px);
  transform-origin: 0 50%;
}

.bus-point:hover,
.bus-point.selected {
  z-index: 3;
  border-color: white;
  transform: translate(-50%, -50%) scale(1.65);
}

.bus-point.stale {
  opacity: 0.34;
  filter: grayscale(0.3) saturate(0.45);
  box-shadow: 0 0 8px rgba(140, 160, 178, 0.2);
}

.bus-point.filtered {
  display: none;
}

.points-layer.pulse .bus-point:not(.filtered) {
  animation: pointPulse 0.68s ease-out;
}

.points-layer.moving .bus-point:not(.filtered)::before {
  width: calc(38px * var(--point-scale));
  background: linear-gradient(90deg, color-mix(in oklch, var(--accent) 62%, transparent), transparent 78%);
}

@keyframes pointPulse {
  0% {
    box-shadow: 0 0 0 0 color-mix(in oklch, var(--accent) 46%, transparent), 0 0 20px color-mix(in oklch, var(--blue-soft) 44%, transparent);
  }

  100% {
    box-shadow: 0 0 0 16px transparent, 0 0 26px color-mix(in oklch, var(--blue-soft) 28%, transparent);
  }
}

.map-chip-row {
  position: absolute;
  left: 360px;
  top: 18px;
  z-index: 6;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-width: calc(100% - 760px);
}

.map-chip {
  padding: 7px 9px;
  border: 1px solid color-mix(in oklch, var(--border) 56%, transparent);
  border-radius: 999px;
  background: rgba(8, 15, 26, 0.74);
  backdrop-filter: blur(12px);
  color: color-mix(in oklch, var(--muted) 88%, white);
  font: 11px/1 var(--font-mono);
}

.map-chip strong {
  color: var(--fg);
  font-weight: 400;
}

.route-stop-chip {
  border-color: color-mix(in oklch, var(--poi) 54%, transparent);
  color: color-mix(in oklch, var(--poi) 84%, white);
}

.signal-alert-stack {
  position: absolute;
  left: 360px;
  top: 70px;
  z-index: 13;
  max-width: min(360px, calc(100% - 790px));
}

.signal-alert-pill {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 8px 10px;
  border: 1px solid color-mix(in oklch, var(--warn) 58%, var(--border));
  border-radius: 999px;
  background:
    linear-gradient(135deg, color-mix(in oklch, var(--warn) 18%, transparent), transparent 58%),
    rgba(12, 18, 27, 0.86);
  color: var(--fg);
  box-shadow: 0 14px 38px rgba(0, 0, 0, 0.32);
  backdrop-filter: blur(14px);
  cursor: pointer;
  text-align: left;
}

.signal-alert-pill:hover,
.signal-alert-pill:focus-visible {
  border-color: color-mix(in oklch, var(--warn) 72%, white);
  outline: none;
}

.signal-alert-icon {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border: 1px solid color-mix(in oklch, var(--warn) 54%, white);
  border-radius: 50%;
  background: color-mix(in oklch, var(--warn) 28%, transparent);
  color: color-mix(in oklch, var(--warn) 28%, white);
  font: 13px/1 var(--font-mono);
}

.signal-alert-pill strong,
.signal-alert-pill small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.signal-alert-pill strong {
  font-size: 12px;
}

.signal-alert-pill small {
  color: var(--muted);
  font: 10px/1.2 var(--font-mono);
}

.zoom-controls {
  position: absolute;
  right: 14px;
  bottom: 46px;
  z-index: 12;
  display: grid;
  grid-template-columns: 34px 48px 34px;
  gap: 6px;
  padding: 7px;
  border: 1px solid color-mix(in oklch, var(--border) 58%, transparent);
  border-radius: 10px;
  background: rgba(8, 15, 26, 0.76);
  backdrop-filter: blur(14px);
  box-shadow: 0 14px 44px rgba(0, 0, 0, 0.34);
}

.operations-explorer.inspector-open .zoom-controls {
  right: 410px;
}

.zoom-btn {
  height: 32px;
  min-width: 0;
  border: 1px solid color-mix(in oklch, var(--border) 58%, transparent);
  border-radius: 7px;
  background: color-mix(in oklch, var(--surface) 52%, transparent);
  color: var(--fg);
  font: 13px/1 var(--font-mono);
}

.zoom-btn:hover,
.zoom-btn:focus-visible {
  border-color: color-mix(in oklch, var(--accent) 58%, var(--border));
  color: color-mix(in oklch, var(--accent) 36%, white);
  outline: none;
}

.zoom-readout {
  display: grid;
  place-items: center;
  color: color-mix(in oklch, var(--muted) 92%, white);
  font: 11px/1 var(--font-mono);
}

.zoom-reset {
  grid-column: 1 / -1;
  height: 26px;
  color: var(--muted);
  font-size: 11px;
}

.panel {
  z-index: 20;
  border: 1px solid color-mix(in oklch, var(--border) 72%, transparent);
  border-radius: 10px;
  background: color-mix(in oklch, var(--panel) 88%, transparent);
  backdrop-filter: blur(20px);
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.34);
}

.left-panel {
  position: fixed;
  top: var(--panel-top);
  left: 14px;
  bottom: var(--panel-bottom-offset);
  width: 326px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.right-panel {
  position: fixed;
  top: var(--panel-top);
  right: 14px;
  bottom: var(--panel-bottom-offset);
  width: 378px;
  max-height: calc(100dvh - var(--panel-top) - var(--panel-bottom-offset));
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.panel-header {
  padding: 13px 14px 11px;
  border-bottom: 1px solid color-mix(in oklch, var(--border) 55%, transparent);
}

.panel-headline {
  display: block;
}

.signal-panel .panel-headline {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.eyebrow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: var(--muted);
  font: 11px/1.2 var(--font-mono);
  letter-spacing: 0.42px;
  text-transform: uppercase;
}

.panel-title {
  margin-top: 7px;
  color: var(--fg);
  font-size: 16px;
  font-weight: 590;
  line-height: 1.12;
  letter-spacing: 0;
}

.panel-copy {
  margin-top: 5px;
  color: color-mix(in oklch, var(--muted) 88%, white);
  font-size: 11.5px;
  line-height: 1.38;
}

.panel-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 14px 14px 18px;
  scrollbar-color: color-mix(in oklch, var(--border) 80%, black) transparent;
}

.right-panel .panel-body {
  padding-bottom: 26px;
}

.section {
  padding: 13px 0;
  border-top: 1px solid color-mix(in oklch, var(--border) 42%, transparent);
}

.section:first-child {
  padding-top: 0;
  border-top: 0;
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 11px;
  color: color-mix(in oklch, var(--fg) 94%, white);
  font-size: 12px;
  font-weight: 640;
}

.section-title span:first-child {
  color: color-mix(in oklch, var(--fg) 96%, white);
}

.section-title span:last-child:not(.badge) {
  color: color-mix(in oklch, var(--accent) 64%, white);
  font: 10.5px/1 var(--font-mono);
  letter-spacing: 0.2px;
}

.badge-row {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 8px;
}

/* Active-layer entity count, relocated out of the global status bar so the
   top chrome stays layer-agnostic as more layers are added. */
.layer-metric {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 10px;
}

.layer-metric strong {
  font-size: 22px;
  line-height: 1;
}

.layer-metric span {
  color: color-mix(in oklch, var(--muted) 82%, white);
  font: 11px/1.35 var(--font-mono);
}


.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 21px;
  padding: 0 6px;
  border: 1px solid color-mix(in oklch, var(--border) 58%, transparent);
  border-radius: 999px;
  background: color-mix(in oklch, var(--surface) 42%, transparent);
  color: color-mix(in oklch, var(--muted) 88%, white);
  font: 10.5px/1 var(--font-mono);
  white-space: nowrap;
}

.badge.live {
  border-color: color-mix(in oklch, var(--ok) 40%, transparent);
  color: color-mix(in oklch, var(--ok) 78%, white);
}

.badge.source {
  border-color: color-mix(in oklch, var(--accent) 42%, transparent);
  color: color-mix(in oklch, var(--accent) 64%, white);
}

.badge.sample {
  border-color: color-mix(in oklch, var(--warn) 35%, transparent);
  color: color-mix(in oklch, var(--warn) 72%, white);
}

.toggle-row,
.control-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 10px 0;
  color: color-mix(in oklch, var(--fg) 82%, var(--muted));
  font-size: 12px;
}

.switch {
  position: relative;
  width: 38px;
  height: 21px;
  flex: 0 0 auto;
}

.switch input {
  position: absolute;
  opacity: 0;
}

.switch span {
  position: absolute;
  inset: 0;
  border: 1px solid color-mix(in oklch, var(--border) 70%, transparent);
  border-radius: 999px;
  background: color-mix(in oklch, var(--surface) 58%, black);
}

.switch span::after {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: var(--muted);
  content: "";
  transition: transform 0.16s ease, background 0.16s ease;
}

.switch input:checked + span {
  border-color: color-mix(in oklch, var(--accent) 62%, transparent);
  background: color-mix(in oklch, var(--accent) 22%, var(--surface));
}

.switch input:checked + span::after {
  background: var(--accent);
  transform: translateX(17px);
}

.field {
  display: grid;
  gap: 6px;
  margin: 11px 0;
}

.mobile-layer-context {
  display: none;
}

.filter-grid {
  display: grid;
}

.field label,
.check-label {
  color: color-mix(in oklch, var(--muted) 78%, white);
  font-size: 11px;
  font-weight: 510;
}

select,
input[type="range"] {
  width: 100%;
  min-width: 0;
  accent-color: var(--accent);
}

select {
  height: 33px;
  padding: 0 10px;
  border: 1px solid color-mix(in oklch, var(--border) 64%, transparent);
  border-radius: 7px;
  background: color-mix(in oklch, var(--surface) 54%, black);
  color: var(--fg);
  font-size: 12px;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 32px;
  margin-top: 8px;
}

.checkbox input {
  accent-color: var(--accent);
}

.experimental-toggle {
  align-items: flex-start;
  padding: 8px;
  border: 1px dashed color-mix(in oklch, var(--warn) 46%, var(--border));
  border-radius: 8px;
  background: color-mix(in oklch, var(--warn) 5%, transparent);
}

.experimental-toggle input {
  margin-top: 2px;
}

.experimental-toggle strong,
.experimental-toggle small {
  display: block;
}

.experimental-toggle strong {
  color: color-mix(in oklch, var(--warn) 58%, white);
  font-size: 11px;
}

.experimental-toggle small {
  margin-top: 3px;
  color: var(--muted);
  font-size: 10px;
  line-height: 1.35;
}

.mini-table {
  width: 100%;
  border-collapse: collapse;
  color: color-mix(in oklch, var(--muted) 80%, white);
  font: 11px/1.3 var(--font-mono);
}

.mini-table td {
  padding: 7px 0;
  border-top: 1px solid color-mix(in oklch, var(--border) 34%, transparent);
  vertical-align: top;
}

.mini-table td:last-child {
  color: var(--fg);
  text-align: right;
}

.inline-warning {
  margin-top: 10px;
  padding: 8px;
  border: 1px solid color-mix(in oklch, var(--warn) 36%, transparent);
  border-radius: 7px;
  background: color-mix(in oklch, var(--warn) 10%, transparent);
  color: color-mix(in oklch, var(--warn) 72%, white);
  font: 11px/1.45 var(--font-mono);
}

.route-health-section {
  --route-health-tone: var(--accent);
}

.route-health-copy {
  margin: 0 0 10px;
  color: color-mix(in oklch, var(--muted) 84%, white);
  font-size: 11px;
  line-height: 1.45;
}

.route-health-list {
  display: grid;
  gap: 8px;
}

.route-health-row {
  --route-health-tone: var(--accent);
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) minmax(88px, auto);
  grid-template-areas:
    "status main metric"
    "open main metric";
  gap: 5px 8px;
  padding: 9px 10px;
  border: 1px solid color-mix(in oklch, var(--route-health-tone) 36%, var(--border));
  border-left-width: 3px;
  border-radius: 8px;
  background:
    linear-gradient(90deg, color-mix(in oklch, var(--route-health-tone) 13%, transparent), transparent 76%),
    color-mix(in oklch, var(--surface) 44%, transparent);
  color: var(--fg);
  text-decoration: none;
}

.route-health-row:hover,
.route-health-row:focus-visible {
  border-color: color-mix(in oklch, var(--route-health-tone) 66%, var(--border));
  outline: none;
}

.route-health-row.critical {
  --route-health-tone: var(--critical);
}

.route-health-row.warning {
  --route-health-tone: var(--warn);
}

.route-health-row.watch {
  --route-health-tone: #5f8ee8;
}

.route-health-row.data-quality {
  --route-health-tone: #8fa7ba;
}

.route-health-status {
  grid-area: status;
  align-self: start;
  min-width: 52px;
  padding: 3px 7px;
  border: 1px solid color-mix(in oklch, var(--route-health-tone) 54%, transparent);
  border-radius: 999px;
  color: color-mix(in oklch, var(--route-health-tone) 34%, white);
  font: 10px/1 var(--font-mono);
  text-align: center;
  white-space: nowrap;
}

.route-health-main {
  grid-area: main;
  min-width: 0;
}

.route-health-main strong,
.route-health-main small,
.route-health-metric b,
.route-health-metric small {
  display: block;
}

.route-health-main strong {
  overflow: hidden;
  color: var(--fg);
  font-size: 12px;
  font-weight: 680;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.route-health-main small {
  margin-top: 3px;
  color: color-mix(in oklch, var(--muted) 83%, white);
  font-size: 10px;
  line-height: 1.3;
}

.route-health-type {
  color: color-mix(in oklch, var(--route-health-tone) 34%, white);
  font-weight: 720;
}

.route-health-metric {
  grid-area: metric;
  min-width: 0;
  text-align: right;
}

.route-health-metric b {
  color: color-mix(in oklch, var(--route-health-tone) 30%, white);
  font: 11px/1.2 var(--font-mono);
}

.route-health-metric small {
  margin-top: 4px;
  color: color-mix(in oklch, var(--muted) 74%, white);
  font: 10px/1.2 var(--font-mono);
}

.route-health-open {
  grid-area: open;
  align-self: end;
  color: color-mix(in oklch, var(--accent) 50%, white);
  font: 10px/1 var(--font-mono);
}

.route-health-overflow {
  padding: 2px 4px 0;
  color: color-mix(in oklch, var(--muted) 78%, white);
  font: 10px/1.3 var(--font-mono);
  text-align: right;
}

.route-service-panel {
  display: grid;
  gap: 10px;
}

.route-service-kpis {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
}

.route-service-kpis div {
  min-width: 0;
  padding: 8px;
  border: 1px solid color-mix(in oklch, var(--border) 36%, transparent);
  border-radius: 8px;
  background: color-mix(in oklch, var(--surface) 34%, transparent);
}

.route-service-kpis strong,
.route-service-kpis span {
  display: block;
}

.route-service-kpis strong {
  color: var(--fg);
  font: 13px/1.1 var(--font-mono);
}

.route-service-kpis span {
  margin-top: 5px;
  color: color-mix(in oklch, var(--muted) 78%, white);
  font-size: 10px;
  line-height: 1.25;
}

.route-service-headways {
  display: grid;
  gap: 6px;
}

.route-service-headway {
  --route-service-tone: var(--accent);
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) 74px;
  align-items: center;
  gap: 7px;
  color: color-mix(in oklch, var(--muted) 80%, white);
  font: 10px/1.2 var(--font-mono);
}

.route-service-headway.gap {
  --route-service-tone: var(--warn);
}

.route-service-headway.bunching {
  --route-service-tone: #5f8ee8;
}

.route-service-headway b {
  color: color-mix(in oklch, var(--route-service-tone) 36%, white);
  font-weight: 680;
  text-align: right;
}

.route-service-bar-track {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in oklch, var(--border) 36%, transparent);
}

.route-service-bar {
  width: var(--route-service-width, 24%);
  height: 100%;
  border-radius: inherit;
  background: color-mix(in oklch, var(--route-service-tone) 58%, white);
}

.route-service-signals {
  display: grid;
  gap: 7px;
}

.route-service-signal {
  --route-service-signal: var(--warn);
  display: grid;
  gap: 3px;
  padding: 8px 9px;
  border: 1px solid color-mix(in oklch, var(--route-service-signal) 38%, var(--border));
  border-left-width: 3px;
  border-radius: 8px;
  background:
    linear-gradient(90deg, color-mix(in oklch, var(--route-service-signal) 12%, transparent), transparent 76%),
    color-mix(in oklch, var(--surface) 34%, transparent);
}

.route-service-signal.vehicle_bunching {
  --route-service-signal: #5f8ee8;
}

.route-service-signal.stable {
  --route-service-signal: var(--ok);
}

.route-service-signal strong {
  color: color-mix(in oklch, var(--route-service-signal) 32%, white);
  font-size: 11px;
}

.route-service-signal span,
.route-service-note {
  color: color-mix(in oklch, var(--muted) 80%, white);
  font: 10.5px/1.35 var(--font-mono);
}

.route-service-note {
  margin: 0;
}

.route-detail-link {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  margin-top: 7px;
  padding: 0 9px;
  border: 1px solid color-mix(in oklch, var(--accent) 36%, transparent);
  border-radius: 7px;
  background: color-mix(in oklch, var(--accent) 9%, transparent);
  color: color-mix(in oklch, var(--accent) 42%, white);
  font: 10.5px/1 var(--font-mono);
  text-decoration: none;
}

.route-detail-link:hover,
.route-detail-link:focus-visible {
  border-color: color-mix(in oklch, var(--accent) 62%, var(--border));
  outline: none;
}

.analytics-empty {
  padding: 7px 0;
  border-top: 1px solid color-mix(in oklch, var(--border) 30%, transparent);
  color: color-mix(in oklch, var(--muted) 70%, white);
  font: 10.5px/1.35 var(--font-mono);
}

.record-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.record-actions {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.track-btn {
  width: 28px;
  height: 28px;
  display: inline-grid;
  place-items: center;
  border: 1px solid color-mix(in oklch, var(--border) 58%, transparent);
  border-radius: 7px;
  background: color-mix(in oklch, var(--surface) 42%, transparent);
  color: color-mix(in oklch, var(--muted) 90%, white);
}

.track-btn.active {
  border-color: color-mix(in oklch, var(--accent) 70%, transparent);
  background: color-mix(in oklch, var(--accent) 20%, var(--surface));
  color: color-mix(in oklch, var(--accent) 28%, white);
}

.track-btn:hover,
.track-btn:focus-visible {
  border-color: color-mix(in oklch, var(--accent) 58%, var(--border));
  color: var(--fg);
  outline: none;
}

.inspector-tool {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: center;
  margin-top: 12px;
  padding: 10px;
  border: 1px solid color-mix(in oklch, var(--border) 46%, transparent);
  border-radius: 8px;
  background: color-mix(in oklch, var(--surface) 34%, transparent);
}

.inspector-tool strong {
  display: block;
  font-size: 13px;
}

.inspector-tool p {
  margin-top: 4px;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.4;
}

.route-progress-panel {
  margin-top: 10px;
  padding: 10px;
  border: 1px solid color-mix(in oklch, var(--warn) 30%, var(--border));
  border-radius: 8px;
  background:
    linear-gradient(135deg, color-mix(in oklch, var(--warn) 8%, transparent), transparent 42%),
    color-mix(in oklch, var(--surface) 34%, transparent);
}

.route-progress-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.route-progress-head strong {
  display: block;
  font-size: 13px;
}

.route-progress-head p {
  margin-top: 4px;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.35;
}

.route-progress-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 10px;
}

.route-progress-grid div {
  min-width: 0;
  padding-top: 8px;
  border-top: 1px solid color-mix(in oklch, var(--border) 40%, transparent);
}

.route-progress-grid span {
  display: block;
  color: var(--muted);
  font: 10px/1.2 var(--font-mono);
  text-transform: uppercase;
}

.route-progress-grid strong {
  display: block;
  margin-top: 4px;
  overflow-wrap: anywhere;
  font-size: 12px;
  font-weight: 590;
}

.signal-detail-panel {
  padding: 11px;
  border: 1px solid color-mix(in oklch, var(--warn) 34%, var(--border));
  border-radius: 8px;
  background:
    linear-gradient(135deg, color-mix(in oklch, var(--warn) 9%, transparent), transparent 48%),
    color-mix(in oklch, var(--surface) 34%, transparent);
}

.signal-detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.signal-detail-head strong {
  display: block;
  font-size: 14px;
}

.signal-detail-head p {
  margin-top: 4px;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.35;
}

.plate {
  font: 22px/1.05 var(--font-mono);
}

.route {
  color: var(--accent);
  font-size: 13px;
  font-weight: 590;
}

.kv {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 12px;
}

.kv-card {
  padding: 10px;
  border: 1px solid color-mix(in oklch, var(--border) 46%, transparent);
  border-radius: 8px;
  background: color-mix(in oklch, var(--surface) 36%, transparent);
}

.kv-card span {
  display: block;
  color: var(--muted);
  font: 10px/1.2 var(--font-mono);
  text-transform: uppercase;
}

.kv-card strong {
  display: block;
  margin-top: 5px;
  overflow-wrap: anywhere;
  font-size: 13px;
  font-weight: 590;
}

.evidence-list {
  display: grid;
  gap: 8px;
  margin-top: 10px;
}

.evidence-item {
  padding: 9px;
  border: 1px solid color-mix(in oklch, var(--border) 42%, transparent);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.025);
  color: color-mix(in oklch, var(--muted) 86%, white);
  font-size: 11px;
  line-height: 1.4;
}

.evidence-item strong {
  color: var(--fg);
  font-weight: 590;
}

.technical-details {
  margin-top: 10px;
}

.technical-details summary {
  cursor: pointer;
  color: var(--muted);
  font: 11px/1.3 var(--font-mono);
}

.technical-details[open] summary {
  color: var(--fg);
}

pre {
  max-height: 220px;
  margin: 10px 0 0;
  overflow: auto;
  padding: 11px;
  border: 1px solid color-mix(in oklch, var(--border) 48%, transparent);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.32);
  color: color-mix(in oklch, var(--fg) 82%, var(--accent));
  font: 11px/1.52 var(--font-mono);
}

.timeline {
  position: fixed;
  inset: auto 10px var(--timeline-gap) 10px;
  z-index: 25;
  height: var(--timeline-height);
  display: grid;
  grid-template-columns: 210px minmax(340px, 1fr) max-content;
  gap: 18px;
  align-items: center;
  padding: 9px 14px;
  border: 1px solid color-mix(in oklch, var(--border) 60%, transparent);
  border-radius: 12px;
  background: color-mix(in oklch, var(--bg) 92%, black);
  backdrop-filter: blur(18px);
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.38);
}

.timeline-status {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.timeline-title-row {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.timeline-title {
  color: var(--muted);
  font: 10px/1 var(--font-mono);
  text-transform: uppercase;
}

.live-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  flex: 0 0 auto;
  padding: 2px 6px;
  border: 1px solid color-mix(in oklch, var(--border) 58%, transparent);
  border-radius: 999px;
  color: color-mix(in oklch, var(--muted) 86%, white);
  font: 9px/1 var(--font-mono);
  text-transform: uppercase;
}

.live-pill.active,
.live-pill.idle {
  border-color: color-mix(in oklch, var(--ok) 54%, transparent);
  color: color-mix(in oklch, var(--ok) 24%, white);
}

.live-dot {
  width: 5px;
  height: 5px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: var(--muted);
}

.live-pill.active .live-dot,
.live-pill.idle .live-dot {
  background: var(--ok);
  box-shadow: 0 0 10px color-mix(in oklch, var(--ok) 68%, transparent);
}

.live-pill.active .live-dot {
  animation: livePulse 1.4s ease-in-out infinite;
}

.timeline-status strong {
  overflow: hidden;
  color: var(--fg);
  font: 18px/1.05 var(--font-mono);
  font-weight: 590;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.timeline-detail,
.timeline-zone {
  overflow: hidden;
  color: var(--muted);
  font: 10px/1.1 var(--font-mono);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.timeline-zone {
  display: none;
}

.timeline-center {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.timeline-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  overflow: hidden;
  color: color-mix(in oklch, var(--muted) 90%, white);
  font: 10px/1 var(--font-mono);
  white-space: nowrap;
}

.timeline-meta span {
  overflow: hidden;
  text-overflow: ellipsis;
}

.track {
  position: relative;
  height: 30px;
  overflow: hidden;
  border: 1px solid color-mix(in oklch, var(--border) 44%, transparent);
  border-radius: 8px;
  background:
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.045) 0 1px, transparent 1px 72px),
    rgba(255, 255, 255, 0.018);
}

.coverage-fill,
.track-fill {
  position: absolute;
  inset: 0 auto 0 0;
  pointer-events: none;
}

.coverage-fill {
  width: var(--timeline-coverage);
  background: color-mix(in oklch, var(--accent) 7%, transparent);
}

.track-fill {
  width: var(--timeline-progress);
  border-right: 1px solid color-mix(in oklch, var(--accent) 72%, transparent);
  background: linear-gradient(90deg, color-mix(in oklch, var(--accent) 24%, transparent), transparent);
  transition: width 0.22s linear;
}

.timeline-slider {
  position: absolute;
  inset: 0;
  z-index: 3;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.timeline-slider:disabled {
  cursor: not-allowed;
}

.track-label {
  position: absolute;
  top: 50%;
  color: color-mix(in oklch, var(--fg) 74%, var(--muted));
  font: 10px/1 var(--font-mono);
  pointer-events: none;
  transform: translateY(-50%);
}

.track-label.start {
  left: 10px;
}

.track-label.mid {
  left: 50%;
  transform: translate(-50%, -50%);
}

.track-label.now {
  right: 10px;
  color: color-mix(in oklch, var(--accent) 44%, white);
}

.now-marker {
  position: absolute;
  top: 5px;
  bottom: 5px;
  left: var(--timeline-progress);
  width: 2px;
  border-radius: 99px;
  background: var(--accent);
  box-shadow: 0 0 14px color-mix(in oklch, var(--accent) 70%, transparent);
  transition: left 0.22s linear;
}

.timeline-hover {
  position: absolute;
  z-index: 4;
  top: 50%;
  max-width: calc(100% - 18px);
  padding: 5px 8px;
  border: 1px solid color-mix(in oklch, var(--accent) 44%, var(--border));
  border-radius: 7px;
  background: color-mix(in oklch, var(--surface) 92%, black);
  color: var(--fg);
  font: 10px/1 var(--font-mono);
  white-space: nowrap;
  pointer-events: none;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.28);
  transform: translate(-50%, -50%);
}

.timeline-hover::after {
  position: absolute;
  left: 50%;
  bottom: -7px;
  width: 1px;
  height: 7px;
  content: "";
  background: var(--accent);
  transform: translateX(-50%);
}

.timeline-actions {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-end;
  gap: 7px;
}

@keyframes livePulse {
  0%,
  100% {
    opacity: 0.55;
    transform: scale(0.8);
  }

  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}

.speed-control {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px;
  border: 1px solid color-mix(in oklch, var(--border) 48%, transparent);
  border-radius: 9px;
  background: color-mix(in oklch, var(--surface) 36%, transparent);
}

.speed-btn {
  width: auto;
  min-width: 34px;
  height: 28px;
  padding-inline: 6px;
  border-color: transparent;
  background: transparent;
  font: 11px/1 var(--font-mono);
}

.speed-btn.primary {
  border-color: color-mix(in oklch, var(--accent) 56%, transparent);
  background: color-mix(in oklch, var(--accent) 20%, var(--surface));
}

.disabled {
  cursor: not-allowed;
  opacity: 0.46;
}

.tooltip {
  position: fixed;
  z-index: 80;
  min-width: 184px;
  padding: 9px 10px;
  border: 1px solid color-mix(in oklch, var(--accent) 42%, var(--border));
  border-radius: 8px;
  background: color-mix(in oklch, var(--surface) 90%, black);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.45);
  color: var(--fg);
  font-size: 12px;
  pointer-events: none;
}

.tooltip .muted {
  margin-top: 4px;
  color: var(--muted);
  font: 10px/1.5 var(--font-mono);
}

.health-drawer {
  position: fixed;
  z-index: 70;
  top: 62px;
  right: 16px;
  display: none;
  width: min(680px, calc(100% - 32px));
  max-height: calc(100% - 158px);
  overflow: auto;
  padding: 14px;
  border: 1px solid color-mix(in oklch, var(--border) 72%, transparent);
  border-radius: 12px;
  background: color-mix(in oklch, var(--panel) 94%, black);
  backdrop-filter: blur(20px);
  box-shadow: 0 28px 90px rgba(0, 0, 0, 0.5);
}

.health-drawer.open {
  display: block;
}

.drawer-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid color-mix(in oklch, var(--border) 46%, transparent);
}

.source-health-list {
  margin-top: 12px;
  overflow: hidden;
  border: 1px solid color-mix(in oklch, var(--border) 46%, transparent);
  border-radius: 10px;
  background: color-mix(in oklch, var(--surface) 28%, transparent);
}

.source-health-row {
  display: grid;
  grid-template-columns: minmax(180px, 1.5fr) 92px 84px minmax(96px, 1fr) 80px;
  gap: 10px;
  align-items: center;
  min-width: 0;
  padding: 10px 12px;
  border-top: 1px solid color-mix(in oklch, var(--border) 34%, transparent);
  color: color-mix(in oklch, var(--fg) 88%, var(--muted));
  font-size: 12px;
}

.source-health-row:first-child {
  border-top: 0;
}

.source-health-head {
  background: color-mix(in oklch, var(--surface) 44%, black);
  color: var(--muted);
  font: 10px/1 var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.source-name {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.source-name strong {
  overflow: hidden;
  color: var(--fg);
  font-weight: 620;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-name small {
  color: var(--muted);
  font: 10px/1.2 var(--font-mono);
}

.health-status {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 8px;
  border: 1px solid color-mix(in oklch, var(--border) 52%, transparent);
  border-radius: 999px;
  background: color-mix(in oklch, var(--surface) 52%, transparent);
  color: var(--muted);
  font: 10px/1 var(--font-mono);
  text-transform: uppercase;
}

.status-ok .health-status {
  border-color: color-mix(in oklch, var(--ok) 42%, var(--border));
  color: color-mix(in oklch, var(--ok) 42%, white);
}

.status-syncing .health-status {
  border-color: color-mix(in oklch, var(--accent) 46%, var(--border));
  color: color-mix(in oklch, var(--accent) 38%, white);
}

.status-planned .health-status {
  border-color: color-mix(in oklch, var(--warn) 38%, var(--border));
  color: color-mix(in oklch, var(--warn) 35%, white);
}

.status-empty .health-status,
.status-error .health-status {
  border-color: color-mix(in oklch, var(--critical) 44%, var(--border));
  color: color-mix(in oklch, var(--critical) 26%, white);
}

@media (max-width: 1180px) {
  .left-panel {
    width: 300px;
  }

  .right-panel {
    width: 342px;
  }

  .map-chip-row {
    left: 330px;
    max-width: calc(100% - 700px);
  }

  .signal-alert-stack {
    left: 330px;
    max-width: calc(100% - 710px);
  }

  .zoom-controls {
    bottom: 46px;
    right: 14px;
  }

  .operations-explorer.inspector-open .zoom-controls {
    right: 374px;
  }

  .metric.budget {
    display: none;
  }

  .timeline {
    grid-template-columns: 180px minmax(300px, 1fr) max-content;
  }
}

@media (max-width: 900px) {
  .operations-explorer {
    --timeline-height: 106px;
  }

  .status-bar {
    grid-template-columns: max-content 1fr;
  }

  .actions {
    grid-column: 2;
    justify-content: flex-end;
  }

  .left-panel {
    right: auto;
    bottom: var(--panel-bottom-offset);
    width: calc(50% - 21px);
    min-width: 0;
  }

  .right-panel {
    bottom: var(--panel-bottom-offset);
    width: calc(50% - 21px);
    min-width: 0;
  }

  .map-chip-row {
    display: none;
  }

  .signal-alert-stack {
    left: 14px;
    top: 70px;
    max-width: calc(100% - 390px);
  }

  .zoom-controls {
    top: 18px;
    right: 14px;
    bottom: auto;
  }

  .operations-explorer.inspector-open .zoom-controls {
    right: 14px;
  }

  .timeline {
    grid-template-columns: 150px 1fr;
    gap: 8px;
  }

  .timeline-actions {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }
}

@media (max-width: 680px) {
  .operations-explorer {
    --timeline-height: 88px;
  }

  .status-bar {
    height: 76px;
    grid-template-columns: 1fr max-content;
    align-items: start;
    padding-top: 8px;
  }

  .brand-sub {
    display: none;
  }

  .status-strip {
    grid-column: 1 / -1;
    order: 3;
    width: 100%;
    gap: 6px;
  }

  .actions {
    grid-column: auto;
  }

  .btn {
    height: 28px;
    padding-inline: 9px;
    font-size: 11px;
  }

  .locale-btn {
    height: 24px;
    min-width: 34px;
    padding-inline: 7px;
  }

  .metric {
    height: 26px;
    gap: 5px;
    padding-inline: 6px;
    font-size: 10.5px;
  }

  .metric-time em {
    display: none;
  }

  .metric:nth-child(4) {
    display: none;
  }

  .map-shell {
    inset: 76px 0 calc(var(--timeline-height) + var(--timeline-gap)) 0;
  }

  .left-panel {
    top: 88px;
    right: 10px;
    bottom: auto;
    left: 10px;
    width: auto;
    max-height: none;
    border-radius: 8px;
  }

  .right-panel {
    top: auto;
    right: 10px;
    bottom: var(--panel-bottom-offset);
    left: 10px;
    width: auto;
    height: min(30dvh, 240px);
  }

  .operations-explorer.inspector-open .left-panel {
    display: none;
  }

  .operations-explorer.inspector-open .tooltip {
    display: none;
  }

  .panel-header {
    padding: 10px 12px 8px;
  }

  .panel-title {
    font-size: 14px;
  }

  .left-panel .panel-header {
    display: none;
  }

  .left-panel .panel-copy,
  .left-panel .badge-row {
    display: none;
  }

  .right-panel .panel-copy {
    display: none;
  }

  .right-panel .inspector-ghost-tool {
    display: none;
  }

  .panel-body {
    padding: 10px 12px;
  }

  .left-panel .panel-body {
    padding: 8px;
  }

  .left-panel .section:nth-child(2),
  .left-panel .section:nth-child(3) {
    display: none;
  }

  .left-panel .section {
    padding: 0;
    border-top: 0;
  }

  .left-panel .section-title {
    display: none;
  }

  .mobile-layer-context {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 0 3px 7px;
  }

  .mobile-layer-context span {
    color: var(--muted);
    font: 10px/1 var(--font-mono);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .mobile-layer-context strong {
    overflow: hidden;
    color: color-mix(in oklch, var(--accent) 42%, white);
    font-size: 12px;
    font-weight: 620;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .left-panel .field label,
  .left-panel .checkbox {
    display: none;
  }

  .left-panel .filter-grid {
    grid-template-columns: minmax(116px, 0.9fr) minmax(0, 1.3fr);
    gap: 7px;
  }

  .left-panel .field {
    margin: 0;
  }

  .left-panel select {
    min-height: 42px;
    border-radius: 8px;
  }

  .signal-alert-stack {
    top: 178px;
    right: 24px;
    left: 24px;
    z-index: 32;
    max-width: none;
  }

  .operations-explorer.inspector-open .signal-alert-stack {
    display: none;
  }

  .kv,
  .source-health-row {
    grid-template-columns: 1fr;
  }

  .zoom-controls {
    top: 45%;
    right: 10px;
    bottom: auto;
    z-index: 30;
    grid-template-columns: 38px;
  }

  .operations-explorer.inspector-open .zoom-controls {
    right: 10px;
  }

  .zoom-readout {
    min-height: 24px;
  }

  .zoom-reset {
    display: none;
  }

  .timeline {
    padding: 8px 10px;
  }

  .track {
    height: 28px;
  }

  .timeline-meta {
    display: none;
  }

  .timeline-status strong {
    font-size: 15px;
  }

  .timeline-detail {
    display: none;
  }

  .timeline-zone {
    display: block;
    color: color-mix(in oklch, var(--muted) 82%, var(--accent));
    font-size: 8px;
  }

  .timeline-actions {
    gap: 6px;
  }
}
</style>
