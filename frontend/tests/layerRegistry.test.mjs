import assert from 'node:assert/strict';
import {
  OPERATIONS_LAYER_IDS,
  getOperationsLayer,
  operationsLayerRegistry,
} from '../src/layerRegistry.js';

assert.ok(operationsLayerRegistry.length >= 3);

const busLayer = getOperationsLayer(OPERATIONS_LAYER_IDS.BUS_VEHICLES);
assert.equal(busLayer.status, 'active');
assert.equal(busLayer.projectionType, 'vehicle_position_projection');
assert.equal(busLayer.primaryFilter.id, 'route');
assert.equal(busLayer.timelineAware, true);

const mrtLayer = getOperationsLayer(OPERATIONS_LAYER_IDS.MRT_LIVEBOARD);
assert.equal(mrtLayer.status, 'planned');
assert.equal(mrtLayer.primaryFilter.id, 'line');

const fallbackLayer = getOperationsLayer('unknown-layer');
assert.equal(fallbackLayer.id, OPERATIONS_LAYER_IDS.BUS_VEHICLES);

console.log('layerRegistry tests passed');
