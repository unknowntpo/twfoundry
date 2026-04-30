import * as THREE from 'three';

const COLORS = {
  paper: '#FFF7FA',
  sakura: '#F596AA',
  sakuraLight: '#FFD2DC',
  rose: '#E16B8C',
  sky: '#78C8F8',
  water: '#81C7D4',
  gold: '#FFB11B',
  leaf: '#B5CAA0',
  leafDeep: '#5DAC81',
  alley: '#F3E5DA',
  ink: '#2B2330',
};

function material(color, opts = {}) {
  return new THREE.MeshLambertMaterial({
    color,
    transparent: opts.opacity !== undefined,
    opacity: opts.opacity ?? 1,
    emissive: opts.emissive ?? color,
    emissiveIntensity: opts.emissiveIntensity ?? 0.04,
  });
}

function box(width, height, depth, color, opts = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material(color, opts));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function pointFromLocal(coordinates, transform) {
  const [x = 0, yOrZ = 0, maybeZ] = coordinates ?? [];
  const y = maybeZ === undefined ? 0 : yOrZ;
  const z = maybeZ === undefined ? yOrZ : maybeZ;
  const scale = transform?.scale ?? 1;
  const translate = transform?.translate ?? { x: 0, y: 0, z: 0 };
  return new THREE.Vector3(
    x * scale + (translate.x ?? 0),
    y * scale + (translate.y ?? 0),
    z * scale + (translate.z ?? 0),
  );
}

function addWindowBand(group, { width, depth, y, zSide = -1, color = COLORS.sky, count }) {
  const windowCount = count ?? Math.max(2, Math.floor(width / 0.48));
  for (let i = 0; i < windowCount; i += 1) {
    const pane = box(0.22, 0.16, 0.05, color, { emissive: color, emissiveIntensity: 0.1 });
    pane.position.set((i - (windowCount - 1) / 2) * 0.42, y, zSide * (depth / 2 + 0.04));
    group.add(pane);
  }
}

function addFloorStack(group, state) {
  const floors = state.floors ?? 4;
  const width = state.width ?? 1.35;
  const depth = state.depth ?? 1.15;
  const floorHeight = state.floorHeight ?? 0.58;
  const color = state.color ?? COLORS.sakuraLight;
  const accentColor = state.accentColor ?? color;
  for (let floor = 0; floor < floors; floor += 1) {
    const block = box(width, floorHeight, depth, floor % 2 ? color : accentColor, {
      emissive: color,
      emissiveIntensity: 0.035,
    });
    block.position.y = floorHeight / 2 + floor * floorHeight;
    group.add(block);
    if (floor > 0) addWindowBand(group, { width, depth, y: floor * floorHeight + floorHeight * 0.55 });
  }
  return floors * floorHeight;
}

function addRetailSign(group, state, y) {
  if (!state.sign) return;
  const width = state.width ?? 1.35;
  const depth = state.depth ?? 1.15;
  const sign = box(width * 0.82, 0.16, 0.14, state.signColor ?? COLORS.gold, {
    emissive: state.signColor ?? COLORS.gold,
    emissiveIntensity: 0.14,
  });
  sign.position.set(0, y + 0.18, -depth / 2 - 0.09);
  group.add(sign);
}

function addCanopy(group, state, y = 0.62) {
  const width = state.width ?? 1.35;
  const depth = state.depth ?? 1.15;
  const canopy = box(width * 1.08, 0.12, 0.34, state.canopyColor ?? COLORS.paper, {
    emissive: state.signColor ?? COLORS.gold,
    emissiveIntensity: 0.08,
  });
  canopy.position.set(0, y, -depth / 2 - 0.18);
  group.add(canopy);
}

function createDepartmentStore(state) {
  const group = new THREE.Group();
  const podium = box((state.width ?? 1.6) * 1.18, 0.48, (state.depth ?? 1.3) * 1.14, COLORS.paper, {
    emissive: state.signColor ?? COLORS.gold,
    emissiveIntensity: 0.055,
  });
  podium.position.y = 0.24;
  group.add(podium);
  const tower = new THREE.Group();
  tower.position.y = 0.46;
  const topY = addFloorStack(tower, { ...state, floorHeight: 0.52 });
  addRetailSign(tower, state, topY);
  addCanopy(tower, state, 0.18);
  group.add(tower);
  return group;
}

function createBookstoreMall(state) {
  const group = new THREE.Group();
  const floors = state.floors ?? 4;
  const width = state.width ?? 1.4;
  const depth = state.depth ?? 1.1;
  for (let floor = 0; floor < floors; floor += 1) {
    const setback = floor > 1 ? 0.12 : 0;
    const slab = box(width - setback, 0.5, depth - setback, floor % 2 ? COLORS.sakuraLight : COLORS.paper, {
      emissive: state.signColor ?? COLORS.water,
      emissiveIntensity: 0.045,
    });
    slab.position.y = 0.25 + floor * 0.5;
    group.add(slab);
    addWindowBand(group, { width: width - setback, depth: depth - setback, y: 0.3 + floor * 0.5, color: COLORS.water, count: 3 });
  }
  addRetailSign(group, { ...state, width, depth }, floors * 0.5);
  return group;
}

function createLaneShop(state) {
  const group = new THREE.Group();
  const width = state.width ?? 1;
  const depth = state.depth ?? 1;
  const floors = state.floors ?? 2;
  const topY = addFloorStack(group, {
    ...state,
    floors,
    width,
    depth,
    floorHeight: 0.46,
    color: state.color ?? COLORS.alley,
    accentColor: state.accentColor ?? COLORS.sakuraLight,
  });
  const awning = box(width * 0.9, 0.12, 0.28, state.signColor ?? COLORS.rose, {
    emissive: state.signColor ?? COLORS.rose,
    emissiveIntensity: 0.12,
  });
  awning.position.set(0, 0.58, -depth / 2 - 0.12);
  group.add(awning);
  if (state.sign) addRetailSign(group, state, topY);
  return group;
}

function createMrtExit(state) {
  const group = new THREE.Group();
  const color = state.color ?? COLORS.rose;
  const base = box(1.35, 0.22, 1.1, COLORS.paper, { emissive: color, emissiveIntensity: 0.08 });
  base.position.y = 0.11;
  group.add(base);
  const stairWell = box(0.86, 0.6, 0.72, COLORS.sakuraLight, { emissive: color, emissiveIntensity: 0.05 });
  stairWell.position.y = 0.52;
  group.add(stairWell);
  const pylon = box(0.34, 1.32, 0.34, color, { emissive: color, emissiveIntensity: 0.16 });
  pylon.position.set(-0.48, 1.0, -0.12);
  group.add(pylon);
  const roof = box(1.15, 0.18, 0.7, COLORS.paper, { emissive: color, emissiveIntensity: 0.1 });
  roof.position.y = 1.38;
  group.add(roof);
  return group;
}

export function createZhongshanStaticFeature(feature, transform) {
  const point = pointFromLocal(feature.geometry?.coordinates, transform);
  const state = feature.visualState ?? {};
  let group;
  if (feature.kind === 'department-store') {
    group = createDepartmentStore(state);
  } else if (feature.kind === 'bookstore-mall') {
    group = createBookstoreMall(state);
  } else if (feature.kind === 'lane-shop') {
    group = createLaneShop(state);
  } else if (feature.kind === 'station-anchor' || feature.kind === 'mrt-exit') {
    group = createMrtExit(state);
  } else {
    group = createLaneShop(state);
  }
  group.position.copy(point);
  group.name = `static ${feature.kind}`;
  group.userData.voxelBlueprint = {
    mainAxis: feature.kind === 'station-anchor' ? 'vertical entrance marker' : 'Y floor stack',
    modules: ['base', 'floor-slice', 'facade-pattern', 'signage', 'street-context'],
    localCoordinate: 'feature geometry point as building origin',
    repeatPatterns: ['floor slices', 'window bands', 'retail signs'],
    landmarkKind: feature.kind,
  };
  return group;
}
