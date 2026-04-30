import assert from 'node:assert/strict';
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

console.log('mapOverlayData tests passed');
