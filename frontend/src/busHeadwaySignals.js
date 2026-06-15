const DEFAULT_TARGET_HEADWAY_MINUTES = 8;
const DEFAULT_GAP_RATIO_THRESHOLD = 1.8;
const DEFAULT_BUNCHING_RATIO_THRESHOLD = 0.5;
const DEFAULT_ESTIMATED_TRIP_MINUTES = 48;
const MIN_SIGNAL_OBSERVATIONS = 2;

export function detectHeadwayGapSignals(entries, options = {}) {
  return buildRouteServiceSummary(entries, options).signals
    .filter((signal) => signal.signalType === 'headway_gap');
}

export function buildRouteServiceSummary(entries, options = {}) {
  const targetHeadwayMinutes = Number(options.targetHeadwayMinutes ?? DEFAULT_TARGET_HEADWAY_MINUTES);
  const gapRatioThreshold = Number(options.gapRatioThreshold ?? DEFAULT_GAP_RATIO_THRESHOLD);
  const bunchingRatioThreshold = Number(options.bunchingRatioThreshold ?? DEFAULT_BUNCHING_RATIO_THRESHOLD);
  const estimatedTripMinutes = Number(options.estimatedTripMinutes ?? DEFAULT_ESTIMATED_TRIP_MINUTES);
  const minimumGapMinutes = Number(options.minimumGapMinutes ?? targetHeadwayMinutes * gapRatioThreshold);
  const maximumBunchingMinutes = Number(options.maximumBunchingMinutes ?? targetHeadwayMinutes * bunchingRatioThreshold);

  const grouped = groupSignalReadyEntries(entries);
  const routeSummaries = [];
  const signals = [];

  for (const [routeKey, routeEntries] of grouped.entries()) {
    if (routeEntries.length < MIN_SIGNAL_OBSERVATIONS) continue;

    const sorted = [...routeEntries].sort((left, right) => (
      left.routeProgress.progressRatio - right.routeProgress.progressRatio
    ));
    const sample = sorted[0];
    const headways = adjacentProgressHeadways(sorted, estimatedTripMinutes, targetHeadwayMinutes);
    const gap = largestHeadway(headways);
    const bunching = smallestHeadway(headways);
    const maxHeadwayMinutes = gap?.observedHeadwayMinutes ?? null;
    const minHeadwayMinutes = bunching?.observedHeadwayMinutes ?? null;
    const averageHeadwayMinutes = headways.length > 0
      ? headways.reduce((sum, headway) => sum + headway.observedHeadwayMinutes, 0) / headways.length
      : null;
    const routeSummary = {
      id: `route-service:${routeKey}`,
      routeUID: sample.routeProgress.routeUID,
      routeName: sample.routeProgress.routeName,
      direction: sample.routeProgress.direction,
      targetHeadwayMinutes,
      estimatedTripMinutes,
      sampleCount: sorted.length,
      geometryQuality: weakestGeometryQuality(sorted),
      headways,
      minHeadwayMinutes,
      maxHeadwayMinutes,
      averageHeadwayMinutes,
      signals: [],
      evidence: {
        baselineSource: 'prototype_target_headway',
        estimatedTripMinutes,
        targetHeadwayMinutes,
        gapRatioThreshold,
        bunchingRatioThreshold,
      },
    };

    if (gap && gap.observedHeadwayMinutes >= minimumGapMinutes) {
      const ratio = targetHeadwayMinutes > 0 ? gap.observedHeadwayMinutes / targetHeadwayMinutes : 0;
      const confidence = clamp(0.48 + Math.min(0.34, (ratio - gapRatioThreshold) * 0.18) + Math.min(0.16, sorted.length * 0.025), 0.5, 0.86);
      routeSummary.signals.push({
        id: `headway-gap:${routeKey}`,
        signalType: 'headway_gap',
        productLabel: '大空窗',
        severity: ratio >= 2.4 ? 'high' : 'medium',
        routeUID: sample.routeProgress.routeUID,
        routeName: sample.routeProgress.routeName,
        direction: sample.routeProgress.direction,
        confidence,
        observedHeadwayMinutes: gap.observedHeadwayMinutes,
        expectedHeadwayMinutes: targetHeadwayMinutes,
        progressGapRatio: gap.progressGapRatio,
        sampleCount: sorted.length,
        geometryQuality: routeSummary.geometryQuality,
        leadingVehicleId: gap.leading.observation.id,
        trailingVehicleId: gap.trailing.observation.id,
        anchor: signalAnchor(gap.trailing),
        evidence: routeSummary.evidence,
      });
    }

    if (bunching && bunching.observedHeadwayMinutes <= maximumBunchingMinutes) {
      const ratio = targetHeadwayMinutes > 0 ? bunching.observedHeadwayMinutes / targetHeadwayMinutes : 0;
      const confidence = clamp(0.5 + Math.min(0.28, (bunchingRatioThreshold - ratio) * 0.28) + Math.min(0.14, sorted.length * 0.02), 0.5, 0.82);
      routeSummary.signals.push({
        id: `vehicle-bunching:${routeKey}`,
        signalType: 'vehicle_bunching',
        productLabel: '車輛群聚',
        severity: ratio <= 0.3 ? 'high' : 'medium',
        routeUID: sample.routeProgress.routeUID,
        routeName: sample.routeProgress.routeName,
        direction: sample.routeProgress.direction,
        confidence,
        observedHeadwayMinutes: bunching.observedHeadwayMinutes,
        expectedHeadwayMinutes: targetHeadwayMinutes,
        progressGapRatio: bunching.progressGapRatio,
        sampleCount: sorted.length,
        geometryQuality: routeSummary.geometryQuality,
        leadingVehicleId: bunching.leading.observation.id,
        trailingVehicleId: bunching.trailing.observation.id,
        anchor: signalAnchor(bunching.leading),
        evidence: routeSummary.evidence,
      });
    }

    signals.push(...routeSummary.signals);
    routeSummaries.push(routeSummary);
  }

  signals.sort((left, right) => right.confidence - left.confidence);
  routeSummaries.sort((left, right) => (
    signalSeverityRank(right.signals[0]) - signalSeverityRank(left.signals[0])
    || (right.maxHeadwayMinutes ?? 0) - (left.maxHeadwayMinutes ?? 0)
    || String(left.routeName).localeCompare(String(right.routeName))
  ));

  return {
    targetHeadwayMinutes,
    estimatedTripMinutes,
    routeSummaries,
    signals,
    primaryRoute: routeSummaries[0] ?? null,
  };
}

function groupSignalReadyEntries(entries) {
  const grouped = new Map();

  for (const entry of entries ?? []) {
    const routeProgress = entry?.routeProgress;
    const observation = entry?.observation;
    if (!routeProgress || !observation) continue;
    if (!Number.isFinite(routeProgress.progressRatio)) continue;
    if (Number(routeProgress.distanceToRouteMeters ?? 0) > 120) continue;

    const routeUID = routeProgress.routeUID ?? observation.route?.uid;
    const direction = routeProgress.direction ?? observation.route?.direction;
    if (!routeUID || direction === undefined || direction === null) continue;

    const key = `${routeUID}:${direction}`;
    const rows = grouped.get(key) ?? [];
    rows.push(entry);
    grouped.set(key, rows);
  }

  return grouped;
}

function adjacentProgressHeadways(sortedEntries, estimatedTripMinutes, targetHeadwayMinutes) {
  const headways = [];
  for (let index = 1; index < sortedEntries.length; index += 1) {
    const trailing = sortedEntries[index - 1];
    const leading = sortedEntries[index];
    const progressGapRatio = leading.routeProgress.progressRatio - trailing.routeProgress.progressRatio;
    if (progressGapRatio <= 0) continue;

    const observedHeadwayMinutes = progressGapRatio * estimatedTripMinutes;
    headways.push({
      trailing,
      leading,
      progressGapRatio,
      observedHeadwayMinutes,
      expectedHeadwayMinutes: targetHeadwayMinutes,
      ratioToTarget: targetHeadwayMinutes > 0 ? observedHeadwayMinutes / targetHeadwayMinutes : null,
    });
  }
  return headways;
}

function largestHeadway(headways) {
  return headways.reduce((best, headway) => (
    !best || headway.observedHeadwayMinutes > best.observedHeadwayMinutes ? headway : best
  ), null);
}

function smallestHeadway(headways) {
  return headways.reduce((best, headway) => (
    !best || headway.observedHeadwayMinutes < best.observedHeadwayMinutes ? headway : best
  ), null);
}

function signalAnchor(entry) {
  return {
    longitude: entry.routeProgress.matchedPosition?.longitude
      ?? entry.observation.position.longitude,
    latitude: entry.routeProgress.matchedPosition?.latitude
      ?? entry.observation.position.latitude,
  };
}

function signalSeverityRank(signal) {
  if (!signal) return 0;
  if (signal.severity === 'high') return 3;
  if (signal.severity === 'medium') return 2;
  return 1;
}

function weakestGeometryQuality(entries) {
  const ranks = new Map([
    ['good', 3],
    ['usable', 2],
    ['bad', 1],
  ]);
  return entries.reduce((weakest, entry) => {
    const quality = entry.geometryQuality ?? 'usable';
    return (ranks.get(quality) ?? 0) < (ranks.get(weakest) ?? 0) ? quality : weakest;
  }, 'good');
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
