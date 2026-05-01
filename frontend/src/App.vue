<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import MapLibreOverlay from './MapLibreOverlay.vue';
import { defaultObject, layers, ontologyObjects, pipelineSteps } from './mockData.js';
import { VoxelWorld } from './voxelWorld.js';
import { loadWorldViewPayload, summarizeWorldView, toUiOntologyObjects } from './worldViewPayload.js';

const pageParams = new URLSearchParams(window.location.search);
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
const mapBaseVisible = ref(pageParams.get('mapBase') !== 'off');
const debugMapVisible = ref(pageParams.get('debugMap') === '1');
const mapStatus = ref('loading');
const debugMapStatus = ref('loading');
const worldLod = ref('map-reference');
const hoverObject = ref(null);
const hoverPosition = reactive({ x: 0, y: 0 });
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
const debugReference = computed(() => buildDebugReference(worldPayload.value, selectedObject.value?.id));

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
const hoverStyle = computed(() => ({
  left: `${Math.min(hoverPosition.x + 16, window.innerWidth - 250)}px`,
  top: `${Math.min(hoverPosition.y + 16, window.innerHeight - 150)}px`,
}));
const debugMapStatusLabel = computed(() => {
  if (!debugMapVisible.value) return 'OFF';
  if (debugMapStatus.value === 'ready') return 'ON';
  if (debugMapStatus.value === 'error') return 'ERROR';
  return 'LOADING';
});

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

function localToFocusLngLat(coordinate, chunk, focus) {
  const bounds = chunk?.localBounds;
  const geo = focus?.geoBounds;
  if (!bounds || !geo) return null;
  const [x = 0, yOrZ = 0, maybeZ] = coordinate ?? [];
  const z = maybeZ === undefined ? yOrZ : maybeZ;
  const nx = (x - bounds.minX) / Math.max(0.0001, bounds.maxX - bounds.minX);
  const nz = (z - bounds.minZ) / Math.max(0.0001, bounds.maxZ - bounds.minZ);
  return [
    geo.west + nx * (geo.east - geo.west),
    geo.north - nz * (geo.north - geo.south),
  ];
}

function boundsPolygon({ west, south, east, north }) {
  return [[
    [west, south],
    [east, south],
    [east, north],
    [west, north],
    [west, south],
  ]];
}

function buildDebugReference(payload, selectedId) {
  const focusGeo = payload?.focus?.geoBounds;
  if (!payload || !focusGeo) return null;
  const objects = new Map((payload.objects ?? []).map((object) => [object.id, object]));
  const features = [
    {
      type: 'Feature',
      properties: {
        id: payload.focus.id,
        name: payload.focus.label,
        kind: 'focus-bounds',
        color: '#E16B8C',
        selected: false,
      },
      geometry: { type: 'Polygon', coordinates: boundsPolygon(focusGeo) },
    },
  ];

  (payload.chunks ?? []).forEach((chunk) => {
    if (chunk.localBounds) {
      const corners = [
        [chunk.localBounds.minX, 0, chunk.localBounds.minZ],
        [chunk.localBounds.maxX, 0, chunk.localBounds.minZ],
        [chunk.localBounds.maxX, 0, chunk.localBounds.maxZ],
        [chunk.localBounds.minX, 0, chunk.localBounds.maxZ],
        [chunk.localBounds.minX, 0, chunk.localBounds.minZ],
      ].map((point) => localToFocusLngLat(point, chunk, payload.focus)).filter(Boolean);
      features.push({
        type: 'Feature',
        properties: { id: chunk.id, name: chunk.label ?? chunk.id, kind: 'chunk-bounds', color: '#81C7D4', selected: false },
        geometry: { type: 'Polygon', coordinates: [corners] },
      });
    }

    (chunk.staticFeatures ?? []).forEach((feature) => {
      const object = objects.get(feature.ontologyObjectId);
      const lngLat = localToFocusLngLat(feature.geometry?.coordinates, chunk, payload.focus);
      if (!lngLat) return;
      features.push({
        type: 'Feature',
        properties: {
          id: feature.id,
          objectId: object?.id ?? feature.id,
          name: object?.name ?? feature.kind,
          kind: feature.kind,
          color: feature.visualState?.signColor ?? feature.visualState?.color ?? '#F596AA',
          selected: object?.id === selectedId,
        },
        geometry: { type: 'Point', coordinates: lngLat },
      });
    });
  });

  return { type: 'FeatureCollection', features };
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
    onHover: (object, position) => {
      hoverObject.value = object;
      if (position) {
        hoverPosition.x = position.x;
        hoverPosition.y = position.y;
      }
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
    <MapLibreOverlay
      :visible="debugMapVisible"
      variant="debug"
      :interactive="true"
      :mrt-visible="layerState.mrt"
      :debug-reference="debugReference"
      @status="debugMapStatus = $event"
    />
    <section v-if="debugMapVisible" class="debug-map-panel">
      <div>
        <span>DEBUG MAP REFERENCE</span>
        <strong>OpenFreeMap · {{ debugMapStatusLabel }}</strong>
      </div>
      <button type="button" @click="debugMapVisible = false">Close</button>
    </section>
    <div
      ref="worldEl"
      class="world-stage"
      :class="{ 'map-backed': effectiveMapVisible }"
      aria-label="Sakura voxel Taipei 3D scene"
    ></div>

    <aside v-if="hoverObject" class="hover-card" :style="hoverStyle" aria-live="polite">
      <span>{{ hoverObject.type }} · {{ hoverObject.layer }}</span>
      <strong>{{ hoverObject.name }}</strong>
      <p>{{ hoverObject.summary }}</p>
    </aside>

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

      <div class="brand-block">
        <div class="brand-title">TWFoundry</div>
        <div class="brand-subtitle">SAKURA VOXEL TAIPEI · MAPLIBRE READY</div>
      </div>

      <div class="pipeline-strip">
        <button
          v-for="step in pipelineSteps"
          :key="step.key"
          class="pipeline-node"
          :class="{ active: selectedPipeline === step.key }"
          type="button"
          @click="selectPipeline(step.key)"
        >
          <span class="node-dot"></span>
          <span class="node-copy">
            <strong>{{ step.label }}</strong>
            <b>{{ step.short }}</b>
            <small>{{ step.countLabel }}</small>
          </span>
        </button>
      </div>

      <div class="hud-section compact-readout">
        <div>
          <span>Focus</span>
          <strong>{{ activePipeline.detail }} · {{ payloadStatusLabel }}</strong>
        </div>
        <div>
          <span>Visible chunks</span>
          <strong>{{ stats.visibleChunks }}</strong>
        </div>
        <div>
          <span>Voxel entities</span>
          <strong>{{ stats.voxelEntities }}</strong>
        </div>
      </div>

      <div class="panel-domain map-domain">
        <div class="domain-heading">
          <span>MAP BASE</span>
          <small>OpenFreeMap · {{ mapStatusLabel }}</small>
        </div>
      </div>

      <button
        class="layer-pill map-base-pill"
        :class="{ active: mapBaseVisible }"
        type="button"
        @click="toggleMapBase"
      >
        <span class="layer-swatch map-swatch"></span>
        <span class="layer-main">
          <strong>Actual Taipei map</strong>
          <small>REFERENCE LOD · {{ mapBaseVisible ? mapStatusLabel : 'OFF' }}</small>
        </span>
      </button>

      <p v-if="mapStatus === 'error'" class="map-error-note">
        Map source unavailable. Showing fallback voxel diorama.
      </p>

      <button
        class="layer-pill map-base-pill debug-map-pill"
        :class="{ active: debugMapVisible }"
        type="button"
        @click="debugMapVisible = !debugMapVisible"
      >
        <span class="layer-swatch debug-map-swatch"></span>
        <span class="layer-main">
          <strong>Debug map reference</strong>
          <small>REAL MAP CHECK · {{ debugMapStatusLabel }}</small>
        </span>
      </button>

      <div class="panel-domain overlay-domain">
        <div class="domain-heading">
          <span>OVERLAYS</span>
          <small>{{ activeOverlayCount }} active</small>
        </div>
      </div>

      <div class="layer-stack overlay-stack">
        <button
          v-for="layer in overlayLayers"
          :key="layer.key"
          class="layer-pill"
          :class="{ active: layerState[layer.key] }"
          type="button"
          @click="toggleLayer(layer.key)"
        >
          <span class="layer-swatch" :style="{ background: layer.color }"></span>
          <span class="layer-main">
            <strong>{{ layer.label }}</strong>
            <small>{{ layer.short }} · {{ layerState[layer.key] ? 'ON' : 'OFF' }}</small>
          </span>
        </button>
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
