import assert from 'node:assert/strict';
import { gridToLngLat, lngLatToGrid, TAIPEI_MAP_VIEW } from '../src/geoProjection.js';
import { mrtMapSummary, mrtRouteGeoJson, mrtStationGeoJson } from '../src/mrtMapData.js';

assert.equal(mrtRouteGeoJson.type, 'FeatureCollection');
assert.equal(mrtStationGeoJson.type, 'FeatureCollection');
assert.equal(mrtRouteGeoJson.features.length, mrtMapSummary.routeCount);
assert.equal(mrtStationGeoJson.features.length, mrtMapSummary.stationCount);

for (const feature of mrtRouteGeoJson.features) {
  assert.equal(feature.geometry.type, 'LineString');
  assert.ok(feature.properties.color.startsWith('#'));
  assert.ok(feature.geometry.coordinates.length >= 2);
  feature.geometry.coordinates.forEach(([lng, lat]) => {
    assert.ok(lng > 121.3 && lng < 121.8, `route longitude ${lng} stays near Taipei`);
    assert.ok(lat > 24.8 && lat < 25.3, `route latitude ${lat} stays near Taipei`);
  });
}

for (const feature of mrtStationGeoJson.features) {
  assert.equal(feature.geometry.type, 'Point');
  assert.ok(feature.properties.routeId);
  assert.ok(feature.properties.name);
}

const taipeiMain = [121.517, 25.046];
const gridPoint = lngLatToGrid(taipeiMain);
assert.ok(gridPoint[0] >= 0 && gridPoint[0] <= 29);
assert.ok(gridPoint[1] >= 0 && gridPoint[1] <= 29);

const roundTrip = gridToLngLat(gridPoint);
assert.ok(Math.abs(roundTrip[0] - taipeiMain[0]) < 0.000001);
assert.ok(Math.abs(roundTrip[1] - taipeiMain[1]) < 0.000001);

assert.deepEqual(TAIPEI_MAP_VIEW.center, [121.535, 25.049]);

console.log('mapOverlayData tests passed');
