import assert from 'node:assert/strict';
import { fallbackWorldViewPayload, toUiOntologyObjects } from '../src/worldViewPayload.js';
import { createWorldViewLayer } from '../src/worldViewRenderModules.js';

const uiObjects = toUiOntologyObjects(fallbackWorldViewPayload);
const layer = createWorldViewLayer(fallbackWorldViewPayload, uiObjects);

assert.equal(layer.name, 'payload world view layer');
assert.equal(layer.children.length, fallbackWorldViewPayload.projections.length);

for (const projection of fallbackWorldViewPayload.projections) {
  const projectionObject = layer.children.find((child) => child.userData.worldViewProjection?.id === projection.id);
  assert.ok(projectionObject, `missing projection mesh ${projection.id}`);
  assert.equal(projectionObject.userData.twObject.id, projection.objectId);
  assert.equal(projectionObject.userData.overlay, projection.overlay);
}

const rainProjectionMeshes = layer.children.filter((child) => child.userData.twObject?.id === 'rain-R042');
assert.equal(rainProjectionMeshes.length, 2);
assert.ok(
  rainProjectionMeshes.every((child) => child.userData.twObject === rainProjectionMeshes[0].userData.twObject),
  'cross-chunk rain projections should point to the same canonical UI object',
);

console.log('worldViewRenderModules tests passed');
