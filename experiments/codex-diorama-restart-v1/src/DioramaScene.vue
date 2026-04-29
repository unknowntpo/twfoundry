<template>
  <canvas ref="canvasEl" class="diorama-canvas" @pointermove="onPointerMove" @pointerleave="onPointerLeave" @click="onClick" />
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as THREE from 'three';
import { palette, routeStops } from './mockData';

const props = defineProps({
  worldTime: { type: Number, required: true },
  selectedId: { type: String, default: null }
});

const emit = defineEmits(['hover-object', 'select-object']);

const canvasEl = ref(null);
const pointer = new THREE.Vector2(4, 4);
const clickable = [];
const stationMeshes = new Map();

let renderer;
let scene;
let camera;
let raycaster;
let trainGroup;
let routeGroup;
let animationFrame;
let hoveredMesh = null;

const materials = {};

function makeMaterial(name, color, options = {}) {
  materials[name] = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.72,
    metalness: 0.02,
    ...options
  });
}

function cube(name, size, position, material, objectId = null) {
  const geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (objectId) {
    mesh.userData.objectId = objectId;
    clickable.push(mesh);
  }
  scene.add(mesh);
  return mesh;
}

function addCubeToGroup(group, name, size, position, material, objectId = null) {
  const geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (objectId) {
    mesh.userData.objectId = objectId;
    clickable.push(mesh);
  }
  group.add(mesh);
  return mesh;
}

function setupMaterials() {
  makeMaterial('plinthTop', palette.plinthTop);
  makeMaterial('plinthSide', palette.plinthSide);
  makeMaterial('grass', palette.leafSoft);
  makeMaterial('grassHi', palette.leafPale);
  makeMaterial('leaf', palette.leafSpring);
  makeMaterial('water', palette.waterSoft, { transparent: true, opacity: 0.86 });
  makeMaterial('rail', palette.railRed, { emissive: palette.sakuraAction, emissiveIntensity: 0.18 });
  makeMaterial('station', palette.fujiVivid);
  makeMaterial('train', palette.sunnyFlower, { emissive: palette.sunnyGold, emissiveIntensity: 0.12 });
  makeMaterial('roof', palette.sakuraPop);
  makeMaterial('building', '#f3ead7');
  makeMaterial('trunk', '#8a6948');
  makeMaterial('sakura', palette.sakuraMist);
  makeMaterial('sensor', palette.sunnyGold, { emissive: palette.sunnyGold, emissiveIntensity: 0.1 });
  makeMaterial('incident', palette.sakuraAction, { emissive: palette.sakuraAction, emissiveIntensity: 0.28 });
  makeMaterial('rain', palette.skyPale, { transparent: true, opacity: 0.22 });
  makeMaterial('haze', '#ffd87a', { transparent: true, opacity: 0.16 });
}

function setupBase() {
  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(7.8, 8.4, 0.18, 48),
    new THREE.MeshStandardMaterial({ color: '#f0d9bd', roughness: 0.82 })
  );
  table.position.y = -0.9;
  table.receiveShadow = true;
  scene.add(table);

  cube('thick tabletop plinth', [12, 0.72, 8], [0, -0.36, 0], materials.plinthSide);
  cube('soft grass slab', [11.3, 0.28, 7.3], [0, 0.14, 0], materials.grass);

  for (let x = -5; x <= 5; x += 1) {
    for (let z = -3; z <= 3; z += 1) {
      if ((x + z) % 4 === 0) {
        cube('raised terrain voxel', [0.92, 0.12, 0.92], [x, 0.34, z], materials.grassHi);
      }
    }
  }
}

function setupRiver() {
  const river = [
    [-5, 2.5], [-4, 2.2], [-3, 1.9], [-2, 1.8], [-1, 1.6], [0, 1.3],
    [1, 1.0], [2, 0.7], [3, 0.5], [4, 0.2], [5, -0.1]
  ];
  river.forEach(([x, z], index) => {
    cube(`river voxel ${index}`, [1.08, 0.13, 0.72], [x, 0.43, z], materials.water, 'rain-r03');
  });

  const rain = cube('rainfall voxel volume', [2.6, 2.2, 1.5], [-1.1, 1.62, 1.4], materials.rain, 'rain-r03');
  rain.castShadow = false;
}

function setupRail() {
  routeGroup = new THREE.Group();
  scene.add(routeGroup);

  routeStops.forEach((stop, index) => {
    if (index < routeStops.length - 1) {
      const next = routeStops[index + 1];
      const dx = next.x - stop.x;
      const dz = next.z - stop.z;
      const length = Math.sqrt(dx * dx + dz * dz);
      const rail = addCubeToGroup(
        routeGroup,
        `rail segment ${index}`,
        [length, 0.16, 0.18],
        [(stop.x + next.x) / 2, 0.72, (stop.z + next.z) / 2],
        materials.rail,
        'route-tamsui-xinyi'
      );
      rail.rotation.y = -Math.atan2(dz, dx);
    }
  });

  routeStops.forEach((stop) => {
    const station = addCubeToGroup(
      routeGroup,
      stop.name,
      [0.45, 0.36, 0.45],
      [stop.x, 0.86, stop.z],
      materials.station,
      stop.id === 'station-yuanshan' ? 'station-yuanshan' : 'route-tamsui-xinyi'
    );
    stationMeshes.set(stop.id, station);

    addCubeToGroup(routeGroup, `${stop.name} roof`, [0.58, 0.12, 0.58], [stop.x, 1.1, stop.z], materials.roof);
  });
}

function setupTrain() {
  trainGroup = new THREE.Group();
  trainGroup.userData.objectId = 'train-r22';
  clickable.push(trainGroup);

  addCubeToGroup(trainGroup, 'train body', [0.7, 0.34, 0.38], [0, 0, 0], materials.train, 'train-r22');
  addCubeToGroup(trainGroup, 'train head notch', [0.18, 0.2, 0.44], [0.43, 0.02, 0], materials.rail, 'train-r22');
  trainGroup.position.y = 1.08;
  scene.add(trainGroup);
}

function setupCityDetails() {
  const buildings = [
    [-4.4, -0.1, 0.9], [-3.4, 0.4, 1.2], [-2.2, -1.8, 0.8], [0.7, -1.4, 1.1],
    [1.8, -0.7, 0.75], [2.9, -1.8, 1.25], [4.1, 0.8, 0.9]
  ];
  buildings.forEach(([x, z, h], index) => {
    cube(`low building ${index}`, [0.64, h, 0.64], [x, 0.5 + h / 2, z], materials.building);
    cube(`low building roof ${index}`, [0.72, 0.13, 0.72], [x, 1.04 + h, z], index % 2 ? materials.fujiVivid || materials.station : materials.roof);
  });

  const trees = [
    [-5, -2.5, 'leaf'], [-4.2, -1.9, 'sakura'], [-2.8, 2.8, 'leaf'], [-0.4, -2.6, 'leaf'],
    [1.7, 2.9, 'sakura'], [3.5, 2.5, 'leaf'], [5, -2.5, 'sakura']
  ];
  trees.forEach(([x, z, kind], index) => {
    cube(`tree trunk ${index}`, [0.18, 0.44, 0.18], [x, 0.72, z], materials.trunk);
    cube(`tree crown ${index}`, [0.56, 0.56, 0.56], [x, 1.18, z], materials[kind]);
  });

  cube('AQMS sensor tower', [0.34, 1.1, 0.34], [-0.4, 0.95, -0.9], materials.sensor, 'aqms-datong');
  cube('PM2.5 soft haze', [1.7, 1.3, 1.2], [-0.3, 1.24, -0.8], materials.haze, 'aqms-datong').castShadow = false;
  cube('incident marker', [0.4, 0.82, 0.4], [1.65, 0.9, 0.05], materials.incident, 'incident-i042');
}

function getTrainSample(time) {
  const t = (time / 100) * (routeStops.length - 1);
  const index = Math.min(Math.floor(t), routeStops.length - 2);
  const local = t - index;
  const a = routeStops[index];
  const b = routeStops[index + 1];
  return {
    x: a.x + (b.x - a.x) * local,
    z: a.z + (b.z - a.z) * local,
    angle: -Math.atan2(b.z - a.z, b.x - a.x)
  };
}

function updateTrain() {
  if (!trainGroup) return;
  const sample = getTrainSample(props.worldTime);
  trainGroup.position.x = sample.x;
  trainGroup.position.z = sample.z;
  trainGroup.rotation.y = sample.angle;
}

function updateSelection() {
  stationMeshes.forEach((mesh, id) => {
    const active = props.selectedId === 'station-yuanshan' && id === 'station-yuanshan';
    mesh.scale.setScalar(active ? 1.22 : 1);
  });
  if (trainGroup) {
    trainGroup.scale.setScalar(props.selectedId === 'train-r22' ? 1.18 : 1);
  }
}

function setupScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(palette.skyPale);
  scene.fog = new THREE.Fog(palette.skyPale, 12, 23);

  camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(8.2, 7.1, 8.4);
  camera.lookAt(0, 0.4, 0);

  renderer = new THREE.WebGLRenderer({ canvas: canvasEl.value, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  raycaster = new THREE.Raycaster();
  setupMaterials();

  const ambient = new THREE.HemisphereLight(palette.skyPale, palette.leafSoft, 2.1);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(palette.sunnyFlower, 2.6);
  sun.position.set(4, 8, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun);

  setupBase();
  setupRiver();
  setupRail();
  setupTrain();
  setupCityDetails();
  resize();
  updateTrain();
  updateSelection();
}

function resize() {
  if (!renderer || !canvasEl.value) return;
  const rect = canvasEl.value.getBoundingClientRect();
  renderer.setSize(rect.width, rect.height, false);
  camera.aspect = rect.width / rect.height;
  camera.updateProjectionMatrix();
}

function animate() {
  animationFrame = requestAnimationFrame(animate);
  if (routeGroup) routeGroup.rotation.y = Math.sin(Date.now() * 0.00035) * 0.012;
  updateTrain();
  renderer.render(scene, camera);
}

function pickObject(event) {
  const rect = canvasEl.value.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(clickable, true);
  return hits.find((hit) => hit.object.userData.objectId || hit.object.parent?.userData.objectId);
}

function setHover(mesh) {
  if (hoveredMesh === mesh) return;
  if (hoveredMesh) hoveredMesh.scale.setScalar(1);
  hoveredMesh = mesh;
  if (hoveredMesh) hoveredMesh.scale.setScalar(1.12);
}

function onPointerMove(event) {
  const hit = pickObject(event);
  if (!hit) {
    setHover(null);
    canvasEl.value.style.cursor = 'default';
    emit('hover-object', null);
    return;
  }
  const objectId = hit.object.userData.objectId || hit.object.parent?.userData.objectId;
  setHover(hit.object);
  canvasEl.value.style.cursor = 'pointer';
  emit('hover-object', objectId);
}

function onPointerLeave() {
  setHover(null);
  canvasEl.value.style.cursor = 'default';
  emit('hover-object', null);
}

function onClick(event) {
  const hit = pickObject(event);
  if (!hit) return;
  const objectId = hit.object.userData.objectId || hit.object.parent?.userData.objectId;
  emit('select-object', objectId);
}

onMounted(() => {
  setupScene();
  window.addEventListener('resize', resize);
  animate();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize);
  cancelAnimationFrame(animationFrame);
  renderer?.dispose();
});

watch(() => props.worldTime, updateTrain);
watch(() => props.selectedId, updateSelection);
</script>
