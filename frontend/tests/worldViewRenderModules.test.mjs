import assert from 'node:assert/strict';
import { fallbackWorldViewPayload, toUiOntologyObjects } from '../src/worldViewPayload.js';
import { createWorldViewBaseLayer, createWorldViewLayer } from '../src/worldViewRenderModules.js';

const uiObjects = toUiOntologyObjects(fallbackWorldViewPayload);
const baseLayer = createWorldViewBaseLayer(fallbackWorldViewPayload, uiObjects);
const layer = createWorldViewLayer(fallbackWorldViewPayload, uiObjects);

assert.equal(baseLayer.name, 'payload diorama chunk base layer');
assert.ok(baseLayer.children.length >= 1);
assert.ok(baseLayer.children[0].children.length >= 3);
const staticFeatureKinds = [];
baseLayer.traverse((child) => {
  if (child.userData?.worldViewStaticFeature?.kind) {
    staticFeatureKinds.push(child.userData.worldViewStaticFeature.kind);
  }
});
assert.ok(staticFeatureKinds.includes('station-anchor'));
assert.ok(staticFeatureKinds.includes('department-store'));
assert.ok(staticFeatureKinds.includes('bookstore-mall'));
assert.ok(staticFeatureKinds.includes('lane-shop'));
assert.equal(layer.name, 'payload world view layer');
assert.equal(layer.children.length, fallbackWorldViewPayload.projections.length);

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
