<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createPm25Sensor, createStationAnchor, createWeatherCell } from './voxelEntities.js';

const props = defineProps({
  kind: {
    type: String,
    required: true,
  },
  debug: {
    type: Boolean,
    default: false,
  },
});

const previewEl = ref(null);
let renderer;
let scene;
let camera;
let controls;
let entity;
let frame = 0;

const builders = {
  station: () => createStationAnchor({ lineColor: '#0070BD', stationId: 'BL18', stationName: 'Taipei City Hall', debug: props.debug }),
  pm25: () => createPm25Sensor({ sensorId: 'AQMS A-07', value: 31, status: 'watch', debug: props.debug }),
  weather: () => createWeatherCell({ cellId: 'Rain Cell R-042', intensity: 38, trend: 'rising', debug: props.debug }),
};

function buildEntity() {
  if (!scene) return;
  if (entity) scene.remove(entity);
  entity = (builders[props.kind] ?? builders.station)();
  entity.scale.setScalar(props.kind === 'station' ? 2.4 : 1.55);
  entity.rotation.y = Math.PI * -0.18;
  scene.add(entity);
}

function resize() {
  if (!renderer || !previewEl.value) return;
  const rect = previewEl.value.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return;
  renderer.setSize(rect.width, rect.height, false);
  camera.aspect = rect.width / Math.max(rect.height, 1);
  camera.updateProjectionMatrix();
}

function animate() {
  frame = requestAnimationFrame(animate);
  const rect = previewEl.value?.getBoundingClientRect();
  if (!rect || rect.width < 1 || rect.height < 1) return;
  if (entity) entity.rotation.y += 0.005;
  controls?.update();
  renderer?.render(scene, camera);
}

onMounted(() => {
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#D8EEF8');
  camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120);
  camera.position.set(5.4, 4.8, 7.4);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  previewEl.value.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.9, 0);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 4.2;
  controls.maxDistance = 14;

  scene.add(new THREE.AmbientLight('#FFF7FA', 1.7));
  scene.add(new THREE.HemisphereLight('#D8EEF8', '#FFD2DC', 1.1));
  const sun = new THREE.DirectionalLight('#FFFFFF', 1.9);
  sun.position.set(5, 8, 4);
  sun.castShadow = true;
  scene.add(sun);

  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(6.2, 0.24, 5.2),
    new THREE.MeshLambertMaterial({ color: '#FEDFE1', emissive: '#FFD2DC', emissiveIntensity: 0.04 }),
  );
  plate.position.y = -0.22;
  plate.receiveShadow = true;
  scene.add(plate);

  buildEntity();
  resize();
  window.addEventListener('resize', resize);
  animate();
});

onBeforeUnmount(() => {
  cancelAnimationFrame(frame);
  window.removeEventListener('resize', resize);
  controls?.dispose();
  renderer?.dispose();
  renderer?.domElement?.remove();
});

watch(() => [props.kind, props.debug], buildEntity);
</script>

<template>
  <div ref="previewEl" class="ontology-preview" :aria-label="`${kind} voxel component preview`"></div>
</template>
