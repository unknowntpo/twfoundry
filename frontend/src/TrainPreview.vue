<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createMrtTrain } from './voxelTrain.js';

const props = defineProps({
  lineColor: {
    type: String,
    default: '#E16B8C',
  },
  carCount: {
    type: Number,
    default: 4,
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
let train;
let frame = 0;

function buildPreviewTrain() {
  if (!scene) return;
  if (train) scene.remove(train);
  train = createMrtTrain({
    lineColor: props.lineColor,
    carCount: props.carCount,
    scale: 2.4,
    name: 'design system MRT train preview',
    debug: props.debug,
  });
  train.rotation.y = Math.PI * -0.12;
  scene.add(train);
}

function resize() {
  if (!renderer || !previewEl.value) return;
  const rect = previewEl.value.getBoundingClientRect();
  renderer.setSize(rect.width, rect.height, false);
  camera.aspect = rect.width / Math.max(rect.height, 1);
  camera.updateProjectionMatrix();
}

function animate() {
  frame = requestAnimationFrame(animate);
  if (train) {
    train.rotation.y += 0.004;
  }
  controls?.update();
  renderer?.render(scene, camera);
}

onMounted(() => {
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#78C8F8');
  scene.fog = new THREE.Fog('#D8EEF8', 28, 72);

  camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120);
  camera.position.set(7.8, 5.6, 9.4);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.setClearColor('#78C8F8', 1);
  previewEl.value.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.2, 0);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 5.5;
  controls.maxDistance = 22;

  scene.add(new THREE.AmbientLight('#FFF7FA', 1.6));
  const sun = new THREE.DirectionalLight('#FFFFFF', 2.2);
  sun.position.set(5, 9, 4);
  sun.castShadow = true;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight('#D8EEF8', '#FFD2DC', 1.2));

  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(15, 0.36, 8),
    new THREE.MeshLambertMaterial({ color: '#FEDFE1', emissive: '#FFD2DC', emissiveIntensity: 0.04 }),
  );
  plate.position.y = -1.05;
  plate.receiveShadow = true;
  scene.add(plate);

  buildPreviewTrain();
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

watch(() => [props.lineColor, props.carCount, props.debug], buildPreviewTrain);
</script>

<template>
  <div ref="previewEl" class="train-preview" aria-label="MRT voxel train preview"></div>
</template>
