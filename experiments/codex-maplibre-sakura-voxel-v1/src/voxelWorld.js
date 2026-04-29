import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ontologyObjects } from './mockData.js';

const GRID = 30;
const CELL = 1.85;
const OFF = -GRID * CELL / 2;

const COLORS = {
  sky: '#D8EEF8',
  skyDeep: '#78C8F8',
  sakuraMist: '#FEDFE1',
  sakuraLight: '#FFD2DC',
  sakuraMid: '#FCB4C3',
  sakuraHot: '#F596AA',
  rose: '#E16B8C',
  fuji: '#B481BB',
  water: '#81C7D4',
  leaf: '#B5CAA0',
  leafDeep: '#5DAC81',
  gold: '#FFB11B',
  hill: '#D2C3C3',
  base: '#F7D8E4',
  ink: '#2B2330',
};

function makeRng(seed) {
  let state = seed;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

function gridToWorld(gx, gz) {
  return [gx * CELL + OFF + CELL / 2, gz * CELL + OFF + CELL / 2];
}

function makeMat(color, opts = {}) {
  if (opts.glass) {
    return new THREE.MeshPhysicalMaterial({
      color,
      transparent: true,
      opacity: opts.opacity ?? 0.72,
      metalness: 0,
      roughness: opts.roughness ?? 0.24,
      transmission: opts.transmission ?? 0.36,
      thickness: opts.thickness ?? 1.4,
      ior: opts.ior ?? 1.34,
      clearcoat: opts.clearcoat ?? 0.7,
      clearcoatRoughness: opts.clearcoatRoughness ?? 0.2,
      specularIntensity: opts.specularIntensity ?? 0.75,
      emissive: opts.emissive ?? 0x000000,
      emissiveIntensity: opts.emissiveIntensity ?? 0,
      depthWrite: opts.depthWrite ?? false,
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

function box(w, h, d, color, opts = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), makeMat(color, opts));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export class VoxelWorld {
  constructor(container, callbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 620);
    this.camera.position.set(52, 50, 68);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 2.35, -3.6);
    this.controls.enabled = true;
    this.controls.enableRotate = true;
    this.controls.enablePan = true;
    this.controls.screenSpacePanning = true;
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    };
    this.controls.panSpeed = 1.22;
    this.controls.rotateSpeed = 0.72;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.minDistance = 14;
    this.controls.maxDistance = 205;
    this.controls.maxPolarAngle = Math.PI / 2.04;
    this.controls.minPolarAngle = Math.PI / 7.5;

    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.layers = {};
    this.clickables = [];
    this.trains = [];
    this.rainBars = [];
    this.pmPuffs = [];
    this.petals = [];
    this.incidentMarkers = [];
    this.pipelineNodes = {};
    this.objectAnchors = new Map();
    this.selected = null;
    this.worldMinutes = 610;
    this.pipelineFocus = 'tiles';
    this.layerVisibility = {
      tiles: true,
      mrt: true,
      rain: true,
      pm25: true,
      incident: true,
    };

    this.initScene();
    this.bindEvents();
    this.resize();
    this.animate();
  }

  initScene() {
    this.scene.background = new THREE.Color(COLORS.sky);
    this.scene.fog = new THREE.FogExp2(COLORS.sakuraMist, 0.008);

    this.ambient = new THREE.AmbientLight('#FFF7FA', 1.18);
    this.scene.add(this.ambient);

    this.hemi = new THREE.HemisphereLight('#EAF8FF', '#FFD7E6', 0.76);
    this.scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight('#FFFAF8', 1.65);
    this.sun.position.set(26, 48, 28);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.setScalar(2048);
    this.sun.shadow.camera.left = -70;
    this.sun.shadow.camera.right = 70;
    this.sun.shadow.camera.top = 70;
    this.sun.shadow.camera.bottom = -70;
    this.scene.add(this.sun);

    this.roseFill = new THREE.DirectionalLight('#FFB7C5', 0.42);
    this.roseFill.position.set(-38, 18, -20);
    this.scene.add(this.roseFill);

    this.terrain = this.makeTerrain();
    this.layers.tiles = this.buildTileLayer();
    this.layers.map = this.buildVoxelCity();
    this.layers.mrt = this.buildMrtLayer();
    this.layers.rain = this.buildRainLayer();
    this.layers.pm25 = this.buildPm25Layer();
    this.layers.incident = this.buildIncidentLayer();
    this.layers.pipeline = this.buildPipelineMiniature();
    this.layers.petals = this.buildPetals();
    this.layers.avatar = this.buildAvatar();

    this.scene.add(this.layers.tiles);
    this.scene.add(this.layers.map);
    this.scene.add(this.layers.mrt);
    this.scene.add(this.layers.rain);
    this.scene.add(this.layers.pm25);
    this.scene.add(this.layers.incident);
    this.scene.add(this.layers.pipeline);
    this.scene.add(this.layers.petals);
    this.scene.add(this.layers.avatar);

    this.applyPipelineFocus('tiles');
    this.callbacks.onReady?.({
      visibleChunks: 9,
      observations: 128,
      ontologyObjects: ontologyObjects.length,
      voxelEntities: 812,
    });
  }

  makeTerrain() {
    const rng = makeRng(73);
    return Array.from({ length: GRID }, (_, z) => Array.from({ length: GRID }, (_, x) => {
      if (x <= 2 || (z < 3 && x > 6 && x < 22)) return { type: 'river', h: 0 };
      if (z < 7 && x < 12) return { type: 'hill', h: Math.round((8 - z) * 0.75 + rng() * 2) };
      if (x > 24 && z < 14) return { type: 'hill', h: Math.round(rng() * 3) + 2 };
      if ((x > 12 && x < 17 && z > 20 && z < 24) || (x > 6 && x < 10 && z > 14 && z < 18)) {
        return { type: 'park', h: 1 };
      }
      if (x > 18 && x < 25 && z > 14 && z < 21) return { type: 'tall', h: Math.round(rng() * 7) + 4 };
      if (x > 9 && x < 21 && z > 9 && z < 19) return { type: 'dense', h: Math.round(rng() * 4) + 2 };
      return { type: 'urban', h: Math.round(rng() * 2) + 1 };
    }));
  }

  heightAt(gx, gz) {
    const x = Math.max(0, Math.min(GRID - 1, Math.round(gx)));
    const z = Math.max(0, Math.min(GRID - 1, Math.round(gz)));
    return Math.max(this.terrain[z][x].h, 1);
  }

  buildTileLayer() {
    const group = new THREE.Group();
    const plate = box(GRID * CELL + 7, 0.7, GRID * CELL + 7, COLORS.base, {
      glass: true,
      opacity: 0.82,
      transmission: 0.24,
      roughness: 0.32,
      emissive: '#FFD2DC',
      emissiveIntensity: 0.04,
      depthWrite: true,
    });
    plate.position.y = -0.45;
    group.add(plate);

    const rim = box(GRID * CELL + 8.2, 1.1, GRID * CELL + 8.2, '#EFB9CC', {
      glass: true,
      opacity: 0.68,
      transmission: 0.3,
      roughness: 0.28,
      emissive: '#F596AA',
      emissiveIntensity: 0.04,
      depthWrite: true,
    });
    rim.position.y = -1.15;
    group.add(rim);

    const lineMat = new THREE.LineBasicMaterial({ color: COLORS.skyDeep, transparent: true, opacity: 0.42 });
    const tileSize = GRID * CELL / 4;
    for (let z = 0; z < 4; z++) {
      for (let x = 0; x < 4; x++) {
        const tile = box(tileSize - 0.18, 0.08, tileSize - 0.18, '#F9F6FF', {
          glass: true,
          opacity: 0.18,
          transmission: 0.42,
          roughness: 0.18,
        });
        tile.position.set(OFF + tileSize * x + tileSize / 2, 0.03, OFF + tileSize * z + tileSize / 2);
        tile.userData = {
          twObject: {
            id: `chunk-14-${13623 + x}-${6193 + z}`,
            name: `Chunk ${x + 1}.${z + 1}`,
            type: 'MapLibre visible tile',
            layer: 'Mock geospatial backbone',
            status: x > 0 && x < 3 && z > 0 && z < 3 ? 'visible' : 'cached',
            freshness: 'viewport frame',
            summary: '模擬 MapLibre viewport-driven tile/chunk。未來會由 camera bounds 與 zoom level 決定載入。',
            properties: [`z: 14`, `x: ${13623 + x}`, `y: ${6193 + z}`, `lod: voxel-preview`],
            relationships: ['decodes vector features', 'emits observations', 'binds ontology anchors'],
          },
        };
        this.clickables.push(tile);
        this.registerAnchor(tile.userData.twObject.id, tile);
        group.add(tile);

        const active = x > 0 && x < 3 && z > 0 && z < 3;
        const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(tileSize - 0.18, 0.12, tileSize - 0.18));
        const edge = new THREE.LineSegments(edges, active
          ? new THREE.LineBasicMaterial({ color: COLORS.rose, transparent: true, opacity: 0.76 })
          : lineMat);
        edge.position.copy(tile.position);
        group.add(edge);
      }
    }
    return group;
  }

  buildVoxelCity() {
    const group = new THREE.Group();
    const typeColor = {
      river: COLORS.water,
      park: COLORS.leaf,
      urban: COLORS.sakuraLight,
      dense: COLORS.sakuraMid,
      tall: COLORS.sakuraHot,
      hill: COLORS.hill,
    };
    const geom = new THREE.BoxGeometry(CELL * 0.86, 1, CELL * 0.86);
    const buckets = {};
    this.terrain.forEach((row, z) => row.forEach((cell, x) => {
      const h = Math.max(cell.h, cell.type === 'river' ? 0 : 1);
      const levels = cell.type === 'river' ? 1 : h;
      if (!buckets[cell.type]) buckets[cell.type] = [];
      for (let y = 0; y < levels; y++) {
        buckets[cell.type].push({ x, y, z, h });
      }
    }));

    const dummy = new THREE.Object3D();
    Object.entries(buckets).forEach(([type, cells]) => {
      const glassProfile = {
        river: { opacity: 0.58, transmission: 0.44, roughness: 0.12, emissiveIntensity: 0.1 },
        park: { opacity: 0.72, transmission: 0.2, roughness: 0.26, emissiveIntensity: 0.03 },
        urban: { opacity: 0.82, transmission: 0.22, roughness: 0.22, emissiveIntensity: 0.055 },
        dense: { opacity: 0.84, transmission: 0.2, roughness: 0.22, emissiveIntensity: 0.075 },
        tall: { opacity: 0.88, transmission: 0.18, roughness: 0.2, emissiveIntensity: 0.12 },
        hill: { opacity: 0.72, transmission: 0.16, roughness: 0.34, emissiveIntensity: 0.025 },
      }[type];
      const mesh = new THREE.InstancedMesh(geom, makeMat(typeColor[type], {
        glass: true,
        ...glassProfile,
        emissive: type === 'river' ? COLORS.water : typeColor[type],
        depthWrite: true,
      }), cells.length);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      cells.forEach((cell, i) => {
        const [wx, wz] = gridToWorld(cell.x, cell.z);
        dummy.position.set(wx, type === 'river' ? -0.08 : cell.y + 0.5, wz);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        const shade = 0.94 + Math.min(0.2, cell.y / Math.max(cell.h, 1) * 0.16);
        mesh.setColorAt(i, new THREE.Color(typeColor[type]).multiplyScalar(shade));
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
      group.add(mesh);
    });

    const tower = box(CELL * 0.9, 14, CELL * 0.9, '#F58CA5', {
      glass: true,
      opacity: 0.76,
      transmission: 0.2,
      roughness: 0.18,
      emissive: '#F596AA',
      emissiveIntensity: 0.16,
      depthWrite: true,
    });
    const [twx, twz] = gridToWorld(21, 17);
    tower.position.set(twx, 7.2, twz);
    tower.userData.twObject = {
      id: 'taipei-101',
      name: 'Taipei 101 Voxel Tower',
      type: 'Landmark',
      layer: 'Voxel city',
      status: 'reference',
      freshness: 'static',
      summary: '城市量體的視覺錨點，用於維持臺北微縮模型的方位感。',
      properties: ['height: 14 voxel', 'material: sakura crystal', 'role: visual anchor'],
      relationships: ['near Train R22', 'inside Taipei core chunk'],
    };
    this.clickables.push(tower);
    this.registerAnchor('taipei-101', tower);
    group.add(tower);
    return group;
  }

  makeCurve(points) {
    return new THREE.CatmullRomCurve3(points.map(([gx, gz]) => {
      const [wx, wz] = gridToWorld(gx, gz);
      return new THREE.Vector3(wx, this.heightAt(gx, gz) + 1.05, wz);
    }), false, 'catmullrom', 0.42);
  }

  buildMrtLayer() {
    const group = new THREE.Group();
    const lines = [
      { name: '淡水信義線', color: '#E3002C', objectId: 'train-R22', pts: [[3, 2], [6, 5], [9, 8], [12, 11], [14, 14], [17, 16], [21, 17]] },
      { name: '板南線', color: '#0070BD', objectId: 'station-BL12', pts: [[4, 15], [8, 15], [12, 14], [16, 14], [20, 14], [25, 14], [28, 14]] },
      { name: '松山新店線', color: '#008659', objectId: 'station-BL12', pts: [[23, 8], [19, 10], [15, 12], [12, 16], [12, 21], [12, 27]] },
    ];

    lines.forEach((line, lineIndex) => {
      const curve = this.makeCurve(line.pts);
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 84, 0.13, 6, false),
        makeMat(line.color, {
          glass: true,
          opacity: 0.84,
          transmission: 0.22,
          roughness: 0.2,
          emissive: line.color,
          emissiveIntensity: 0.24,
          depthWrite: true,
        }),
      );
      group.add(tube);

      line.pts.forEach(([gx, gz], i) => {
        if (i % 2 !== 0 && i !== line.pts.length - 1) return;
        const object = ontologyObjects.find((item) => item.id === line.objectId) ?? ontologyObjects[1];
        const [wx, wz] = gridToWorld(gx, gz);
        const station = box(0.9, 0.76, 0.9, '#FFFFFF', {
          glass: true,
          opacity: 0.82,
          transmission: 0.5,
          roughness: 0.16,
          emissive: line.color,
          emissiveIntensity: 0.32,
          depthWrite: true,
        });
        station.position.set(wx, this.heightAt(gx, gz) + 1.45, wz);
        station.userData.twObject = object;
        this.clickables.push(station);
        this.registerAnchor(object.id, station);
        group.add(station);
      });

      for (let i = 0; i < 2; i++) {
        const train = this.makeTrain(line.color);
        train.userData.twObject = ontologyObjects.find((item) => item.id === 'train-R22');
        this.clickables.push(train);
        if (i === 0 && lineIndex === 0) this.registerAnchor('train-R22', train);
        this.trains.push({ mesh: train, curve, progress: (i / 2 + lineIndex * 0.17) % 1, speed: 0.035 + lineIndex * 0.006 });
        group.add(train);
      }
    });
    return group;
  }

  makeTrain(color) {
    const group = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const car = box(0.78, 0.56, 1.18, color, {
        glass: true,
        opacity: 0.82,
        transmission: 0.32,
        roughness: 0.2,
        emissive: color,
        emissiveIntensity: 0.14,
        depthWrite: true,
      });
      car.position.z = (i - 1) * 1.26;
      const roof = box(0.8, 0.08, 1.12, '#FFFFFF', {
        glass: true,
        opacity: 0.78,
        transmission: 0.58,
        roughness: 0.12,
        depthWrite: true,
      });
      roof.position.set(0, 0.34, car.position.z);
      group.add(car, roof);
    }
    return group;
  }

  buildRainLayer() {
    const group = new THREE.Group();
    const rng = makeRng(142);
    for (let z = 0; z < 6; z++) {
      for (let x = 0; x < 6; x++) {
        const gx = x * 4.2 + 3;
        const gz = z * 4.2 + 3;
        const [wx, wz] = gridToWorld(gx, gz);
        const base = this.heightAt(gx, gz) + 1.2;
        const h = 1.2 + rng() * 6 * (1.35 - z / 7);
        const bar = box(5.4, 1, 5.4, COLORS.water, {
          glass: true,
          opacity: 0.28,
          transmission: 0.68,
          roughness: 0.08,
          emissive: '#81C7D4',
          emissiveIntensity: 0.12,
        });
        bar.position.set(wx, base + h / 2, wz);
        bar.scale.y = h;
        bar.userData = { base, baseHeight: h, phase: rng() * Math.PI * 2, twObject: ontologyObjects[2] };
        this.rainBars.push(bar);
        this.clickables.push(bar);
        if (x === 2 && z === 2) this.registerAnchor('rain-R042', bar);
        group.add(bar);
      }
    }
    return group;
  }

  buildPm25Layer() {
    const group = new THREE.Group();
    const rng = makeRng(888);
    for (let i = 0; i < 54; i++) {
      const gx = 7 + rng() * 20;
      const gz = 8 + rng() * 17;
      const [wx, wz] = gridToWorld(gx, gz);
      const puff = box(0.55 + rng() * 0.5, 0.55 + rng() * 0.5, 0.55 + rng() * 0.5, rng() > 0.55 ? COLORS.gold : '#F7D94C', {
        glass: true,
        opacity: 0.44,
        transmission: 0.36,
        roughness: 0.24,
        emissive: '#FFD966',
        emissiveIntensity: 0.1,
      });
      puff.position.set(wx, this.heightAt(gx, gz) + 2.2 + rng() * 5, wz);
      puff.userData = { phase: rng() * Math.PI * 2, drift: 0.2 + rng() * 0.5, twObject: ontologyObjects[3] };
      this.pmPuffs.push(puff);
      this.clickables.push(puff);
      group.add(puff);
    }

    [[9, 18], [18, 12], [24, 19]].forEach(([gx, gz]) => {
      const [wx, wz] = gridToWorld(gx, gz);
      const sensor = box(0.78, 4.2, 0.78, COLORS.gold, {
        glass: true,
        opacity: 0.78,
        transmission: 0.28,
        roughness: 0.2,
        emissive: COLORS.gold,
        emissiveIntensity: 0.18,
        depthWrite: true,
      });
      sensor.position.set(wx, this.heightAt(gx, gz) + 2.1, wz);
      sensor.userData.twObject = ontologyObjects[3];
      this.clickables.push(sensor);
      if (!this.objectAnchors.has('aq-A07')) this.registerAnchor('aq-A07', sensor);
      group.add(sensor);
    });
    return group;
  }

  buildIncidentLayer() {
    const group = new THREE.Group();
    [[15, 14], [21, 16], [10, 17]].forEach(([gx, gz], index) => {
      const [wx, wz] = gridToWorld(gx, gz);
      const marker = new THREE.Group();
      for (let y = 0; y < 3; y++) {
        const m = box(0.92 - y * 0.08, 0.52, 0.92 - y * 0.08, y === 1 ? COLORS.fuji : COLORS.rose, {
          glass: true,
          opacity: 0.82,
          transmission: 0.24,
          roughness: 0.2,
          emissive: y === 1 ? COLORS.fuji : COLORS.rose,
          emissiveIntensity: 0.2,
          depthWrite: true,
        });
        m.position.y = y * 0.58;
        marker.add(m);
      }
      marker.position.set(wx, this.heightAt(gx, gz) + 1.4, wz);
      marker.userData = { phase: index * 1.3, twObject: ontologyObjects[4] };
      this.incidentMarkers.push(marker);
      this.clickables.push(marker);
      if (index === 0) this.registerAnchor('incident-I237', marker);
      group.add(marker);
    });
    return group;
  }

  buildPipelineMiniature() {
    const group = new THREE.Group();
    const keys = ['tiles', 'chunks', 'observations', 'ontology', 'voxels'];
    const colors = [COLORS.skyDeep, COLORS.water, COLORS.gold, COLORS.fuji, COLORS.rose];
    keys.forEach((key, index) => {
      const node = box(2.1, 0.75 + index * 0.14, 2.1, colors[index], {
        glass: true,
        opacity: 0.78,
        transmission: 0.34,
        roughness: 0.18,
        emissive: colors[index],
        emissiveIntensity: 0.08,
        depthWrite: true,
      });
      node.position.set(-22 + index * 5.3, 1.1 + index * 0.08, 31.5);
      node.userData = {
        pipelineKey: key,
        twObject: {
          id: `pipeline-${key}`,
          name: key,
          type: 'Pipeline stage',
          layer: 'MapLibre-ready architecture',
          status: key === this.pipelineFocus ? 'focused' : 'ready',
          freshness: 'prototype state',
          summary: '從 geospatial viewport 到 voxel entity 的概念節點，可對應 README 的設計 reasoning。',
          properties: ['mock only', 'no MapLibre API call', 'frontend projection'],
          relationships: ['feeds next stage', 'keeps ontology before rendering'],
        },
      };
      this.pipelineNodes[key] = node;
      this.clickables.push(node);
      this.registerAnchor(`pipeline-${key}`, node);
      group.add(node);

      if (index > 0) {
        const prev = this.pipelineNodes[keys[index - 1]].position;
        const points = [new THREE.Vector3(prev.x + 1.2, prev.y, prev.z), new THREE.Vector3(node.position.x - 1.2, node.position.y, node.position.z)];
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: COLORS.rose, transparent: true, opacity: 0.5 }));
        group.add(line);
      }
    });
    return group;
  }

  buildAvatar() {
    const group = new THREE.Group();
    const [wx, wz] = gridToWorld(16, 19);
    const body = box(0.85, 0.95, 0.85, '#FFF9FB', {
      glass: true,
      opacity: 0.84,
      transmission: 0.48,
      roughness: 0.15,
      emissive: COLORS.sakuraMid,
      emissiveIntensity: 0.22,
      depthWrite: true,
    });
    const head = box(0.64, 0.64, 0.64, COLORS.sakuraHot, {
      glass: true,
      opacity: 0.82,
      transmission: 0.34,
      roughness: 0.18,
      emissive: COLORS.sakuraHot,
      emissiveIntensity: 0.14,
      depthWrite: true,
    });
    body.position.y = 0.48;
    head.position.y = 1.28;
    group.add(body, head);
    group.position.set(wx, this.heightAt(16, 19) + 1.05, wz);
    group.userData.twObject = {
      id: 'avatar-local-context',
      name: 'Voxel Avatar',
      type: 'Avatar Context',
      layer: 'Local context',
      status: 'watching',
      freshness: 'cursor state',
      summary: '玩家位置用來查附近站點、列車、雨量、PM2.5、incident 與路線風險。',
      properties: ['nearby stations: 2', 'rain: light', 'pm2.5: watch', 'incidents: 1'],
      relationships: ['near AQMS A-07', 'near Incident I-237', 'inside visible chunk'],
    };
    this.clickables.push(group);
    this.registerAnchor('avatar-local-context', group);
    return group;
  }

  buildPetals() {
    const group = new THREE.Group();
    const rng = makeRng(777);
    const geo = new THREE.PlaneGeometry(0.36, 0.24);
    const cols = ['#FFB7C5', '#FF95B5', '#FFD6E4', '#FFE4EE', '#F596AA'];
    for (let i = 0; i < 180; i++) {
      const petal = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        color: cols[Math.floor(rng() * cols.length)],
        transparent: true,
        opacity: 0.46 + rng() * 0.34,
        side: THREE.DoubleSide,
      }));
      const spread = GRID * CELL * 0.72;
      petal.position.set((rng() - 0.5) * spread * 2, rng() * 23 + 4, (rng() - 0.5) * spread * 2);
      petal.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
      petal.userData = {
        vx: (rng() - 0.5) * 0.018,
        vy: -(0.012 + rng() * 0.016),
        vz: (rng() - 0.5) * 0.018,
        phase: rng() * Math.PI * 2,
      };
      this.petals.push(petal);
      group.add(petal);
    }
    return group;
  }

  bindEvents() {
    this.onResize = () => this.resize();
    this.onPointerMove = (event) => this.updatePointer(event);
    this.onClick = (event) => this.handleClick(event);
    window.addEventListener('resize', this.onResize);
    this.renderer.domElement.addEventListener('pointermove', this.onPointerMove);
    this.renderer.domElement.addEventListener('click', this.onClick);
  }

  registerAnchor(id, object3d) {
    if (!id || this.objectAnchors.has(id)) return;
    this.objectAnchors.set(id, object3d);
  }

  updatePointer(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  handleClick(event) {
    this.updatePointer(event);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.clickables, true);
    const hit = hits.find((item) => {
      let obj = item.object;
      while (obj) {
        if (obj.userData?.twObject || obj.userData?.pipelineKey) return true;
        obj = obj.parent;
      }
      return false;
    });
    if (!hit) return;

    let obj = hit.object;
    while (obj && !obj.userData?.twObject && !obj.userData?.pipelineKey) obj = obj.parent;
    const selected = obj.userData.twObject;
    this.setSelected(obj, selected);
    if (obj.userData.pipelineKey) this.applyPipelineFocus(obj.userData.pipelineKey);
    this.callbacks.onSelect?.(selected);
  }

  setSelected(mesh, object) {
    if (this.selected?.material?.emissiveIntensity !== undefined) {
      this.selected.material.emissiveIntensity = this.selected.userData.previousEmissive ?? this.selected.material.emissiveIntensity;
    }
    this.selected = mesh;
    if (mesh.material?.emissiveIntensity !== undefined) {
      mesh.userData.previousEmissive = mesh.material.emissiveIntensity;
      mesh.material.emissive = new THREE.Color(COLORS.gold);
      mesh.material.emissiveIntensity = 0.55;
    }
    this.focusMesh(mesh, 0.35);
  }

  focusObject(id) {
    const anchor = this.objectAnchors.get(id);
    if (!anchor) return;
    this.setSelected(anchor, anchor.userData?.twObject);
    this.focusMesh(anchor, 1);
  }

  focusMesh(mesh, mix = 1) {
    const position = new THREE.Vector3();
    mesh.getWorldPosition(position);
    const target = position.clone();
    target.y = Math.max(1.4, position.y * 0.45);
    this.controls.target.lerp(target, mix);

    const offset = new THREE.Vector3(28, 26, 34);
    const desired = target.clone().add(offset);
    this.camera.position.lerp(desired, Math.min(1, mix * 0.85));
    this.controls.update();
  }

  setLayer(key, visible) {
    this.layerVisibility[key] = visible;
    if (key === 'tiles' && this.layers.tiles) this.layers.tiles.visible = visible;
    if (this.layers[key]) this.layers[key].visible = visible;
  }

  setTime(minutes) {
    this.worldMinutes = minutes;
    this.updateSkyForTime(minutes);
  }

  applyPipelineFocus(key) {
    this.pipelineFocus = key;
    Object.entries(this.pipelineNodes).forEach(([nodeKey, mesh]) => {
      const focused = nodeKey === key;
      mesh.scale.setScalar(focused ? 1.22 : 1);
      mesh.material.emissiveIntensity = focused ? 0.52 : 0.08;
    });
  }

  resize() {
    const { clientWidth, clientHeight } = this.container;
    this.camera.aspect = clientWidth / Math.max(clientHeight, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(clientWidth, clientHeight);
  }

  animate() {
    this.frame = requestAnimationFrame(() => this.animate());
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;
    const daylight = this.updateSkyForTime(this.worldMinutes);

    this.trains.forEach((train) => {
      train.progress = (train.progress + dt * train.speed * (0.75 + daylight * 0.6)) % 1;
      const p = train.curve.getPointAt(train.progress);
      const p2 = train.curve.getPointAt((train.progress + 0.01) % 1);
      train.mesh.position.copy(p);
      train.mesh.rotation.y = Math.atan2(p2.x - p.x, p2.z - p.z);
    });

    this.rainBars.forEach((bar) => {
      const h = bar.userData.baseHeight * (0.74 + Math.sin(t * 1.2 + bar.userData.phase) * 0.12 + daylight * 0.08);
      bar.scale.y = Math.max(0.4, h);
      bar.position.y = bar.userData.base + Math.max(0.4, h) / 2;
    });

    this.pmPuffs.forEach((puff) => {
      puff.position.x += Math.sin(t + puff.userData.phase) * 0.002 * puff.userData.drift;
      puff.position.z += Math.cos(t * 0.8 + puff.userData.phase) * 0.002 * puff.userData.drift;
      puff.rotation.y += dt * 0.3;
    });

    this.incidentMarkers.forEach((marker) => {
      const pulse = 1 + Math.sin(t * 3 + marker.userData.phase) * 0.12;
      marker.scale.set(pulse, 1 + (pulse - 1) * 0.4, pulse);
    });

    this.petals.forEach((petal) => {
      petal.position.x += petal.userData.vx + Math.sin(t + petal.userData.phase) * 0.01;
      petal.position.y += petal.userData.vy;
      petal.position.z += petal.userData.vz;
      petal.rotation.x += dt * 0.9;
      petal.rotation.z += dt * 0.7;
      if (petal.position.y < 1) petal.position.y = 24;
    });

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  updateSkyForTime(minutes) {
    const hour = (minutes % 1440) / 60;
    const daylight = Math.max(0, Math.sin((hour - 5.6) / 13.8 * Math.PI));
    const dawn = Math.max(0, 1 - Math.abs(hour - 6.2) / 2.2);
    const dusk = Math.max(0, 1 - Math.abs(hour - 18.2) / 2.5);
    const twilight = Math.max(dawn, dusk);
    const night = Math.max(0, 1 - daylight - twilight * 0.28);

    const daySky = new THREE.Color('#78C8F8');
    const noonSky = new THREE.Color('#50B0FF');
    const sunsetSky = new THREE.Color('#F8BBD0');
    const nightSky = new THREE.Color('#16244A');
    const sky = nightSky.clone().lerp(daySky, daylight).lerp(noonSky, Math.max(0, daylight - 0.72) * 0.5).lerp(sunsetSky, twilight * 0.48);
    this.scene.background = sky;

    const fog = new THREE.Color('#2C3260').lerp(new THREE.Color(COLORS.sakuraMist), daylight).lerp(new THREE.Color('#F8C5D6'), twilight * 0.35);
    this.scene.fog.color.copy(fog);
    this.scene.fog.density = 0.006 + night * 0.007 + twilight * 0.002;

    this.ambient.color.set(new THREE.Color('#AFC8FF').lerp(new THREE.Color('#FFF7FA'), daylight).lerp(new THREE.Color('#FFD6E4'), twilight * 0.35));
    this.ambient.intensity = 0.54 + daylight * 0.78 + twilight * 0.2;
    this.hemi.color.set(new THREE.Color('#A7C4FF').lerp(new THREE.Color('#EAF8FF'), daylight));
    this.hemi.groundColor.set(new THREE.Color('#382D5C').lerp(new THREE.Color('#FFD7E6'), daylight));
    this.hemi.intensity = 0.34 + daylight * 0.48;
    this.sun.color.set(new THREE.Color('#F8A7C4').lerp(new THREE.Color('#FFFAF8'), daylight));
    this.sun.intensity = 0.18 + daylight * 1.58 + twilight * 0.42;
    this.roseFill.intensity = 0.2 + twilight * 0.62 + daylight * 0.18;
    this.renderer.toneMappingExposure = 0.92 + daylight * 0.28 + twilight * 0.08;

    return Math.max(0.2, daylight);
  }

  destroy() {
    cancelAnimationFrame(this.frame);
    window.removeEventListener('resize', this.onResize);
    this.renderer.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.renderer.domElement.removeEventListener('click', this.onClick);
    this.renderer.dispose();
    this.container.innerHTML = '';
  }
}
