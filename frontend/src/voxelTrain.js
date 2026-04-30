import * as THREE from 'three';

export const MRT_TRAIN_BLUEPRINT = {
  mainAxis: 'curve tangent / local Z',
  modules: ['car-body', 'cab', 'window-band', 'doors', 'roof-equipment', 'bogies', 'route-stripe'],
  localCoordinate: 'Each car origin is centered on local Z; details are carOrigin + local offset.',
  repeatPatterns: ['cars repeat along local Z', 'windows repeat on both side faces', 'bogies repeat per car'],
};

function makeMat(color, opts = {}) {
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

function makePalette(lineColor) {
  return {
    body: makeMat('#FFF9FB', { emissive: '#FFD2DC', emissiveIntensity: 0.035 }),
    line: makeMat(lineColor, { emissive: lineColor, emissiveIntensity: 0.12 }),
    window: makeMat('#78C8F8', { emissive: '#58B2DC', emissiveIntensity: 0.11 }),
    dark: makeMat('#2B2330', { emissive: '#2B2330', emissiveIntensity: 0.02 }),
    roof: makeMat('#FFFFFF', { emissive: '#FFF7FA', emissiveIntensity: 0.05 }),
    light: makeMat('#FFB11B', { emissive: '#FFB11B', emissiveIntensity: 0.18 }),
  };
}

function buildWindowBand(parent, cache, mats, carZ, sideX, carLength) {
  addVoxel(parent, cache, mats.dark, sideX, 0.14, carZ, 0.055, 0.2, carLength - 0.26, 'continuous window band');

  for (let z = carZ - carLength / 2 + 0.22; z <= carZ + carLength / 2 - 0.22; z += 0.28) {
    addVoxel(parent, cache, mats.window, sideX + Math.sign(sideX) * 0.02, 0.16, z, 0.06, 0.16, 0.16, 'passenger window');
  }
}

function buildDoorPair(parent, cache, mats, carZ, sideX) {
  [-0.28, 0.28].forEach((offset) => {
    addVoxel(parent, cache, mats.body, sideX, -0.1, carZ + offset, 0.06, 0.38, 0.14, 'door panel');
    addVoxel(parent, cache, mats.window, sideX + Math.sign(sideX) * 0.02, 0.02, carZ + offset, 0.065, 0.15, 0.1, 'door glass');
  });
}

function buildBogies(parent, cache, mats, carZ, carLength) {
  [-0.32, 0.32].forEach((offset) => {
    addVoxel(parent, cache, mats.dark, -0.22, -0.36, carZ + offset * carLength, 0.2, 0.14, 0.16, 'left bogie');
    addVoxel(parent, cache, mats.dark, 0.22, -0.36, carZ + offset * carLength, 0.2, 0.14, 0.16, 'right bogie');
  });
}

function buildTrainCar(parent, cache, mats, index, carCount, options) {
  const carLength = options.carLength;
  const carZ = (index - (carCount - 1) / 2) * options.carSpacing;
  const sideX = options.carWidth / 2 + 0.035;

  addVoxel(parent, cache, mats.body, 0, 0, carZ, options.carWidth, options.carHeight, carLength, 'car body');
  addVoxel(parent, cache, mats.line, -sideX, -0.08, carZ, 0.06, 0.16, carLength - 0.18, 'left route stripe');
  addVoxel(parent, cache, mats.line, sideX, -0.08, carZ, 0.06, 0.16, carLength - 0.18, 'right route stripe');
  addVoxel(parent, cache, mats.roof, 0, options.carHeight / 2 + 0.055, carZ, options.carWidth * 0.86, 0.08, carLength * 0.9, 'roof cap');

  buildWindowBand(parent, cache, mats, carZ, -sideX, carLength);
  buildWindowBand(parent, cache, mats, carZ, sideX, carLength);
  buildDoorPair(parent, cache, mats, carZ, -sideX);
  buildDoorPair(parent, cache, mats, carZ, sideX);
  buildBogies(parent, cache, mats, carZ, carLength);

  if (index === 0 || index === carCount - 1) {
    const frontZ = carZ + (index === carCount - 1 ? 1 : -1) * (carLength / 2 + 0.035);
    addVoxel(parent, cache, mats.window, 0, 0.12, frontZ, options.carWidth * 0.54, 0.2, 0.06, 'cab windshield');
    addVoxel(parent, cache, mats.light, -0.2, -0.12, frontZ, 0.09, 0.08, 0.065, 'cab light');
    addVoxel(parent, cache, mats.light, 0.2, -0.12, frontZ, 0.09, 0.08, 0.065, 'cab light');
  }
}

export function createMrtTrain({
  lineColor = '#E16B8C',
  carCount = 3,
  scale = 1,
  name = 'procedural MRT train',
  debug = false,
} = {}) {
  const cache = new Map();
  const mats = makePalette(lineColor);
  const group = new THREE.Group();
  group.name = name;
  group.scale.setScalar(scale);

  const options = {
    carWidth: 0.78,
    carHeight: 0.56,
    carLength: 1.18,
    carSpacing: 1.28,
  };

  for (let index = 0; index < carCount; index += 1) {
    buildTrainCar(group, cache, mats, index, carCount, options);
  }

  if (debug) {
    const axis = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, -0.52, -carCount * 0.7), carCount * 1.42, lineColor, 0.26, 0.16);
    axis.name = 'debug local Z axis';
    group.add(axis);
  }

  group.userData.voxelBlueprint = {
    ...MRT_TRAIN_BLUEPRINT,
    carCount,
    lineColor,
    voxelCount: group.children.filter((child) => child.type === 'Mesh').length,
    geometryVariants: cache.size,
  };

  return group;
}
