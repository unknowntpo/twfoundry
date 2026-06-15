<script setup>
import { computed, onMounted, ref } from 'vue';
import {
  buildRouteMeasure,
  buildRouteProgressObservation,
  buildStopProgress,
  findMatchingShape,
  findMatchingStopOfRoute,
  parseLineStringGeometry,
  projectPointToRoute,
} from './busRouteGeometry.js';
import {
  headwaySeverity,
  headwaySeverityLabelZh,
  isCriticalHeadway,
} from './busReliabilitySignals.js';
import {
  formatRouteOperatorNames,
  routeOperatorsFromContext,
} from './busRouteOperators.js';
import {
  BUS_VEHICLE_PROJECTION_TIMELINE_URL,
  BUS_VEHICLE_PROJECTION_URL,
  OPERATIONS_ARCHIVE_MANIFEST_URL,
  createOperationsFromArchivePayload,
  createOperationsFromSnapshot,
} from './operationsWorkflowData.js';

const initialRouteName = new URLSearchParams(globalThis.location?.search ?? '').get('route') || '205';
const routeName = ref(initialRouteName);
const direction = ref(0);
const routeContext = ref(null);
const sampleObservation = ref(null);
const loadError = ref('');
const routeContextWarning = ref('');
const analyticsError = ref('');
const analyticsLoading = ref(false);
const analyticsData = ref({
  serviceDate: '',
  publishedAt: '',
  bunching: [],
  freshness: [],
  density: [],
});
const liveMonitoringLoading = ref(true);
const liveMonitoringLoaded = ref(false);
const liveMonitoringSource = ref(null);
const liveMonitoringRows = ref({
  bunching: [],
  freshness: [],
  density: [],
});
const monitoringTimelineEntries = ref([]);
const monitoringTimelineIndex = ref(0);
const monitoringTimelineScrubIndex = ref(null);
const monitoringTimelinePendingCommitIndex = ref(null);
const currentMonitoringObservations = ref([]);
const delayPocLoading = ref(true);
const delayPocError = ref('');
const delayPocData = ref(null);
const selectedDelayCandidateId = ref(null);
let monitoringTimelineScrubFrame = 0;
let monitoringTimelinePendingScrubIndex = null;
let monitoringTimelineCommitPendingIndex = -1;

const viewport = {
  width: 1120,
  height: 520,
  padding: 64,
};

const routeShape = computed(() => {
  if (!routeContext.value) return null;
  return (routeContext.value.shapes ?? []).find((shape) => Number(shape.Direction) === direction.value) ?? null;
});
const routeStops = computed(() => {
  if (!routeContext.value) return null;
  return (routeContext.value.stopOfRoutes ?? []).find((route) => Number(route.Direction) === direction.value) ?? null;
});
const routePoints = computed(() => parseLineStringGeometry(routeShape.value?.Geometry));
const routeMeasure = computed(() => buildRouteMeasure(routePoints.value));
const stopProgress = computed(() => buildStopProgress(routeStops.value, routeMeasure.value));
const visibleStops = computed(() => (
  stopProgress.value
    .filter((stop) => stop.position && Number.isFinite(stop.progressMeters))
    .sort((left, right) => left.sequence - right.sequence)
));
const sampleProgress = computed(() => (
  sampleObservation.value && routeContext.value
    ? buildRouteProgressObservation(sampleObservation.value, routeContext.value)
    : null
));
const bounds = computed(() => computeBounds([
  ...routePoints.value,
  ...visibleStops.value.map((stop) => stop.position),
  sampleObservation.value
    ? [sampleObservation.value.position.longitude, sampleObservation.value.position.latitude]
    : null,
].filter(Boolean)));
const routePath = computed(() => svgPath(routePoints.value));
const stopPairs = computed(() => visibleStops.value.map((stop) => ({
  stop,
  raw: projectToSvg(stop.position),
  matched: projectToSvg(projectPointToRoute(stop.position, routeMeasure.value)?.point),
})));
const busRaw = computed(() => (
  sampleObservation.value
    ? projectToSvg([sampleObservation.value.position.longitude, sampleObservation.value.position.latitude])
    : null
));
const busMatched = computed(() => (
  sampleProgress.value
    ? projectToSvg([sampleProgress.value.matchedPosition.longitude, sampleProgress.value.matchedPosition.latitude])
    : null
));
const selectedDirectionStops = computed(() => visibleStops.value.slice(0, 7));
const routeContextSummary = computed(() => ({
  routeName: routeContext.value?.routeName ?? routeName.value,
  shapeCount: routeContext.value?.shapeCount ?? 0,
  stopOfRouteCount: routeContext.value?.stopOfRouteCount ?? 0,
  totalStops: routeStops.value?.Stops?.length ?? 0,
  routeLengthKm: routeMeasure.value.totalMeters / 1000,
}));
const routeStripStops = computed(() => {
  const stops = visibleStops.value;
  if (stops.length === 0) return [];

  const targetIndexes = [0, 0.18, 0.36, 0.55, 0.74, 0.9, 1]
    .map((ratio) => Math.round((stops.length - 1) * ratio));
  return [...new Set(targetIndexes)].map((index) => {
    const stop = stops[index];
    return {
      ...stop,
      fullName: stop.name,
      name: compactStopName(stop.name),
      positionPercent: clampPercent((stop.progressRatio ?? index / Math.max(stops.length - 1, 1)) * 100),
    };
  });
});
const monitoringBunchingRows = computed(() => {
  if (liveMonitoringLoaded.value) return liveMonitoringRows.value.bunching;
  if (liveMonitoringLoading.value) return [];
  return analyticsData.value.bunching;
});
const monitoringFreshnessRows = computed(() => {
  if (liveMonitoringLoaded.value) return liveMonitoringRows.value.freshness;
  if (liveMonitoringLoading.value) return [];
  return analyticsData.value.freshness;
});
const monitoringDensityRows = computed(() => {
  if (liveMonitoringLoaded.value) return liveMonitoringRows.value.density;
  if (liveMonitoringLoading.value) return [];
  return analyticsData.value.density;
});
const routeBunchingRows = computed(() => monitoringBunchingRows.value
  .filter((row) => row.route_name === routeName.value)
  .sort((left, right) => Number(right.estimated_headway_minutes) - Number(left.estimated_headway_minutes)));
const routeFreshnessRows = computed(() => monitoringFreshnessRows.value
  .filter((row) => row.route_name === routeName.value)
  .sort((left, right) => Number(right.off_route_rate) - Number(left.off_route_rate)));
const routeDensityRows = computed(() => monitoringDensityRows.value
  .filter((row) => row.route_name === routeName.value));
const primaryBunchingRow = computed(() => routeBunchingRows.value[0] ?? null);
const maxHeadwayMinutes = computed(() => Number(primaryBunchingRow.value?.estimated_headway_minutes));
const primarySignalSeverity = computed(() => headwaySeverity(maxHeadwayMinutes.value));
const delayPocCandidates = computed(() => delayPocData.value?.delayCandidates ?? []);
const delayPocEvidenceRows = computed(() => delayPocData.value?.etaEvidence ?? []);
const primaryDelayCandidate = computed(() => delayPocCandidates.value[0] ?? null);
const routeOperators = computed(() => routeOperatorsFromContext(routeContext.value, { direction: direction.value }));
const routeOperatorLabel = computed(() => formatRouteOperatorNames(routeOperators.value));
const primaryDelaySeverity = computed(() => {
  if (delayPocCandidates.value.some((row) => row.severity === 'critical')) return 'critical';
  if (delayPocCandidates.value.some((row) => row.severity === 'warning')) return 'warning';
  if (delayPocCandidates.value.some((row) => row.severity === 'watch')) return 'watch';
  return 'info';
});
const primaryDelayLabel = computed(() => {
  if (delayPocCandidates.value.some((row) => row.signalVariant === 'departure_delay')) return '發車誤點待確認';
  if (delayPocCandidates.value.some((row) => row.signalSubtype === 'timetable_delay')) return '表定誤點待確認';
  if (delayPocCandidates.value.length > 0) return '候車超時待確認';
  return '';
});
const routeStatus = computed(() => {
  if (liveMonitoringLoading.value || analyticsLoading.value) return '載入中';
  if (delayPocCandidates.value.length > 0) return primaryDelayLabel.value;
  if (routeBunchingRows.value.length > 0) return '疑似服務空窗';
  if (routeFreshnessRows.value.length > 0) return '資料品質觀察';
  return '目前無異常訊號';
});
const routeStatusClass = computed(() => {
  if (delayPocCandidates.value.length > 0) return primaryDelaySeverity.value;
  if (routeStatus.value === '疑似服務空窗') return primarySignalSeverity.value;
  if (routeStatus.value === '資料品質觀察') return 'watch';
  return 'info';
});
const monitorModeLabel = computed(() => {
  if (liveMonitoringLoading.value) return '載入監控資料';
  if (liveMonitoringLoaded.value) return `監控資料 ${formatMonitorSourceTime(liveMonitoringSource.value)}`;
  if (analyticsLoading.value) return '載入監控資料';
  if (analyticsData.value.serviceDate) return `監控資料 ${analyticsData.value.serviceDate}`;
  return '監控資料';
});
const monitoringTimelineMax = computed(() => Math.max(0, monitoringTimelineEntries.value.length - 1));
const monitoringTimelineDisabled = computed(() => monitoringTimelineEntries.value.length <= 1 || liveMonitoringLoading.value);
const monitoringTimelineSliderValue = computed(() => (
  monitoringTimelineScrubIndex.value
  ?? monitoringTimelinePendingCommitIndex.value
  ?? monitoringTimelineIndex.value
));
const monitoringTimelineStartLabel = computed(() => (
  formatTimelineEntryLabel(monitoringTimelineEntries.value[0]) || '--:--'
));
const monitoringTimelineEndLabel = computed(() => (
  formatTimelineEntryLabel(monitoringTimelineEntries.value.at(-1)) || '--:--'
));
const monitoringTimelineCurrentLabel = computed(() => (
  formatTimelineEntryLabel(monitoringTimelineEntries.value[monitoringTimelineSliderValue.value]) || '--:--'
));
const monitoringTimelineProgressPercent = computed(() => {
  if (monitoringTimelineEntries.value.length <= 1) {
    return monitoringTimelineEntries.value.length === 1 ? 100 : 0;
  }
  return (monitoringTimelineSliderValue.value / monitoringTimelineMax.value) * 100;
});
const monitoringTimelineStyle = computed(() => ({
  '--monitor-timeline-progress': `${clampNumber(monitoringTimelineProgressPercent.value, 0, 100)}%`,
}));
const monitoringTimelineCoverageLabel = computed(() => {
  const count = monitoringTimelineEntries.value.length;
  if (count === 0) return '尚無歷史時間軸';
  return `${formatNumber(count)} 個時間點`;
});
const canStepMonitoringBackward = computed(() => monitoringTimelineIndex.value > 0 && !liveMonitoringLoading.value);
const canStepMonitoringForward = computed(() => (
  monitoringTimelineIndex.value < monitoringTimelineEntries.value.length - 1 && !liveMonitoringLoading.value
));
const isMonitoringTimelineLatest = computed(() => (
  monitoringTimelineEntries.value.length > 0
  && monitoringTimelineIndex.value === monitoringTimelineEntries.value.length - 1
));
const actualSignalCount = computed(() => (
  delayPocCandidates.value.length + routeBunchingRows.value.length + routeFreshnessRows.value.length + routeDensityRows.value.length
));
const delayPocStatus = computed(() => {
  if (delayPocLoading.value) return '載入班表資料';
  if (delayPocCandidates.value.some((row) => row.signalVariant === 'departure_delay')) return '有發車誤點待確認';
  if (delayPocCandidates.value.some((row) => row.signalSubtype === 'timetable_delay')) return '有表定誤點候選';
  if (delayPocCandidates.value.length > 0) return '有候車超時候選';
  if (delayPocEvidenceRows.value.length > 0 && delayPocMeta.value.scheduledRows === 0) return '尚無可比對班表/班距';
  if (delayPocEvidenceRows.value.length > 0) return '預估到站目前在班表範圍內';
  if (delayPocError.value) return '資料待補';
  return '尚無預估到站資料';
});
const delayPocMeta = computed(() => {
  const rowCounts = delayPocData.value?.rowCounts ?? {};
  const joinQuality = delayPocData.value?.joinQuality ?? {};
  const scheduledRows = Number(joinQuality.scheduledEtaRows ?? 0);
  const timetableRows = Number(joinQuality.timetableEtaRows ?? 0);
  const frequencyRows = Number(joinQuality.frequencyEtaRows ?? 0);
  const etaRows = Number(rowCounts.eta ?? rowCounts.estimatedTimeOfArrival ?? 0);
  const joinRate = Number(joinQuality.etaStopJoinRate);
  return {
    sourceTime: formatMonitorSourceTime({ slotKey: delayPocData.value?.generatedAt }),
    etaRows,
    scheduledRows,
    timetableRows,
    frequencyRows,
    joinRate,
    coverageDetail: timetableRows > 0 && timetableRows < etaRows
      ? `此路線僅 ${formatNumber(timetableRows)} 個站點有表定時間，其餘站以班距資料為準`
      : frequencyRows > 0
      ? '目前以時段班距上限判讀'
      : scheduledRows === 0
      ? '目前沒有可對照的表定時間或班距窗口'
      : '有表定時間或目前時段班距',
  };
});
const routeProgressVehicles = computed(() => currentMonitoringObservations.value
  .filter((observation) => observation.route.name === routeName.value)
  .map((observation) => {
    try {
      const progress = buildRouteProgressObservation(observation, routeContext.value);
      if (!progress || !Number.isFinite(progress.progressRatio) || Number(progress.distanceToRouteMeters) > 120) {
        return null;
      }
      return {
        observation,
        progress,
        direction: Number(observation.route.direction),
      };
    } catch {
      return null;
    }
  })
  .filter(Boolean)
  .sort((left, right) => left.progress.progressRatio - right.progress.progressRatio));
const delayPocCases = computed(() => {
  return [...delayPocCandidates.value]
    .sort(delayCandidateSort)
    .slice(0, 3)
    .map((row, index) => {
    const delayMinutes = Number(row.predictedDelayMinutes);
    const etaMinutes = Number(row.etaMinutes);
    const expected = Number(row.expectedMaxWaitMinutes);
    const hasSignal = row.severity !== 'ok';
    const isTimetableDelay = row.signalSubtype === 'timetable_delay';
    const vehicleMatch = matchDelayCandidateVehicle(row);
    return {
      id: `${row.direction ?? 'x'}-${row.stopUID ?? row.stopID ?? index}`,
      severity: ['critical', 'warning', 'watch'].includes(row.severity) ? row.severity : 'info',
      title: hasSignal ? `${row.userFacingSignal ?? (isTimetableDelay ? '表定誤點' : '候車超時')}${row.claimStatus === 'needs_manual_trip_check' ? '待確認' : '候選'}` : '到站預估參考站點',
      stopName: row.stopName ?? '未知站點',
      direction: routeDirectionLabel(row.direction),
      metric: hasSignal
        ? row.claimStatus === 'needs_manual_trip_check'
          ? `疑似晚於對照班次 ${formatNumber(delayMinutes)} 分鐘`
          : isTimetableDelay ? `晚到 ${formatNumber(delayMinutes)} 分鐘` : `超出 ${formatNumber(delayMinutes)} 分鐘`
        : `${formatNumber(etaMinutes)} 分鐘到站`,
      detail: delayCandidateDetail(row, expected, etaMinutes, isTimetableDelay),
      evidence: delayCandidateEvidence(row, vehicleMatch, isTimetableDelay),
    };
  });
});
const delayCandidateStops = computed(() => delayPocCandidates.value
  .filter((row) => Number(row.direction) === direction.value)
  .slice(0, 8)
  .map((row) => {
    const stop = stopProgressForDelayCandidate(row);
    if (!stop || !Number.isFinite(stop.progressRatio)) return null;
    const id = `${row.direction ?? 'x'}-${row.stopUID ?? row.stopID}`;
    const etaMinutes = Number(row.etaMinutes);
    const expectedMinutes = Number(row.expectedMaxWaitMinutes);
    const lateMinutes = Number(row.predictedDelayMinutes);
    const vehicleMatch = matchDelayCandidateVehicle(row);
    const expectedPositionPercent = expectedVehiclePositionPercent(stop, vehicleMatch, etaMinutes, expectedMinutes);
    const currentPositionStop = Number.isFinite(vehicleMatch?.vehicleProgressRatio)
      ? nearestStopByRatio(vehicleMatch.vehicleProgressRatio)?.name
      : '';
    const expectedPositionStop = expectedPositionPercent !== null
      ? nearestStopByRatio(expectedPositionPercent / 100)?.name
      : '';
    return {
      id,
      name: compactStopName(row.stopName ?? stop.name),
      fullName: row.stopName ?? stop.name,
      positionPercent: clampPercent(stop.progressRatio * 100),
      severity: ['critical', 'warning', 'watch'].includes(row.severity) ? row.severity : 'warning',
      signalLabel: row.userFacingSignal ?? '延遲',
      etaMinutes,
      expectedMinutes,
      lateMinutes,
      vehicleMatch,
      vehiclePositionPercent: Number.isFinite(vehicleMatch?.vehicleProgressRatio)
        ? clampPercent(vehicleMatch.vehicleProgressRatio * 100)
        : null,
      expectedPositionPercent,
      currentPositionLabel: currentPositionStop ? `${compactStopName(currentPositionStop)}附近` : '目前位置待判讀',
      expectedPositionLabel: expectedPositionStop ? `${compactStopName(expectedPositionStop)}附近` : '門檻位置待判讀',
      positionExplanation: expectedPositionPercent !== null && vehicleMatch?.vehicleProgressRatio !== null
        ? vehicleMatch.vehicleProgressRatio * 100 < expectedPositionPercent
          ? '參考車尚未進入門檻位置'
          : '參考車已進入門檻位置'
        : '目前無法估算門檻位置',
      subjectLabel: `${row.stopName ?? stop.name} 的下一班服務`,
      isSelected: selectedDelayCandidateId.value === id,
    };
  })
  .filter(Boolean));
const selectedDelayCandidateStop = computed(() => {
  const selected = delayCandidateStops.value.find((candidate) => candidate.id === selectedDelayCandidateId.value);
  return selected ?? null;
});
const etaReferenceVehicleIds = computed(() => new Set([
  selectedDelayCandidateStop.value?.vehicleMatch?.vehicleId,
]
  .filter(Boolean)));
const evidenceSummaryCards = computed(() => {
  const freshness = routeFreshnessRows.value[0];
  const density = routeDensityRows.value[0];
  return [
    {
      id: 'status',
      tone: routeStatusClass.value,
      label: '路線狀態',
      value: routeStatus.value,
      detail: primaryDelayCandidate.value
        ? primaryDelayCandidate.value.signalSubtype === 'timetable_delay'
          ? primaryDelayCandidate.value.claimStatus === 'needs_manual_trip_check'
            ? `${primaryDelayCandidate.value.stopName ?? '站點'} 需人工核對對照班次 ${primaryDelayCandidate.value.scheduledArrivalTime ?? ''}`
            : `${primaryDelayCandidate.value.stopName ?? '站點'} 預估到站晚於表定 ${formatNumber(primaryDelayCandidate.value.predictedDelayMinutes)} 分鐘`
          : `${primaryDelayCandidate.value.stopName ?? '站點'} 預估到站超出班距 ${formatNumber(primaryDelayCandidate.value.predictedDelayMinutes)} 分鐘`
        : Number.isFinite(maxHeadwayMinutes.value)
        ? `最大觀測間距 ${formatNumber(maxHeadwayMinutes.value)} 分鐘`
        : '目前沒有服務空窗資料',
    },
    {
      id: 'signals',
      tone: 'info',
      label: '監控事件',
      value: `${formatNumber(actualSignalCount.value)} 筆`,
      detail: `班表/候車 ${delayPocCandidates.value.length} / 空窗 ${routeBunchingRows.value.length} / 品質 ${routeFreshnessRows.value.length}`,
    },
    {
      id: 'operators',
      tone: routeOperators.value.length > 0 ? 'info' : 'watch',
      label: '營運業者',
      value: routeOperatorLabel.value,
      detail: routeOperators.value.length > 1
        ? '此欄為路線層級；非單車歸屬判定'
        : '依路線層級的營運業者資料',
    },
    {
      id: 'quality',
      tone: freshness && Number(freshness.off_route_rate) >= 0.35 ? 'watch' : 'info',
      label: '位置品質',
      value: freshness ? `${formatPercent(freshness.off_route_rate)} 需回查` : '--',
      detail: freshness ? `${formatNumber(freshness.reports)} 筆回報 / 多數更新在 ${formatNumber(freshness.p95_gps_update_lag_seconds)} 秒內` : '尚無品質資料',
    },
    density ? {
      id: 'activity',
      tone: 'info',
      label: '路線活動',
      value: density ? `${formatNumber(density.active_vehicles)} 台車` : '--',
      detail: density ? `${formatAnalyticsTime(density.bucket_start)} / 均速 ${formatNumber(density.avg_speed_kph)} km/h` : '尚無活動資料',
    } : null,
  ].filter(Boolean);
});
const routeStripZones = computed(() => {
  const row = primaryBunchingRow.value;
  if (!row) return { gap: null, bunch: null, slow: null };

  const start = clampPercent(Number(row?.trailing_progress ?? 0.7) * 100);
  const end = clampPercent(Number(row?.leading_progress ?? 0.9) * 100);
  const left = Math.min(start, end);
  const width = Math.max(Math.abs(end - start), 4);
  return {
    gap: {
      left,
      width: Math.min(width, 100 - left),
      label: '疑似服務空窗',
    },
    bunch: null,
    slow: null,
  };
});
const monitorVehicles = computed(() => {
  const row = primaryBunchingRow.value;
  if (row) {
    return [
      {
        id: row.trailing_vehicle_id,
        label: row.trailing_vehicle_id,
        displayLabel: row.trailing_vehicle_id,
        positionPercent: clampPercent(Number(row.trailing_progress) * 100),
        state: 'normal',
      },
      {
        id: row.leading_vehicle_id,
        label: row.leading_vehicle_id,
        displayLabel: row.leading_vehicle_id,
        positionPercent: clampPercent(Number(row.leading_progress) * 100),
        state: 'gap',
      },
    ];
  }

  return routeProgressVehicles.value
    .filter((vehicle) => !Number.isFinite(direction.value) || vehicle.direction === direction.value)
    .slice(0, 28)
    .map((vehicle) => {
      const isEtaReference = etaReferenceVehicleIds.value.has(vehicle.observation.id);
      return {
        id: vehicle.observation.id,
        label: `${isEtaReference ? '到站預估參考車' : '路線車輛'} ${vehicle.observation.id} · ${progressPercent(vehicle.progress.progressRatio)}`,
        displayLabel: vehicle.observation.id,
        positionPercent: clampPercent(vehicle.progress.progressRatio * 100),
        state: 'normal',
        role: isEtaReference ? 'eta-reference' : 'context',
      };
    });
});
const monitorCases = computed(() => {
  const cases = routeBunchingRows.value.slice(0, 2).map((row, index) => {
    const minutes = Number(row.estimated_headway_minutes);
    const progressGap = Number(row.progress_gap_ratio);
    return {
      id: index === 0 ? 'service-gap' : `service-gap-${index}`,
      typeClass: 'service-gap',
      severity: headwaySeverity(minutes),
      scenario: '監控資料',
      severityLabel: headwaySeverityLabelZh(minutes),
      title: '疑似服務空窗',
      metric: `${formatNumber(minutes)} 分鐘間距`,
      where: `${segmentLabel(Number(row.trailing_progress), Number(row.leading_progress))}（${progressPercent(Number(row.trailing_progress))} → ${progressPercent(Number(row.leading_progress))}）`,
      action: isCriticalHeadway(minutes)
        ? '可評估短端發車、備援車或班距重排；同步提示沿線站點到站風險。'
        : '可評估微調發車間隔，避免後續形成更大的服務空窗。',
      evidence: `${formatAnalyticsTime(row.slot_start)}，${row.trailing_vehicle_id} 到 ${row.leading_vehicle_id} 的進度間距 ${progressPercent(progressGap)}。`,
    };
  });

  const freshness = routeFreshnessRows.value[0];
  if (freshness) {
    cases.push({
      id: 'data-quality',
      typeClass: 'data-quality',
      severity: Number(freshness.off_route_rate) >= 0.35 ? 'watch' : 'info',
      scenario: '監控資料',
      severityLabel: '觀察',
      title: '資料品質觀察',
      metric: `${formatPercent(freshness.off_route_rate)} 幾何不一致`,
      where: `${routeDirectionLabel(freshness.direction)} / ${formatNumber(freshness.reports)} 筆回報`,
      action: '先回查路線形狀、方向對應與車輛位置品質，再決定是否納入正式服務空窗判斷。',
      evidence: `多數位置更新在 ${formatNumber(freshness.p95_gps_update_lag_seconds)} 秒內，偏離路線回報 ${formatNumber(freshness.off_route_reports)} 筆。`,
    });
  }

  const density = routeDensityRows.value[0];
  if (cases.length < 3 && density) {
    cases.push({
      id: 'activity-density',
      typeClass: 'activity-density',
      severity: 'info',
      scenario: '監控資料',
      severityLabel: '參考',
      title: '路線活動密度',
      metric: `${formatNumber(density.active_vehicles)} 台車`,
      where: `${formatAnalyticsTime(density.bucket_start)} / ${routeDirectionLabel(density.direction)}`,
      action: '用來輔助判斷服務空窗是否由車輛數不足、低速或資料品質造成。',
      evidence: `平均速度 ${formatNumber(density.avg_speed_kph)} km/h，停止回報 ${formatNumber(density.stopped_reports)} 筆。`,
    });
  }

  return cases;
});

onMounted(async () => {
  await Promise.all([
    loadConceptData(),
    loadAnalyticsData(),
    loadDelayPocData(),
  ]);
});

async function loadConceptData() {
  liveMonitoringLoading.value = true;
  try {
    const contextResponse = await fetch(`/data/tdx-bus/route-context/${encodeURIComponent(encodeURIComponent(routeName.value))}.json`);
    if (!contextResponse.ok) {
      routeContextWarning.value = `這條路線目前尚未發布完整路線幾何，先以路線層級訊號判讀。`;
      publishEmptyLiveMonitoring();
      return;
    }
    const contextType = contextResponse.headers.get('content-type') ?? '';
    if (!contextType.includes('application/json')) {
      routeContextWarning.value = `這條路線目前尚未發布完整路線幾何，先以路線層級訊號判讀。`;
      publishEmptyLiveMonitoring();
      return;
    }
    routeContext.value = await contextResponse.json();

    await loadMonitoringTimeline();
    await loadMonitoringTimelineEntry(monitoringTimelineEntries.value.length - 1);
  } catch (error) {
    routeContextWarning.value = error instanceof SyntaxError
      ? `這條路線目前尚未發布完整路線幾何，先以路線層級訊號判讀。`
      : error.message;
    publishEmptyLiveMonitoring();
  } finally {
    liveMonitoringLoading.value = false;
  }
}

async function loadMonitoringTimeline() {
  try {
    const timeline = await fetchJson(BUS_VEHICLE_PROJECTION_TIMELINE_URL);
    const snapshots = normalizeTimelineEntries(timeline.snapshots ?? [], 'projection-api');
    if (snapshots.length === 0) throw new Error('projection timeline missing snapshots');
    monitoringTimelineEntries.value = snapshots;
  } catch {
    const manifest = await fetchJson(OPERATIONS_ARCHIVE_MANIFEST_URL);
    monitoringTimelineEntries.value = normalizeTimelineEntries(manifest.snapshots ?? [], 'static-archive');
  }
}

function normalizeTimelineEntries(snapshots, sourceKind) {
  return [...snapshots]
    .filter((snapshot) => snapshot?.capturedAt || snapshot?.slotKey)
    .map((snapshot) => ({ ...snapshot, sourceKind }))
    .sort((left, right) => String(left.capturedAt ?? left.slotKey).localeCompare(String(right.capturedAt ?? right.slotKey)));
}

async function loadMonitoringTimelineEntry(index) {
  if (monitoringTimelineEntries.value.length === 0) {
    publishEmptyLiveMonitoring();
    liveMonitoringLoading.value = false;
    return;
  }

  const safeIndex = clampNumber(index, 0, monitoringTimelineEntries.value.length - 1);
  const entry = monitoringTimelineEntries.value[safeIndex];
  liveMonitoringLoading.value = true;
  try {
    const payload = await fetchMonitoringPayload(entry);
    const observations = entry.sourceKind === 'projection-api'
      ? createOperationsFromArchivePayload(payload, entry)
      : createOperationsFromSnapshot(payload, entry);
    currentMonitoringObservations.value = observations;
    monitoringTimelineIndex.value = safeIndex;
    selectSampleObservationForDirection(direction.value);
    if (!sampleObservation.value) {
      selectSampleObservationForDirection(Number.NaN);
    }
    if (sampleObservation.value && Number.isFinite(Number(sampleObservation.value.route.direction))) {
      direction.value = Number(sampleObservation.value.route.direction);
    }
    liveMonitoringRows.value = buildLiveMonitoringRows(observations, entry);
    liveMonitoringSource.value = entry;
    liveMonitoringLoaded.value = true;
    alignDirectionToPrimaryDelayCandidate();
  } catch (error) {
    routeContextWarning.value = error.message;
    publishEmptyLiveMonitoring();
  } finally {
    liveMonitoringLoading.value = false;
  }
}

async function fetchMonitoringPayload(entry) {
  if (entry.sourceKind === 'projection-api') {
    if (!entry.slotKey) throw new Error('projection slot missing');
    return fetchJson(`${BUS_VEHICLE_PROJECTION_URL}?slot=${encodeURIComponent(entry.slotKey)}`);
  }
  if (!entry.path) throw new Error('archive snapshot path missing');
  return fetchJson(entry.path);
}

async function loadAnalyticsData() {
  analyticsLoading.value = true;
  analyticsError.value = '';
  try {
    const [bunching, freshness, density] = await Promise.all([
      fetchJson('/data/analytics/bus/bunching.json'),
      fetchJson('/data/analytics/bus/data-freshness.json'),
      fetchJson('/data/analytics/bus/route-density.json'),
    ]);
    analyticsData.value = {
      serviceDate: bunching.serviceDate ?? freshness.serviceDate ?? density.serviceDate ?? '',
      publishedAt: bunching.publishedAt ?? freshness.publishedAt ?? density.publishedAt ?? '',
      bunching: Array.isArray(bunching.rows) ? bunching.rows : [],
      freshness: Array.isArray(freshness.rows) ? freshness.rows : [],
      density: Array.isArray(density.rows) ? density.rows : [],
    };
  } catch (error) {
    analyticsError.value = error.message;
  } finally {
    analyticsLoading.value = false;
  }
}

async function loadDelayPocData() {
  delayPocLoading.value = true;
  delayPocError.value = '';
  try {
    const response = await fetch(cacheBustedUrl(`/api/tdx/bus-delay-poc?route=${encodeURIComponent(routeName.value)}`));
    const payload = await response.json().catch(() => null);
    if (response.ok && payload?.ok) {
      delayPocData.value = payload;
      alignDirectionToPrimaryDelayCandidate();
      return;
    }

    const fallbackPath = payload?.fallbackPath
      ?? `/data/tdx-bus/reliability-evidence/route-${safeFileName(routeName.value)}.json`;
    const fallbackPayload = await fetchDelayPocFallback(fallbackPath, routeName.value, payload, response.status);
    delayPocData.value = normalizeDelayFixture(fallbackPayload);
    alignDirectionToPrimaryDelayCandidate();
  } catch (error) {
    console.warn('Delay evidence unavailable', error);
    delayPocError.value = '此路線目前沒有可用的到站或班表資料。';
    delayPocData.value = null;
  } finally {
    delayPocLoading.value = false;
  }
}

async function fetchDelayPocFallback(path, route, apiPayload, apiStatus) {
  const response = await fetch(cacheBustedUrl(path));
  const contentType = response.headers.get('content-type') ?? '';
  if (!response.ok || !contentType.includes('application/json')) {
    if (apiPayload?.error && apiStatus !== 404) {
      console.warn('Delay evidence API unavailable', { route, status: apiStatus, error: apiPayload.error });
    }
    throw new Error(`route ${route} delay evidence unavailable`);
  }
  return response.json();
}

function normalizeDelayFixture(payload) {
  if (payload?.delayCandidates || payload?.etaEvidence) return payload;
  return {
    ok: true,
    schema: 'twfoundry.bus.delay-poc.fixture.v1',
    generatedAt: payload?.generatedAt ?? '',
    source: payload?.source ?? {},
    signalPolicy: payload?.signalPolicy ?? {},
    rowCounts: {
      eta: payload?.rowCounts?.estimatedTimeOfArrival ?? 0,
      schedule: payload?.rowCounts?.schedule ?? 0,
      stopOfRoute: payload?.rowCounts?.stopOfRoute ?? 0,
      etaEvidence: payload?.rowCounts?.evidenceRows ?? 0,
      delayCandidates: 0,
    },
    joinQuality: payload?.joinQuality ?? {},
    scheduleSummary: payload?.scheduleSummary ?? [],
    delayCandidates: [],
    etaEvidence: payload?.evidenceRows ?? [],
  };
}

function delayCandidateDetail(row, expected, etaMinutes, isTimetableDelay) {
  if (isTimetableDelay) {
    return row.scheduledArrivalTime
      ? `預估到站 ${formatNumber(etaMinutes)} 分鐘 / 對照班次 ${row.scheduledArrivalTime}`
      : `預估到站 ${formatNumber(etaMinutes)} 分鐘 / 尚無可對齊表定時間`;
  }
  return Number.isFinite(expected)
    ? `預估到站 ${formatNumber(etaMinutes)} 分鐘 / 目前班距上限 ${formatNumber(expected)} 分鐘`
    : `預估到站 ${formatNumber(etaMinutes)} 分鐘 / 尚無可用班距`;
}

function delayCandidateEvidence(row, vehicleMatch, isTimetableDelay) {
  const vehicleText = vehicleMatch
    ? `依即時定位推估可能為 ${vehicleMatch.vehicleId}（非官方到站預估車輛），距該站約 ${formatNumber(vehicleMatch.distanceKm)} km。`
    : vehicleMatchUnavailableText();

  if (isTimetableDelay) {
    const reviewText = row.claimStatus === 'needs_manual_trip_check'
      ? `此差距超過 ${formatNumber(row.manualReviewThresholdMinutes ?? 30)} 分鐘，先標為待確認，需人工核對是否為同一班次。`
      : '';
    return `依站牌順序對齊，並比對該站表定到站時間。${reviewText}${vehicleText}`;
  }
  if (row.scheduleBasis === 'frequency') {
    return `依 ${row.scheduleWindow ?? '目前時段'} 班距資料判讀。${vehicleText}`;
  }
  return '目前只有預估到站資料，尚未取得可用班表或班距。';
}

function delayCandidateSort(left, right) {
  const leftSubtype = left.signalSubtype === 'timetable_delay' ? 0 : 1;
  const rightSubtype = right.signalSubtype === 'timetable_delay' ? 0 : 1;
  return leftSubtype - rightSubtype
    || severitySortRank(left.severity) - severitySortRank(right.severity)
    || Number(right.predictedDelayMinutes ?? -Infinity) - Number(left.predictedDelayMinutes ?? -Infinity);
}

function severitySortRank(severity) {
  if (severity === 'critical') return 0;
  if (severity === 'warning') return 1;
  if (severity === 'watch') return 2;
  return 3;
}

async function fetchJson(path) {
  const response = await fetch(cacheBustedUrl(path), { cache: 'no-store' });
  if (!response.ok) throw new Error(`${path} HTTP ${response.status}`);
  return response.json();
}

function setDirection(nextDirection) {
  direction.value = nextDirection;
  selectedDelayCandidateId.value = null;
  selectSampleObservationForDirection(nextDirection);
}

function alignDirectionToPrimaryDelayCandidate() {
  const candidateDirection = Number(primaryDelayCandidate.value?.direction);
  if (!Number.isFinite(candidateDirection)) return;
  const currentDirectionHasCandidate = delayPocCandidates.value.some((row) => Number(row.direction) === direction.value);
  if (!currentDirectionHasCandidate) setDirection(candidateDirection);
}

function selectDelayCandidate(candidateId) {
  selectedDelayCandidateId.value = selectedDelayCandidateId.value === candidateId ? null : candidateId;
}

function selectSampleObservationForDirection(nextDirection) {
  const observations = currentMonitoringObservations.value;
  sampleObservation.value = observations.find((observation) => (
    observation.route.name === routeName.value
    && Number(observation.route.direction) === nextDirection
  )) ?? observations.find((observation) => observation.route.name === routeName.value) ?? null;
}

function onMonitoringTimelineInput(event) {
  monitoringTimelinePendingScrubIndex = clampNumber(Number(event.target.value), 0, monitoringTimelineMax.value);
  if (monitoringTimelineScrubFrame) return;

  const publishScrubIndex = () => {
    monitoringTimelineScrubFrame = 0;
    monitoringTimelineScrubIndex.value = monitoringTimelinePendingScrubIndex;
  };
  if (globalThis.requestAnimationFrame) {
    monitoringTimelineScrubFrame = globalThis.requestAnimationFrame(publishScrubIndex);
    return;
  }
  publishScrubIndex();
}

function commitMonitoringTimeline(event) {
  flushMonitoringTimelineScrub();
  const fallbackValue = Number(event?.target?.value ?? monitoringTimelineIndex.value);
  const targetIndex = clampNumber(monitoringTimelineScrubIndex.value ?? fallbackValue, 0, monitoringTimelineMax.value);
  monitoringTimelineScrubIndex.value = null;
  if (monitoringTimelineCommitPendingIndex === targetIndex || monitoringTimelineIndex.value === targetIndex) return;
  monitoringTimelinePendingCommitIndex.value = targetIndex;
  monitoringTimelineCommitPendingIndex = targetIndex;
  void loadMonitoringTimelineEntry(targetIndex).finally(() => {
    if (monitoringTimelineCommitPendingIndex === targetIndex) {
      monitoringTimelineCommitPendingIndex = -1;
      monitoringTimelinePendingCommitIndex.value = null;
    }
  });
}

function stepMonitoringTimeline(delta) {
  monitoringTimelineScrubIndex.value = null;
  const targetIndex = clampNumber(monitoringTimelineIndex.value + delta, 0, monitoringTimelineMax.value);
  monitoringTimelinePendingCommitIndex.value = targetIndex;
  void loadMonitoringTimelineEntry(targetIndex).finally(() => {
    if (monitoringTimelinePendingCommitIndex.value === targetIndex) {
      monitoringTimelinePendingCommitIndex.value = null;
    }
  });
}

function flushMonitoringTimelineScrub() {
  if (!monitoringTimelineScrubFrame) return;
  if (globalThis.cancelAnimationFrame) {
    globalThis.cancelAnimationFrame(monitoringTimelineScrubFrame);
  }
  monitoringTimelineScrubFrame = 0;
  monitoringTimelineScrubIndex.value = monitoringTimelinePendingScrubIndex;
}

function buildLiveMonitoringRows(observations, entry) {
  const routeObservations = observations.filter((observation) => observation.route.name === routeName.value);
  const projected = routeObservations.map((observation) => {
    try {
      return {
        observation,
        progress: buildRouteProgressObservation(observation, routeContext.value),
        direction: Number(observation.route.direction),
      };
    } catch {
      return {
        observation,
        progress: null,
        direction: Number(observation.route.direction),
      };
    }
  });
  const slotStart = entry?.slotKey ?? entry?.capturedAt ?? '';
  return {
    bunching: buildLiveHeadwayRows(projected, slotStart),
    freshness: buildLiveFreshnessRows(projected),
    density: buildLiveDensityRows(routeObservations, slotStart),
  };
}

function buildLiveHeadwayRows(projected, slotStart) {
  const groups = groupByDirection(projected.filter((row) => (
    row.progress
    && Number.isFinite(row.progress.progressRatio)
    && Number(row.progress.distanceToRouteMeters) <= 120
  )));
  const rows = [];
  for (const [directionKey, rowsInDirection] of groups) {
    const sorted = rowsInDirection
      .sort((left, right) => left.progress.progressRatio - right.progress.progressRatio);
    for (let index = 0; index < sorted.length - 1; index += 1) {
      const trailing = sorted[index];
      const leading = sorted[index + 1];
      const gap = leading.progress.progressRatio - trailing.progress.progressRatio;
      const minutes = gap * 48;
      if (minutes < 14) continue;
      rows.push({
        slot_start: slotStart,
        route_name: routeName.value,
        direction: Number(directionKey),
        trailing_vehicle_id: trailing.observation.id,
        leading_vehicle_id: leading.observation.id,
        trailing_progress: roundRatio(trailing.progress.progressRatio),
        leading_progress: roundRatio(leading.progress.progressRatio),
        progress_gap_ratio: roundRatio(gap),
        estimated_headway_minutes: Math.round(minutes * 10) / 10,
      });
    }
  }
  return rows.sort((left, right) => Number(right.estimated_headway_minutes) - Number(left.estimated_headway_minutes));
}

function buildLiveFreshnessRows(projected) {
  const groups = groupByDirection(projected);
  const rows = [];
  for (const [directionKey, rowsInDirection] of groups) {
    const reports = rowsInDirection.length;
    if (reports === 0) continue;
    const offRouteReports = rowsInDirection.filter((row) => (
      !row.progress || !Number.isFinite(row.progress.distanceToRouteMeters) || row.progress.distanceToRouteMeters > 120
    )).length;
    const nonFreshReports = rowsInDirection.filter((row) => row.observation.status.freshness !== 'fresh').length;
    const offRouteRate = offRouteReports / reports;
    const nonFreshRate = nonFreshReports / reports;
    if (offRouteRate < 0.35 && nonFreshRate === 0) continue;
    rows.push({
      route_name: routeName.value,
      direction: Number(directionKey),
      reports,
      vehicles: new Set(rowsInDirection.map((row) => row.observation.id)).size,
      avg_completeness: roundRatio(average(rowsInDirection.map((row) => row.observation.status.completeness))),
      p95_gps_update_lag_seconds: percentile(rowsInDirection.map((row) => row.observation.status.ageSeconds), 0.95),
      non_fresh_reports: nonFreshReports,
      off_route_reports: offRouteReports,
      non_fresh_rate: roundRatio(nonFreshRate),
      off_route_rate: roundRatio(offRouteRate),
    });
  }
  return rows;
}

function buildLiveDensityRows(observations, slotStart) {
  const groups = groupByDirection(observations.map((observation) => ({
    observation,
    direction: Number(observation.route.direction),
  })));
  return [...groups.entries()].map(([directionKey, rowsInDirection]) => ({
    bucket_start: slotStart,
    route_name: routeName.value,
    direction: Number(directionKey),
    active_vehicles: new Set(rowsInDirection.map((row) => row.observation.id)).size,
    avg_speed_kph: Math.round(average(rowsInDirection.map((row) => row.observation.motion.speedKph)) * 10) / 10,
    stopped_reports: rowsInDirection.filter((row) => Number(row.observation.motion.speedKph) === 0).length,
  }));
}

function groupByDirection(rows) {
  return rows.reduce((groups, row) => {
    if (!Number.isFinite(row.direction)) return groups;
    const key = String(row.direction);
    const current = groups.get(key) ?? [];
    current.push(row);
    groups.set(key, current);
    return groups;
  }, new Map());
}

function publishEmptyLiveMonitoring() {
  liveMonitoringRows.value = { bunching: [], freshness: [], density: [] };
  liveMonitoringSource.value = null;
  liveMonitoringLoaded.value = true;
}

function cacheBustedUrl(path) {
  const url = new URL(path, window.location.origin);
  url.searchParams.set('_', String(Date.now()));
  return url.toString();
}

function average(values) {
  const finite = values.map(Number).filter(Number.isFinite);
  if (finite.length === 0) return 0;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

function percentile(values, ratio) {
  const finite = values.map(Number).filter(Number.isFinite).sort((left, right) => left - right);
  if (finite.length === 0) return 0;
  const index = Math.min(finite.length - 1, Math.max(0, Math.ceil(finite.length * ratio) - 1));
  return finite[index];
}

function roundRatio(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 10000) / 10000 : 0;
}

function projectToSvg(point) {
  if (!point || !bounds.value) return null;
  const { minLon, maxLon, minLat, maxLat } = bounds.value;
  const x = viewport.padding
    + ((point[0] - minLon) / Math.max(maxLon - minLon, 0.000001)) * (viewport.width - viewport.padding * 2);
  const y = viewport.height - viewport.padding
    - ((point[1] - minLat) / Math.max(maxLat - minLat, 0.000001)) * (viewport.height - viewport.padding * 2);
  return { x, y };
}

function svgPath(points) {
  return points
    .map((point, index) => {
      const projected = projectToSvg(point);
      if (!projected) return '';
      return `${index === 0 ? 'M' : 'L'} ${projected.x.toFixed(2)} ${projected.y.toFixed(2)}`;
    })
    .join(' ');
}

function computeBounds(points) {
  if (!points.length) return null;
  const lons = points.map((point) => point[0]);
  const lats = points.map((point) => point[1]);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const lonPad = Math.max((maxLon - minLon) * 0.08, 0.001);
  const latPad = Math.max((maxLat - minLat) * 0.08, 0.001);
  return {
    minLon: minLon - lonPad,
    maxLon: maxLon + lonPad,
    minLat: minLat - latPad,
    maxLat: maxLat + latPad,
  };
}

function progressPercent(value) {
  return Number.isFinite(value) ? `${Math.round(value * 1000) / 10}%` : '--';
}

function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString('en-US', { maximumFractionDigits: 1 }) : '--';
}

function formatPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '--';
  return `${(number * 100).toFixed(number >= 0.1 ? 1 : 2)}%`;
}

function formatAnalyticsTime(value) {
  if (!value) return '--';
  return String(value).slice(5, 16).replace('T', ' ');
}

function formatMonitorSourceTime(source) {
  if (!source) return '資料待補';
  const slot = source.slotKey ?? source.capturedAt ?? '';
  const date = source.captureDate ?? slot.slice(0, 10);
  const time = source.timeLabel ?? slot.slice(11, 16);
  return [date, time].filter(Boolean).join(' ');
}

function formatTimelineEntryLabel(entry) {
  if (!entry) return '';
  const date = entry.captureDate ? entry.captureDate.slice(5) : String(entry.slotKey ?? entry.capturedAt ?? '').slice(5, 10);
  const time = entry.timeLabel ?? String(entry.slotKey ?? entry.capturedAt ?? '').slice(11, 16);
  return [date, time].filter(Boolean).join(' ');
}

function routeDirectionLabel(value) {
  const numericDirection = Number(value);
  const matchedStops = (routeContext.value?.stopOfRoutes ?? [])
    .find((route) => Number(route.Direction) === numericDirection)?.Stops ?? [];
  const terminalStop = matchedStops[matchedStops.length - 1]?.StopName?.Zh_tw
    ?? matchedStops[matchedStops.length - 1]?.StopName?.En;
  if (terminalStop) return `往 ${compactStopName(terminalStop)}`;
  if (numericDirection === 0) return '去程';
  if (numericDirection === 1) return '返程';
  return `方向 ${value}`;
}

function meters(value) {
  return Number.isFinite(value) ? `${Math.round(value)}m` : '--';
}

function compactStopName(name) {
  const cleaned = String(name ?? '')
    .replace(/[（(].*?[）)]/g, '')
    .replace(/口$/, '')
    .trim();
  if (cleaned.length <= 6) return cleaned || '--';
  return `${cleaned.slice(0, 5)}…`;
}

function safeFileName(value) {
  return encodeURIComponent(String(value)).replace(/%20/g, '-');
}

function segmentLabel(startRatio, endRatio) {
  const stops = visibleStops.value;
  if (stops.length === 0) return '資料載入中';
  const start = nearestStopByRatio(startRatio);
  const end = nearestStopByRatio(endRatio);
  return start?.name && end?.name ? `${start.name} → ${end.name}` : '路線區段';
}

function nearestStopByRatio(ratio) {
  return visibleStops.value.reduce((best, stop) => {
    if (!Number.isFinite(stop.progressRatio)) return best;
    const delta = Math.abs(stop.progressRatio - ratio);
    return !best || delta < best.delta ? { ...stop, delta } : best;
  }, null);
}

function matchDelayCandidateVehicle(row) {
  if (!isMonitoringTimelineLatest.value) return null;
  if (!routeContext.value) return null;
  const stop = stopProgressForDelayCandidate(row);
  if (!stop || !Number.isFinite(stop.progressMeters)) return null;
  const candidateDirection = Number(row.direction);

  const vehicles = routeProgressVehicles.value.filter((vehicle) => vehicle.direction === candidateDirection);
  const upstream = vehicles
    .filter((vehicle) => vehicle.progress.progressMeters <= stop.progressMeters)
    .map((vehicle) => ({
      vehicle,
      distanceMeters: stop.progressMeters - vehicle.progress.progressMeters,
    }))
    .sort((left, right) => left.distanceMeters - right.distanceMeters);
  const nearest = upstream[0] ?? null;

  if (!nearest) return null;
  return {
    vehicleId: nearest.vehicle.observation.id,
    distanceKm: Math.round((nearest.distanceMeters / 1000) * 10) / 10,
    vehicleProgressRatio: nearest.vehicle.progress.progressRatio,
    stopProgressRatio: stop.progressRatio,
  };
}

function expectedVehiclePositionPercent(stop, vehicleMatch, etaMinutes, expectedMinutes) {
  if (!vehicleMatch) return null;
  if (!Number.isFinite(stop?.progressRatio) || !Number.isFinite(vehicleMatch.vehicleProgressRatio)) return null;
  if (!Number.isFinite(etaMinutes) || etaMinutes <= 0 || !Number.isFinite(expectedMinutes) || expectedMinutes <= 0) return null;
  const remainingRatio = Math.max(0, stop.progressRatio - vehicleMatch.vehicleProgressRatio);
  const expectedRemainingRatio = remainingRatio * Math.min(expectedMinutes / etaMinutes, 1);
  return clampPercent((stop.progressRatio - expectedRemainingRatio) * 100);
}

function stopProgressForDelayCandidate(row) {
  if (!routeContext.value) return null;
  const candidateDirection = Number(row.direction);
  if (!Number.isFinite(candidateDirection)) return null;

  const shape = (routeContext.value.shapes ?? []).find((item) => Number(item.Direction) === candidateDirection);
  const stopOfRoute = (routeContext.value.stopOfRoutes ?? []).find((item) => Number(item.Direction) === candidateDirection);
  const points = parseLineStringGeometry(shape?.Geometry);
  const measure = buildRouteMeasure(points);
  const stops = buildStopProgress(stopOfRoute, measure);
  return stops.find((item) => (
    (row.stopUID && item.stopUID === row.stopUID)
    || (row.stopID && item.stopID === row.stopID)
  )) ?? null;
}

function vehicleMatchUnavailableText() {
  if (!isMonitoringTimelineLatest.value) return '目前時間軸不是最新時間點，暫不推估對應車輛。';
  return '同方向目前沒有上游車輛；到站預估未提供官方車牌。';
}

function clampPercent(value) {
  return Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
}

function clampNumber(value, min, max) {
  const number = Number(value);
  return Math.min(max, Math.max(min, Number.isFinite(number) ? number : min));
}

</script>

<template>
  <main class="concept-page">
    <header class="topbar">
      <div>
        <div class="brand-kicker">TWFoundry Transit Operations</div>
      </div>
      <a class="nav-link" href="/">回監控台</a>
    </header>

    <section class="route-hero" :class="routeStatusClass">
      <div class="hero-copy">
        <div class="eyebrow">路線可靠度詳細</div>
        <h1>{{ routeName }} <span>服務可靠度</span></h1>
        <p>
          目前顯示路線層級監控資料：候車超時、服務空窗、資料品質與建議調度方向。
        </p>
      </div>
      <div class="hero-status-card">
        <span>目前狀態</span>
        <strong>{{ routeStatus }}</strong>
        <p>{{ monitorModeLabel }}</p>
      </div>
    </section>

    <section class="evidence-grid" aria-label="路線可靠度摘要">
      <article
        v-for="card in evidenceSummaryCards"
        :key="card.id"
        class="evidence-card"
        :class="[card.tone, { primary: card.id === 'status' }]"
      >
        <span>{{ card.label }}</span>
        <strong>{{ card.value }}</strong>
        <p>{{ card.detail }}</p>
      </article>
    </section>

    <section v-if="analyticsError || routeContextWarning || loadError" class="panel data-note">
      <p v-if="analyticsError">監控資料無法讀取：{{ analyticsError }}</p>
      <p v-if="routeContextWarning">{{ routeContextWarning }}</p>
      <p v-if="loadError">{{ loadError }}</p>
    </section>

    <section class="panel delay-poc-panel">
      <div class="panel-head">
        <div>
          <div class="eyebrow">班表對照（試行）</div>
          <h2>用預估到站對照班表與班距，先找服務異常站點</h2>
        </div>
        <span class="mode-badge">{{ delayPocStatus }}</span>
      </div>

      <div class="delay-summary-grid">
        <article>
          <span>預估到站站點數</span>
          <strong>{{ formatNumber(delayPocMeta.etaRows) }}</strong>
          <p>{{ delayPocMeta.sourceTime }}</p>
        </article>
        <article>
          <span>可比對班表/班距站點</span>
          <strong>{{ formatNumber(delayPocMeta.scheduledRows) }}</strong>
          <p>{{ delayPocMeta.coverageDetail }}</p>
        </article>
        <article>
          <span>資料對齊完整度</span>
          <strong>{{ formatPercent(delayPocMeta.joinRate) }}</strong>
          <p>到站預估與站點順序可對齊</p>
        </article>
      </div>

      <div v-if="delayPocError" class="delay-error">{{ delayPocError }}</div>
      <div class="monitor-grid delay-grid">
        <article
          v-for="item in delayPocCases"
          :key="item.id"
          class="incident-card"
          :class="item.severity"
        >
          <div class="incident-head">
            <div class="incident-title">
              <i class="type-glyph eta-delay" aria-hidden="true"></i>
              <div>
                <small>{{ item.direction }}</small>
                <strong>{{ item.title }}</strong>
              </div>
            </div>
            <div class="incident-status">
              <b>{{ item.severity === 'critical' ? '嚴重' : item.severity === 'warning' ? '注意' : item.severity === 'watch' ? '待確認' : '參考' }}</b>
              <span>{{ item.metric }}</span>
            </div>
          </div>
          <p class="incident-where">{{ item.stopName }}</p>
          <div class="action-box">
            <span>判斷方式</span>
            <p>{{ item.detail }}</p>
          </div>
          <div class="evidence-box">
            <span>資料依據</span>
            <p>{{ item.evidence }}</p>
          </div>
        </article>
        <article v-if="!delayPocLoading && delayPocCases.length === 0" class="incident-card empty">
          <div class="incident-head">
            <div class="incident-title">
              <i class="type-glyph eta-delay" aria-hidden="true"></i>
              <div>
                <small>班表 / 預估到站</small>
                <strong>預估到站目前在班表範圍內</strong>
              </div>
            </div>
          </div>
          <p class="incident-where">路線 {{ routeName }}</p>
          <div class="action-box">
            <span>下一步</span>
            <p>目前無需調度動作；若現場回報與此不符，再回查班距與到站資料。</p>
          </div>
        </article>
      </div>
    </section>

    <section class="panel monitor-panel">
      <div class="panel-head">
        <div>
          <div class="eyebrow">可靠度監控</div>
          <h2>先看服務空窗，再決定調度動作</h2>
        </div>
        <span class="mode-badge">{{ monitorModeLabel }}</span>
      </div>

      <div class="monitor-timeline" :style="monitoringTimelineStyle" aria-label="選擇監控時間點">
        <div class="monitor-timeline-status">
          <span>時間點</span>
          <strong>{{ monitoringTimelineCurrentLabel }}</strong>
          <small>{{ monitoringTimelineCoverageLabel }}</small>
        </div>
        <div class="monitor-timeline-track">
          <button
            type="button"
            class="timeline-step"
            :disabled="!canStepMonitoringBackward"
            aria-label="上一個時間點"
            @click="stepMonitoringTimeline(-1)"
          >
            ‹
          </button>
          <div class="monitor-slider-wrap">
            <input
              class="monitor-slider"
              type="range"
              min="0"
              :max="monitoringTimelineMax"
              :value="monitoringTimelineSliderValue"
              :disabled="monitoringTimelineDisabled"
              aria-label="選擇歷史監控時間點"
              @input="onMonitoringTimelineInput"
              @change="commitMonitoringTimeline"
            />
            <div class="monitor-slider-labels">
              <span>{{ monitoringTimelineStartLabel }}</span>
              <span>{{ monitoringTimelineEndLabel }}</span>
            </div>
          </div>
          <button
            type="button"
            class="timeline-step"
            :disabled="!canStepMonitoringForward"
            aria-label="下一個時間點"
            @click="stepMonitoringTimeline(1)"
          >
            ›
          </button>
        </div>
      </div>

      <div class="route-strip" aria-label="路線可靠度監控圖">
        <div class="strip-axis">
          <span>路線進度</span>
          <strong>起點 → 終點</strong>
        </div>
        <div class="strip-band">
          <div
            v-if="routeStripZones.gap"
            class="gap-zone"
            :style="{ left: `${routeStripZones.gap.left}%`, width: `${routeStripZones.gap.width}%` }"
          ><span>{{ routeStripZones.gap.label }}</span></div>
          <div
            v-if="routeStripZones.bunch"
            class="bunch-zone"
            :style="{ left: `${routeStripZones.bunch.left}%`, width: `${routeStripZones.bunch.width}%` }"
          ><span>車距邊界</span></div>
          <div
            v-if="routeStripZones.slow"
            class="slow-zone"
            :style="{ left: `${routeStripZones.slow.left}%`, width: `${routeStripZones.slow.width}%` }"
          ><span>需回查</span></div>
          <button
            v-for="candidate in delayCandidateStops"
            :key="`delay-stop-${candidate.id}`"
            type="button"
            class="strip-delay-stop"
            :class="[candidate.severity, { selected: candidate.isSelected }]"
            :style="{ left: `${candidate.positionPercent}%` }"
            :title="`${candidate.signalLabel}：${candidate.fullName}，超出 ${formatNumber(candidate.lateMinutes)} 分鐘`"
            :aria-label="`${candidate.signalLabel}：${candidate.fullName}，超出 ${formatNumber(candidate.lateMinutes)} 分鐘`"
            @click="selectDelayCandidate(candidate.id)"
          >
            <span class="delay-marker-stem"></span>
            <span class="delay-marker-head"></span>
            <small>{{ candidate.signalLabel }}</small>
          </button>
          <div
            v-for="stop in routeStripStops"
            :key="`strip-${stop.stopUID}`"
            class="strip-stop"
            :style="{ left: `${stop.positionPercent}%` }"
            :title="stop.fullName"
          >
            <span></span>
            <small>{{ stop.name }}</small>
          </div>
          <div
            v-for="vehicle in monitorVehicles"
            :key="vehicle.id"
            class="strip-bus"
            :class="[vehicle.state, vehicle.role]"
            :style="{ left: `${vehicle.positionPercent}%` }"
            :title="vehicle.label"
            :aria-label="vehicle.label"
            tabindex="0"
          >
            <b></b>
            <small v-if="vehicle.displayLabel">{{ vehicle.displayLabel }}</small>
          </div>
        </div>
        <div class="strip-legend">
          <span v-if="delayCandidateStops.length > 0"><b class="legend-delay-stop"></b>延遲候選：對應下方事件卡</span>
          <span v-if="routeStripZones.gap"><b class="legend-gap"></b>服務空窗：疑似空窗區段</span>
          <span v-if="routeStripZones.bunch"><b class="legend-bunch"></b>連車：車距過近</span>
          <span v-if="routeStripZones.slow"><b class="legend-slow"></b>疑似慢行：需回查</span>
          <span v-if="etaReferenceVehicleIds.size > 0"><b class="legend-eta-bus"></b>到站預估參考車：用來解釋候車時間</span>
          <span v-if="monitorVehicles.length > etaReferenceVehicleIds.size"><b class="legend-bus"></b>其他即時車輛：位置參考</span>
        </div>
        <div v-if="selectedDelayCandidateStop" class="delay-selected-panel">
          <div>
            <small>誰超時</small>
            <strong>{{ selectedDelayCandidateStop.subjectLabel }}</strong>
            <span>候車超過班距門檻</span>
          </div>
          <div>
            <small>現在在哪</small>
            <strong v-if="selectedDelayCandidateStop.vehicleMatch">{{ selectedDelayCandidateStop.vehicleMatch.vehicleId }}</strong>
            <span>{{ selectedDelayCandidateStop.currentPositionLabel }}，距站 {{ formatNumber(selectedDelayCandidateStop.vehicleMatch?.distanceKm) }} km</span>
          </div>
          <div>
            <small>原本應該在哪</small>
            <strong>{{ selectedDelayCandidateStop.expectedPositionLabel }}</strong>
            <span>{{ selectedDelayCandidateStop.positionExplanation }}</span>
          </div>
          <div>
            <small>超時多久</small>
            <strong>晚 {{ formatNumber(selectedDelayCandidateStop.lateMinutes) }} 分鐘</strong>
            <span>預估到站 {{ formatNumber(selectedDelayCandidateStop.etaMinutes) }} / 門檻 {{ formatNumber(selectedDelayCandidateStop.expectedMinutes) }} 分</span>
          </div>
        </div>
      </div>

      <div class="monitor-grid">
        <article v-if="!analyticsLoading && monitorCases.length === 0" class="incident-card empty">
          <div class="incident-head">
            <div class="incident-title">
              <div>
                <small>監控資料</small>
                <strong>目前沒有這條路線的異常訊號</strong>
              </div>
            </div>
          </div>
          <p class="incident-where">路線 {{ routeName }} / {{ monitorModeLabel }}</p>
          <div class="action-box">
            <span>下一步</span>
            <p>目前無需調度動作，持續監控；若現場回報與此不符，先回查資料品質。</p>
          </div>
        </article>
        <article
          v-for="item in monitorCases"
          :key="item.id"
          class="incident-card"
          :class="item.severity"
        >
          <div class="incident-head">
            <div class="incident-title">
              <i class="type-glyph" :class="item.typeClass" aria-hidden="true"></i>
              <div>
                <small>{{ item.scenario }}</small>
                <strong>{{ item.title }}</strong>
              </div>
            </div>
            <div class="incident-status">
              <b>{{ item.severityLabel }}</b>
              <span>{{ item.metric }}</span>
            </div>
          </div>
          <p class="incident-where">{{ item.where }}</p>
          <div class="action-box">
            <span>建議調整</span>
            <p>{{ item.action }}</p>
          </div>
          <div class="evidence-box">
            <span>判斷依據</span>
            <p>{{ item.evidence }}</p>
          </div>
        </article>
      </div>
    </section>

    <details v-if="routeContext" class="panel evidence-details">
      <summary>
        <span>
          <b>資料證據</b>
          <small>站點、車輛位置與路線幾何</small>
        </span>
        <i>展開檢視</i>
      </summary>

      <div class="visual-panel evidence-visual">
        <div class="panel-head">
          <div>
            <div class="eyebrow">路線幾何</div>
            <h2>站點與車輛位置</h2>
          </div>
          <div class="segmented">
            <button type="button" :class="{ active: direction === 0 }" @click="setDirection(0)">{{ routeDirectionLabel(0) }}</button>
            <button type="button" :class="{ active: direction === 1 }" @click="setDirection(1)">{{ routeDirectionLabel(1) }}</button>
          </div>
        </div>

        <svg
          class="route-svg"
          :viewBox="`0 0 ${viewport.width} ${viewport.height}`"
          role="img"
          aria-label="路線幾何位置對照"
        >
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path class="route-shadow" :d="routePath" />
          <path class="route-line" :d="routePath" />

          <g v-for="pair in stopPairs" :key="pair.stop.stopUID">
            <line
              v-if="pair.raw && pair.matched"
              class="projection-line"
              :x1="pair.raw.x"
              :y1="pair.raw.y"
              :x2="pair.matched.x"
              :y2="pair.matched.y"
            />
            <circle v-if="pair.raw" class="raw-stop" :cx="pair.raw.x" :cy="pair.raw.y" r="4.5" />
            <circle v-if="pair.matched" class="matched-stop" :cx="pair.matched.x" :cy="pair.matched.y" r="3.2" />
            <text
              v-if="pair.matched && pair.stop.sequence <= 4"
              class="stop-label"
              :x="pair.matched.x + 8"
              :y="pair.matched.y - 8"
            >{{ pair.stop.sequence }} {{ pair.stop.name }}</text>
          </g>

          <g v-if="busRaw && busMatched">
            <line class="bus-projection" :x1="busRaw.x" :y1="busRaw.y" :x2="busMatched.x" :y2="busMatched.y" />
            <circle class="bus-raw" :cx="busRaw.x" :cy="busRaw.y" r="8" />
            <circle class="bus-matched" :cx="busMatched.x" :cy="busMatched.y" r="10" />
            <text class="bus-label" :x="busMatched.x + 14" :y="busMatched.y - 12">
              {{ sampleObservation?.id }} / {{ progressPercent(sampleProgress?.progressRatio) }}
            </text>
          </g>
        </svg>

        <div class="legend">
          <span><b class="line-key"></b>路線形狀</span>
          <span><b class="raw-key"></b>原始站點</span>
          <span><b class="matched-key"></b>路線上的站點</span>
          <span><b class="bus-key"></b>車輛對應位置</span>
        </div>
      </div>

      <div class="grid evidence-grid-detail">
        <article class="evidence-subpanel">
          <div class="eyebrow">站點</div>
          <h2>站點進度</h2>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>站名</th>
                <th>路線進度</th>
                <th>離路線</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="stop in selectedDirectionStops" :key="stop.stopUID">
                <td>{{ stop.sequence }}</td>
                <td>{{ stop.name }}</td>
                <td>{{ progressPercent(stop.progressRatio) }}</td>
                <td>{{ meters(stop.distanceToRouteMeters) }}</td>
              </tr>
            </tbody>
          </table>
        </article>

        <article class="evidence-subpanel">
          <div class="eyebrow">車輛位置</div>
          <h2>車輛所在進度</h2>
          <div class="metric-list">
            <div><span>車號</span><strong>{{ sampleObservation?.id ?? '--' }}</strong></div>
            <div><span>路線進度</span><strong>{{ progressPercent(sampleProgress?.progressRatio) }}</strong></div>
            <div><span>距離路線</span><strong>{{ meters(sampleProgress?.distanceToRouteMeters) }}</strong></div>
            <div><span>最近站點</span><strong>{{ sampleProgress?.nearestStop?.name ?? '--' }}</strong></div>
            <div><span>站間位置</span><strong>{{ sampleProgress?.betweenStops?.betweenLabel ?? '--' }}</strong></div>
          </div>
        </article>

        <article class="evidence-subpanel wide">
          <div class="eyebrow">判讀依據</div>
          <h2>車輛位置轉成路線進度後，才能比較服務間距</h2>
          <p>
            若車輛離路線太遠，這筆位置會被標成低可信度，不應直接用來判斷服務空窗或延誤。
          </p>
        </article>
      </div>
    </details>

    <section v-else class="panel context-pending-panel">
      <div class="panel-head">
        <div>
          <div class="eyebrow">路線幾何</div>
          <h2>幾何資料待補</h2>
        </div>
        <span class="mode-badge">資料待補</span>
      </div>
      <p>
        目前先以路線層級訊號研判。補齊站點、路線形狀與品質稽核後，才顯示站點與車輛位置。
      </p>
    </section>

  </main>
</template>

<style scoped>
.concept-page {
  min-height: 100vh;
  padding: 26px;
  overflow-x: hidden;
  background:
    radial-gradient(circle at 18% 6%, rgba(17, 100, 129, 0.22), transparent 30%),
    radial-gradient(circle at 88% 18%, rgba(255, 99, 86, 0.12), transparent 26%),
    linear-gradient(180deg, rgba(7, 16, 26, 0), rgba(2, 5, 10, 0.5) 64%),
    #060a12;
  color: #e5f2fb;
  font-family: Geist, -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
}

.topbar,
.route-hero,
.panel-head,
.legend,
.formula {
  display: flex;
  align-items: center;
}

.topbar {
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 36px;
}

.brand-kicker {
  color: #8fa7ba;
  font: 12px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.eyebrow {
  color: #8fa7ba;
  font: 12px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  max-width: 1120px;
  margin-top: 8px;
  font-size: clamp(32px, 3.2vw, 44px);
  line-height: 1.04;
  letter-spacing: 0;
}

h1 span {
  white-space: nowrap;
}

h2 {
  margin-top: 6px;
  font-size: 20px;
  letter-spacing: 0;
}

p {
  color: #aebfcc;
  font-size: 15px;
  line-height: 1.6;
}

.nav-link,
button {
  border: 1px solid rgba(128, 154, 180, 0.32);
  border-radius: 8px;
  background: rgba(12, 22, 34, 0.78);
  color: #dcecf7;
  text-decoration: none;
}

.nav-link {
  padding: 10px 12px;
}

.route-hero {
  --hero-tone: #8fa7ba;
  position: relative;
  align-items: stretch;
  justify-content: space-between;
  gap: 28px;
  margin-bottom: 18px;
  padding: 24px;
  border: 1px solid rgba(128, 154, 180, 0.22);
  border-radius: 8px;
  background:
    linear-gradient(110deg, rgba(10, 22, 35, 0.96), rgba(7, 13, 22, 0.82)),
    radial-gradient(circle at 90% 20%, color-mix(in oklch, var(--hero-tone) 18%, transparent), transparent 34%);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.34);
}

.route-hero.critical {
  --hero-tone: #ff6b61;
}

.route-hero.warning {
  --hero-tone: #ffd052;
}

.route-hero.watch {
  --hero-tone: #6c9eff;
}

.route-hero.info {
  --hero-tone: #8fa7ba;
}

.route-hero::after {
  content: "";
  position: absolute;
  right: 28px;
  bottom: 26px;
  left: 28px;
  height: 1px;
  background: linear-gradient(90deg, color-mix(in oklch, var(--hero-tone) 72%, transparent), rgba(46, 199, 232, 0.42), transparent);
  opacity: 0.72;
}

.hero-copy {
  max-width: 1120px;
}

.hero-copy p {
  max-width: 760px;
  margin-top: 12px;
  color: #bfd0dc;
  font-size: 16px;
}

.hero-status-card {
  flex: 0 0 310px;
  align-self: stretch;
  display: grid;
  align-content: center;
  gap: 12px;
  padding: 22px;
  border: 1px solid color-mix(in oklch, var(--hero-tone) 34%, transparent);
  border-radius: 8px;
  background:
    linear-gradient(180deg, color-mix(in oklch, var(--hero-tone) 14%, transparent), rgba(18, 31, 46, 0.42)),
    rgba(8, 16, 26, 0.82);
}

.hero-status-card span,
.evidence-card span {
  color: #8fa7ba;
  font: 11px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.hero-status-card strong {
  color: color-mix(in oklch, var(--hero-tone) 34%, white);
  font-size: 30px;
  line-height: 1.02;
}

.hero-status-card p {
  font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
}

.evidence-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  grid-auto-flow: dense;
  gap: 12px;
  margin-bottom: 16px;
}

.evidence-card {
  grid-column: span 3;
  display: grid;
  gap: 9px;
  min-height: 112px;
  padding: 16px;
  border: 1px solid rgba(128, 154, 180, 0.2);
  border-radius: 8px;
  background: rgba(9, 17, 27, 0.84);
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.22);
}

.evidence-card.primary {
  grid-column: span 6;
}

.evidence-card strong {
  font-size: clamp(21px, 2.5vw, 34px);
  line-height: 1.04;
}

.evidence-card p {
  color: #9fb1c0;
  font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace;
}

.evidence-card.critical {
  border-color: rgba(255, 105, 97, 0.38);
  background:
    linear-gradient(135deg, rgba(255, 105, 97, 0.16), rgba(9, 17, 27, 0.82) 64%),
    rgba(9, 17, 27, 0.84);
}

.evidence-card.warning {
  border-color: rgba(255, 208, 82, 0.32);
}

.evidence-card.watch {
  border-color: rgba(108, 158, 255, 0.34);
}

.evidence-card.info {
  border-color: rgba(128, 154, 180, 0.22);
}

.explain,
.summary,
.panel {
  border: 1px solid rgba(128, 154, 180, 0.22);
  border-radius: 8px;
  background: rgba(9, 17, 27, 0.84);
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.26);
}

.explain {
  flex: 1;
  padding: 18px;
}

.step-row {
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;
}

.step-row span,
.legend span,
.formula span,
.formula b {
  padding: 8px 10px;
  border: 1px solid rgba(128, 154, 180, 0.22);
  border-radius: 999px;
  background: rgba(18, 31, 46, 0.74);
  color: #bfd0dc;
  font-size: 13px;
}

.summary {
  width: 320px;
  flex-wrap: wrap;
  gap: 10px;
  padding: 18px;
}

.summary div,
.metric-list div {
  min-width: 130px;
  display: grid;
  gap: 4px;
}

.summary span,
.metric-list span {
  color: #8fa7ba;
  font: 12px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
}

.summary strong,
.metric-list strong {
  font-size: 20px;
}

.panel {
  padding: 16px;
}

.warning,
.data-note {
  margin-bottom: 16px;
  border-color: rgba(244, 165, 96, 0.42);
  color: #ffd29c;
}

.data-note {
  background:
    linear-gradient(90deg, rgba(244, 165, 96, 0.1), rgba(9, 17, 27, 0.84) 70%),
    rgba(9, 17, 27, 0.84);
}

.data-note p {
  color: #ffd29c;
}

.visual-panel {
  margin-bottom: 16px;
  padding-bottom: 12px;
}

.evidence-details {
  margin-bottom: 16px;
}

.evidence-details summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  cursor: pointer;
  list-style: none;
}

.evidence-details summary::-webkit-details-marker {
  display: none;
}

.evidence-details summary span {
  display: grid;
  gap: 4px;
}

.evidence-details summary b {
  color: #dcecf7;
  font-size: 18px;
}

.evidence-details summary small {
  color: #8fa7ba;
  font-size: 12px;
}

.evidence-details summary i {
  flex: 0 0 auto;
  padding: 7px 9px;
  border: 1px solid rgba(128, 154, 180, 0.26);
  border-radius: 999px;
  color: #bad1ff;
  font: 11px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
  font-style: normal;
}

.evidence-details[open] summary {
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(128, 154, 180, 0.18);
}

.evidence-details[open] summary i {
  color: #dcecf7;
}

.evidence-details[open] summary i::before {
  content: "已";
}

.evidence-visual {
  padding-top: 14px;
}

.evidence-grid-detail {
  margin-top: 14px;
}

.evidence-subpanel {
  padding: 14px;
  border: 1px solid rgba(128, 154, 180, 0.18);
  border-radius: 8px;
  background: rgba(6, 13, 22, 0.48);
}

.context-pending-panel {
  margin-bottom: 16px;
  border-color: rgba(108, 158, 255, 0.24);
  background:
    radial-gradient(circle at 8% 20%, rgba(108, 158, 255, 0.12), transparent 34%),
    rgba(9, 17, 27, 0.84);
}

.monitor-panel {
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
}

.panel-head {
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.mode-badge {
  flex: 0 0 auto;
  padding: 8px 10px;
  border: 1px solid rgba(108, 158, 255, 0.34);
  border-radius: 999px;
  background: rgba(38, 68, 114, 0.28);
  color: #bad1ff;
  font: 12px/1.1 ui-monospace, SFMono-Regular, Menlo, monospace;
}

.monitor-timeline {
  display: grid;
  grid-template-columns: minmax(170px, 0.28fr) minmax(0, 1fr);
  gap: 16px;
  align-items: center;
  margin: 4px 0 12px;
  padding: 12px;
  border: 1px solid rgba(128, 154, 180, 0.18);
  border-radius: 8px;
  background: rgba(6, 13, 22, 0.58);
}

.monitor-timeline-status {
  display: grid;
  gap: 4px;
}

.monitor-timeline-status span,
.monitor-timeline-status small,
.monitor-slider-labels {
  color: #8fa7ba;
  font: 11px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
}

.monitor-timeline-status strong {
  color: #e5f2fb;
  font-size: 18px;
  line-height: 1.1;
}

.monitor-timeline-track {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 34px;
  gap: 10px;
  align-items: center;
}

.timeline-step {
  width: 34px;
  height: 34px;
  padding: 0;
  border-radius: 8px;
  border-color: rgba(128, 154, 180, 0.24);
  color: #dcecf7;
  font-size: 22px;
  line-height: 1;
}

.timeline-step:disabled {
  cursor: not-allowed;
  opacity: 0.38;
}

.monitor-slider-wrap {
  position: relative;
  display: grid;
  gap: 6px;
}

.monitor-slider-wrap::before,
.monitor-slider-wrap::after {
  content: "";
  position: absolute;
  top: 12px;
  left: 0;
  height: 30px;
  border-radius: 8px;
  pointer-events: none;
}

.monitor-slider-wrap::before {
  right: 0;
  border: 1px solid rgba(128, 154, 180, 0.22);
  background:
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.045) 0 1px, transparent 1px 72px),
    rgba(255, 255, 255, 0.018);
}

.monitor-slider-wrap::after {
  width: var(--monitor-timeline-progress);
  border-right: 1px solid rgba(46, 199, 232, 0.72);
  background: linear-gradient(90deg, rgba(46, 199, 232, 0.2), transparent);
  transition: width 0.12s linear;
}

.monitor-slider {
  position: relative;
  z-index: 2;
  width: 100%;
  height: 54px;
  opacity: 0;
  cursor: pointer;
}

.monitor-slider-labels {
  position: absolute;
  z-index: 1;
  top: 21px;
  right: 10px;
  left: 10px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  pointer-events: none;
}

.monitor-slider-labels span:last-child {
  color: #b9f4ff;
}

.route-strip {
  margin-top: 12px;
  padding: 18px 18px 14px;
  border: 1px solid rgba(128, 154, 180, 0.18);
  border-radius: 8px;
  background:
    linear-gradient(180deg, rgba(14, 27, 42, 0.8), rgba(8, 16, 26, 0.92));
}

.strip-axis {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin: 0 18px 4px;
  color: #8fa7ba;
  font: 11px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
  text-transform: uppercase;
}

.strip-axis strong {
  color: #dcecf7;
  font-size: 12px;
  font-weight: 700;
  text-transform: none;
}

.strip-band {
  position: relative;
  height: 142px;
  margin: 0 18px 10px;
}

.strip-band::before {
  content: "";
  position: absolute;
  right: 0;
  left: 0;
  top: 66px;
  height: 8px;
  border-radius: 999px;
  background: linear-gradient(90deg, #d9e7f8, #91a9bd);
  box-shadow: 0 0 18px rgba(188, 220, 255, 0.34);
}

.gap-zone,
.bunch-zone,
.slow-zone {
  position: absolute;
  height: 18px;
  border-radius: 999px;
}

.gap-zone {
  top: 52px;
  height: 34px;
  border: 2px dashed rgba(255, 105, 97, 0.76);
  background: rgba(255, 105, 97, 0.12);
}

.bunch-zone {
  top: 96px;
  height: 16px;
  border: 1px solid rgba(255, 208, 82, 0.84);
  border-radius: 4px;
  background: rgba(255, 208, 82, 0.16);
}

.bunch-zone::before,
.bunch-zone::after {
  content: "";
  position: absolute;
  top: -5px;
  bottom: -5px;
  width: 5px;
  border-color: rgba(255, 208, 82, 0.82);
  border-style: solid;
}

.bunch-zone::before {
  left: 0;
  border-width: 2px 0 2px 2px;
  border-radius: 8px 0 0 8px;
}

.bunch-zone::after {
  right: 0;
  border-width: 2px 2px 2px 0;
  border-radius: 0 8px 8px 0;
}

.slow-zone {
  top: 18px;
  height: 22px;
  border: 1px solid rgba(108, 158, 255, 0.78);
  box-shadow: 0 0 0 1px rgba(108, 158, 255, 0.18);
  background:
    repeating-linear-gradient(
      135deg,
      rgba(108, 158, 255, 0.42) 0,
      rgba(108, 158, 255, 0.42) 6px,
      rgba(108, 158, 255, 0.1) 6px,
      rgba(108, 158, 255, 0.1) 12px
    );
}

.gap-zone span,
.bunch-zone span,
.slow-zone span {
  position: absolute;
  right: 10px;
  color: #dcecf7;
  font: 10.5px/1.1 ui-monospace, SFMono-Regular, Menlo, monospace;
  white-space: nowrap;
}

.gap-zone span {
  bottom: -22px;
}

.slow-zone span {
  top: 50%;
  bottom: auto;
  transform: translateY(-50%);
  color: #dbe7ff;
}

.bunch-zone span {
  display: none;
}

.strip-stop,
.strip-bus,
.strip-delay-stop {
  position: absolute;
  transform: translateX(-50%);
}

.strip-stop {
  top: 63px;
}

.strip-stop span {
  display: block;
  width: 14px;
  height: 14px;
  border: 2px solid #d9e7f8;
  border-radius: 50%;
  background: #07101a;
}

.strip-stop small {
  position: absolute;
  top: 24px;
  left: 50%;
  width: 74px;
  transform: translateX(-50%);
  color: #8fa7ba;
  font: 10.5px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.strip-delay-stop {
  top: 27px;
  z-index: 4;
  display: grid;
  justify-items: center;
  gap: 3px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  outline: none;
}

.delay-marker-stem {
  order: 2;
  width: 2px;
  height: 23px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255, 208, 82, 0.95), rgba(255, 208, 82, 0.12));
}

.delay-marker-head {
  order: 1;
  position: relative;
  width: 18px;
  height: 18px;
  border: 1px solid rgba(255, 239, 185, 0.92);
  border-radius: 6px 6px 6px 1px;
  background: #ffd052;
  box-shadow: 0 0 16px rgba(255, 208, 82, 0.48);
  transform: rotate(45deg);
}

.delay-marker-head::after {
  content: "";
  position: absolute;
  inset: 5px;
  border-radius: 50%;
  background: rgba(7, 16, 26, 0.7);
}

.strip-delay-stop.critical .delay-marker-stem {
  background: linear-gradient(180deg, rgba(255, 107, 97, 0.95), rgba(255, 107, 97, 0.12));
}

.strip-delay-stop.critical .delay-marker-head {
  border-color: rgba(255, 211, 207, 0.92);
  background: #ff6b61;
  box-shadow: 0 0 16px rgba(255, 107, 97, 0.52);
}

.strip-delay-stop small {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  order: 0;
  padding: 3px 6px;
  border: 1px solid rgba(255, 208, 82, 0.34);
  border-radius: 999px;
  background: rgba(255, 208, 82, 0.11);
  color: #ffe19a;
  font: 10.5px/1.1 ui-monospace, SFMono-Regular, Menlo, monospace;
  opacity: 0;
  pointer-events: none;
  transform: translateX(-50%) translateY(2px);
  transition: opacity 0.14s ease, transform 0.14s ease;
  white-space: nowrap;
}

.strip-delay-stop:hover small {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.strip-delay-stop:hover .delay-marker-head,
.strip-delay-stop:focus-visible .delay-marker-head,
.strip-delay-stop.selected .delay-marker-head {
  box-shadow:
    0 0 0 3px rgba(255, 208, 82, 0.18),
    0 0 18px rgba(255, 208, 82, 0.68);
}

.delay-selected-panel {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
  margin-top: 10px;
  padding: 10px 12px;
  border: 1px solid rgba(255, 208, 82, 0.34);
  border-radius: 8px;
  background: rgba(7, 16, 26, 0.96);
}

.delay-selected-panel div {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.delay-selected-panel strong {
  color: #eaf7ff;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delay-selected-panel span {
  color: #aebfcc;
  font: 11.5px/1.25 ui-monospace, SFMono-Regular, Menlo, monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delay-selected-panel div:last-child strong {
  color: #ffd052;
}

.delay-selected-panel small {
  color: #aebfcc;
  font: 10.5px/1.25 ui-monospace, SFMono-Regular, Menlo, monospace;
}

.strip-bus {
  top: 59px;
  z-index: 3;
  outline: none;
}

.strip-bus b {
  display: block;
  width: 22px;
  height: 22px;
  border: 2px solid white;
  border-radius: 7px;
  background: #2ec7e8;
  box-shadow: 0 0 18px rgba(46, 199, 232, 0.5);
}

.strip-bus.context {
  top: 62px;
  z-index: 2;
}

.strip-bus.context b {
  width: 14px;
  height: 14px;
  border: 1px solid rgba(165, 236, 255, 0.78);
  border-radius: 5px;
  background: rgba(46, 199, 232, 0.44);
  box-shadow: 0 0 10px rgba(46, 199, 232, 0.18);
}

.strip-bus.eta-reference {
  z-index: 5;
}

.strip-bus.eta-reference b {
  border-color: rgba(255, 255, 255, 0.98);
  background: #2ec7e8;
  box-shadow:
    0 0 0 3px rgba(46, 199, 232, 0.16),
    0 0 20px rgba(46, 199, 232, 0.64);
}

.strip-bus.bunched b {
  background: #ffd052;
  box-shadow: 0 0 18px rgba(255, 208, 82, 0.52);
}

.strip-bus.gap b {
  background: #ff6b61;
  box-shadow: 0 0 18px rgba(255, 107, 97, 0.52);
}

.strip-bus small {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  max-width: 86px;
  padding: 4px 7px;
  border: 1px solid rgba(46, 199, 232, 0.42);
  border-radius: 999px;
  background: rgba(7, 16, 26, 0.94);
  color: #e7f4ff;
  font: 11px/1.1 ui-monospace, SFMono-Regular, Menlo, monospace;
  text-align: center;
  opacity: 0;
  overflow: hidden;
  pointer-events: none;
  text-overflow: ellipsis;
  transform: translateX(-50%) translateY(3px);
  transition: opacity 0.14s ease, transform 0.14s ease;
  white-space: nowrap;
}

.strip-bus:hover,
.strip-bus:focus-visible {
  z-index: 7;
}

.strip-bus:hover b,
.strip-bus:focus-visible b {
  box-shadow:
    0 0 0 3px rgba(46, 199, 232, 0.18),
    0 0 18px rgba(46, 199, 232, 0.58);
}

.strip-bus:hover small,
.strip-bus:focus-visible small {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.strip-bus.eta-reference small {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.strip-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 2px;
  color: #aebfcc;
  font-size: 12px;
}

.strip-legend span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.strip-legend b {
  position: relative;
  flex: 0 0 auto;
  width: 12px;
  height: 12px;
  border-radius: 4px;
}

.legend-gap {
  border: 2px dashed rgba(255, 105, 97, 0.9);
  background: rgba(255, 105, 97, 0.22);
}

.legend-delay-stop {
  width: 13px;
  height: 13px;
  border: 1px solid rgba(255, 239, 185, 0.92);
  border-radius: 999px;
  background: #ffd052;
  box-shadow: 0 0 10px rgba(255, 208, 82, 0.42);
  transform: rotate(45deg);
}

.legend-delay-stop::after {
  content: "";
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  background: rgba(7, 16, 26, 0.7);
}

.legend-eta-bus {
  border: 2px solid white;
  background: #2ec7e8;
  box-shadow:
    0 0 0 2px rgba(46, 199, 232, 0.14),
    0 0 10px rgba(46, 199, 232, 0.48);
}

.strip-legend .legend-bunch {
  width: 20px;
  height: 12px;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.strip-legend .legend-bunch::before,
.strip-legend .legend-bunch::after {
  content: "";
  position: absolute;
  top: 2px;
  width: 8px;
  height: 8px;
  border: 1px solid rgba(255, 239, 185, 0.88);
  border-radius: 3px;
  background: #ffd052;
  box-shadow: 0 0 8px rgba(255, 208, 82, 0.42);
}

.strip-legend .legend-bunch::before {
  left: 0;
}

.strip-legend .legend-bunch::after {
  right: 0;
}

.legend-slow {
  border: 1px solid rgba(108, 158, 255, 0.7);
  background:
    repeating-linear-gradient(
      135deg,
      rgba(108, 158, 255, 0.95) 0,
      rgba(108, 158, 255, 0.95) 4px,
      rgba(108, 158, 255, 0.28) 4px,
      rgba(108, 158, 255, 0.28) 8px
    );
}

.legend-bus {
  background: #2ec7e8;
}

.monitor-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.delay-poc-panel {
  display: grid;
  gap: 14px;
}

.delay-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.delay-summary-grid article {
  min-width: 0;
  padding: 12px;
  border: 1px solid rgba(128, 154, 180, 0.18);
  border-radius: 8px;
  background: rgba(8, 18, 29, 0.76);
}

.delay-summary-grid span {
  display: block;
  color: #8fa7ba;
  font: 11px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
}

.delay-summary-grid strong {
  display: block;
  margin-top: 6px;
  color: #e9f6ff;
  font-size: 24px;
  line-height: 1;
}

.delay-summary-grid p {
  margin: 7px 0 0;
  color: #9fb1c1;
  font-size: 12px;
}

.delay-grid {
  margin-top: 0;
}

.delay-error {
  padding: 10px 12px;
  border: 1px solid rgba(255, 208, 82, 0.28);
  border-radius: 8px;
  background: rgba(255, 208, 82, 0.08);
  color: #ffdca0;
  font: 12px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace;
}

.incident-card {
  display: grid;
  gap: 10px;
  padding: 14px;
  border: 1px solid rgba(128, 154, 180, 0.2);
  border-left-width: 4px;
  border-radius: 8px;
  background: rgba(6, 13, 22, 0.72);
}

.incident-card.critical {
  border-left-color: #ff6b61;
}

.incident-card.warning {
  border-left-color: #ffd052;
}

.incident-card.watch {
  border-left-color: #6c9eff;
}

.incident-card.info,
.incident-card.empty {
  border-left-color: #8fa7ba;
}

.incident-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.incident-title {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.incident-title div {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.incident-head small {
  color: #8fa7ba;
  font: 10.5px/1.1 ui-monospace, SFMono-Regular, Menlo, monospace;
  text-transform: uppercase;
}

.incident-head strong {
  font-size: 15px;
}

.incident-status {
  display: grid;
  justify-items: end;
  gap: 5px;
}

.incident-status b {
  padding: 4px 7px;
  border-radius: 999px;
  background: rgba(128, 154, 180, 0.14);
  color: #dcecf7;
  font: 10.5px/1.1 ui-monospace, SFMono-Regular, Menlo, monospace;
}

.incident-card.critical .incident-status b {
  color: #ffb3ad;
  background: rgba(255, 105, 97, 0.14);
}

.incident-card.warning .incident-status b {
  color: #ffe19a;
  background: rgba(255, 208, 82, 0.14);
}

.incident-card.watch .incident-status b {
  color: #bad1ff;
  background: rgba(108, 158, 255, 0.14);
}

.incident-card.info .incident-status b,
.incident-card.empty .incident-status b {
  color: #c4d2df;
  background: rgba(143, 167, 186, 0.14);
}

.incident-status span {
  color: #ffdca0;
  font: 12px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
  text-align: right;
}

.type-glyph {
  position: relative;
  flex: 0 0 auto;
  width: 24px;
  height: 24px;
  border-radius: 7px;
  background: rgba(18, 31, 46, 0.86);
}

.type-glyph.service-gap {
  border: 2px dashed rgba(255, 105, 97, 0.86);
}

.type-glyph.eta-delay {
  border: 2px solid rgba(93, 207, 255, 0.86);
}

.type-glyph.bunching {
  border: 1px solid rgba(255, 208, 82, 0.72);
}

.type-glyph.bunching::before,
.type-glyph.bunching::after {
  content: "";
  position: absolute;
  top: 7px;
  width: 7px;
  height: 7px;
  border-radius: 3px;
  background: #ffd052;
}

.type-glyph.bunching::before {
  left: 5px;
}

.type-glyph.bunching::after {
  right: 5px;
}

.type-glyph.slow-segment {
  border: 1px solid rgba(108, 158, 255, 0.7);
  background:
    repeating-linear-gradient(
      135deg,
      rgba(108, 158, 255, 0.62) 0,
      rgba(108, 158, 255, 0.62) 4px,
      rgba(18, 31, 46, 0.86) 4px,
      rgba(18, 31, 46, 0.86) 8px
    );
}

.type-glyph.data-quality {
  border: 2px dashed rgba(143, 167, 186, 0.78);
}

.type-glyph.data-quality::before,
.type-glyph.data-quality::after {
  content: "";
  position: absolute;
  background: rgba(143, 167, 186, 0.88);
}

.type-glyph.data-quality::before {
  top: 6px;
  left: 10px;
  width: 4px;
  height: 8px;
  border-radius: 999px;
}

.type-glyph.data-quality::after {
  right: 10px;
  bottom: 5px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
}

.type-glyph.activity-density {
  border: 1px solid rgba(143, 167, 186, 0.68);
}

.type-glyph.activity-density::before {
  content: "";
  position: absolute;
  right: 5px;
  bottom: 5px;
  left: 5px;
  height: 11px;
  border-radius: 2px;
  background: linear-gradient(90deg, #8fa7ba 28%, transparent 28% 38%, #8fa7ba 38% 66%, transparent 66% 76%, #8fa7ba 76%);
  opacity: 0.78;
}

.incident-where {
  color: #dcecf7;
  font-size: 13px;
}

.action-box,
.evidence-box {
  display: grid;
  gap: 4px;
  padding: 9px;
  border-radius: 7px;
  background: rgba(18, 31, 46, 0.58);
}

.action-box span,
.evidence-box span {
  color: #8fa7ba;
  font: 11px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
}

.action-box p,
.evidence-box p {
  color: #bfd0dc;
  font-size: 12.5px;
  line-height: 1.45;
}

.segmented {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  border: 1px solid rgba(128, 154, 180, 0.24);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.22);
}

button {
  height: 34px;
  padding: 0 12px;
  cursor: pointer;
}

button.active {
  border-color: rgba(20, 196, 226, 0.7);
  background: rgba(17, 101, 126, 0.72);
}

.route-svg {
  display: block;
  width: 100%;
  height: auto;
  min-height: 420px;
  border-radius: 10px;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.026) 1px, transparent 1px),
    linear-gradient(0deg, rgba(255, 255, 255, 0.026) 1px, transparent 1px),
    radial-gradient(circle at 50% 46%, rgba(23, 52, 74, 0.42), transparent 44%),
    #07101a;
  background-size: 46px 46px, 46px 46px, auto, auto;
}

.route-shadow {
  fill: none;
  stroke: rgba(124, 151, 184, 0.16);
  stroke-width: 12;
}

.route-line {
  fill: none;
  stroke: #d4e4ff;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 4.5;
  filter: url("#glow");
}

.projection-line,
.bus-projection {
  stroke-dasharray: 4 5;
  stroke-width: 1.2;
}

.projection-line {
  stroke: rgba(255, 112, 96, 0.56);
}

.bus-projection {
  stroke: rgba(255, 211, 89, 0.76);
  stroke-width: 2;
}

.raw-stop {
  fill: #ff5b4f;
  stroke: #ffd7d0;
  stroke-width: 1.5;
}

.matched-stop {
  fill: #18c6dd;
  stroke: #d8fbff;
  stroke-width: 1.2;
}

.bus-raw {
  fill: rgba(255, 216, 86, 0.42);
  stroke: #ffd94f;
  stroke-width: 2;
}

.bus-matched {
  fill: #ffd052;
  stroke: white;
  stroke-width: 2;
}

.stop-label,
.bus-label {
  fill: #e7f4ff;
  paint-order: stroke;
  stroke: #07101a;
  stroke-width: 4px;
  font: 13px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
}

.bus-label {
  font-weight: 700;
}

.legend {
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

.legend b {
  width: 12px;
  height: 12px;
  display: inline-block;
  margin-right: 8px;
  border-radius: 50%;
  vertical-align: -1px;
}

.line-key {
  background: #d4e4ff;
}

.raw-key {
  background: #ff5b4f;
}

.matched-key {
  background: #18c6dd;
}

.bus-key {
  background: #ffd052;
}

.grid {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
  gap: 16px;
}

.wide {
  grid-column: 1 / -1;
}

table {
  width: 100%;
  margin-top: 14px;
  border-collapse: collapse;
}

th,
td {
  padding: 10px 8px;
  border-top: 1px solid rgba(128, 154, 180, 0.18);
  text-align: left;
}

th {
  color: #8fa7ba;
  font: 12px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
}

td {
  color: #dcecf7;
  font-size: 14px;
}

.metric-list {
  display: grid;
  gap: 14px;
  margin-top: 16px;
}

.formula {
  flex-wrap: wrap;
  gap: 8px;
  margin: 16px 0;
}

.formula b {
  color: #fff;
  background: rgba(17, 101, 126, 0.78);
}

@media (max-width: 820px) {
  .concept-page {
    padding: 16px;
  }

  .route-hero,
  .grid,
  .monitor-grid {
    display: grid;
    grid-template-columns: 1fr;
  }

  .route-hero {
    padding: 20px;
  }

  .hero-status-card {
    flex-basis: auto;
  }

  .evidence-grid {
    grid-template-columns: 1fr;
  }

  .delay-summary-grid {
    grid-template-columns: 1fr;
  }

  .delay-selected-panel {
    grid-template-columns: 1fr;
  }

  .evidence-card,
  .evidence-card.primary {
    grid-column: span 1;
  }

  .summary {
    width: auto;
  }

  .panel-head,
  .topbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .monitor-timeline {
    grid-template-columns: 1fr;
  }

  .monitor-timeline-track {
    grid-template-columns: 30px minmax(0, 1fr) 30px;
  }

  .timeline-step {
    width: 30px;
    height: 30px;
  }

  .strip-band {
    margin-right: 6px;
    margin-left: 6px;
  }

  .strip-axis {
    margin-right: 6px;
    margin-left: 6px;
  }

  .gap-zone span,
  .bunch-zone span,
  .slow-zone span {
    display: none;
  }

  .route-strip {
    order: 2;
  }

  .monitor-grid {
    order: 1;
  }

  .strip-stop small {
    display: none;
  }
}
</style>
