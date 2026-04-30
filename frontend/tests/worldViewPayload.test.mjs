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
assert.equal(summary.visibleChunks, 2);
assert.equal(summary.ontologyObjects, 3);
assert.ok(summary.voxelEntities >= fallbackWorldViewPayload.projections.length);

const uiObjects = toUiOntologyObjects(fallbackWorldViewPayload);
assert.equal(uiObjects[0].id, 'train-R22');
assert.equal(uiObjects[0].layer, 'Taipei Metro');
assert.ok(uiObjects[0].properties.some((item) => item.includes('next_stop')));
assert.ok(uiObjects[1].relationships.some((item) => item.includes('Taipei core west')));

const apiPayload = {
  ...fallbackWorldViewPayload,
  chunks: [...fallbackWorldViewPayload.chunks, { id: 'chunk-extra' }],
};
const apiResult = await loadWorldViewPayload(async () => ({
  ok: true,
  json: async () => apiPayload,
}));
assert.equal(apiResult.source, 'api');
assert.equal(apiResult.payload.chunks.length, 3);

const fallbackResult = await loadWorldViewPayload(async () => ({
  ok: false,
  status: 503,
}));
assert.equal(fallbackResult.source, 'fallback');
assert.equal(fallbackResult.payload.schemaVersion, 'world-view.v1');

console.log('worldViewPayload tests passed');
