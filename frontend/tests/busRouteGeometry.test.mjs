import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildRouteMeasure,
  buildRouteProgressObservation,
  buildStopProgress,
  locateBetweenStops,
  parseLineStringGeometry,
  projectPointToRoute,
} from '../src/busRouteGeometry.js';
import {
  createOperationsFromSnapshot,
  createRouteQualityIndex,
  getObservationRouteQuality,
  isRouteGeometrySignalReady,
} from '../src/operationsWorkflowData.js';

const geometry = 'LINESTRING (121.5000 25.0000, 121.5100 25.0000, 121.5200 25.0000)';
const points = parseLineStringGeometry(geometry);
assert.deepEqual(points, [
  [121.5, 25],
  [121.51, 25],
  [121.52, 25],
]);

const measure = buildRouteMeasure(points);
assert.equal(measure.segments.length, 2);
assert.ok(measure.totalMeters > 2000);

const projection = projectPointToRoute([121.512, 25.001], measure);
assert.ok(projection.distanceToRouteMeters > 100);
assert.ok(projection.progressRatio > 0.55 && projection.progressRatio < 0.65);
assert.ok(Math.abs(projection.point[1] - 25) < 0.00001);

const stopOfRoute = {
  Direction: 0,
  Stops: [{
    StopUID: 'stop-a',
    StopID: 'A',
    StopName: { Zh_tw: 'A站' },
    StopSequence: 1,
    StopPosition: { PositionLon: 121.5, PositionLat: 25 },
  }, {
    StopUID: 'stop-b',
    StopID: 'B',
    StopName: { Zh_tw: 'B站' },
    StopSequence: 2,
    StopPosition: { PositionLon: 121.51, PositionLat: 25 },
  }, {
    StopUID: 'stop-c',
    StopID: 'C',
    StopName: { Zh_tw: 'C站' },
    StopSequence: 3,
    StopPosition: { PositionLon: 121.52, PositionLat: 25 },
  }],
};

const stopProgress = buildStopProgress(stopOfRoute, measure);
assert.equal(stopProgress.length, 3);
assert.equal(stopProgress[1].name, 'B站');
assert.ok(stopProgress[1].progressRatio > 0.49 && stopProgress[1].progressRatio < 0.51);

const betweenStops = locateBetweenStops(projection.progressMeters, stopProgress);
assert.equal(betweenStops.previous.name, 'B站');
assert.equal(betweenStops.next.name, 'C站');
assert.equal(betweenStops.betweenLabel, 'B站 -> C站');

const observation = {
  id: 'BUS-1',
  route: { uid: 'TPE_TEST', name: 'test', direction: 0 },
  position: { longitude: 121.512, latitude: 25.001 },
};
const routeContext = {
  shapes: [{
    RouteUID: 'TPE_TEST',
    Direction: 0,
    Geometry: geometry,
  }],
  stopOfRoutes: [{
    RouteUID: 'TPE_TEST',
    Direction: 0,
    Stops: stopOfRoute.Stops,
  }],
};
const progressObservation = buildRouteProgressObservation(observation, routeContext);
assert.equal(progressObservation.plateNumb, 'BUS-1');
assert.equal(progressObservation.routeUID, 'TPE_TEST');
assert.equal(progressObservation.nearestStop.name, 'B站');
assert.equal(progressObservation.betweenStops.betweenLabel, 'B站 -> C站');

const archiveManifest = JSON.parse(readFileSync(resolve('public/data/tdx-bus/archive/manifest.json'), 'utf8'));
const routeQualityManifest = JSON.parse(readFileSync(resolve('public/data/tdx-bus/route-quality/manifest.json'), 'utf8'));
const routeQualityIndex = createRouteQualityIndex(routeQualityManifest);
const archiveEntry = archiveManifest.snapshots.find((entry) => entry.count > 0);
const archiveSnapshot = JSON.parse(readFileSync(resolve(`public${archiveEntry.path}`), 'utf8'));
const archiveObservations = createOperationsFromSnapshot(archiveSnapshot, archiveEntry);
const auditedObservation = archiveObservations.find((item) => (
  isRouteGeometrySignalReady(getObservationRouteQuality(item, routeQualityIndex))
));
assert.ok(auditedObservation, 'archive should include at least one signal-ready route observation');

const auditedQuality = getObservationRouteQuality(auditedObservation, routeQualityIndex);
const auditedRouteContext = JSON.parse(readFileSync(resolve(`public${auditedQuality.routeContextPath}`), 'utf8'));
const auditedProgress = buildRouteProgressObservation(auditedObservation, auditedRouteContext);
assert.ok(auditedProgress, 'signal-ready route observation should produce route progress');
assert.ok(auditedProgress.routeLengthMeters > 1000);
assert.ok(auditedProgress.progressRatio >= 0 && auditedProgress.progressRatio <= 1);
assert.ok(Number.isFinite(auditedProgress.distanceToRouteMeters));
assert.ok(auditedProgress.nearestStop?.name);

console.log(JSON.stringify({
  routeLengthMeters: Math.round(measure.totalMeters),
  projectedProgressRatio: Number(projection.progressRatio.toFixed(3)),
  distanceToRouteMeters: Math.round(projection.distanceToRouteMeters),
}, null, 2));
