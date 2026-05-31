import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  OPERATIONS_ARCHIVE_INTERVAL_MINUTES,
  OPERATIONS_POLL_INTERVAL_SECONDS,
  advanceOperationsMotionFrame,
  advanceOperationsFixtureTick,
  ageOperationsObservations,
  createOperationsDataSource,
  createOperationsFixture,
  createOperationsFromSnapshot,
  createRouteQualityIndex,
  fallbackOperationsDataSource,
  filterOperationsObservations,
  getObservationRouteQuality,
  isRouteGeometrySignalReady,
  listRouteOptions,
  summarizeOperations,
} from '../src/operationsWorkflowData.js';

const manifest = JSON.parse(readFileSync(resolve('public/data/tdx-bus/archive/manifest.json'), 'utf8'));
const routeQualityManifest = JSON.parse(readFileSync(resolve('public/data/tdx-bus/route-quality/manifest.json'), 'utf8'));
const latestEntry = manifest.source?.mode === 'tdx-historical'
  ? manifest.snapshots.reduce((best, snapshot) => (snapshot.count > best.count ? snapshot : best), manifest.snapshots[0])
  : manifest.snapshots.at(-1);
const snapshot = JSON.parse(readFileSync(resolve(`public${latestEntry.path}`), 'utf8'));
const observations = createOperationsFromSnapshot(snapshot, latestEntry);
const dataSource = createOperationsDataSource(snapshot, latestEntry);
const expectedSourceMode = manifest.source?.mode ?? 'tdx-captured';
const minimumRows = expectedSourceMode === 'tdx-historical' ? 120 : 500;
const minimumRoutes = expectedSourceMode === 'tdx-historical' ? 15 : 20;

assert.equal(OPERATIONS_ARCHIVE_INTERVAL_MINUTES, 5);
assert.equal(OPERATIONS_POLL_INTERVAL_SECONDS, 300);
assert.ok(manifest.snapshots.length >= 1, 'archive manifest should expose at least one timeline slot');
assert.ok(observations.length >= minimumRows, 'TDX archive snapshot should provide enough rows for simulation');
assert.ok(listRouteOptions(observations).length >= minimumRoutes, 'captured TDX archive snapshot should include many routes');
assert.equal(dataSource.mode, expectedSourceMode);
assert.equal(dataSource.count, observations.length);
assert.equal(dataSource.path, latestEntry.path);

const fallbackRows = createOperationsFixture();
assert.equal(fallbackOperationsDataSource.mode, 'fixture');
assert.equal(fallbackRows[0].source.mode, 'fixture');

const sample = observations[0];
assert.ok(sample.source.mode.startsWith(expectedSourceMode));
assert.equal(sample.ontologyType, 'VehicleObservation');
assert.equal(sample.objectType, 'BusVehicle');
assert.ok(sample.evidence.sourceFields.includes('PlateNumb'));
assert.ok(sample.evidence.derivedFields.includes('freshness age'));
assert.ok(sample.raw.mode.startsWith(expectedSourceMode));

const firstRoute = sample.route.name;
const firstRouteRows = filterOperationsObservations(observations, { routeName: firstRoute });
assert.ok(firstRouteRows.length >= 1);
assert.ok(firstRouteRows.every((observation) => observation.route.name === firstRoute));

const routeQualityIndex = createRouteQualityIndex(routeQualityManifest);
const auditedSample = observations.find((observation) => getObservationRouteQuality(observation, routeQualityIndex));
assert.ok(auditedSample, 'sample should include at least one audited route');
const auditedRouteQuality = getObservationRouteQuality(auditedSample, routeQualityIndex);
assert.ok(isRouteGeometrySignalReady(auditedRouteQuality), 'audited route should be signal-ready');
assert.ok(routeQualityIndex.byRouteName.get(auditedSample.route.name).length >= 1);

const noStale = filterOperationsObservations(observations, { hideStale: true });
assert.ok(noStale.length <= observations.length);
assert.ok(noStale.every((observation) => observation.status.freshness === 'fresh'));

const aged = ageOperationsObservations(observations, 45);
const agedSample = aged.find((observation) => observation.id === sample.id);
assert.equal(agedSample.status.ageSeconds, sample.status.ageSeconds + 45);

const ticked = advanceOperationsFixtureTick(observations, 2, new Date('2026-05-20T07:12:30Z'));
const moved = ticked.find((observation) => observation.id === sample.id);
assert.notEqual(moved.position.screenX, sample.position.screenX);
assert.equal(moved.timestamps.updateTime, '2026-05-20T07:12:30.000Z');
assert.ok(moved.source.mode.startsWith(expectedSourceMode));

const interpolated = advanceOperationsMotionFrame(observations, 1, new Date('2026-05-20T07:12:31Z'));
const interpolatedSample = interpolated.find((observation) => observation.id === sample.id);
assert.notEqual(interpolatedSample.position.screenX, sample.position.screenX);
assert.equal(interpolatedSample.timestamps.updateTime, '2026-05-20T07:12:31.000Z');
assert.equal(interpolatedSample.status.ageSeconds, sample.status.ageSeconds);
assert.ok(interpolatedSample.evidence.derivedFields.includes('playback interpolation'));

const summary = summarizeOperations(observations);
assert.equal(summary.active, observations.length);
assert.equal(summary.fresh + summary.stale, observations.length);
assert.ok(summary.completeness > 0.75);

console.log(JSON.stringify({
  archivedCount: observations.length,
  routeCount: listRouteOptions(observations).length,
  sourceMode: sample.source.mode,
  archiveSlots: manifest.snapshots.length,
  latestSlot: latestEntry.slotKey,
  staleCount: summary.stale,
}, null, 2));
