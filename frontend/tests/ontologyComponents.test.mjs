import assert from 'node:assert/strict';
import { createPm25Sensor, createStationAnchor, createWeatherCell } from '../src/voxelEntities.js';

const components = [
  {
    name: 'station',
    entity: createStationAnchor({ lineColor: '#0070BD', stationId: 'BL18', stationName: 'Taipei City Hall', debug: true }),
    requiredFields: ['stationId', 'stationName', 'lineId', 'status'],
  },
  {
    name: 'pm25',
    entity: createPm25Sensor({ sensorId: 'AQMS A-07', value: 31, status: 'watch', debug: true }),
    requiredFields: ['sensorId', 'pm25', 'trend', 'updatedAt', 'location'],
  },
  {
    name: 'weather',
    entity: createWeatherCell({ cellId: 'Rain Cell R-042', intensity: 38, trend: 'rising', debug: true }),
    requiredFields: ['cellId', 'intensityMmHr', 'trend', 'confidence', 'geometry'],
  },
];

const summary = components.map(({ name, entity, requiredFields }) => {
  const blueprint = entity.userData.voxelBlueprint;
  assert.ok(blueprint, `${name} should expose voxelBlueprint metadata`);
  assert.ok(blueprint.voxelCount >= 5, `${name} should generate visible voxels`);
  assert.ok(blueprint.geometryVariants <= blueprint.voxelCount, `${name} should reuse geometries`);
  requiredFields.forEach((field) => {
    assert.ok(blueprint.backendContract.includes(field), `${name} missing backend field ${field}`);
  });

  return {
    name,
    ontologyType: blueprint.ontologyType,
    source: blueprint.source,
    voxelCount: blueprint.voxelCount,
    geometryVariants: blueprint.geometryVariants,
    backendContract: blueprint.backendContract,
  };
});

console.log(JSON.stringify(summary, null, 2));
