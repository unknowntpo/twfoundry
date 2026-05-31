import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import {
  buildRouteMeasure,
  buildStopProgress,
  parseLineStringGeometry,
} from '../src/busRouteGeometry.js';

const DEFAULT_INPUT_ROOT = 'public/data/tdx-bus/route-context';
const DEFAULT_OUTPUT_ROOT = 'public/data/tdx-bus/route-quality';

const options = parseArgs(process.argv.slice(2));
const inputRoot = resolve(process.cwd(), options['input-root'] ?? DEFAULT_INPUT_ROOT);
const outputRoot = resolve(process.cwd(), options['output-root'] ?? DEFAULT_OUTPUT_ROOT);
const city = options.city ?? 'Taipei';
const goodP95Meters = Number(options['good-p95-meters'] ?? 30);
const usableP95Meters = Number(options['usable-p95-meters'] ?? 80);
const badStopMeters = Number(options['bad-stop-meters'] ?? 80);
const maxBadStopRatio = Number(options['max-bad-stop-ratio'] ?? 0.15);

if (!existsSync(inputRoot)) {
  throw new Error(`Route context input root does not exist: ${inputRoot}`);
}

const routeContextFiles = readdirSync(inputRoot)
  .filter((fileName) => fileName.endsWith('.json') && fileName !== 'manifest.json')
  .sort((left, right) => left.localeCompare(right, 'en', { numeric: true }));

const audits = routeContextFiles.flatMap((fileName) => {
  const routeContextPath = join(inputRoot, fileName);
  const routeContext = JSON.parse(readFileSync(routeContextPath, 'utf8'));
  return auditRouteContext(routeContext, routeContextPath);
});

const manifest = {
  schema: 'twfoundry.tdx.citybus.route-quality-manifest.v1',
  source: {
    provider: 'TDX',
    city,
    routeContextRoot: toPublicPath(inputRoot),
  },
  generatedAt: new Date().toISOString(),
  thresholds: {
    goodP95Meters,
    usableP95Meters,
    badStopMeters,
    maxBadStopRatio,
  },
  summary: summarizeAudits(audits),
  routes: audits.sort((left, right) => (
    left.routeName.localeCompare(right.routeName, 'en', { numeric: true })
    || Number(left.direction) - Number(right.direction)
    || String(left.subRouteUID ?? '').localeCompare(String(right.subRouteUID ?? ''))
  )),
};

const outputPath = join(outputRoot, 'manifest.json');
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.info(JSON.stringify({
  ok: true,
  inputRoot,
  outputPath,
  ...manifest.summary,
}, null, 2));

function auditRouteContext(routeContext, routeContextPath) {
  const routeName = String(routeContext.routeName ?? '');
  const stopOfRoutes = routeContext.stopOfRoutes ?? [];

  if (!stopOfRoutes.length) {
    return [{
      routeName,
      direction: null,
      quality: 'bad',
      reason: 'missing-stop-of-route',
      routeContextPath: toPublicPath(routeContextPath),
      stopsCount: 0,
      projectedStopsCount: 0,
      badStopCount: 0,
      badStopRatio: 1,
      medianDistanceToRouteMeters: null,
      p95DistanceToRouteMeters: null,
      maxDistanceToRouteMeters: null,
      routeLengthMeters: null,
      shapePointCount: 0,
      worstStops: [],
    }];
  }

  return stopOfRoutes.map((stopOfRoute) => auditStopOfRoute(routeContext, stopOfRoute, routeContextPath));
}

function auditStopOfRoute(routeContext, stopOfRoute, routeContextPath) {
  const shape = findMatchingShape(routeContext, stopOfRoute);
  const routeName = routeNameFrom(stopOfRoute.RouteName) || String(routeContext.routeName ?? '');
  const direction = Number(stopOfRoute.Direction);

  if (!shape) {
    const stopsCount = stopOfRoute.Stops?.length ?? 0;
    return {
      routeName,
      routeUID: stopOfRoute.RouteUID ?? null,
      subRouteUID: stopOfRoute.SubRouteUID ?? null,
      subRouteName: routeNameFrom(stopOfRoute.SubRouteName),
      direction,
      quality: 'bad',
      reason: 'missing-shape',
      routeContextPath: toPublicPath(routeContextPath),
      stopsCount,
      projectedStopsCount: 0,
      badStopCount: stopsCount,
      badStopRatio: stopsCount > 0 ? 1 : 0,
      medianDistanceToRouteMeters: null,
      p95DistanceToRouteMeters: null,
      maxDistanceToRouteMeters: null,
      routeLengthMeters: null,
      shapePointCount: 0,
      worstStops: [],
    };
  }

  const points = parseLineStringGeometry(shape.Geometry);
  const routeMeasure = buildRouteMeasure(points);
  const stopProgress = buildStopProgress(stopOfRoute, routeMeasure);
  const projectedStops = stopProgress.filter((stop) => Number.isFinite(stop.distanceToRouteMeters));
  const distances = projectedStops
    .map((stop) => stop.distanceToRouteMeters)
    .sort((left, right) => left - right);
  const badStopCount = distances.filter((distance) => distance > badStopMeters).length;
  const stopsCount = stopOfRoute.Stops?.length ?? 0;
  const badStopRatio = stopsCount > 0 ? badStopCount / stopsCount : 1;
  const p95DistanceToRouteMeters = quantile(distances, 0.95);
  const quality = classifyQuality({ p95DistanceToRouteMeters, badStopRatio });

  return {
    routeName,
    routeUID: stopOfRoute.RouteUID ?? shape.RouteUID ?? null,
    subRouteUID: stopOfRoute.SubRouteUID ?? null,
    subRouteName: routeNameFrom(stopOfRoute.SubRouteName),
    direction,
    quality,
    reason: quality === 'bad' ? 'geometry-stop-distance' : 'ok',
    routeContextPath: toPublicPath(routeContextPath),
    stopsCount,
    projectedStopsCount: projectedStops.length,
    badStopCount,
    badStopRatio: round(badStopRatio, 4),
    medianDistanceToRouteMeters: roundNullable(quantile(distances, 0.5), 1),
    p95DistanceToRouteMeters: roundNullable(p95DistanceToRouteMeters, 1),
    maxDistanceToRouteMeters: roundNullable(distances.at(-1), 1),
    routeLengthMeters: roundNullable(routeMeasure.totalMeters, 1),
    shapePointCount: points.length,
    worstStops: [...projectedStops]
      .sort((left, right) => right.distanceToRouteMeters - left.distanceToRouteMeters)
      .slice(0, 5)
      .map((stop) => ({
        sequence: stop.sequence,
        stopID: stop.stopID,
        stopUID: stop.stopUID,
        name: stop.name,
        distanceToRouteMeters: roundNullable(stop.distanceToRouteMeters, 1),
      })),
  };
}

function findMatchingShape(routeContext, stopOfRoute) {
  return (routeContext.shapes ?? []).find((shape) => (
    shape.RouteUID === stopOfRoute.RouteUID
    && Number(shape.Direction) === Number(stopOfRoute.Direction)
  )) ?? (routeContext.shapes ?? []).find((shape) => (
    Number(shape.Direction) === Number(stopOfRoute.Direction)
  )) ?? null;
}

function classifyQuality({ p95DistanceToRouteMeters, badStopRatio }) {
  if (!Number.isFinite(p95DistanceToRouteMeters)) return 'bad';
  if (p95DistanceToRouteMeters < goodP95Meters && badStopRatio <= maxBadStopRatio) return 'good';
  if (p95DistanceToRouteMeters < usableP95Meters && badStopRatio <= maxBadStopRatio) return 'usable';
  return 'bad';
}

function summarizeAudits(items) {
  const byQuality = items.reduce((summary, item) => {
    summary[item.quality] = (summary[item.quality] ?? 0) + 1;
    return summary;
  }, {});
  return {
    routeDirectionCount: items.length,
    good: byQuality.good ?? 0,
    usable: byQuality.usable ?? 0,
    bad: byQuality.bad ?? 0,
  };
}

function quantile(sortedValues, q) {
  if (!sortedValues.length) return null;
  if (sortedValues.length === 1) return sortedValues[0];
  const position = (sortedValues.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const weight = position - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

function routeNameFrom(value) {
  if (typeof value === 'string') return value;
  return value?.Zh_tw ?? value?.En ?? '';
}

function roundNullable(value, digits = 1) {
  return Number.isFinite(value) ? round(value, digits) : null;
}

function round(value, digits = 1) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function toPublicPath(path) {
  const publicRoot = resolve(process.cwd(), 'public');
  const relative = path.startsWith(publicRoot)
    ? path.slice(publicRoot.length)
    : path.slice(process.cwd().length);
  return `/${relative.replace(/^\/+/, '')}`;
}

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith('--')) {
      parsed[key] = true;
      continue;
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}
