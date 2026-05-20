<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createProjectionObject } from './worldViewRenderModules.js';

const props = defineProps({
  projection: {
    type: Object,
    required: true,
  },
  chunk: {
    type: Object,
    required: true,
  },
  object: {
    type: Object,
    required: true,
  },
});

const previewEl = ref(null);
let renderer;
let scene;
let camera;
let controls;
let frame = 0;

function resize() {
  if (!renderer || !previewEl.value) return;
  const rect = previewEl.value.getBoundingClientRect();
  renderer.setSize(rect.width, rect.height, false);
  camera.aspect = rect.width / Math.max(rect.height, 1);
  camera.updateProjectionMatrix();
}

function animate() {
  frame = requestAnimationFrame(animate);
  controls?.update();
  renderer?.render(scene, camera);
}

onMounted(() => {
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#D8EEF8');
  scene.fog = new THREE.Fog('#D8EEF8', 22, 62);
  camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120);
  camera.position.set(7, 5.8, 8.4);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.setClearColor('#D8EEF8', 1);
  previewEl.value.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.2, 0);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 4.5;
  controls.maxDistance = 22;

  scene.add(new THREE.AmbientLight('#FFF7FA', 1.5));
  const sun = new THREE.DirectionalLight('#FFFFFF', 2.1);
  sun.position.set(5, 9, 4);
  sun.castShadow = true;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight('#D8EEF8', '#FFD2DC', 1.1));

  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(12, 0.28, 8),
    new THREE.MeshLambertMaterial({ color: '#FEDFE1', emissive: '#FFD2DC', emissiveIntensity: 0.04 }),
  );
  plate.position.y = -0.32;
  plate.receiveShadow = true;
  scene.add(plate);

  const projectionObject = createProjectionObject(props.projection, props.chunk, props.object);
  projectionObject.position.x -= 1.5;
  scene.add(projectionObject);

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
</script>

<template>
  <div ref="previewEl" class="render-module-preview" :aria-label="`${projection.renderModule} preview`"></div>
</template>
