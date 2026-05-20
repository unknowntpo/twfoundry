import assert from 'node:assert/strict';
import {
  fallbackWorldViewPayload,
  fallbackWorldViewPayloadForFocus,
  loadWorldViewPayload,
  summarizeWorldView,
  toUiOntologyObjects,
  validateWorldViewPayload,
} from '../src/worldViewPayload.js';
import { deriveWorldPayloadFromMapFeatureCatalog } from '../src/mapDerivedWorldPayload.js';

validateWorldViewPayload(fallbackWorldViewPayload);

const summary = summarizeWorldView(fallbackWorldViewPayload);
assert.equal(summary.visibleChunks, 1);
assert.ok(summary.ontologyObjects >= 6);
assert.ok(summary.voxelEntities >= fallbackWorldViewPayload.projections.length);
assert.equal(fallbackWorldViewPayload.freshness.mode, 'fallback');
assert.equal(typeof fallbackWorldViewPayload.freshness.maxSourceLagSeconds, 'number');
assert.ok(fallbackWorldViewPayload.freshness.sources.length > 0);
assert.ok(fallbackWorldViewPayload.objects.every((object) => object.source === 'frontend:fallback'));
assert.ok(fallbackWorldViewPayload.objects.every((object) => object.properties?.intendedSource));
assert.ok(fallbackWorldViewPayload.chunks.every((chunk) => chunk.staticFeatures.every((feature) => feature.ontologyObjectId)));
assert.ok(fallbackWorldViewPayload.chunks.every((chunk) => chunk.staticFeatures.every((feature) => typeof feature.visualState?.footprintScale === 'number')));
assert.ok(fallbackWorldViewPayload.chunks.every((chunk) => chunk.staticFeatures.every((feature) => feature.kind !== 'context-building')));
assert.ok(fallbackWorldViewPayload.chunks.every((chunk) => chunk.groundFeatures?.some((feature) => feature.kind === 'road-corridor')));
assert.ok(fallbackWorldViewPayload.chunks.every((chunk) => chunk.groundFeatures
  .filter((feature) => feature.kind === 'road-corridor')
  .every((feature) => feature.geometry?.type === 'LineString'
    && feature.sourceRef
    && feature.sourceGeometry?.type === 'LineString'
    && feature.sourceGeometry.coordinates.length === feature.geometry.coordinates.length
    && !feature.visualState?.geoPath
    && feature.visualState?.width > 0
    && feature.visualState?.displayWidth <= Math.max(0.24, feature.visualState.width * 1.15 + 0.000001))));
assert.ok(fallbackWorldViewPayload.chunks.every((chunk) => chunk.groundFeatures
  .filter((feature) => feature.kind === 'green-space')
  .every((feature) => feature.geometry?.type === 'Polygon'
    && feature.sourceRef
    && feature.geometry.coordinates[0].length >= 4
    && feature.sourceGeometry?.type === 'Polygon'
    && feature.sourceGeometry.coordinates[0].length === feature.geometry.coordinates[0].length
    && !feature.visualState?.geoFootprint)));
assert.ok(fallbackWorldViewPayload.chunks.every((chunk) => chunk.staticFeatures
  .filter((feature) => feature.geometry?.type === 'Polygon')
  .every((feature) => feature.footprintSource
    && feature.visualState?.footprintSource
    && feature.sourceGeometry?.type === 'Polygon'
    && !feature.visualState?.geoFootprint)));
assert.ok(fallbackWorldViewPayload.chunks.every((chunk) => chunk.staticFeatures
  .filter((feature) => feature.geometry?.type === 'Point')
  .every((feature) => !feature.footprintSource
    && !feature.visualState?.footprintSource
    && feature.sourceGeometry?.type === 'Point'
    && !feature.visualState?.geoFootprint)));
assert.equal(fallbackWorldViewPayload.chunks[0].staticFeatures.find((feature) => feature.id === 'building-shin-kong-nanxi').visualState.urbanRole, 'landmark');
assert.equal(fallbackWorldViewPayload.chunks[0].staticFeatures.find((feature) => feature.id === 'building-eslite-nanxi').visualState.urbanRole, 'landmark');
assert.equal(fallbackWorldViewPayload.chunks[0].staticFeatures.find((feature) => feature.id === 'building-shin-kong-nanxi').visualState.footprintSource, 'fixture-osm:way/shin-kong-nanxi');
assert.equal(fallbackWorldViewPayload.chunks[0].staticFeatures.find((feature) => feature.id === 'building-shin-kong-nanxi').footprintSource, 'fixture-osm:way/shin-kong-nanxi');
const unnamedFallbackBuildings = fallbackWorldViewPayload.chunks[0].staticFeatures
  .filter((feature) => String(feature.footprintSource ?? '').match(/chifeng-block|linsen-mixed|north-residential/));
assert.ok(unnamedFallbackBuildings.length > 0);
assert.ok(unnamedFallbackBuildings.every((feature) => feature.visualState.label === undefined
  && feature.visualState.shortLabel === undefined
  && feature.visualState.sign === false));
assert.ok(!fallbackWorldViewPayload.chunks[0].staticFeatures.some((feature) => feature.id === 'building-nanxi-retail-01'), 'road-overlapping fixture buildings should be filtered before rendering');
assert.equal(fallbackWorldViewPayload.chunks[0].staticFeatures.find((feature) => feature.id === 'building-linsen-lane').visualState.signColor, '#FFB11B');
assert.ok(fallbackWorldViewPayload.chunks[0].staticFeatures.filter((feature) => feature.geometry?.type === 'Polygon').length >= 6);
assert.equal(summary.voxelEntities, fallbackWorldViewPayload.chunks[0].staticFeatures.length + fallbackWorldViewPayload.projections.length);

const staticLabels = fallbackWorldViewPayload.chunks.flatMap((chunk) => chunk.staticFeatures.map((feature) => feature.visualState?.shortLabel));
assert.ok(staticLabels.includes('中山站'));
assert.ok(staticLabels.includes('新光三越'));
assert.ok(staticLabels.includes('誠品南西'));
assert.ok(!staticLabels.some((label) => ['DEPT', 'BOOK', 'LANE', 'MRT'].includes(label)));

const taipeiMainPayload = fallbackWorldViewPayloadForFocus('taipei-main-station');
validateWorldViewPayload(taipeiMainPayload);
assert.equal(taipeiMainPayload.request.focusId, 'taipei-main-station');
assert.equal(taipeiMainPayload.focus.id, 'taipei-main-station');
assert.equal(taipeiMainPayload.chunks[0].id, 'chunk-taipei-main-station');
assert.equal(taipeiMainPayload.coordinateSystem.originLng, 121.517);
assert.ok(taipeiMainPayload.chunks[0].sourceRefs.includes('offline-osm-fixture:taipei-main-station-2026-05-04'));
assert.ok(taipeiMainPayload.objects.some((object) => object.id === 'station-R10-BL13'));
assert.ok(taipeiMainPayload.projections.every((projection) => projection.chunkId === 'chunk-taipei-main-station'));
const taipeiStaticLabels = taipeiMainPayload.chunks.flatMap((chunk) => chunk.staticFeatures.map((feature) => feature.visualState?.shortLabel));
assert.ok(taipeiStaticLabels.includes('台北車站'));
assert.ok(taipeiStaticLabels.includes('京站'));
assert.ok(taipeiStaticLabels.includes('新光站前'));
assert.ok(taipeiMainPayload.chunks[0].groundFeatures.some((feature) => feature.id === 'road-zhongxiao-west'));
assert.ok(taipeiMainPayload.chunks[0].staticFeatures
  .filter((feature) => feature.geometry?.type === 'Polygon')
  .every((feature) => feature.sourceGeometry?.type === 'Polygon' && feature.visualState?.footprintSource));

const focusBounds = fallbackWorldViewPayload.focus.geoBounds;
const focusChunk = fallbackWorldViewPayload.chunks[0];
const coordinateSystem = fallbackWorldViewPayload.coordinateSystem;
assert.ok(focusChunk.sourceRefs.includes('openfreemap:zhongshan-station-focus'));
assert.ok(focusChunk.sourceRefs.includes('openstreetmap:road-corridor-contract'));
assert.ok(focusChunk.sourceRefs.includes('offline-osm-fixture:zhongshan-2026-05-02'));
assert.ok(focusChunk.sourceRefs.includes('curated:zhongshan-static-features'));
const chifengRoad = focusChunk.groundFeatures.find((feature) => feature.id === 'road-chifeng');
assert.ok(chifengRoad.sourceGeometry.coordinates[0][1] > chifengRoad.sourceGeometry.coordinates.at(-1)[1], '赤峰街 source geometry should run north-south, not as an east-west fallback line');
const R = 6378137;
function mercatorMeters(lng, lat) {
  return {
    x: R * lng * Math.PI / 180,
    y: R * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)),
  };
}
const originMeters = mercatorMeters(coordinateSystem.originLng, coordinateSystem.originLat);
function lngLatToLocal([lng, lat], y = 0) {
  const meters = mercatorMeters(lng, lat);
  return [
    Number(((meters.x - originMeters.x) * coordinateSystem.sceneUnitsPerMeter).toFixed(3)),
    y,
    Number((-(meters.y - originMeters.y) * coordinateSystem.sceneUnitsPerMeter).toFixed(3)),
  ];
}
function localToLngLat(coordinate) {
  const [x = 0, yOrZ = 0, maybeZ] = coordinate ?? [];
  const z = maybeZ === undefined ? yOrZ : maybeZ;
  const metersX = x / coordinateSystem.sceneUnitsPerMeter + originMeters.x;
  const metersY = -z / coordinateSystem.sceneUnitsPerMeter + originMeters.y;
  return [
    metersX / R * 180 / Math.PI,
    (2 * Math.atan(Math.exp(metersY / R)) - Math.PI / 2) * 180 / Math.PI,
  ];
}
assert.deepEqual(lngLatToLocal([focusBounds.west, focusBounds.north]), [focusChunk.localBounds.minX, 0, focusChunk.localBounds.minZ]);
assert.deepEqual(lngLatToLocal([focusBounds.east, focusBounds.south]), [focusChunk.localBounds.maxX, 0, focusChunk.localBounds.maxZ]);
focusChunk.staticFeatures.forEach((feature) => {
  assert.ok(feature.sourceGeometry, `${feature.id} should declare sourceGeometry`);
  assert.ok(!feature.visualState?.geoAnchor, `${feature.id} should not keep source coordinates in visualState.geoAnchor`);
  if (feature.geometry.type === 'Point') {
    assert.equal(feature.sourceGeometry.type, 'Point');
    const actual = localToLngLat(feature.geometry.coordinates);
    const expected = feature.sourceGeometry.coordinates;
    assert.ok(Math.abs(actual[0] - expected[0]) < 0.000001, `${feature.id} point lng should round-trip`);
    assert.ok(Math.abs(actual[1] - expected[1]) < 0.000001, `${feature.id} point lat should round-trip`);
  }
  if (feature.geometry.type === 'Polygon') {
    assert.equal(feature.sourceGeometry.type, 'Polygon');
    feature.geometry.coordinates[0].forEach((localCoordinate, index) => {
      const actual = localToLngLat(localCoordinate);
      const expected = feature.sourceGeometry.coordinates[0][index];
      assert.ok(Math.abs(actual[0] - expected[0]) < 0.000001, `${feature.id} polygon lng should round-trip at ${index}`);
      assert.ok(Math.abs(actual[1] - expected[1]) < 0.000001, `${feature.id} polygon lat should round-trip at ${index}`);
    });
  }
});

focusChunk.groundFeatures.forEach((feature) => {
  if (feature.geometry.type === 'LineString') {
    const expectedPath = feature.sourceGeometry?.coordinates;
    assert.ok(expectedPath, `${feature.id} should preserve source geoPath`);
    feature.geometry.coordinates.forEach((localCoordinate, index) => {
      const actual = localToLngLat(localCoordinate);
      const expected = expectedPath[index];
      assert.ok(Math.abs(actual[0] - expected[0]) < 0.000001, `${feature.id} path lng should round-trip at ${index}`);
      assert.ok(Math.abs(actual[1] - expected[1]) < 0.000001, `${feature.id} path lat should round-trip at ${index}`);
    });
  }
  if (feature.geometry.type === 'Polygon') {
    const expectedFootprint = feature.sourceGeometry?.coordinates?.[0];
    assert.ok(expectedFootprint, `${feature.id} should preserve source geoFootprint`);
    feature.geometry.coordinates[0].forEach((localCoordinate, index) => {
      const actual = localToLngLat(localCoordinate);
      const expected = expectedFootprint[index];
      assert.ok(Math.abs(actual[0] - expected[0]) < 0.000001, `${feature.id} footprint lng should round-trip at ${index}`);
      assert.ok(Math.abs(actual[1] - expected[1]) < 0.000001, `${feature.id} footprint lat should round-trip at ${index}`);
    });
  }
});

const uiObjects = toUiOntologyObjects(fallbackWorldViewPayload);
const station = uiObjects.find((object) => object.id === 'station-R11-G14');
const train = uiObjects.find((object) => object.id === 'train-R22');
const busStop = uiObjects.find((object) => object.id === 'bus-stop-nanxi');
const ubike = uiObjects.find((object) => object.id === 'ubike-zhongshan');
assert.equal(station.rawProperties.liveSource, 'TDX MRT LiveBoard');
assert.equal(station.rawProperties.liveBoardRows.length, 2);
assert.ok(!station.properties.some((item) => item.includes('[object Object]')));
assert.equal(train.layer, 'Taipei Metro');
assert.equal(busStop.layer, 'Taipei Bus');
assert.equal(ubike.layer, 'YouBike docks');
assert.ok(train.properties.some((item) => item.includes('next_stop')));
assert.ok(busStop.relationships.some((item) => item.includes('Zhongshan')));

const apiPayload = {
  ...fallbackWorldViewPayload,
  chunks: [...fallbackWorldViewPayload.chunks, { id: 'chunk-extra' }],
};
const requestedUrls = [];
const apiResult = await loadWorldViewPayload(async (url) => {
  requestedUrls.push(url);
  return {
  ok: true,
  json: async () => apiPayload,
  };
});
assert.equal(apiResult.source, 'api');
assert.equal(apiResult.payload.chunks.length, 2);
assert.deepEqual(requestedUrls, ['/api/world/view?focusId=zhongshan-station&lod=city&time=live']);

const taipeiRequestedUrls = [];
const taipeiFallbackResult = await loadWorldViewPayload(async (url) => {
  taipeiRequestedUrls.push(url);
  return { ok: false, status: 404 };
}, { focusId: 'taipei-main-station' });
assert.equal(taipeiFallbackResult.source, 'fallback');
assert.equal(taipeiFallbackResult.payload.focus.id, 'taipei-main-station');
assert.deepEqual(taipeiRequestedUrls, ['/api/world/view?focusId=taipei-main-station&lod=city&time=live']);

assert.throws(() => validateWorldViewPayload({
  ...fallbackWorldViewPayload,
  request: { ...fallbackWorldViewPayload.request, focusId: 'taipei-main-station' },
}), /focus mismatch/);
assert.throws(() => validateWorldViewPayload({
  ...fallbackWorldViewPayload,
  projections: [{ ...fallbackWorldViewPayload.projections[0], objectId: 'missing-object' }],
}), /unknown object/);
assert.throws(() => validateWorldViewPayload({
  ...fallbackWorldViewPayload,
  chunks: [{
    ...fallbackWorldViewPayload.chunks[0],
    staticFeatures: [{
      ...fallbackWorldViewPayload.chunks[0].staticFeatures[0],
      ontologyObjectId: 'missing-static-object',
    }],
  }],
}), /static feature references unknown object/);
assert.throws(() => validateWorldViewPayload(
  fallbackWorldViewPayload,
  { expectedFocusId: 'taipei-main-station' },
), /unexpected focus/);

const fallbackResult = await loadWorldViewPayload(async () => ({
  ok: false,
  status: 503,
}));
assert.equal(fallbackResult.source, 'fallback');
assert.equal(fallbackResult.payload.schemaVersion, 'world-view.v1');

const mapDerivedPayload = deriveWorldPayloadFromMapFeatureCatalog(fallbackWorldViewPayload, {
  source: 'openfreemap-rendered-features',
  coverage: { buildings: 'complete' },
  bounds: fallbackWorldViewPayload.focus.geoBounds,
  roads: [{
    id: 'road-rendered-nanjing',
    properties: { name: '南京西路', highway: 'primary', sourceRef: 'openfreemap:transportation/1/road_major' },
    geometry: {
      type: 'LineString',
      coordinates: [[121.5198, 25.0524], [121.5222, 25.0526]],
    },
  }, {
    id: 'road-rendered-crossing',
    properties: { name: '穿越道路', highway: 'primary', sourceRef: 'openfreemap:transportation/crossing/road_major' },
    geometry: {
      type: 'LineString',
      coordinates: [[121.515, 25.0524], [121.526, 25.0524]],
    },
  }],
  buildings: [
    {
      id: 'building-rendered-shop',
      properties: { name: '測試商場', shop: 'mall', height: 48, sourceRef: 'openfreemap:building/2/building' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[121.521, 25.0517], [121.5213, 25.0517], [121.5213, 25.052], [121.521, 25.052], [121.521, 25.0517]]],
      },
    },
    {
      id: 'building-rendered-cross-boundary',
      properties: { name: '跨界建物', sourceRef: 'openfreemap:building/cross-boundary/building' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[121.5163, 25.052], [121.517, 25.052], [121.517, 25.0525], [121.5163, 25.0525], [121.5163, 25.052]]],
      },
    },
    {
      id: 'building-rendered-outside',
      properties: { name: '範圍外建物', sourceRef: 'openfreemap:building/outside/building' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[121.531, 25.063], [121.532, 25.063], [121.532, 25.064], [121.531, 25.064], [121.531, 25.063]]],
      },
    },
    {
      id: 'building-rendered-unnamed',
      properties: { sourceRef: 'openfreemap:building/unnamed/building' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[121.522, 25.0517], [121.5222, 25.0517], [121.5222, 25.0519], [121.522, 25.0519], [121.522, 25.0517]]],
      },
    },
  ],
  areas: [{
    id: 'park-rendered',
    properties: { name: '測試公園', class: 'park', sourceRef: 'openfreemap:landcover/3/park' },
    geometry: {
      type: 'Polygon',
      coordinates: [[[121.518, 25.0508], [121.5184, 25.0508], [121.5184, 25.0511], [121.518, 25.0511], [121.518, 25.0508]]],
    },
  }],
  pois: [{
    id: 'poi-rendered-eslite',
    properties: { name: '誠品南西', class: 'shop', sourceRef: 'openfreemap:poi/4/poi-label' },
    geometry: {
      type: 'Point',
      coordinates: [121.5217, 25.0513],
    },
  }, {
    id: 'poi-rendered-unnamed',
    properties: { class: 'shop', sourceRef: 'openfreemap:poi/unnamed/poi-label' },
    geometry: {
      type: 'Point',
      coordinates: [121.5219, 25.0514],
    },
  }, {
    id: 'poi-rendered-outside',
    properties: { name: '範圍外 POI', class: 'shop', sourceRef: 'openfreemap:poi/outside/poi-label' },
    geometry: {
      type: 'Point',
      coordinates: [121.5317, 25.0613],
    },
  }],
});
validateWorldViewPayload(mapDerivedPayload);
const derivedChunk = mapDerivedPayload.chunks[0];
assert.ok(derivedChunk.sourceRefs.includes('openfreemap:rendered-feature-catalog'));
assert.ok(derivedChunk.groundFeatures.some((feature) => feature.sourceRef === 'openfreemap:transportation/1/road_major'));
assert.ok(derivedChunk.groundFeatures.some((feature) => feature.sourceRef === 'openfreemap:transportation/crossing/road_major'));
assert.ok(derivedChunk.groundFeatures.some((feature) => feature.sourceRef === 'openfreemap:landcover/3/park'));
assert.ok(derivedChunk.staticFeatures.some((feature) => feature.footprintSource === 'openfreemap:building/2/building'));
const unnamedBuilding = derivedChunk.staticFeatures.find((feature) => feature.footprintSource === 'openfreemap:building/unnamed/building');
assert.ok(unnamedBuilding);
assert.equal(unnamedBuilding.visualState.label, undefined);
assert.equal(unnamedBuilding.visualState.shortLabel, undefined);
assert.equal(unnamedBuilding.visualState.sign, false);
assert.ok(!derivedChunk.staticFeatures.some((feature) => feature.footprintSource === 'openfreemap:building/cross-boundary/building'));
assert.ok(!derivedChunk.staticFeatures.some((feature) => feature.footprintSource === 'openfreemap:building/outside/building'));
assert.ok(derivedChunk.staticFeatures
  .filter((feature) => feature.visualState?.derivedFrom === 'maplibre-rendered-feature')
  .every((feature) => feature.visualState.floors <= 4));
assert.ok(derivedChunk.staticFeatures.some((feature) => feature.kind === 'station-anchor'));
assert.ok(derivedChunk.staticFeatures.some((feature) => feature.geometry?.type === 'Point' && feature.visualState?.areaAnchor));
assert.ok(!derivedChunk.staticFeatures.some((feature) => feature.id === 'building-linsen-lane'));
assert.ok(!derivedChunk.staticFeatures.some((feature) => feature.id === 'building-chifeng-maker'));
assert.ok(derivedChunk.staticFeatures
  .filter((feature) => feature.visualState?.derivedFrom !== 'maplibre-rendered-feature')
  .every((feature) => !(feature.geometry?.type === 'Polygon' && (feature.footprintSource || feature.visualState?.footprintSource))));
assert.ok(derivedChunk.staticFeatures.some((feature) => feature.visualState?.shortLabel === '測試商場'));
assert.ok(derivedChunk.staticFeatures.some((feature) => feature.visualState?.shortLabel === '誠品南西' && feature.visualState?.derivedFrom === 'maplibre-rendered-poi' && feature.sourceRef === 'openfreemap:poi/4/poi-label'));
assert.ok(mapDerivedPayload.objects.some((object) => object.id === derivedChunk.staticFeatures.find((feature) => feature.visualState?.shortLabel === '測試商場').ontologyObjectId));
assert.ok(mapDerivedPayload.objects.some((object) => object.name === '誠品南西' && object.properties?.derivedFrom === 'maplibre-rendered-poi'));
assert.ok(!mapDerivedPayload.objects.some((object) => object.id === 'landmark-linsen-lane-shop'));
assert.ok(!mapDerivedPayload.objects.some((object) => object.id === 'landmark-chifeng-maker-lane'));
const unnamedPoi = derivedChunk.staticFeatures.find((feature) => feature.sourceRef === 'openfreemap:poi/unnamed/poi-label');
assert.ok(unnamedPoi);
assert.equal(unnamedPoi.visualState.label, undefined);
assert.equal(unnamedPoi.visualState.shortLabel, undefined);
assert.equal(unnamedPoi.visualState.sign, false);
assert.equal(unnamedBuilding.ontologyObjectId, undefined);
assert.equal(unnamedPoi.ontologyObjectId, undefined);
assert.ok(!derivedChunk.staticFeatures.some((feature) => feature.visualState?.shortLabel === '範圍外 P'));
assert.ok(mapDerivedPayload.completeness.warnings.includes('static city fabric derived from MapLibre rendered features'));

const emptyCompleteMapPayload = deriveWorldPayloadFromMapFeatureCatalog(fallbackWorldViewPayload, {
  source: 'openfreemap-rendered-features',
  coverage: { buildings: 'complete' },
  bounds: fallbackWorldViewPayload.focus.geoBounds,
  roads: [],
  buildings: [],
  areas: [],
  pois: [],
});
validateWorldViewPayload(emptyCompleteMapPayload);
const emptyCompleteChunk = emptyCompleteMapPayload.chunks[0];
assert.ok(emptyCompleteChunk.sourceRefs.includes('openfreemap:rendered-feature-catalog'));
assert.ok(!emptyCompleteChunk.staticFeatures.some((feature) => feature.id === 'building-shin-kong-nanxi'));
assert.ok(!emptyCompleteChunk.staticFeatures.some((feature) => feature.id === 'building-linsen-lane'));
assert.ok(!emptyCompleteChunk.staticFeatures.some((feature) => feature.visualState?.areaAnchor));
assert.ok(emptyCompleteChunk.staticFeatures.some((feature) => feature.kind === 'station-anchor'));
assert.ok(!emptyCompleteMapPayload.objects.some((object) => object.id === 'landmark-shin-kong-nanxi'));
assert.ok(emptyCompleteMapPayload.objects.some((object) => object.id === 'station-R11-G14'));
assert.ok(emptyCompleteChunk.groundFeatures.some((feature) => feature.id === 'road-nanjing-west'), 'ground road references remain as calibration context when the catalog has no rendered roads');

const viewportMapDerivedPayload = deriveWorldPayloadFromMapFeatureCatalog(fallbackWorldViewPayload, {
  source: 'openfreemap-rendered-features',
  coverage: { buildings: 'rendered-viewport' },
  bounds: fallbackWorldViewPayload.focus.geoBounds,
  roads: [],
  buildings: [{
    id: 'partial-building-rendered-shop',
    properties: { name: '部分建物', shop: 'mall', sourceRef: 'openfreemap:building/partial/building' },
    geometry: {
      type: 'Polygon',
      coordinates: [[[121.521, 25.0517], [121.5213, 25.0517], [121.5213, 25.052], [121.521, 25.052], [121.521, 25.0517]]],
    },
  }],
  areas: [],
  pois: [],
});
const viewportChunk = viewportMapDerivedPayload.chunks[0];
assert.ok(viewportChunk.staticFeatures.some((feature) => feature.footprintSource === 'openfreemap:building/partial/building'));
assert.ok(!viewportChunk.staticFeatures.some((feature) => feature.id === 'building-shin-kong-nanxi'));
assert.ok(viewportChunk.staticFeatures.some((feature) => feature.kind === 'station-anchor'));
assert.equal(viewportMapDerivedPayload.completeness.status, 'partial');
assert.ok(viewportMapDerivedPayload.completeness.warnings.some((warning) => warning.includes('rendered-viewport')));

const partialMapDerivedPayload = deriveWorldPayloadFromMapFeatureCatalog(fallbackWorldViewPayload, {
  source: 'openfreemap-rendered-features',
  bounds: fallbackWorldViewPayload.focus.geoBounds,
  roads: [],
  buildings: [{
    id: 'partial-building-rendered-shop',
    properties: { name: '部分建物', shop: 'mall', sourceRef: 'openfreemap:building/partial/building' },
    geometry: {
      type: 'Polygon',
      coordinates: [[[121.521, 25.0517], [121.5213, 25.0517], [121.5213, 25.052], [121.521, 25.052], [121.521, 25.0517]]],
    },
  }],
  areas: [],
  pois: [],
}, { buildingReplacementMode: 'preserve-fixture' });
const partialChunk = partialMapDerivedPayload.chunks[0];
assert.ok(partialChunk.staticFeatures.some((feature) => feature.id === 'building-shin-kong-nanxi'));
assert.ok(!partialChunk.staticFeatures.some((feature) => feature.footprintSource === 'openfreemap:building/partial/building'));

const multiChunkPayload = {
  ...fallbackWorldViewPayload,
  chunks: [
    fallbackWorldViewPayload.chunks[0],
    {
      ...fallbackWorldViewPayload.chunks[0],
      id: 'chunk-east-extension',
      label: 'East extension',
      geoBounds: { west: 121.5300, south: 25.0490, east: 121.5330, north: 25.0520 },
      localBounds: { minX: 18, maxX: 48, minZ: 10, maxZ: 42 },
      groundFeatures: [],
      staticFeatures: [],
      semanticZones: [],
      sourceRefs: ['test:chunk-east-extension'],
    },
  ],
};
const multiChunkDerivedPayload = deriveWorldPayloadFromMapFeatureCatalog(multiChunkPayload, {
  source: 'openfreemap-rendered-features',
  coverage: { buildings: 'rendered-viewport' },
  bounds: { west: 121.5165, south: 25.0490, east: 121.5330, north: 25.0558 },
  roads: [],
  buildings: [{
    id: 'east-building',
    properties: { name: '東側測試樓', sourceRef: 'openfreemap:building/east/building' },
    geometry: {
      type: 'Polygon',
      coordinates: [[[121.5310, 25.0500], [121.5314, 25.0500], [121.5314, 25.0504], [121.5310, 25.0504], [121.5310, 25.0500]]],
    },
  }],
  areas: [],
  pois: [],
});
assert.equal(multiChunkDerivedPayload.chunks.length, 2);
assert.ok(!multiChunkDerivedPayload.chunks[0].staticFeatures.some((feature) => feature.footprintSource === 'openfreemap:building/east/building'));
assert.ok(multiChunkDerivedPayload.chunks[1].staticFeatures.some((feature) => feature.footprintSource === 'openfreemap:building/east/building'));
assert.ok(multiChunkDerivedPayload.objects.some((object) => object.name === '東側測試樓'));

console.log('worldViewPayload tests passed');
