const DEFAULT_TARGET_HEADWAY_MINUTES = 8;
const DEFAULT_GAP_RATIO_THRESHOLD = 1.8;
const DEFAULT_ESTIMATED_TRIP_MINUTES = 48;
const MIN_SIGNAL_OBSERVATIONS = 2;

export function detectHeadwayGapSignals(entries, options = {}) {
  const targetHeadwayMinutes = Number(options.targetHeadwayMinutes ?? DEFAULT_TARGET_HEADWAY_MINUTES);
  const gapRatioThreshold = Number(options.gapRatioThreshold ?? DEFAULT_GAP_RATIO_THRESHOLD);
  const estimatedTripMinutes = Number(options.estimatedTripMinutes ?? DEFAULT_ESTIMATED_TRIP_MINUTES);
  const minimumGapMinutes = Number(options.minimumGapMinutes ?? targetHeadwayMinutes * gapRatioThreshold);

  const grouped = groupSignalReadyEntries(entries);
  const signals = [];

  for (const [routeKey, routeEntries] of grouped.entries()) {
    if (routeEntries.length < MIN_SIGNAL_OBSERVATIONS) continue;

    const sorted = [...routeEntries].sort((left, right) => (
      left.routeProgress.progressRatio - right.routeProgress.progressRatio
    ));
    const gap = largestAdjacentProgressGap(sorted, estimatedTripMinutes);
    if (!gap || gap.observedHeadwayMinutes < minimumGapMinutes) continue;

    const sample = sorted[0];
    const ratio = targetHeadwayMinutes > 0 ? gap.observedHeadwayMinutes / targetHeadwayMinutes : 0;
    const confidence = clamp(0.48 + Math.min(0.34, (ratio - gapRatioThreshold) * 0.18) + Math.min(0.16, sorted.length * 0.025), 0.5, 0.86);

    signals.push({
      id: `headway-gap:${routeKey}`,
      signalType: 'headway_gap',
      severity: ratio >= 2.4 ? 'high' : 'medium',
      routeUID: sample.routeProgress.routeUID,
      routeName: sample.routeProgress.routeName,
      direction: sample.routeProgress.direction,
      confidence,
      observedHeadwayMinutes: gap.observedHeadwayMinutes,
      expectedHeadwayMinutes: targetHeadwayMinutes,
      progressGapRatio: gap.progressGapRatio,
      sampleCount: sorted.length,
      geometryQuality: weakestGeometryQuality(sorted),
      leadingVehicleId: gap.leading.observation.id,
      trailingVehicleId: gap.trailing.observation.id,
      anchor: {
        longitude: gap.trailing.routeProgress.matchedPosition?.longitude
          ?? gap.trailing.observation.position.longitude,
        latitude: gap.trailing.routeProgress.matchedPosition?.latitude
          ?? gap.trailing.observation.position.latitude,
      },
      evidence: {
        baselineSource: 'prototype_target_headway',
        estimatedTripMinutes,
        targetHeadwayMinutes,
        gapRatioThreshold,
      },
    });
  }

  return signals.sort((left, right) => right.confidence - left.confidence);
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

function largestAdjacentProgressGap(sortedEntries, estimatedTripMinutes) {
  let best = null;

  for (let index = 1; index < sortedEntries.length; index += 1) {
    const trailing = sortedEntries[index - 1];
    const leading = sortedEntries[index];
    const progressGapRatio = leading.routeProgress.progressRatio - trailing.routeProgress.progressRatio;
    if (progressGapRatio <= 0) continue;

    const candidate = {
      trailing,
      leading,
      progressGapRatio,
      observedHeadwayMinutes: progressGapRatio * estimatedTripMinutes,
    };
    if (!best || candidate.observedHeadwayMinutes > best.observedHeadwayMinutes) best = candidate;
  }

  return best;
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
