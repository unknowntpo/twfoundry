<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import MapLibreOverlay from './MapLibreOverlay.vue';
import { defaultObject, layers, ontologyObjects, pipelineSteps } from './mockData.js';
import { VoxelWorld } from './voxelWorld.js';
import { loadWorldViewPayload, summarizeWorldView, toUiOntologyObjects } from './worldViewPayload.js';

const worldEl = ref(null);
const world = ref(null);
const worldPayloadSource = ref('local');
const worldPayload = ref(null);
const selectedObject = ref(defaultObject);
const selectedPipeline = ref('tiles');
const isPlaying = ref(true);
const isLive = ref(true);
const leftCollapsed = ref(false);
const rightCollapsed = ref(false);
const mapBaseVisible = ref(true);
const mapStatus = ref('loading');
const worldLod = ref('map-reference');
const speed = ref(15);
const worldMinutes = ref(610);
const stats = reactive({
  visibleChunks: 9,
  observations: 128,
  ontologyObjects: 5,
  voxelEntities: 812,
});
const layerState = reactive(Object.fromEntries(layers.map((layer) => [layer.key, true])));

let timer = 0;

const uiOntologyObjects = computed(() => {
  if (!worldPayload.value) return ontologyObjects;
  const objects = toUiOntologyObjects(worldPayload.value);
  return objects.length > 0 ? objects : ontologyObjects;
});

const timeLabel = computed(() => {
  const total = worldMinutes.value % 1440;
  const h = Math.floor(total / 60);
  const m = Math.floor(total % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
});

const freshnessLabel = computed(() => {
  if (!isLive.value) return 'history · cursor detached';
  const age = Math.max(4, Math.round(18 - Math.sin(worldMinutes.value / 19) * 7));
  return `live · ${age}s ago`;
});

const activePipeline = computed(() => pipelineSteps.find((step) => step.key === selectedPipeline.value) ?? pipelineSteps[0]);
const overlayLayers = computed(() => layers.filter((layer) => layer.key !== 'tiles'));
const activeOverlayCount = computed(() => overlayLayers.value.filter((layer) => layerState[layer.key]).length);
const mapStatusLabel = computed(() => {
  if (!mapBaseVisible.value) return 'OFF';
  if (worldLod.value === 'voxel-diorama') return 'ZOOMED IN';
  if (mapStatus.value === 'ready') return 'ON';
  if (mapStatus.value === 'error') return 'ERROR';
  return 'LOADING';
});
const effectiveMapVisible = computed(() => mapBaseVisible.value && mapStatus.value !== 'error' && worldLod.value === 'map-reference');
const payloadStatusLabel = computed(() => worldPayloadSource.value === 'api' ? 'API' : 'FALLBACK');

function toggleLayer(key) {
  layerState[key] = !layerState[key];
  world.value?.setLayer(key, layerState[key]);
}

function toggleMapBase() {
  mapBaseVisible.value = !mapBaseVisible.value;
  world.value?.setMapBaseVisible(effectiveMapVisible.value);
}

function onMapStatus(nextStatus) {
  mapStatus.value = nextStatus;
  world.value?.setMapBaseVisible(effectiveMapVisible.value);
}

function selectPipeline(key) {
  selectedPipeline.value = key;
  world.value?.applyPipelineFocus(key);
}

function selectObject(object) {
  selectedObject.value = object;
  isLive.value = object.status === 'live' ? isLive.value : false;
  world.value?.focusObject(object.id);
}

function setPlaying(next) {
  isPlaying.value = next;
}

function setLive(next) {
  isLive.value = next;
  if (next) isPlaying.value = true;
}

function onTimelineInput(event) {
  worldMinutes.value = Number(event.target.value);
  isLive.value = false;
}

watch(worldMinutes, (value) => {
  world.value?.setTime(value);
});

watch(effectiveMapVisible, (visible) => {
  world.value?.setMapBaseVisible(visible);
});

onMounted(() => {
  world.value = new VoxelWorld(worldEl.value, {
    onSelect: (object) => {
      if (object) selectedObject.value = object;
    },
    onReady: (payload) => {
      Object.assign(stats, payload);
    },
    onLodChange: (lod) => {
      worldLod.value = lod;
    },
  });
  world.value.setMapBaseVisible(effectiveMapVisible.value);

  loadWorldViewPayload().then(({ payload, source }) => {
    worldPayload.value = payload;
    worldPayloadSource.value = source;
    Object.assign(stats, summarizeWorldView(payload));
    const objects = toUiOntologyObjects(payload);
    world.value?.setOntologyObjects(objects);
    world.value?.setWorldViewPayload(payload, objects);
    selectedObject.value = objects.find((object) => object.id === selectedObject.value.id) ?? objects[0] ?? selectedObject.value;
  });

  timer = window.setInterval(() => {
    if (!isPlaying.value) return;
    const next = (worldMinutes.value + speed.value / 6) % 1440;
    worldMinutes.value = next;
    if (isLive.value && next < 8) worldMinutes.value = 610;
  }, 100);
});

onBeforeUnmount(() => {
  window.clearInterval(timer);
  world.value?.destroy();
});
</script>

<template>
  <main class="app-shell">
    <MapLibreOverlay
      :visible="effectiveMapVisible"
      :mrt-visible="layerState.mrt"
      @status="onMapStatus"
    />
    <div
      ref="worldEl"
      class="world-stage"
      :class="{ 'map-backed': effectiveMapVisible }"
      aria-label="Sakura voxel Taipei 3D scene"
    ></div>

    <button
      class="panel-toggle panel-toggle-left"
      :class="{ hidden: !leftCollapsed }"
      type="button"
      aria-label="Open data layers panel"
      @click="leftCollapsed = false"
    >
      Overlays
    </button>

    <button
      class="panel-toggle panel-toggle-right"
      :class="{ hidden: !rightCollapsed }"
      type="button"
      aria-label="Open ontology panel"
      @click="rightCollapsed = false"
    >
      Object
    </button>

    <section class="hud hud-left" :class="{ collapsed: leftCollapsed }">
      <button
        class="collapse-button collapse-left"
        type="button"
        aria-label="Collapse data layers panel"
        @click="leftCollapsed = true"
      >
        ‹
      </button>

      <div class="sidebar-brand-row">
        <div class="sidebar-brand-mark">TW</div>
        <div class="sidebar-brand-copy">
          <strong>TWFoundry</strong>
          <span>Sakura Voxel Taipei</span>
        </div>
        <button class="sidebar-ghost-button" type="button" aria-label="Switch workspace">
          ⌄
        </button>
      </div>

      <div class="sidebar-section">
        <div class="sidebar-section-label">Platform</div>
        <div class="sidebar-nav">
          <button
            v-for="step in pipelineSteps"
            :key="step.key"
            class="sidebar-nav-item"
            :class="{ active: selectedPipeline === step.key }"
            type="button"
            @click="selectPipeline(step.key)"
          >
            <span class="sidebar-item-icon">{{ step.short.slice(0, 1).toUpperCase() }}</span>
            <span class="sidebar-item-copy">
              <strong>{{ step.label }}</strong>
              <small>{{ step.detail }}</small>
            </span>
            <span class="sidebar-item-count">{{ step.countLabel }}</span>
          </button>
        </div>
      </div>

      <div class="sidebar-focus-card">
        <div>
          <span>Focus</span>
          <strong>{{ activePipeline.detail }}</strong>
        </div>
        <div>
          <span>Source</span>
          <strong>{{ payloadStatusLabel }}</strong>
        </div>
        <div>
          <span>Chunks</span>
          <strong>{{ stats.visibleChunks }}</strong>
        </div>
        <div>
          <span>Voxels</span>
          <strong>{{ stats.voxelEntities }}</strong>
        </div>
      </div>

      <div class="sidebar-section">
        <div class="sidebar-section-label">Map Reference</div>
        <button
          class="sidebar-nav-item sidebar-map-row"
          :class="{ active: mapBaseVisible }"
          type="button"
          @click="toggleMapBase"
        >
          <span class="sidebar-item-icon sidebar-map-swatch"></span>
          <span class="sidebar-item-copy">
            <strong>Actual Taipei map</strong>
            <small>OpenFreeMap · {{ mapBaseVisible ? mapStatusLabel : 'OFF' }}</small>
          </span>
          <span class="sidebar-state">{{ mapBaseVisible ? 'ON' : 'OFF' }}</span>
        </button>
        <p v-if="mapStatus === 'error'" class="map-error-note">
          Map source unavailable. Showing fallback voxel diorama.
        </p>
      </div>

      <div class="sidebar-section">
        <div class="sidebar-section-heading">
          <span class="sidebar-section-label">Domain Overlays</span>
          <small>{{ activeOverlayCount }} / {{ overlayLayers.length }} active</small>
        </div>
        <div class="sidebar-nav overlay-nav">
          <button
            v-for="layer in overlayLayers"
            :key="layer.key"
            class="sidebar-nav-item overlay-row"
            :class="{ active: layerState[layer.key] }"
            type="button"
            @click="toggleLayer(layer.key)"
          >
            <span class="sidebar-item-icon overlay-swatch" :style="{ background: layer.color }"></span>
            <span class="sidebar-item-copy">
              <strong>{{ layer.label }}</strong>
              <small>{{ layer.short }} · ontology render module</small>
            </span>
            <span class="sidebar-state">{{ layerState[layer.key] ? 'ON' : 'OFF' }}</span>
          </button>
        </div>
      </div>
    </section>

    <section class="hud hud-right" :class="{ collapsed: rightCollapsed }">
      <button
        class="collapse-button collapse-right"
        type="button"
        aria-label="Collapse ontology panel"
        @click="rightCollapsed = true"
      >
        ›
      </button>

      <div class="object-kicker">ONTOLOGY OBJECT</div>
      <div class="object-title-row">
        <div>
          <h1>{{ selectedObject.name }}</h1>
          <p>{{ selectedObject.type }} · {{ selectedObject.layer }}</p>
        </div>
        <span class="status-chip">{{ selectedObject.status }}</span>
      </div>
      <p class="object-summary">{{ selectedObject.summary }}</p>

      <div class="object-grid">
        <button
          v-for="object in uiOntologyObjects"
          :key="object.id"
          class="object-token"
          :class="{ active: object.id === selectedObject.id }"
          type="button"
          @click="selectObject(object)"
        >
          {{ object.type }}
        </button>
      </div>

      <div class="object-list">
        <div>
          <span>Properties</span>
          <p v-for="item in selectedObject.properties" :key="item">{{ item }}</p>
        </div>
        <div>
          <span>Relationships</span>
          <p v-for="item in selectedObject.relationships" :key="item">{{ item }}</p>
        </div>
      </div>
    </section>

    <section class="hud hud-top-right">
      <div class="corner-big">VOXEL</div>
      <div class="corner-small">MINIATURE · WORLD</div>
    </section>

    <section class="timeline-hud">
      <button class="round-control" type="button" @click="setPlaying(!isPlaying)">
        {{ isPlaying ? 'II' : '▶' }}
      </button>

      <button class="live-chip" :class="{ active: isLive }" type="button" @click="setLive(!isLive)">
        {{ freshnessLabel }}
      </button>

      <div class="time-readout">
        <strong>{{ timeLabel }}</strong>
        <small>worldTime controls observations</small>
      </div>

      <input
        class="time-slider"
        type="range"
        min="0"
        max="1439"
        :value="worldMinutes"
        @input="onTimelineInput"
      />

      <div class="speed-group">
        <button
          v-for="option in [1, 15, 60, 300]"
          :key="option"
          class="speed-button"
          :class="{ active: speed === option }"
          type="button"
          @click="speed = option"
        >
          {{ option }}x
        </button>
      </div>
    </section>
  </main>
</template>
