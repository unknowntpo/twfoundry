import assert from 'node:assert/strict';
import {
  fallbackWorldViewPayload,
  loadWorldViewPayload,
  summarizeWorldView,
  toUiOntologyObjects,
  validateWorldViewPayload,
} from '../src/worldViewPayload.js';

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

const uiObjects = toUiOntologyObjects(fallbackWorldViewPayload);
const train = uiObjects.find((object) => object.id === 'train-R22');
const busStop = uiObjects.find((object) => object.id === 'bus-stop-nanxi');
const ubike = uiObjects.find((object) => object.id === 'ubike-zhongshan');
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

const fallbackResult = await loadWorldViewPayload(async () => ({
  ok: false,
  status: 503,
}));
assert.equal(fallbackResult.source, 'fallback');
assert.equal(fallbackResult.payload.schemaVersion, 'world-view.v1');

console.log('worldViewPayload tests passed');
