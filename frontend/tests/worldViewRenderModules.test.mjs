import assert from 'node:assert/strict';
import * as THREE from 'three';
import { fallbackWorldViewPayload, toUiOntologyObjects } from '../src/worldViewPayload.js';
import { createStaticFeatureVoxel } from '../src/voxelLandmarkRenderers.js';
import { createWorldViewBaseLayer, createWorldViewLayer } from '../src/worldViewRenderModules.js';

const uiObjects = toUiOntologyObjects(fallbackWorldViewPayload);
const baseLayer = createWorldViewBaseLayer(fallbackWorldViewPayload, uiObjects);
const invalidCanvasMapLayer = createWorldViewBaseLayer(fallbackWorldViewPayload, uiObjects, {
  mapReference: {
    canvas: { width: 64, height: 64 },
    bounds: fallbackWorldViewPayload.focus.geoBounds,
  },
});
const legacyBoundsMapLayer = createWorldViewBaseLayer(fallbackWorldViewPayload, uiObjects, {
  mapReference: {
    canvas: { width: 64, height: 64, getContext: () => ({}) },
    bounds: fallbackWorldViewPayload.focus.geoBounds,
  },
});
const exactFrameBounds = {
  west: 121.517,
  south: 25.0496,
  east: 121.524,
  north: 25.0552,
};
const exactFrameMapLayer = createWorldViewBaseLayer(fallbackWorldViewPayload, uiObjects, {
  mapReference: {
    canvas: { width: 1024, height: 1024, getContext: () => ({}) },
    bounds: fallbackWorldViewPayload.focus.geoBounds,
    frame: {
      projection: 'EPSG:3857 Web Mercator',
      pixelSize: { width: 1024, height: 1024, cssWidth: 1024, cssHeight: 1024 },
      corners: {
        northwest: [exactFrameBounds.west, exactFrameBounds.north],
        northeast: [exactFrameBounds.east, exactFrameBounds.north],
        southeast: [exactFrameBounds.east, exactFrameBounds.south],
        southwest: [exactFrameBounds.west, exactFrameBounds.south],
      },
      bounds: exactFrameBounds,
    },
  },
});
const layer = createWorldViewLayer(fallbackWorldViewPayload, uiObjects);

assert.equal(baseLayer.name, 'payload diorama chunk base layer');
assert.ok(baseLayer.children.length >= 1);
assert.ok(baseLayer.children[0].children.length >= 3);
assert.ok(!invalidCanvasMapLayer.children.some((child) => child.name === 'maplibre web mercator reference plane'));
assert.ok(!legacyBoundsMapLayer.children.some((child) => child.name === 'maplibre web mercator reference plane'));
const exactFramePlane = exactFrameMapLayer.children.find((child) => child.name === 'maplibre web mercator reference plane');
assert.ok(exactFramePlane);
assert.deepEqual(exactFramePlane.userData.mapReferenceFrame.bounds, exactFrameBounds);
assert.deepEqual(exactFramePlane.userData.mapReferenceFrame.corners.northwest, [exactFrameBounds.west, exactFrameBounds.north]);
assert.equal(exactFramePlane.userData.mapReferenceFrame.usesExactCorners, true);
assert.equal(exactFramePlane.geometry.type, 'BufferGeometry');
assert.equal(exactFramePlane.material.side, THREE.DoubleSide);
const exactFrameBox = new THREE.Box3().setFromObject(exactFramePlane);
assert.ok(exactFrameBox.getSize(new THREE.Vector3()).x > 1);
assert.ok(exactFrameBox.getSize(new THREE.Vector3()).z > 1);
const exactFramePositions = exactFramePlane.geometry.getAttribute('position');
const exactFrameTriangleNormal = new THREE.Triangle(
  new THREE.Vector3().fromBufferAttribute(exactFramePositions, 0),
  new THREE.Vector3().fromBufferAttribute(exactFramePositions, 1),
  new THREE.Vector3().fromBufferAttribute(exactFramePositions, 2),
).getNormal(new THREE.Vector3());
assert.ok(exactFrameTriangleNormal.y > 0, 'exact map reference frame should face upward toward the camera');
const exactFrameUvs = exactFramePlane.geometry.getAttribute('uv');
assert.deepEqual([exactFrameUvs.getX(0), exactFrameUvs.getY(0)], [0, 1]);
assert.deepEqual([exactFrameUvs.getX(1), exactFrameUvs.getY(1)], [0, 0]);
assert.deepEqual([exactFrameUvs.getX(2), exactFrameUvs.getY(2)], [1, 1]);
const invalidCanvasChunk = invalidCanvasMapLayer.children.find((child) => child.name?.startsWith('chunk '));
assert.ok(invalidCanvasChunk.children.some((child) => child.name?.startsWith('semantic zone')));
assert.ok(invalidCanvasChunk.children.some((child) => child.name === 'ground feature road-corridor'));
assert.ok(invalidCanvasChunk.children.some((child) => child.name === 'ground feature green-space'));
const greenSpace = invalidCanvasChunk.children.find((child) => child.name === 'ground feature green-space');
const greenSurface = greenSpace.children.find((child) => child.name === 'ground polygon surface');
assert.equal(greenSurface.geometry.type, 'BufferGeometry');
assert.equal(greenSurface.material.side, THREE.DoubleSide);
const staticFeatureKinds = [];
const staticFeatureBlueprints = [];
const staticFeatureRecords = [];
baseLayer.traverse((child) => {
  if (child.userData?.worldViewStaticFeature?.kind) {
    staticFeatureKinds.push(child.userData.worldViewStaticFeature.kind);
    staticFeatureBlueprints.push(child.userData.voxelBlueprint);
    staticFeatureRecords.push({
      feature: child.userData.worldViewStaticFeature,
      blueprint: child.userData.voxelBlueprint,
    });
  }
});
assert.ok(staticFeatureKinds.includes('station-anchor'));
assert.ok(staticFeatureKinds.includes('department-store'));
assert.ok(staticFeatureKinds.includes('bookstore-mall'));
assert.ok(staticFeatureKinds.includes('lane-shop'));
assert.ok(!staticFeatureKinds.includes('context-building'));
const detailedLandmarks = staticFeatureRecords
  .filter((record) => record.blueprint?.landmarkKind !== 'station-anchor')
  .filter((record) => record.feature.visualState?.areaAnchor !== true)
  .map((record) => record.blueprint);
assert.ok(detailedLandmarks.every((blueprint) => blueprint.voxelCount >= 20), 'landmark modules should be composed from detailed voxel parts');
assert.ok(detailedLandmarks.some((blueprint) => blueprint.modules.includes('facade-window-band')));
assert.ok(detailedLandmarks.some((blueprint) => blueprint.modules.includes('roof-equipment')));
assert.ok(staticFeatureRecords.some((record) => record.feature.visualState?.areaAnchor === true));
assert.ok(staticFeatureRecords.every((record) => record.feature.ontologyObjectId));

const pointLaneFeature = createStaticFeatureVoxel({
  id: 'area-lane-without-area-anchor-flag',
  ontologyObjectId: 'landmark-test-lane',
  kind: 'lane-shop',
  geometry: { type: 'Point', coordinates: [0, 0, 0] },
  visualState: { shortLabel: '測試巷弄', color: '#F8DDE7', signColor: '#E16B8C' },
});
const pointLaneChildNames = [];
pointLaneFeature.traverse((child) => {
  if (child.name) pointLaneChildNames.push(child.name);
});
assert.ok(pointLaneChildNames.includes('lane area anchor marker'));
assert.ok(!pointLaneChildNames.includes('lane shop awning'));
assert.equal(pointLaneFeature.userData.voxelBlueprint.footprintDriven, false);

const pointWithFootprintSourceFeature = createStaticFeatureVoxel({
  id: 'point-with-footprint-source',
  ontologyObjectId: 'landmark-test-point-source',
  kind: 'lane-shop',
  geometry: { type: 'Point', coordinates: [0, 0, 0] },
  visualState: { shortLabel: '錯誤點', color: '#F8DDE7', signColor: '#E16B8C', footprintSource: 'fixture-osm:way/wrong-point' },
});
const pointWithSourceChildNames = [];
pointWithFootprintSourceFeature.traverse((child) => {
  if (child.name) pointWithSourceChildNames.push(child.name);
});
assert.ok(pointWithSourceChildNames.includes('lane area anchor marker'));
assert.ok(!pointWithSourceChildNames.includes('lane shop awning'));
assert.equal(pointWithFootprintSourceFeature.userData.voxelBlueprint.footprintDriven, false);

const malformedPolygonFeature = createStaticFeatureVoxel({
  id: 'polygon-without-footprint-source',
  ontologyObjectId: 'landmark-test-polygon',
  kind: 'lane-shop',
  geometry: { type: 'Polygon', coordinates: [[[-0.4, 0, -0.4], [0.4, 0, -0.4], [0.4, 0, 0.4], [-0.4, 0, -0.4]]] },
  visualState: { shortLabel: '缺來源', color: '#F8DDE7', signColor: '#E16B8C' },
});
const malformedChildNames = [];
malformedPolygonFeature.traverse((child) => {
  if (child.name) malformedChildNames.push(child.name);
});
assert.ok(malformedChildNames.includes('lane area anchor marker'));
assert.ok(!malformedChildNames.includes('lane shop awning'));
assert.equal(malformedPolygonFeature.userData.voxelBlueprint.footprintDriven, false);

[
  { kind: 'department-store', id: 'unnamed-department' },
  { kind: 'bookstore-mall', id: 'unnamed-bookstore' },
  { kind: 'lane-shop', id: 'unnamed-lane' },
  { kind: 'station-anchor', id: 'unnamed-station' },
].forEach(({ kind, id }) => {
  const feature = createStaticFeatureVoxel({
    id,
    ontologyObjectId: `landmark-test-${id}`,
    kind,
    footprintSource: kind === 'station-anchor' ? undefined : `openfreemap:test/${id}`,
    geometry: kind === 'station-anchor'
      ? { type: 'Point', coordinates: [0, 0, 0] }
      : { type: 'Polygon', coordinates: [[[-0.4, 0, -0.4], [0.4, 0, -0.4], [0.4, 0, 0.4], [-0.4, 0, 0.4], [-0.4, 0, -0.4]]] },
    visualState: {
      color: '#F8DDE7',
      signColor: '#E16B8C',
      footprintScale: 1,
      floors: 2,
    },
  });
  const childNames = [];
  feature.traverse((child) => {
    if (child.name) childNames.push(child.name);
  });
  assert.ok(!childNames.includes('category billboard label'), `${kind} without explicit label must not render fallback text`);
});

const legacyCategoryLabelFeature = createStaticFeatureVoxel({
  id: 'legacy-category-label',
  ontologyObjectId: 'landmark-test-category-label',
  kind: 'department-store',
  footprintSource: 'openfreemap:test/legacy-category-label',
  geometry: { type: 'Polygon', coordinates: [[[-0.4, 0, -0.4], [0.4, 0, -0.4], [0.4, 0, 0.4], [-0.4, 0, 0.4], [-0.4, 0, -0.4]]] },
  visualState: {
    categoryLabel: 'DEPT',
    color: '#F8DDE7',
    signColor: '#E16B8C',
    footprintScale: 1,
    floors: 2,
  },
});
const legacyCategoryLabelChildNames = [];
legacyCategoryLabelFeature.traverse((child) => {
  if (child.name) legacyCategoryLabelChildNames.push(child.name);
});
assert.ok(!legacyCategoryLabelChildNames.includes('category billboard label'));

assert.equal(layer.name, 'payload world view layer');
assert.equal(layer.children.length, fallbackWorldViewPayload.projections.length);
const mapAlignedOverlayLayer = createWorldViewLayer(fallbackWorldViewPayload, uiObjects, { mapAligned: true });
assert.equal(mapAlignedOverlayLayer.children.length, fallbackWorldViewPayload.projections.length);

for (const projection of fallbackWorldViewPayload.projections) {
  const projectionObject = layer.children.find((child) => child.userData.worldViewProjection?.id === projection.id);
  assert.ok(projectionObject, `missing projection mesh ${projection.id}`);
  assert.equal(projectionObject.userData.twObject.id, projection.objectId);
  assert.equal(projectionObject.userData.overlay, projection.overlay);
}

const rainProjectionMeshes = layer.children.filter((child) => child.userData.twObject?.id === 'rain-R042');
assert.equal(rainProjectionMeshes.length, 1);

const busProjection = layer.children.find((child) => child.userData.twObject?.id === 'bus-stop-nanxi');
const ubikeProjection = layer.children.find((child) => child.userData.twObject?.id === 'ubike-zhongshan');
assert.equal(busProjection.userData.worldViewProjection.renderModule, 'voxel.bus.stop');
assert.equal(ubikeProjection.userData.worldViewProjection.renderModule, 'voxel.ubike.dock');

console.log('worldViewRenderModules tests passed');
