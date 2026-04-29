<script setup lang="ts">
import * as THREE from "three";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { VoxelModuleKey } from "./modules";

const props = defineProps<{
  moduleKey: VoxelModuleKey;
}>();

const fallbackTiles = Array.from({ length: 30 }, (_, index) => index);
const host = ref<HTMLElement | null>(null);
let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.OrthographicCamera | null = null;
let frameId = 0;
let preview: PreviewScene | null = null;
let resizeObserver: ResizeObserver | null = null;

type PreviewScene = {
  root: THREE.Group;
  focus: THREE.Vector3;
  distance: number;
  tick: (elapsed: number) => void;
};

const color = {
  blossom: "#efb5c6",
  blossomStrong: "#dc7898",
  blue: "#4f93df",
  green: "#58aa72",
  gold: "#f6b23a",
  red: "#df3f53",
  mizu: "#8bcdd8",
  leaf: "#75bd85",
  fuji: "#8d83c7",
  ivory: "#fff9f3",
  stone: "#d8cfc6",
  sumi: "#2b2330",
};

function material(hex: string, transparent = false, opacity = 1) {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(hex),
    transparent,
    opacity,
  });
}

function cube(
  group: THREE.Group,
  hex: string,
  position: [number, number, number],
  scale: [number, number, number],
  transparent = false,
  opacity = 1,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material(hex, transparent, opacity));
  mesh.position.set(position[0], position[1], position[2]);
  mesh.scale.set(scale[0], scale[1], scale[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function barBetween(
  group: THREE.Group,
  start: THREE.Vector3,
  end: THREE.Vector3,
  hex: string,
  width = 0.16,
  height = 0.1,
) {
  const mid = start.clone().add(end).multiplyScalar(0.5);
  const delta = end.clone().sub(start);
  const length = Math.sqrt(delta.x * delta.x + delta.z * delta.z);
  const mesh = cube(group, hex, [mid.x, mid.y, mid.z], [width, height, length]);
  mesh.rotation.y = Math.atan2(delta.x, delta.z);
  return mesh;
}

function addBase(group: THREE.Group) {
  cube(group, color.ivory, [0, -0.08, 0], [6.8, 0.16, 4.4]);
  for (let x = -3; x <= 3; x += 1) {
    for (let z = -2; z <= 2; z += 1) {
      const shade = (x + z) % 2 === 0 ? "#f6d7e1" : "#f1c8d6";
      cube(group, shade, [x * 0.82, 0.04, z * 0.72], [0.76, 0.12, 0.66]);
    }
  }
}

function createTrainPreview(): PreviewScene {
  const root = new THREE.Group();
  addBase(root);
  barBetween(
    root,
    new THREE.Vector3(-2.8, 0.22, 0.65),
    new THREE.Vector3(2.8, 0.22, -0.3),
    color.blue,
    0.12,
    0.08,
  );
  const train = new THREE.Group();
  for (let index = 0; index < 3; index += 1) {
    const x = -0.95 + index * 0.72;
    cube(train, color.blue, [x, 0.48, 0], [0.62, 0.32, 0.34]);
    cube(train, color.ivory, [x, 0.7, -0.01], [0.5, 0.08, 0.3]);
    cube(train, color.ivory, [x - 0.16, 0.51, -0.18], [0.12, 0.1, 0.04]);
    cube(train, color.ivory, [x + 0.16, 0.51, -0.18], [0.12, 0.1, 0.04]);
  }
  cube(train, color.gold, [1.24, 0.5, -0.2], [0.1, 0.12, 0.05]);
  root.add(train);
  return {
    root,
    focus: new THREE.Vector3(0, 0.45, 0),
    distance: 6,
    tick(elapsed) {
      train.position.x = Math.sin(elapsed * 1.5) * 0.42;
      train.position.z = Math.sin(elapsed * 1.5) * -0.08;
    },
  };
}

function createRoutePreview(): PreviewScene {
  const root = new THREE.Group();
  addBase(root);
  const points = [
    new THREE.Vector3(-2.7, 0.26, 1.1),
    new THREE.Vector3(-1.4, 0.28, 0.45),
    new THREE.Vector3(-0.2, 0.3, 0.85),
    new THREE.Vector3(1.2, 0.33, -0.1),
    new THREE.Vector3(2.5, 0.34, -0.65),
  ];
  points.slice(0, -1).forEach((point, index) => {
    barBetween(
      root,
      point,
      points[index + 1],
      index % 2 === 0 ? color.red : color.gold,
      0.16,
      0.12,
    );
  });
  points.forEach((point, index) => {
    cube(
      root,
      index === 2 ? color.ivory : color.stone,
      [point.x, 0.48, point.z],
      [0.24, 0.24, 0.24],
    );
  });
  return {
    root,
    focus: new THREE.Vector3(0, 0.4, 0),
    distance: 6.6,
    tick() {},
  };
}

function createStationPreview(): PreviewScene {
  const root = new THREE.Group();
  addBase(root);
  barBetween(
    root,
    new THREE.Vector3(-2.2, 0.22, 0),
    new THREE.Vector3(2.2, 0.22, 0),
    color.green,
    0.14,
    0.1,
  );
  cube(root, "#f4dce5", [0, 0.36, 0], [0.92, 0.18, 0.72]);
  cube(root, color.green, [0, 0.52, 0], [0.52, 0.14, 0.5]);
  cube(root, color.ivory, [0, 0.68, 0], [0.34, 0.18, 0.34]);
  cube(root, color.blossomStrong, [0.38, 0.76, 0.26], [0.12, 0.12, 0.12]);
  return {
    root,
    focus: new THREE.Vector3(0, 0.45, 0),
    distance: 5.8,
    tick() {},
  };
}

function createSensorPreview(): PreviewScene {
  const root = new THREE.Group();
  addBase(root);
  cube(root, color.mizu, [-0.2, 0.34, 0], [0.42, 0.36, 0.42]);
  cube(root, color.ivory, [-0.2, 0.76, 0], [0.24, 0.48, 0.24]);
  const beacon = cube(root, color.leaf, [-0.2, 1.08, 0], [0.34, 0.18, 0.34]);
  const ring = cube(root, color.mizu, [-0.2, 0.2, 0], [1.4, 0.04, 1.4], true, 0.2);
  cube(root, color.gold, [1.1, 0.3, -0.6], [0.28, 0.24, 0.28]);
  cube(root, color.blue, [-1.2, 0.3, 0.7], [0.28, 0.24, 0.28]);
  return {
    root,
    focus: new THREE.Vector3(0, 0.62, 0),
    distance: 5.7,
    tick(elapsed) {
      beacon.scale.y = 0.18 + Math.sin(elapsed * 3) * 0.04;
      ring.material.opacity = 0.16 + Math.sin(elapsed * 2.4) * 0.06;
    },
  };
}

function createFieldPreview(): PreviewScene {
  const root = new THREE.Group();
  addBase(root);
  cube(root, color.mizu, [0, 0.78, 0], [4.2, 1.25, 2.6], true, 0.24);
  const drops: THREE.Mesh[] = [];
  for (let index = 0; index < 54; index += 1) {
    const x = -2 + (index % 9) * 0.5;
    const z = -1.2 + Math.floor(index / 9) * 0.48;
    const y = 0.6 + ((index * 37) % 20) / 10;
    drops.push(
      cube(
        root,
        index % 3 === 0 ? color.blue : color.mizu,
        [x, y, z],
        [0.08, 0.2, 0.08],
        true,
        0.72,
      ),
    );
  }
  return {
    root,
    focus: new THREE.Vector3(0, 0.7, 0),
    distance: 6.4,
    tick(elapsed) {
      drops.forEach((drop, index) => {
        drop.position.y = 0.42 + ((elapsed * 0.8 + index * 0.17) % 1.8);
      });
    },
  };
}

function createIncidentPreview(): PreviewScene {
  const root = new THREE.Group();
  addBase(root);
  const pulse = cube(root, color.red, [0, 0.66, 0], [1.85, 0.96, 1.4], true, 0.5);
  const core = cube(root, color.red, [0, 0.5, 0], [0.5, 0.5, 0.5]);
  const ring = cube(root, color.gold, [0, 0.2, 0], [2.45, 0.05, 2], true, 0.28);
  barBetween(
    root,
    new THREE.Vector3(-2.4, 0.25, -0.9),
    new THREE.Vector3(2.4, 0.25, 0.9),
    color.red,
    0.14,
    0.1,
  );
  return {
    root,
    focus: new THREE.Vector3(0, 0.55, 0),
    distance: 6.1,
    tick(elapsed) {
      const breathe = 0.5 + Math.sin(elapsed * 3) * 0.16;
      pulse.material.opacity = breathe;
      core.scale.setScalar(0.92 + Math.sin(elapsed * 4) * 0.08);
      ring.scale.setScalar(1 + Math.sin(elapsed * 2) * 0.08);
    },
  };
}

function createZonePreview(): PreviewScene {
  const root = new THREE.Group();
  cube(root, color.ivory, [0, -0.08, 0], [6.8, 0.16, 4.4]);
  for (let x = -3; x <= 3; x += 1) {
    for (let z = -2; z <= 2; z += 1) {
      const isPark = x < -1 && z < 1;
      const isCore = Math.abs(x) < 2 && Math.abs(z) < 2;
      const hex = isPark ? color.leaf : isCore ? color.blossom : color.stone;
      cube(
        root,
        hex,
        [x * 0.82, 0.1 + (isCore ? 0.08 : 0), z * 0.72],
        [0.76, isCore ? 0.28 : 0.14, 0.66],
      );
    }
  }
  cube(root, color.blossomStrong, [0, 0.66, 0], [0.72, 0.86, 0.72]);
  return {
    root,
    focus: new THREE.Vector3(0, 0.35, 0),
    distance: 6.9,
    tick() {},
  };
}

function createPreview(moduleKey: VoxelModuleKey) {
  if (moduleKey === "moving-object") {
    return createTrainPreview();
  }
  if (moduleKey === "route") {
    return createRoutePreview();
  }
  if (moduleKey === "station") {
    return createStationPreview();
  }
  if (moduleKey === "sensor") {
    return createSensorPreview();
  }
  if (moduleKey === "field-volume") {
    return createFieldPreview();
  }
  if (moduleKey === "incident-pulse") {
    return createIncidentPreview();
  }
  return createZonePreview();
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((item) => {
        item.dispose();
      });
    }
  });
}

function rebuildPreview() {
  if (!scene || !camera) {
    return;
  }
  if (preview) {
    scene.remove(preview.root);
    disposeObject(preview.root);
  }
  preview = createPreview(props.moduleKey);
  preview.root.scale.setScalar(1.12);
  scene.add(preview.root);
  camera.position.set(preview.distance * 0.58, preview.distance * 0.48, preview.distance * 0.62);
  camera.lookAt(preview.focus);
}

function resize() {
  if (!host.value || !renderer || !camera) {
    return;
  }
  const rect = host.value.getBoundingClientRect();
  const aspect = rect.width / Math.max(rect.height, 1);
  const frustum = 5.8;
  renderer.setSize(rect.width, rect.height, false);
  camera.left = (-frustum * aspect) / 2;
  camera.right = (frustum * aspect) / 2;
  camera.top = frustum / 2;
  camera.bottom = -frustum / 2;
  camera.updateProjectionMatrix();
}

function animate(start = performance.now()) {
  if (!renderer || !scene || !camera) {
    return;
  }
  const elapsed = (performance.now() - start) / 1000;
  preview?.tick(elapsed);
  scene.rotation.y = Math.sin(elapsed * 0.18) * 0.08;
  renderer.render(scene, camera);
  frameId = requestAnimationFrame(() => animate(start));
}

onMounted(() => {
  if (!host.value) {
    return;
  }

  scene = new THREE.Scene();
  scene.background = new THREE.Color("#94cfff");

  camera = new THREE.OrthographicCamera(-4, 4, 2.9, -2.9, 0.1, 100);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  host.value.appendChild(renderer.domElement);

  const hemi = new THREE.HemisphereLight("#fff7fb", "#b5968d", 2.2);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight("#fff4d8", 2.4);
  sun.position.set(3, 6, 4);
  sun.castShadow = true;
  scene.add(sun);

  rebuildPreview();
  resize();
  resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host.value);
  animate();
});

watch(() => props.moduleKey, rebuildPreview);

onBeforeUnmount(() => {
  cancelAnimationFrame(frameId);
  resizeObserver?.disconnect();
  if (preview) {
    disposeObject(preview.root);
  }
  renderer?.dispose();
  renderer?.domElement.remove();
});
</script>

<template>
  <div ref="host" class="voxel-preview" aria-hidden="true">
    <div class="fallback-world" :data-module="moduleKey">
      <span
        v-for="tile in fallbackTiles"
        :key="tile"
        class="fallback-tile"
        :style="{ '--tile-index': tile }"
      />
      <span class="fallback-route route-red" />
      <span class="fallback-route route-blue" />
      <span class="fallback-route route-green" />
      <span class="fallback-station station-a" />
      <span class="fallback-station station-b" />
      <span class="fallback-train train-a" />
      <span class="fallback-train train-b" />
      <span class="fallback-sensor" />
      <span class="fallback-field" />
      <span class="fallback-incident" />
      <span class="fallback-rain rain-a" />
      <span class="fallback-rain rain-b" />
      <span class="fallback-rain rain-c" />
    </div>
  </div>
</template>

<style scoped>
.voxel-preview {
  position: relative;
  min-height: 260px;
  width: 100%;
  overflow: hidden;
  border: 1px solid rgba(240, 191, 208, 0.7);
  border-radius: 18px;
  background:
    radial-gradient(circle at 50% 35%, rgba(255, 249, 243, 0.52), transparent 36%),
    linear-gradient(180deg, #8cc9ff 0%, #fbe5ec 100%);
}

.voxel-preview :deep(canvas) {
  display: block;
  height: 100%;
  width: 100%;
}

.fallback-world {
  position: absolute;
  inset: 18px;
  pointer-events: none;
  transform: rotateX(58deg) rotateZ(-38deg) translateY(16px);
  transform-style: preserve-3d;
}

.fallback-tile,
.fallback-route,
.fallback-station,
.fallback-train,
.fallback-sensor,
.fallback-field,
.fallback-incident,
.fallback-rain {
  position: absolute;
  display: block;
  transform-style: preserve-3d;
}

.fallback-tile {
  left: calc(20% + (var(--tile-index) % 6) * 10%);
  top: calc(18% + (var(--tile-index) / 6) * 12%);
  width: 9%;
  height: 10%;
  border: 1px solid rgba(139, 63, 89, 0.08);
  background: #efb5c6;
  box-shadow: 7px 7px 0 rgba(139, 63, 89, 0.12);
}

.fallback-route {
  height: 6px;
  border-radius: 999px;
  box-shadow: 0 5px 0 rgba(139, 63, 89, 0.16);
}

.route-red {
  left: 28%;
  top: 42%;
  width: 46%;
  background: #df3f53;
  transform: rotate(20deg);
}

.route-blue {
  left: 24%;
  top: 58%;
  width: 52%;
  background: #4f93df;
  transform: rotate(-16deg);
}

.route-green {
  left: 42%;
  top: 28%;
  width: 36%;
  background: #58aa72;
  transform: rotate(72deg);
}

.fallback-station {
  width: 20px;
  height: 20px;
  border: 4px solid #fff9f3;
  background: #d4a9b8;
  box-shadow: 5px 5px 0 rgba(139, 63, 89, 0.16);
}

.station-a {
  left: 38%;
  top: 47%;
}

.station-b {
  left: 62%;
  top: 50%;
}

.fallback-train {
  width: 80px;
  height: 24px;
  border: 4px solid #fff9f3;
  background: #4f93df;
  box-shadow: 7px 7px 0 rgba(43, 35, 48, 0.14);
}

.fallback-train::before {
  position: absolute;
  inset: 6px 10px;
  background: repeating-linear-gradient(90deg, #fff9f3 0 8px, transparent 8px 14px);
  content: "";
}

.train-a {
  left: 46%;
  top: 51%;
  transform: rotate(-16deg) translateZ(28px);
}

.train-b {
  left: 30%;
  top: 39%;
  background: #df3f53;
  transform: rotate(20deg) translateZ(28px);
}

.fallback-sensor {
  left: 69%;
  top: 32%;
  width: 18px;
  height: 66px;
  background: #8bcdd8;
  box-shadow: 6px 6px 0 rgba(43, 35, 48, 0.12);
  transform: translateZ(40px);
}

.fallback-sensor::after {
  position: absolute;
  top: -16px;
  left: -8px;
  width: 34px;
  height: 18px;
  border-radius: 999px;
  background: #75bd85;
  box-shadow: 0 0 20px rgba(117, 189, 133, 0.72);
  content: "";
}

.fallback-field {
  left: 20%;
  top: 25%;
  width: 58%;
  height: 46%;
  border: 1px solid rgba(139, 205, 216, 0.74);
  background: rgba(139, 205, 216, 0.26);
  box-shadow: 10px 10px 0 rgba(79, 147, 223, 0.12);
  transform: translateZ(18px);
}

.fallback-incident {
  left: 50%;
  top: 42%;
  width: 78px;
  height: 64px;
  background: rgba(223, 63, 83, 0.62);
  box-shadow:
    8px 8px 0 rgba(139, 63, 89, 0.16),
    0 0 28px rgba(223, 63, 83, 0.48);
  transform: translateZ(48px);
  animation: incident-breathe 1.35s ease-in-out infinite;
}

.fallback-rain {
  width: 9px;
  height: 24px;
  background: rgba(79, 147, 223, 0.72);
  transform: translateZ(76px);
  animation: rain-fall 900ms linear infinite;
}

.rain-a {
  left: 34%;
  top: 28%;
}

.rain-b {
  left: 52%;
  top: 22%;
  animation-delay: 160ms;
}

.rain-c {
  left: 63%;
  top: 38%;
  animation-delay: 320ms;
}

.fallback-world[data-module="moving-object"] .fallback-field,
.fallback-world[data-module="moving-object"] .fallback-incident,
.fallback-world[data-module="moving-object"] .fallback-sensor,
.fallback-world[data-module="moving-object"] .fallback-rain,
.fallback-world[data-module="route"] .fallback-field,
.fallback-world[data-module="route"] .fallback-incident,
.fallback-world[data-module="route"] .fallback-sensor,
.fallback-world[data-module="route"] .fallback-train,
.fallback-world[data-module="route"] .fallback-rain,
.fallback-world[data-module="station"] .fallback-field,
.fallback-world[data-module="station"] .fallback-incident,
.fallback-world[data-module="station"] .fallback-sensor,
.fallback-world[data-module="station"] .fallback-train,
.fallback-world[data-module="station"] .fallback-rain,
.fallback-world[data-module="sensor"] .fallback-field,
.fallback-world[data-module="sensor"] .fallback-incident,
.fallback-world[data-module="sensor"] .fallback-train,
.fallback-world[data-module="sensor"] .fallback-rain,
.fallback-world[data-module="field-volume"] .fallback-incident,
.fallback-world[data-module="field-volume"] .fallback-sensor,
.fallback-world[data-module="field-volume"] .fallback-train,
.fallback-world[data-module="incident-pulse"] .fallback-field,
.fallback-world[data-module="incident-pulse"] .fallback-sensor,
.fallback-world[data-module="incident-pulse"] .fallback-train,
.fallback-world[data-module="incident-pulse"] .fallback-rain,
.fallback-world[data-module="zone-chunk"] .fallback-field,
.fallback-world[data-module="zone-chunk"] .fallback-incident,
.fallback-world[data-module="zone-chunk"] .fallback-sensor,
.fallback-world[data-module="zone-chunk"] .fallback-train,
.fallback-world[data-module="zone-chunk"] .fallback-rain {
  display: none;
}

@keyframes incident-breathe {
  0%,
  100% {
    opacity: 0.56;
    transform: translateZ(48px) scale(0.96);
  }

  50% {
    opacity: 0.9;
    transform: translateZ(54px) scale(1.05);
  }
}

@keyframes rain-fall {
  from {
    opacity: 0;
    translate: 0 -18px;
  }

  35% {
    opacity: 0.9;
  }

  to {
    opacity: 0;
    translate: 0 40px;
  }
}
</style>
