import assert from 'node:assert/strict';
import { createMrtTrain, MRT_TRAIN_BLUEPRINT } from '../src/voxelTrain.js';

const train = createMrtTrain({
  lineColor: '#0070BD',
  carCount: 4,
  debug: true,
});

const blueprint = train.userData.voxelBlueprint;
const meshCount = train.children.filter((child) => child.type === 'Mesh').length;
const axisOverlay = train.children.find((child) => child.name === 'debug local Z axis');

assert.equal(train.name, 'procedural MRT train');
assert.equal(blueprint.mainAxis, 'curve tangent / local Z');
assert.equal(blueprint.carCount, 4);
assert.equal(blueprint.lineColor, '#0070BD');
assert.equal(meshCount, blueprint.voxelCount);
assert.ok(meshCount >= 100, `expected detailed voxel train, got ${meshCount} voxels`);
assert.ok(blueprint.geometryVariants <= 14, `expected geometry cache reuse, got ${blueprint.geometryVariants}`);
assert.deepEqual(blueprint.modules, MRT_TRAIN_BLUEPRINT.modules);
assert.ok(axisOverlay, 'debug mode should add local axis overlay');
assert.ok(blueprint.repeatPatterns.some((pattern) => pattern.includes('windows')));

console.log(JSON.stringify({
  component: train.name,
  axis: blueprint.mainAxis,
  modules: blueprint.modules,
  carCount: blueprint.carCount,
  voxelCount: blueprint.voxelCount,
  geometryVariants: blueprint.geometryVariants,
}, null, 2));
