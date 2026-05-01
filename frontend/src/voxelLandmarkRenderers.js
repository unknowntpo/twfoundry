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
  stone: '#D2C3C3',
  ink: '#2B2330',
};

const geometryCache = new Map();
const labelTextureCache = new Map();
const DEFAULT_LABEL_BY_KIND = {
  'station-anchor': 'MRT',
  'mrt-exit': 'MRT',
  'department-store': 'DEPT',
  'bookstore-mall': 'BOOK',
  'lane-shop': 'LANE',
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

function getGeometry(width, height, depth) {
  const key = `${width.toFixed(3)}_${height.toFixed(3)}_${depth.toFixed(3)}`;
  if (!geometryCache.has(key)) {
    geometryCache.set(key, new THREE.BoxGeometry(width, height, depth));
  }
  return geometryCache.get(key);
}

function box(width, height, depth, color, opts = {}) {
  const mesh = new THREE.Mesh(getGeometry(width, height, depth), material(color, opts));
  mesh.name = opts.name ?? 'voxel block';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function getLabelTexture(text, color) {
  const key = `${text}-${color}`;
  if (labelTextureCache.has(key)) return labelTextureCache.get(key);
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(255, 249, 251, 0.96)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 8;
  roundRect(ctx, 8, 8, 240, 80, 22);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = '900 42px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(text).slice(0, 8), 128, 50);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  labelTextureCache.set(key, texture);
  return texture;
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function addBillboardLabel(group, { text, color, y }) {
  const texture = getLabelTexture(text, color);
  if (!texture) return;
  const label = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  }));
  label.name = 'category billboard label';
  label.scale.set(1.7, 0.64, 1);
  label.position.set(0, y, -0.42);
  label.renderOrder = 6;
  group.add(label);
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

function addWindowBand(group, { width, depth, y, zSide = -1, color = COLORS.sky, count, size = 0.16 }) {
  const windowCount = count ?? Math.max(2, Math.floor(width / 0.48));
  for (let i = 0; i < windowCount; i += 1) {
    const pane = box(size * 1.35, size, 0.05, color, {
      emissive: color,
      emissiveIntensity: 0.1,
      name: 'facade window',
    });
    pane.position.set((i - (windowCount - 1) / 2) * 0.42, y, zSide * (depth / 2 + 0.04));
    group.add(pane);
  }
}

function addSideWindowBand(group, { width, depth, y, xSide = 1, color = COLORS.sky, count }) {
  const windowCount = count ?? Math.max(2, Math.floor(depth / 0.42));
  for (let i = 0; i < windowCount; i += 1) {
    const pane = box(0.05, 0.14, 0.18, color, {
      emissive: color,
      emissiveIntensity: 0.08,
      name: 'side facade window',
    });
    pane.position.set(xSide * (width / 2 + 0.04), y, (i - (windowCount - 1) / 2) * 0.36);
    group.add(pane);
  }
}

function addFloorTrim(group, { width, depth, y, color }) {
  const front = box(width * 1.04, 0.055, 0.075, color, {
    emissive: color,
    emissiveIntensity: 0.08,
    name: 'floor trim front',
  });
  front.position.set(0, y, -depth / 2 - 0.04);
  group.add(front);
  const side = box(0.075, 0.055, depth * 0.94, color, {
    emissive: color,
    emissiveIntensity: 0.05,
    name: 'floor trim side',
  });
  side.position.set(width / 2 + 0.04, y, 0);
  group.add(side);
}

function addCornerColumns(group, { width, depth, height, color }) {
  const columnHeight = Math.max(0.4, height - 0.24);
  [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ].forEach(([xSide, zSide]) => {
    const column = box(0.12, columnHeight, 0.12, color, {
      emissive: color,
      emissiveIntensity: 0.035,
      name: 'corner column',
    });
    column.position.set(xSide * (width / 2 - 0.05), columnHeight / 2 + 0.1, zSide * (depth / 2 - 0.05));
    group.add(column);
  });
}

function addFloorStack(group, state) {
  const floors = state.floors ?? 4;
  const width = state.width ?? 1.35;
  const depth = state.depth ?? 1.15;
  const floorHeight = state.floorHeight ?? 0.58;
  const color = state.color ?? COLORS.sakuraLight;
  const accentColor = state.accentColor ?? color;
  for (let floor = 0; floor < floors; floor += 1) {
    const setback = Math.max(0, floor - (state.setbackAfterFloor ?? floors + 1)) * 0.08;
    const floorWidth = Math.max(0.72, width - setback);
    const floorDepth = Math.max(0.7, depth - setback * 0.75);
    const block = box(floorWidth, floorHeight, floorDepth, floor % 2 ? color : accentColor, {
      emissive: color,
      emissiveIntensity: 0.035,
      name: 'floor mass',
    });
    block.position.y = floorHeight / 2 + floor * floorHeight;
    group.add(block);
    addFloorTrim(group, {
      width: floorWidth,
      depth: floorDepth,
      y: floor * floorHeight + floorHeight * 0.96,
      color: state.trimColor ?? COLORS.paper,
    });
    if (floor > 0) {
      addWindowBand(group, { width: floorWidth, depth: floorDepth, y: floor * floorHeight + floorHeight * 0.56 });
      addSideWindowBand(group, { width: floorWidth, depth: floorDepth, y: floor * floorHeight + floorHeight * 0.56, xSide: 1 });
    }
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
    name: 'retail sign',
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
    name: 'street canopy',
  });
  canopy.position.set(0, y, -depth / 2 - 0.18);
  group.add(canopy);
}

function addEntranceDetails(group, state, y = 0.42) {
  const width = state.width ?? 1.35;
  const depth = state.depth ?? 1.15;
  const door = box(0.38, 0.5, 0.06, COLORS.ink, {
    opacity: 0.72,
    emissive: COLORS.sky,
    emissiveIntensity: 0.06,
    name: 'glass entrance',
  });
  door.position.set(0, y, -depth / 2 - 0.055);
  group.add(door);

  [-1, 1].forEach((side) => {
    const planter = box(0.22, 0.18, 0.24, COLORS.leaf, {
      emissive: COLORS.leaf,
      emissiveIntensity: 0.05,
      name: 'street planter',
    });
    planter.position.set(side * width * 0.36, 0.13, -depth / 2 - 0.22);
    group.add(planter);
  });
}

function addRoofDetails(group, state, y) {
  const width = state.width ?? 1.35;
  const depth = state.depth ?? 1.15;
  const roofColor = state.roofColor ?? COLORS.paper;
  const cap = box(width * 0.86, 0.16, depth * 0.82, roofColor, {
    emissive: roofColor,
    emissiveIntensity: 0.05,
    name: 'roof cap',
  });
  cap.position.set(0, y + 0.08, 0);
  group.add(cap);

  const tank = box(0.28, 0.28, 0.28, state.signColor ?? COLORS.gold, {
    emissive: state.signColor ?? COLORS.gold,
    emissiveIntensity: 0.08,
    name: 'roof equipment',
  });
  tank.position.set(width * 0.24, y + 0.31, depth * 0.2);
  group.add(tank);

  const antenna = box(0.06, 0.54, 0.06, COLORS.sky, {
    emissive: COLORS.sky,
    emissiveIntensity: 0.08,
    name: 'roof antenna',
  });
  antenna.position.set(-width * 0.28, y + 0.55, depth * 0.18);
  group.add(antenna);
}

function addTypeBeacon(group, { color, y, shape = 'pin' }) {
  const mast = box(0.1, 0.88, 0.1, COLORS.paper, {
    emissive: color,
    emissiveIntensity: 0.06,
    name: 'type beacon mast',
  });
  mast.position.set(0, y + 0.44, 0);
  group.add(mast);

  if (shape === 'station') {
    const board = box(1, 0.62, 0.1, COLORS.paper, {
      emissive: color,
      emissiveIntensity: 0.14,
      name: 'metro station board',
    });
    board.position.set(0, y + 1.02, -0.04);
    group.add(board);
    [-0.16, 0.16].forEach((offset) => {
      const stripe = box(0.14, 0.42, 0.11, color, {
        emissive: color,
        emissiveIntensity: 0.18,
        name: 'metro board stripe',
      });
      stripe.position.set(offset, y + 1.02, -0.1);
      group.add(stripe);
    });
    return;
  }

  const flag = box(0.78, 0.44, 0.14, color, {
    emissive: color,
    emissiveIntensity: 0.16,
    name: `${shape} type beacon`,
  });
  flag.position.set(0.26, y + 1.08, 0);
  group.add(flag);

  if (shape === 'retail') {
    const handle = box(0.52, 0.1, 0.12, COLORS.paper, {
      emissive: COLORS.paper,
      emissiveIntensity: 0.05,
      name: 'shopping bag handle',
    });
    handle.position.set(0.26, y + 1.34, 0);
    group.add(handle);
  }
}

function addCategoryPlate(group, { width, depth, color, name, label }) {
  const plate = box(width, 0.055, depth, color, {
    opacity: 0.66,
    emissive: color,
    emissiveIntensity: 0.06,
    name,
  });
  plate.position.set(0, 0.045, 0);
  group.add(plate);
  if (label) addBillboardLabel(group, { text: label, color, y: 1.78 });
}

function addRetailIdentity(group, state, y) {
  const color = state.signColor ?? COLORS.gold;
  const bag = box(0.5, 0.42, 0.18, color, {
    emissive: color,
    emissiveIntensity: 0.16,
    name: 'department store shopping bag mark',
  });
  bag.position.set(-0.34, y + 0.42, -0.22);
  group.add(bag);
  const handle = box(0.34, 0.08, 0.2, COLORS.paper, {
    emissive: COLORS.paper,
    emissiveIntensity: 0.08,
    name: 'department store shopping bag handle',
  });
  handle.position.set(-0.34, y + 0.68, -0.22);
  group.add(handle);
  addTypeBeacon(group, { color, y: y + 0.18, shape: 'retail' });
}

function addBookIdentity(group, state, y) {
  const width = state.width ?? 1.4;
  const colors = [COLORS.water, COLORS.paper, state.signColor ?? COLORS.water];
  colors.forEach((color, index) => {
    const spine = box(width * 0.56, 0.09, 0.2, color, {
      emissive: color,
      emissiveIntensity: 0.09,
      name: 'bookstore stacked book spine',
    });
    spine.position.set(0, y + 0.23 + index * 0.12, -0.34);
    group.add(spine);
  });
  addTypeBeacon(group, { color: state.signColor ?? COLORS.water, y, shape: 'book' });
}

function addLaneBalconies(group, state) {
  const width = state.width ?? 1;
  const depth = state.depth ?? 1;
  const floors = state.floors ?? 2;
  const floorHeight = state.floorHeight ?? 0.46;
  for (let floor = 1; floor < floors; floor += 1) {
    const y = floor * floorHeight + 0.18;
    const deck = box(width * 0.58, 0.07, 0.2, COLORS.paper, {
      emissive: COLORS.paper,
      emissiveIntensity: 0.045,
      name: 'lane balcony deck',
    });
    deck.position.set(0, y, -depth / 2 - 0.15);
    group.add(deck);
    const rail = box(width * 0.52, 0.08, 0.05, state.signColor ?? COLORS.rose, {
      emissive: state.signColor ?? COLORS.rose,
      emissiveIntensity: 0.08,
      name: 'lane balcony rail',
    });
    rail.position.set(0, y + 0.12, -depth / 2 - 0.26);
    group.add(rail);
    const sideSign = box(0.12, 0.28, 0.08, state.signColor ?? COLORS.rose, {
      emissive: state.signColor ?? COLORS.rose,
      emissiveIntensity: 0.11,
      name: 'lane hanging sign',
    });
    sideSign.position.set(width / 2 + 0.1, y - 0.02, -depth / 2 - 0.1);
    group.add(sideSign);
  }
}

function createDepartmentStore(state) {
  const group = new THREE.Group();
  addCategoryPlate(group, {
    width: (state.width ?? 1.6) * 1.48,
    depth: (state.depth ?? 1.3) * 1.42,
    color: state.signColor ?? COLORS.gold,
    name: 'department store category plate',
  });
  const podium = box((state.width ?? 1.6) * 1.18, 0.48, (state.depth ?? 1.3) * 1.14, COLORS.paper, {
    emissive: state.signColor ?? COLORS.gold,
    emissiveIntensity: 0.055,
    name: 'department store podium',
  });
  podium.position.y = 0.24;
  group.add(podium);
  addEntranceDetails(group, state, 0.36);
  const tower = new THREE.Group();
  tower.position.y = 0.46;
  const topY = addFloorStack(tower, { ...state, floorHeight: 0.52, setbackAfterFloor: 3 });
  addCornerColumns(tower, {
    width: state.width ?? 1.6,
    depth: state.depth ?? 1.3,
    height: topY,
    color: state.trimColor ?? COLORS.paper,
  });
  addRetailSign(tower, state, topY);
  addCanopy(tower, state, 0.18);
  addRoofDetails(tower, state, topY);
  addRetailIdentity(tower, state, topY);
  addBillboardLabel(tower, { text: state.categoryLabel ?? 'DEPT', color: state.signColor ?? COLORS.gold, y: topY + 1.04 });
  group.add(tower);
  return group;
}

function createBookstoreMall(state) {
  const group = new THREE.Group();
  const floors = state.floors ?? 4;
  const width = state.width ?? 1.4;
  const depth = state.depth ?? 1.1;
  addCategoryPlate(group, {
    width: width * 1.5,
    depth: depth * 1.48,
    color: state.signColor ?? COLORS.water,
    name: 'bookstore category plate',
  });
  for (let floor = 0; floor < floors; floor += 1) {
    const setback = floor > 1 ? 0.12 : 0;
    const slab = box(width - setback, 0.5, depth - setback, floor % 2 ? COLORS.sakuraLight : COLORS.paper, {
      emissive: state.signColor ?? COLORS.water,
      emissiveIntensity: 0.045,
      name: 'bookstore floor slab',
    });
    slab.position.y = 0.25 + floor * 0.5;
    group.add(slab);
    addWindowBand(group, { width: width - setback, depth: depth - setback, y: 0.3 + floor * 0.5, color: COLORS.water, count: 4, size: 0.14 });
    addSideWindowBand(group, { width: width - setback, depth: depth - setback, y: 0.3 + floor * 0.5, color: COLORS.water, count: 3 });
    addFloorTrim(group, { width: width - setback, depth: depth - setback, y: 0.48 + floor * 0.5, color: COLORS.paper });
  }
  addEntranceDetails(group, { ...state, width, depth }, 0.34);
  addRetailSign(group, { ...state, width, depth }, floors * 0.5);
  addRoofDetails(group, { ...state, width, depth }, floors * 0.5);
  addBookIdentity(group, { ...state, width, depth }, floors * 0.5);
  addBillboardLabel(group, { text: state.categoryLabel ?? 'BOOK', color: state.signColor ?? COLORS.water, y: floors * 0.5 + 1.1 });
  return group;
}

function createLaneShop(state) {
  const group = new THREE.Group();
  const width = state.width ?? 1;
  const depth = state.depth ?? 1;
  const floors = state.floors ?? 2;
  addCategoryPlate(group, {
    width: width * 1.32,
    depth: depth * 1.32,
    color: state.signColor ?? COLORS.rose,
    name: 'lane shop category plate',
  });
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
    name: 'lane shop awning',
  });
  awning.position.set(0, 0.58, -depth / 2 - 0.12);
  group.add(awning);
  addLaneBalconies(group, { ...state, width, depth, floorHeight: 0.46 });
  addEntranceDetails(group, { ...state, width, depth }, 0.32);
  addRoofDetails(group, { ...state, width, depth }, topY);
  if (state.sign) addRetailSign(group, state, topY);
  addBillboardLabel(group, { text: state.categoryLabel ?? 'LANE', color: state.signColor ?? COLORS.rose, y: topY + 1.0 });
  return group;
}

function createMrtExit(state) {
  const group = new THREE.Group();
  const color = state.color ?? COLORS.rose;
  addCategoryPlate(group, {
    width: 1.78,
    depth: 1.46,
    color,
    name: 'station category plate',
  });
  const base = box(1.35, 0.22, 1.1, COLORS.paper, { emissive: color, emissiveIntensity: 0.08, name: 'mrt exit base' });
  base.position.y = 0.11;
  group.add(base);
  const stairWell = box(0.86, 0.6, 0.72, COLORS.sakuraLight, { emissive: color, emissiveIntensity: 0.05, name: 'mrt exit stair well' });
  stairWell.position.y = 0.52;
  group.add(stairWell);
  const pylon = box(0.34, 1.32, 0.34, color, { emissive: color, emissiveIntensity: 0.16, name: 'mrt pylon' });
  pylon.position.set(-0.48, 1.0, -0.12);
  group.add(pylon);
  const roof = box(1.15, 0.18, 0.7, COLORS.paper, { emissive: color, emissiveIntensity: 0.1, name: 'mrt exit roof' });
  roof.position.y = 1.38;
  group.add(roof);
  for (let i = 0; i < 4; i += 1) {
    const step = box(0.72 - i * 0.08, 0.07, 0.18, COLORS.stone, {
      emissive: color,
      emissiveIntensity: 0.04,
      name: 'mrt exit stair step',
    });
    step.position.set(0.28, 0.28 + i * 0.08, -0.56 - i * 0.13);
    group.add(step);
  }
  addTypeBeacon(group, { color, y: 1.35, shape: 'station' });
  addBillboardLabel(group, { text: state.categoryLabel ?? 'MRT', color, y: 2.75 });
  return group;
}

export function createStaticFeatureVoxel(feature, transform) {
  const point = pointFromLocal(feature.geometry?.coordinates, transform);
  const state = {
    ...(feature.visualState ?? {}),
    categoryLabel: feature.visualState?.categoryLabel ?? DEFAULT_LABEL_BY_KIND[feature.kind],
  };
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
    modules: ['podium', 'floor-slice', 'facade-window-band', 'corner-columns', 'type-beacon', 'category-label', 'signage', 'roof-equipment', 'street-context'],
    localCoordinate: 'feature geometry point as building origin',
    repeatPatterns: ['floor slices', 'window bands', 'side facade panels', 'retail signs'],
    landmarkKind: feature.kind,
    voxelCount: group.children.reduce((total, child) => {
      let count = child.type === 'Mesh' ? 1 : 0;
      child.traverse?.((descendant) => {
        if (descendant !== child && descendant.type === 'Mesh') count += 1;
      });
      return total + count;
    }, 0),
    geometryVariants: geometryCache.size,
  };
  return group;
}
