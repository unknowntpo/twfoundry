import * as THREE from 'three';

function makeMat(color, opts = {}) {
  if (opts.glass) {
    return new THREE.MeshPhysicalMaterial({
      color,
      transparent: true,
      opacity: opts.opacity ?? 0.56,
      roughness: opts.roughness ?? 0.24,
      transmission: opts.transmission ?? 0.35,
      thickness: opts.thickness ?? 1,
      clearcoat: opts.clearcoat ?? 0.55,
      depthWrite: opts.depthWrite ?? false,
      emissive: opts.emissive ?? 0x000000,
      emissiveIntensity: opts.emissiveIntensity ?? 0,
    });
  }

  return new THREE.MeshLambertMaterial({
    color,
    transparent: opts.opacity !== undefined,
    opacity: opts.opacity ?? 1,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 0,
  });
}

function getGeometry(cache, sx, sy, sz) {
  const key = `${sx.toFixed(3)}_${sy.toFixed(3)}_${sz.toFixed(3)}`;
  if (!cache.has(key)) {
    cache.set(key, new THREE.BoxGeometry(sx, sy, sz));
  }
  return cache.get(key);
}

function addVoxel(parent, cache, mat, x, y, z, sx, sy, sz, name) {
  const mesh = new THREE.Mesh(getGeometry(cache, sx, sy, sz), mat);
  mesh.position.set(x, y, z);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function attachBlueprint(group, blueprint, cache) {
  group.userData.voxelBlueprint = {
    ...blueprint,
    voxelCount: group.children.filter((child) => child.type === 'Mesh').length,
    geometryVariants: cache.size,
  };
  return group;
}

export function createStationAnchor({
  lineColor = '#0070BD',
  stationId = 'BL18',
  stationName = 'Taipei City Hall',
  load = 'medium',
  debug = false,
} = {}) {
  const cache = new Map();
  const group = new THREE.Group();
  group.name = 'station anchor';
  const mats = {
    paper: makeMat('#FFF9FB', { emissive: '#FFD2DC', emissiveIntensity: 0.04 }),
    line: makeMat(lineColor, { emissive: lineColor, emissiveIntensity: 0.12 }),
    ink: makeMat('#2B2330'),
    shadow: makeMat('#EFB9CC', { opacity: 0.72 }),
  };

  addVoxel(group, cache, mats.shadow, 0, -0.09, 0, 1.35, 0.12, 1.35, 'soft platform shadow');
  addVoxel(group, cache, mats.paper, 0, 0.05, 0, 1.08, 0.2, 1.08, 'station platform');
  addVoxel(group, cache, mats.line, 0, 0.22, 0, 0.82, 0.1, 0.82, 'route color plate');
  addVoxel(group, cache, mats.paper, 0, 0.46, 0, 0.62, 0.36, 0.62, 'station marker body');
  addVoxel(group, cache, mats.ink, 0, 0.72, 0, 0.48, 0.08, 0.48, 'station sign top');
  addVoxel(group, cache, mats.line, -0.38, 0.55, 0, 0.1, 0.42, 0.1, 'station line pillar');
  addVoxel(group, cache, mats.line, 0.38, 0.55, 0, 0.1, 0.42, 0.1, 'station line pillar');

  if (debug) {
    const axis = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -0.2, 0), 1.8, lineColor, 0.22, 0.16);
    axis.name = 'debug station Y axis';
    group.add(axis);
  }

  return attachBlueprint(group, {
    ontologyType: 'Station',
    source: 'TDX MRT LiveBoard / stationId',
    backendContract: ['stationId', 'stationName', 'lineId', 'status'],
    mainAxis: 'Y marker over route node',
    modules: ['platform', 'route-color-plate', 'marker-body', 'sign', 'debug-axis'],
    sample: { stationId, stationName, load },
  }, cache);
}

export function createPm25Sensor({
  sensorId = 'AQMS A-07',
  value = 31,
  status = 'watch',
  debug = false,
} = {}) {
  const cache = new Map();
  const group = new THREE.Group();
  group.name = 'pm25 sensor';
  const riskColor = value >= 35 ? '#E16B8C' : value >= 25 ? '#FFB11B' : '#5DAC81';
  const mats = {
    base: makeMat('#FFF9FB', { emissive: '#FFD2DC', emissiveIntensity: 0.04 }),
    pole: makeMat('#B481BB', { emissive: '#B481BB', emissiveIntensity: 0.08 }),
    risk: makeMat(riskColor, { glass: true, opacity: 0.46, emissive: riskColor, emissiveIntensity: 0.18 }),
    ink: makeMat('#2B2330'),
  };

  addVoxel(group, cache, mats.base, 0, 0.05, 0, 1, 0.18, 1, 'sensor base');
  addVoxel(group, cache, mats.pole, 0, 0.78, 0, 0.22, 1.35, 0.22, 'sensor mast');
  addVoxel(group, cache, mats.ink, 0, 1.52, 0, 0.56, 0.28, 0.42, 'sensor head');
  addVoxel(group, cache, mats.risk, 0, 1.92, 0, 1.45, 0.18, 1.45, 'pm25 haze slice');
  addVoxel(group, cache, mats.risk, -0.42, 2.22, 0.18, 0.42, 0.42, 0.42, 'pm25 particle');
  addVoxel(group, cache, mats.risk, 0.46, 2.52, -0.18, 0.34, 0.34, 0.34, 'pm25 particle');
  addVoxel(group, cache, mats.risk, 0.05, 2.82, 0.42, 0.28, 0.28, 0.28, 'pm25 particle');

  if (debug) {
    const ring = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(2.1, 2.1, 2.1)),
      new THREE.LineBasicMaterial({ color: riskColor, transparent: true, opacity: 0.7 }),
    );
    ring.name = 'debug exposure bounds';
    ring.position.y = 1.8;
    group.add(ring);
  }

  return attachBlueprint(group, {
    ontologyType: 'PM2.5 Sensor',
    source: 'EPA AQMS planned ingestion',
    backendContract: ['sensorId', 'pm25', 'trend', 'updatedAt', 'location'],
    mainAxis: 'Y mast + volumetric exposure field',
    modules: ['base', 'mast', 'sensor-head', 'haze-slice', 'particles', 'exposure-bounds'],
    sample: { sensorId, value, status },
  }, cache);
}

export function createWeatherCell({
  cellId = 'Rain Cell R-042',
  intensity = 38,
  trend = 'rising',
  debug = false,
} = {}) {
  const cache = new Map();
  const group = new THREE.Group();
  group.name = 'weather rain cell';
  const heavy = intensity >= 35;
  const volumeColor = heavy ? '#58B2DC' : '#81C7D4';
  const mats = {
    water: makeMat(volumeColor, { glass: true, opacity: heavy ? 0.28 : 0.18, transmission: 0.7, emissive: volumeColor, emissiveIntensity: 0.08 }),
    rain: makeMat('#D8EEF8', { opacity: 0.82, emissive: '#D8EEF8', emissiveIntensity: 0.06 }),
    alert: makeMat(heavy ? '#E16B8C' : '#B5CAA0', { emissive: heavy ? '#E16B8C' : '#B5CAA0', emissiveIntensity: 0.08 }),
  };

  addVoxel(group, cache, mats.water, 0, 1.25, 0, 2.8, 2.5, 2.8, 'rainfall volume');
  for (let i = 0; i < 11; i += 1) {
    const x = -1.1 + (i % 4) * 0.72;
    const z = -1 + Math.floor(i / 4) * 0.78;
    const y = 2.55 - (i % 3) * 0.34;
    addVoxel(group, cache, mats.rain, x, y, z, 0.08, 0.62, 0.08, 'rain streak');
  }
  addVoxel(group, cache, mats.alert, 0, 0.05, 0, 2.1, 0.12, 2.1, 'ground impact footprint');

  if (debug) {
    const axis = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(1.65, 2.7, 1.65), 2.6, '#58B2DC', 0.24, 0.14);
    axis.name = 'debug rainfall vector';
    group.add(axis);
  }

  return attachBlueprint(group, {
    ontologyType: 'Weather / Rainfall Cell',
    source: 'CWA weather planned ingestion',
    backendContract: ['cellId', 'intensityMmHr', 'trend', 'confidence', 'geometry'],
    mainAxis: 'Y volume over affected map chunk',
    modules: ['transparent-volume', 'rain-streaks', 'impact-footprint', 'debug-vector'],
    sample: { cellId, intensity, trend },
  }, cache);
}
