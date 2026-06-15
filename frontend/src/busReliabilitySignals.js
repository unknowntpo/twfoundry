export const HEADWAY_CRITICAL_MINUTES = 30;
export const DELAY_WARNING_MINUTES = 5;
export const DELAY_CRITICAL_MINUTES = 10;
export const TIMETABLE_MANUAL_REVIEW_MINUTES = 30;
export const STOP_STATUS_NORMAL = 0;

export const BUS_RELIABILITY_SIGNAL_TYPES = {
  SERVICE_GAP: 'service_gap',
  BUNCHING: 'bunching',
  LOW_CAPACITY: 'low_capacity',
};

export const BUS_RELIABILITY_SEVERITIES = {
  CRITICAL: 'critical',
  WARNING: 'warning',
  WATCH: 'watch',
  NORMAL: 'normal',
};

export const BUS_RELIABILITY_LABELS_ZH = {
  [BUS_RELIABILITY_SIGNAL_TYPES.SERVICE_GAP]: '大空窗',
  [BUS_RELIABILITY_SIGNAL_TYPES.BUNCHING]: '車輛群聚',
  [BUS_RELIABILITY_SIGNAL_TYPES.LOW_CAPACITY]: '運能不足',
};

export const HEADWAY_RATIO_THRESHOLDS = {
  serviceGapCritical: 2,
  serviceGapWarning: 1.4,
  bunchingWarning: 0.45,
};

export const DEFAULT_EXPECTED_HEADWAY_MINUTES = 15;

export const LOW_CAPACITY_THRESHOLDS = {
  activeVehicles: 4,
  slowSpeedKph: 8,
  stoppedReports: 6,
};

export function headwaySeverity(minutes) {
  return normalizeHeadwaySignal({ observedHeadwayMinutes: minutes }).severity;
}

export function headwaySeverityRank(severity) {
  if (severity === 'critical') return 0;
  if (severity === 'warning') return 1;
  if (severity === 'watch') return 2;
  return 3;
}

export function headwaySeverityLabelZh(minutes) {
  return headwaySeverity(minutes) === 'critical' ? '嚴重' : '注意';
}

export function isCriticalHeadway(minutes) {
  return headwaySeverity(minutes) === 'critical';
}

export function normalizeHeadwaySignal({
  observedHeadwayMinutes,
  expectedHeadwayMinutes = DEFAULT_EXPECTED_HEADWAY_MINUTES,
  progressGapRatio = null,
} = {}) {
  const observed = finiteNumberOrNull(observedHeadwayMinutes);
  const expected = finiteNumberOrNull(expectedHeadwayMinutes) ?? DEFAULT_EXPECTED_HEADWAY_MINUTES;
  const progressRatio = finiteNumberOrNull(progressGapRatio);
  const observedRatio = observed !== null && expected > 0 ? observed / expected : null;

  if (
    progressRatio !== null
    && progressRatio <= 0.08
    && (observedRatio === null || observedRatio <= HEADWAY_RATIO_THRESHOLDS.bunchingWarning)
  ) {
    return buildReliabilitySignal({
      type: BUS_RELIABILITY_SIGNAL_TYPES.BUNCHING,
      severity: BUS_RELIABILITY_SEVERITIES.WARNING,
      observedHeadwayMinutes: observed,
      expectedHeadwayMinutes: expected,
      observedRatio,
    });
  }

  if (observedRatio !== null && observedRatio >= HEADWAY_RATIO_THRESHOLDS.serviceGapCritical) {
    return buildReliabilitySignal({
      type: BUS_RELIABILITY_SIGNAL_TYPES.SERVICE_GAP,
      severity: BUS_RELIABILITY_SEVERITIES.CRITICAL,
      observedHeadwayMinutes: observed,
      expectedHeadwayMinutes: expected,
      observedRatio,
    });
  }

  if (observedRatio !== null && observedRatio >= HEADWAY_RATIO_THRESHOLDS.serviceGapWarning) {
    return buildReliabilitySignal({
      type: BUS_RELIABILITY_SIGNAL_TYPES.SERVICE_GAP,
      severity: BUS_RELIABILITY_SEVERITIES.WARNING,
      observedHeadwayMinutes: observed,
      expectedHeadwayMinutes: expected,
      observedRatio,
    });
  }

  return buildReliabilitySignal({
    type: BUS_RELIABILITY_SIGNAL_TYPES.BUNCHING,
    severity: BUS_RELIABILITY_SEVERITIES.WARNING,
    observedHeadwayMinutes: observed,
    expectedHeadwayMinutes: expected,
    observedRatio,
  });
}

export function normalizeLowCapacitySignal({
  activeVehicles,
  avgSpeedKph,
  stoppedReports,
} = {}) {
  const vehicles = finiteNumberOrNull(activeVehicles);
  const speed = finiteNumberOrNull(avgSpeedKph);
  const stopped = finiteNumberOrNull(stoppedReports);
  const isSparse = vehicles !== null && vehicles <= LOW_CAPACITY_THRESHOLDS.activeVehicles;
  const isSlow = speed !== null && speed <= LOW_CAPACITY_THRESHOLDS.slowSpeedKph;
  const isStopped = stopped !== null && stopped >= LOW_CAPACITY_THRESHOLDS.stoppedReports;

  if (isSparse && isSlow && isStopped) {
    return buildReliabilitySignal({
      type: BUS_RELIABILITY_SIGNAL_TYPES.LOW_CAPACITY,
      severity: BUS_RELIABILITY_SEVERITIES.WARNING,
      activeVehicles: vehicles,
      avgSpeedKph: speed,
      stoppedReports: stopped,
    });
  }

  if ((isSparse && isSlow) || (isSparse && isStopped) || (isSlow && isStopped)) {
    return buildReliabilitySignal({
      type: BUS_RELIABILITY_SIGNAL_TYPES.LOW_CAPACITY,
      severity: BUS_RELIABILITY_SEVERITIES.WATCH,
      activeVehicles: vehicles,
      avgSpeedKph: speed,
      stoppedReports: stopped,
    });
  }

  return buildReliabilitySignal({
    type: BUS_RELIABILITY_SIGNAL_TYPES.LOW_CAPACITY,
    severity: BUS_RELIABILITY_SEVERITIES.NORMAL,
    activeVehicles: vehicles,
    avgSpeedKph: speed,
    stoppedReports: stopped,
  });
}

export function buildReliabilitySignal({ type, severity, ...metadata } = {}) {
  const signalType = Object.values(BUS_RELIABILITY_SIGNAL_TYPES).includes(type)
    ? type
    : BUS_RELIABILITY_SIGNAL_TYPES.SERVICE_GAP;
  const signalSeverity = Object.values(BUS_RELIABILITY_SEVERITIES).includes(severity)
    ? severity
    : BUS_RELIABILITY_SEVERITIES.WATCH;

  return {
    type: signalType,
    severity: signalSeverity,
    label: BUS_RELIABILITY_LABELS_ZH[signalType],
    labelKey: `oversight.signal.${signalType}`,
    severityKey: `oversight.severity.${signalSeverity}`,
    ...metadata,
  };
}

export function delaySeverity(minutes, { candidateEligible = true } = {}) {
  const value = Number(minutes);
  if (!candidateEligible || !Number.isFinite(value) || value <= DELAY_WARNING_MINUTES) return 'ok';
  return value >= DELAY_CRITICAL_MINUTES ? 'critical' : 'warning';
}

export function buildFrequencyWaitSignal({
  etaMinutes,
  expectedMaxWaitMinutes,
  stopStatus,
  scheduleWindow = null,
} = {}) {
  const eta = finiteNumberOrNull(etaMinutes);
  const expected = finiteNumberOrNull(expectedMaxWaitMinutes);
  const predictedDelayMinutes = eta !== null && expected !== null
    ? roundMinutes(eta - expected)
    : null;
  const candidateEligible = stopStatus === STOP_STATUS_NORMAL && expected !== null;

  return {
    signalSubtype: 'frequency_wait_excess',
    userFacingSignal: '候車超時',
    scheduleBasis: 'frequency',
    etaMinutes: eta,
    expectedMaxWaitMinutes: expected,
    expectedScheduledArrivalMinutes: null,
    predictedArrivalMinutes: null,
    predictedDelayMinutes,
    thresholdMinutes: DELAY_WARNING_MINUTES,
    severity: delaySeverity(predictedDelayMinutes, { candidateEligible }),
    candidateEligible,
    scheduleWindow,
  };
}

export function buildTimetableDelaySignal({
  etaMinutes,
  currentMinutes,
  scheduledArrivalMinutes,
  scheduledArrivalTime = null,
  stopSequence = null,
  stopStatus,
} = {}) {
  const eta = finiteNumberOrNull(etaMinutes);
  const now = finiteNumberOrNull(currentMinutes);
  const scheduled = finiteNumberOrNull(scheduledArrivalMinutes);
  const predictedArrivalMinutes = eta !== null && now !== null ? roundMinutes(now + eta) : null;
  const predictedDelayMinutes = predictedArrivalMinutes !== null && scheduled !== null
    ? roundMinutes(predictedArrivalMinutes - scheduled)
    : null;
  const candidateEligible = stopStatus === STOP_STATUS_NORMAL && scheduled !== null;
  const needsManualTripCheck = candidateEligible
    && Number.isFinite(predictedDelayMinutes)
    && predictedDelayMinutes > TIMETABLE_MANUAL_REVIEW_MINUTES;
  const userFacingSignal = Number(stopSequence) === 1 ? '發車誤點' : '表定誤點';

  return {
    signalSubtype: 'timetable_delay',
    userFacingSignal,
    signalVariant: userFacingSignal === '發車誤點' ? 'departure_delay' : 'stop_timetable_delay',
    scheduleBasis: 'timetable',
    etaMinutes: eta,
    expectedMaxWaitMinutes: null,
    expectedScheduledArrivalMinutes: scheduled,
    predictedArrivalMinutes,
    predictedDelayMinutes,
    thresholdMinutes: DELAY_WARNING_MINUTES,
    manualReviewThresholdMinutes: TIMETABLE_MANUAL_REVIEW_MINUTES,
    severity: needsManualTripCheck ? 'watch' : delaySeverity(predictedDelayMinutes, { candidateEligible }),
    candidateEligible,
    claimStatus: needsManualTripCheck ? 'needs_manual_trip_check' : 'candidate',
    scheduledArrivalTime,
  };
}

function finiteNumberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function roundMinutes(value) {
  return Math.round(value * 10) / 10;
}
