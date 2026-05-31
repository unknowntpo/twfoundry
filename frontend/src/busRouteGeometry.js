const EARTH_RADIUS_METERS = 6371008.8;

export function parseLineStringGeometry(geometry) {
  const match = String(geometry ?? '').trim().match(/^LINESTRING\s*\((.*)\)$/i);
  if (!match) return [];

  return match[1]
    .split(',')
    .map((pair) => pair.trim().split(/\s+/).map(Number))
    .filter(([longitude, latitude]) => Number.isFinite(longitude) && Number.isFinite(latitude));
}

export function buildRouteMeasure(points) {
  const segments = [];
  let totalMeters = 0;

  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    const lengthMeters = haversineMeters(from, to);
    segments.push({
      from,
      to,
      startMeters: totalMeters,
      lengthMeters,
    });
    totalMeters += lengthMeters;
  }

  return {
    points,
    segments,
    totalMeters,
  };
}

export function projectPointToRoute(point, routeMeasure) {
  const route = routeMeasure?.segments ? routeMeasure : buildRouteMeasure(routeMeasure ?? []);
  if (!route.segments.length) return null;

  let best = null;
  for (const segment of route.segments) {
    const projected = projectPointToSegment(point, segment.from, segment.to);
    const progressMeters = segment.startMeters + projected.t * segment.lengthMeters;
    const candidate = {
      point: projected.point,
      distanceToRouteMeters: projected.distanceMeters,
      progressMeters,
      progressRatio: route.totalMeters > 0 ? progressMeters / route.totalMeters : 0,
      segment,
    };
    if (!best || candidate.distanceToRouteMeters < best.distanceToRouteMeters) best = candidate;
  }

  return best;
}

export function buildStopProgress(stopOfRoute, routeMeasure) {
  return [...(stopOfRoute?.Stops ?? [])]
    .sort((left, right) => Number(left.StopSequence ?? 0) - Number(right.StopSequence ?? 0))
    .map((stop) => {
      const position = stop.StopPosition
        ? [Number(stop.StopPosition.PositionLon), Number(stop.StopPosition.PositionLat)]
        : null;
      const projection = position?.every(Number.isFinite)
        ? projectPointToRoute(position, routeMeasure)
        : null;
      return {
        stopUID: stop.StopUID,
        stopID: stop.StopID,
        stationID: stop.StationID,
        name: stop.StopName?.Zh_tw ?? stop.StopName?.En ?? stop.StopID,
        sequence: Number(stop.StopSequence ?? 0),
        position,
        progressMeters: projection?.progressMeters ?? null,
        progressRatio: projection?.progressRatio ?? null,
        distanceToRouteMeters: projection?.distanceToRouteMeters ?? null,
      };
    });
}

export function locateBetweenStops(progressMeters, stopProgress) {
  const stops = stopProgress
    .filter((stop) => Number.isFinite(stop.progressMeters))
    .sort((left, right) => left.progressMeters - right.progressMeters);
  if (!stops.length || !Number.isFinite(progressMeters)) return null;

  let previous = stops[0];
  let next = stops.at(-1);
  for (let index = 0; index < stops.length; index += 1) {
    if (stops[index].progressMeters <= progressMeters) previous = stops[index];
    if (stops[index].progressMeters >= progressMeters) {
      next = stops[index];
      break;
    }
  }

  return {
    previous,
    next,
    betweenLabel: previous.stopUID === next.stopUID
      ? previous.name
      : `${previous.name} -> ${next.name}`,
  };
}

export function buildRouteProgressObservation(observation, routeContext) {
  const shape = findMatchingShape(observation, routeContext);
  if (!shape) return null;

  const points = parseLineStringGeometry(shape.Geometry);
  const routeMeasure = buildRouteMeasure(points);
  const projection = projectPointToRoute([
    observation.position.longitude,
    observation.position.latitude,
  ], routeMeasure);
  if (!projection) return null;

  const stopOfRoute = findMatchingStopOfRoute(observation, routeContext);
  const stopProgress = buildStopProgress(stopOfRoute, routeMeasure);
  const betweenStops = locateBetweenStops(projection.progressMeters, stopProgress);

  return {
    routeUID: observation.route.uid,
    routeName: observation.route.name,
    direction: observation.route.direction,
    plateNumb: observation.id,
    progressMeters: projection.progressMeters,
    progressRatio: projection.progressRatio,
    distanceToRouteMeters: projection.distanceToRouteMeters,
    matchedPosition: {
      longitude: projection.point[0],
      latitude: projection.point[1],
    },
    nearestStop: nearestStopByProgress(projection.progressMeters, stopProgress),
    betweenStops,
    routeLengthMeters: routeMeasure.totalMeters,
  };
}

export function findMatchingShape(observation, routeContext) {
  return (routeContext?.shapes ?? []).find((shape) => (
    shape.RouteUID === observation.route.uid
    && Number(shape.Direction) === Number(observation.route.direction)
  )) ?? (routeContext?.shapes ?? []).find((shape) => (
    Number(shape.Direction) === Number(observation.route.direction)
  )) ?? null;
}

export function findMatchingStopOfRoute(observation, routeContext) {
  return (routeContext?.stopOfRoutes ?? []).find((route) => (
    route.RouteUID === observation.route.uid
    && Number(route.Direction) === Number(observation.route.direction)
  )) ?? (routeContext?.stopOfRoutes ?? []).find((route) => (
    Number(route.Direction) === Number(observation.route.direction)
  )) ?? null;
}

function nearestStopByProgress(progressMeters, stopProgress) {
  return stopProgress
    .filter((stop) => Number.isFinite(stop.progressMeters))
    .reduce((best, stop) => {
      const delta = Math.abs(stop.progressMeters - progressMeters);
      return !best || delta < best.deltaMeters ? { ...stop, deltaMeters: delta } : best;
    }, null);
}

function projectPointToSegment(point, from, to) {
  const originLat = point[1];
  const localPoint = lngLatToLocalMeters(point, point, originLat);
  const localFrom = lngLatToLocalMeters(from, point, originLat);
  const localTo = lngLatToLocalMeters(to, point, originLat);
  const dx = localTo[0] - localFrom[0];
  const dy = localTo[1] - localFrom[1];
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0
    ? 0
    : clamp(((localPoint[0] - localFrom[0]) * dx + (localPoint[1] - localFrom[1]) * dy) / lengthSquared, 0, 1);
  const projectedLocal = [
    localFrom[0] + dx * t,
    localFrom[1] + dy * t,
  ];
  const projected = localMetersToLngLat(projectedLocal, point, originLat);

  return {
    t,
    point: projected,
    distanceMeters: Math.hypot(localPoint[0] - projectedLocal[0], localPoint[1] - projectedLocal[1]),
  };
}

function lngLatToLocalMeters(point, origin, originLat) {
  const latScale = (Math.PI / 180) * EARTH_RADIUS_METERS;
  const lonScale = latScale * Math.cos(toRadians(originLat));
  return [
    (point[0] - origin[0]) * lonScale,
    (point[1] - origin[1]) * latScale,
  ];
}

function localMetersToLngLat(point, origin, originLat) {
  const latScale = (Math.PI / 180) * EARTH_RADIUS_METERS;
  const lonScale = latScale * Math.cos(toRadians(originLat));
  return [
    origin[0] + point[0] / lonScale,
    origin[1] + point[1] / latScale,
  ];
}

function haversineMeters(left, right) {
  const lat1 = toRadians(left[1]);
  const lat2 = toRadians(right[1]);
  const deltaLat = toRadians(right[1] - left[1]);
  const deltaLon = toRadians(right[0] - left[0]);
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(value) {
  return value * Math.PI / 180;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
