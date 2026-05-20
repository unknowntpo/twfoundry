<script setup>
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch } from 'vue';
import { defaultObject, layers, ontologyObjects, pipelineSteps } from './mockData.js';
import { deriveWorldPayloadFromMapFeatureCatalog } from './mapDerivedWorldPayload.js';
import {
  activeOverlayCount as countVisibleOverlays,
  defaultOverlayVisibility,
  overlaysByCategory,
} from './overlayRegistry.js';
import { loadWorldViewPayload, summarizeWorldView, toUiOntologyObjects } from './worldViewPayload.js';

const MapLibreOverlay = defineAsyncComponent(() => import('./MapLibreOverlay.vue'));
const OntologyPreview = defineAsyncComponent(() => import('./OntologyPreview.vue'));
const pageParams = new URLSearchParams(window.location.search);
const initialObjectId = pageParams.get('object');
const initialFocusId = pageParams.get('focusId') ?? pageParams.get('focus') ?? 'zhongshan-station';
const world = shallowRef(null);
const worldPayloadSource = ref('local');
const worldPayload = ref(null);
const rawWorldPayload = ref(null);
const selectedObject = ref(defaultObject);
const selectedPipeline = ref('tiles');
const isPlaying = ref(true);
const isLive = ref(true);
const leftCollapsed = ref(false);
const rightCollapsed = ref(false);
const mapBaseVisible = ref(pageParams.get('mapBase') !== 'off');
const debugMapVisible = ref(pageParams.get('debugMap') === '1');
const mapStatus = ref('loading');
const mapTextureStatus = ref('loading');
const latestMapReference = ref(null);
const hoverObject = ref(null);
const hoverPosition = reactive({ x: 0, y: 0 });
const speed = ref(15);
const worldMinutes = ref(610);
const stats = reactive({
  visibleChunks: 0,
  observations: 0,
  ontologyObjects: 0,
  voxelEntities: 0,
});
const layerState = reactive(defaultOverlayVisibility());

let timer = 0;
let lastDerivedPayloadSignature = '';
let componentMounted = false;

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
const pipelineReadouts = computed(() => pipelineSteps.map((step) => ({
  ...step,
  countLabel: pipelineCountLabel(step.key),
})));
const overlayLayers = computed(() => layers);
const overlayGroups = computed(() => overlaysByCategory(overlayLayers.value));
const activeOverlayCount = computed(() => countVisibleOverlays(layerState, overlayLayers.value));
const selectedLiveBoardRows = computed(() => selectedObject.value?.rawProperties?.liveBoardRows ?? []);
const hasStationLiveBoard = computed(() => selectedLiveBoardRows.value.length > 0);
const hasDebugMapReference = computed(() => debugMapVisible.value && Boolean(latestMapReference.value?.canvas));
const mapStatusLabel = computed(() => {
  if (!mapBaseVisible.value) return 'OFF';
  if (mapStatus.value === 'error') return 'ERROR';
  if (mapStatus.value === 'ready') return 'LIVE MAP READY';
  return 'LOADING';
});
const payloadStatusLabel = computed(() => worldPayloadSource.value === 'api' ? 'API' : 'FALLBACK');
const hoverStyle = computed(() => ({
  left: `${Math.min(hoverPosition.x + 16, window.innerWidth - 250)}px`,
  top: `${Math.min(hoverPosition.y + 16, window.innerHeight - 150)}px`,
}));
const selectedVoxelKind = computed(() => {
  const type = `${selectedObject.value?.type ?? ''} ${selectedObject.value?.layer ?? ''}`.toLowerCase();
  if (type.includes('pm2.5') || type.includes('air') || type.includes('sensor')) return 'pm25';
  if (type.includes('rain') || type.includes('weather')) return 'weather';
  return 'station';
});

function toggleLayer(key) {
  layerState[key] = !layerState[key];
  world.value?.setLayer(key, layerState[key]);
}

function toggleMapBase() {
  mapBaseVisible.value = !mapBaseVisible.value;
  world.value?.setMapBaseVisible(mapBaseVisible.value);
  applySceneMapReference();
}

function onMapStatus(nextStatus) {
  mapStatus.value = nextStatus;
  world.value?.setMapBaseVisible(mapBaseVisible.value);
  applySceneMapReference();
}

function onTextureMapStatus(nextStatus) {
  mapTextureStatus.value = nextStatus;
  if (nextStatus === 'error') {
    latestMapReference.value = null;
    lastDerivedPayloadSignature = '';
    if (rawWorldPayload.value) applyWorldPayload(rawWorldPayload.value);
  }
  applySceneMapReference();
}

function onMapTexture(mapReference) {
  latestMapReference.value = mapReference;
  applyMapDerivedPayload();
  applySceneMapReference();
}

function applyWorldPayload(payload) {
  worldPayload.value = payload;
  Object.assign(stats, summarizeWorldView(payload));
  const objects = toUiOntologyObjects(payload);
  world.value?.setOntologyObjects(objects);
  world.value?.setWorldViewPayload(payload, objects);
  world.value?.setMapBaseVisible(mapBaseVisible.value);
  applySceneMapReference();
  selectedObject.value = objects.find((object) => object.id === initialObjectId)
    ?? objects.find((object) => object.id === selectedObject.value.id)
    ?? objects.find((object) => object.type?.toLowerCase().includes('station'))
    ?? objects[0]
    ?? selectedObject.value;
}

function applyMapDerivedPayload() {
  if (!rawWorldPayload.value) return;
  const signature = mapFeatureCatalogSignature(latestMapReference.value?.featureCatalog);
  if (signature === lastDerivedPayloadSignature && worldPayload.value) return;
  lastDerivedPayloadSignature = signature;
  const nextPayload = deriveWorldPayloadFromMapFeatureCatalog(rawWorldPayload.value, latestMapReference.value?.featureCatalog);
  applyWorldPayload(nextPayload);
}

function mapFeatureCatalogSignature(featureCatalog) {
  if (!featureCatalog) return 'fallback-payload';
  const featureKeys = (features = []) => features
    .slice(0, 220)
    .map((feature) => stableFeatureSignature(feature))
    .join('|');
  return JSON.stringify({
    source: featureCatalog.source,
    coverage: featureCatalog.coverage ?? null,
    bounds: featureCatalog.bounds ?? null,
    roads: featureKeys(featureCatalog.roads),
    buildings: featureKeys(featureCatalog.buildings),
    areas: featureKeys(featureCatalog.areas),
    pois: featureKeys(featureCatalog.pois),
  });
}

function stableFeatureSignature(feature) {
  return JSON.stringify({
    id: feature?.properties?.sourceRef ?? feature?.id ?? '',
    geometry: feature?.geometry ?? null,
    properties: Object.fromEntries(Object.entries(feature?.properties ?? {})
      .filter(([key]) => key !== 'generatedAt')
      .sort(([left], [right]) => left.localeCompare(right))),
  });
}

function applySceneMapReference() {
  const reference = hasDebugMapReference.value ? latestMapReference.value : null;
  world.value?.setMapReference(reference);
}

function selectPipeline(key) {
  selectedPipeline.value = key;
  world.value?.applyPipelineFocus(key);
}

function pipelineCountLabel(key) {
  if (key === 'places') return `${stats.visibleChunks} focus`;
  if (key === 'observations') return `${worldPayload.value?.projections?.length ?? stats.observations} rows`;
  if (key === 'ontology') return `${uiOntologyObjects.value.length} objects`;
  if (key === 'detail') return `${stats.voxelEntities} modules`;
  return pipelineSteps.find((step) => step.key === key)?.countLabel ?? '';
}

function selectObject(object) {
  selectedObject.value = object;
  const hasLiveContext = object.status === 'live' || (object.rawProperties?.liveBoardRows?.length ?? 0) > 0;
  isLive.value = hasLiveContext ? isLive.value : false;
  world.value?.focusObject(object.id);
}

function selectMapObject(mapObject) {
  const stationCode = String(mapObject?.id ?? '').toLowerCase();
  const name = String(mapObject?.name ?? '').toLowerCase();
  const nextObject = uiOntologyObjects.value.find((object) => {
    const haystack = [
      object.id,
      object.name,
      object.type,
      ...(object.properties ?? []),
      ...(object.relationships ?? []),
    ].join(' ').toLowerCase();
    return (stationCode && haystack.includes(stationCode)) || (name && haystack.includes(name));
  });
  if (nextObject) selectObject(nextObject);
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

function localToLngLat(coordinate, payload) {
  const coordinateSystem = payload?.coordinateSystem;
  if (!coordinateSystem) return null;
  const [x = 0, yOrZ = 0, maybeZ] = coordinate ?? [];
  const z = maybeZ === undefined ? yOrZ : maybeZ;
  const radiusMeters = 6378137;
  const originX = radiusMeters * coordinateSystem.originLng * Math.PI / 180;
  const originY = radiusMeters * Math.log(Math.tan(Math.PI / 4 + coordinateSystem.originLat * Math.PI / 360));
  const scale = coordinateSystem.sceneUnitsPerMeter ?? 1;
  if (!scale) return null;
  const mercatorX = originX + x / scale;
  const mercatorY = originY - z / scale;
  const lng = mercatorX / radiusMeters * 180 / Math.PI;
  const lat = (2 * Math.atan(Math.exp(mercatorY / radiusMeters)) - Math.PI / 2) * 180 / Math.PI;
  return [Number(lng.toFixed(7)), Number(lat.toFixed(7))];
}

function sceneCoordinateFromChunkLocal(coordinate, chunk) {
  const [x = 0, yOrZ = 0, maybeZ] = coordinate ?? [];
  const y = maybeZ === undefined ? 0 : yOrZ;
  const z = maybeZ === undefined ? yOrZ : maybeZ;
  const transform = chunk?.localToScene ?? { translate: chunk?.sceneOrigin ?? { x: 0, y: 0, z: 0 }, scale: 1, rotationDegrees: 0 };
  const scale = transform.scale ?? 1;
  const translate = transform.translate ?? { x: 0, y: 0, z: 0 };
  const rotation = (transform.rotationDegrees ?? 0) * Math.PI / 180;
  const scaledX = x * scale;
  const scaledZ = z * scale;
  const rotatedX = scaledX * Math.cos(rotation) - scaledZ * Math.sin(rotation);
  const rotatedZ = scaledX * Math.sin(rotation) + scaledZ * Math.cos(rotation);
  return [
    rotatedX + (translate.x ?? 0),
    y * scale + (translate.y ?? 0),
    rotatedZ + (translate.z ?? 0),
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
      ].map((point) => {
        const scenePoint = sceneCoordinateFromChunkLocal(point, chunk);
        return localToLngLat(scenePoint, payload) ?? localToFocusLngLat(point, chunk, payload.focus);
      }).filter(Boolean);
      features.push({
        type: 'Feature',
        properties: { id: chunk.id, name: chunk.label ?? chunk.id, kind: 'chunk-bounds', color: '#81C7D4', selected: false },
        geometry: { type: 'Polygon', coordinates: [corners] },
      });
    }

    (chunk.groundFeatures ?? []).forEach((feature) => {
      if (feature.geometry?.type !== 'LineString') return;
      const line = feature.sourceGeometry?.type === 'LineString'
        ? feature.sourceGeometry.coordinates
        : (feature.visualState?.geoPath
            ?? (feature.geometry.coordinates ?? [])
              .map((point) => localToLngLat(sceneCoordinateFromChunkLocal(point, chunk), payload))
              .filter(Boolean));
      if (line.length < 2) return;
      features.push({
        type: 'Feature',
        properties: {
          id: feature.id,
          name: feature.visualState?.label ?? feature.id,
          kind: feature.kind,
          sourceRef: feature.sourceRef,
          color: feature.visualState?.centerLineColor ?? '#81C7D4',
          selected: false,
        },
        geometry: { type: 'LineString', coordinates: line },
      });
    });

    (chunk.groundFeatures ?? []).forEach((feature) => {
      const coordinates = feature.sourceGeometry?.type === 'Polygon'
        ? feature.sourceGeometry.coordinates
        : (feature.visualState?.geoFootprint ? [feature.visualState.geoFootprint] : null);
      if (feature.geometry?.type !== 'Polygon' || !coordinates) return;
      features.push({
        type: 'Feature',
        properties: {
          id: feature.id,
          name: feature.visualState?.label ?? feature.id,
          kind: feature.kind,
          sourceRef: feature.sourceRef,
          color: feature.visualState?.edgeColor ?? feature.visualState?.color ?? '#B5CAA0',
          selected: false,
        },
        geometry: { type: 'Polygon', coordinates },
      });
    });

    (chunk.staticFeatures ?? []).forEach((feature) => {
      const object = objects.get(feature.ontologyObjectId);
      const sourcePolygon = feature.sourceGeometry?.type === 'Polygon'
        ? feature.sourceGeometry.coordinates
        : (feature.visualState?.geoFootprint ? [feature.visualState.geoFootprint] : null);
      if (sourcePolygon) {
        features.push({
          type: 'Feature',
          properties: {
            id: feature.id,
            objectId: object?.id ?? feature.id,
            name: object?.name ?? feature.visualState?.label ?? feature.kind,
            kind: feature.kind,
            color: feature.visualState?.signColor ?? feature.visualState?.color ?? '#F596AA',
            selected: object?.id === selectedId,
          },
          geometry: { type: 'Polygon', coordinates: sourcePolygon },
        });
      }
      const lngLat = (feature.sourceGeometry?.type === 'Point' ? feature.sourceGeometry.coordinates : null)
        ?? feature.visualState?.geoAnchor
        ?? (feature.geometry?.type === 'Point' ? localToLngLat(sceneCoordinateFromChunkLocal(feature.geometry?.coordinates, chunk), payload) : null)
        ?? (feature.geometry?.type === 'Point' ? localToFocusLngLat(feature.geometry?.coordinates, chunk, payload.focus) : null);
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

onMounted(async () => {
  componentMounted = true;
  const payloadPromise = loadWorldViewPayload(globalThis.fetch, { focusId: initialFocusId });

  payloadPromise.then(({ payload, source }) => {
    if (!componentMounted) return;
    rawWorldPayload.value = payload;
    lastDerivedPayloadSignature = '';
    worldPayloadSource.value = source;
    applyMapDerivedPayload();
    if (initialObjectId) world.value?.focusObject(selectedObject.value.id);
  });

  timer = window.setInterval(() => {
    if (!isPlaying.value) return;
    const next = (worldMinutes.value + speed.value / 6) % 1440;
    worldMinutes.value = next;
    if (isLive.value && next < 8) worldMinutes.value = 610;
  }, 100);
});

onBeforeUnmount(() => {
  componentMounted = false;
  window.clearInterval(timer);
  world.value?.destroy();
});
</script>

<template>
  <main class="app-shell">
    <MapLibreOverlay
      :visible="true"
      variant="texture"
      :mrt-visible="layerState['mrt-routes'] || layerState['mrt-stations']"
      :overlay-visibility="layerState"
      :focus-bounds="worldPayload?.focus?.geoBounds"
      :debug-visible="debugMapVisible"
      :debug-reference="debugReference"
      @status="onTextureMapStatus"
      @texture="onMapTexture"
    />
    <MapLibreOverlay
      :visible="mapBaseVisible"
      variant="main"
      :interactive="true"
      :mrt-visible="layerState['mrt-routes'] || layerState['mrt-stations']"
      :overlay-visibility="layerState"
      :focus-bounds="worldPayload?.focus?.geoBounds"
      :debug-visible="debugMapVisible"
      :debug-reference="debugReference"
      @status="onMapStatus"
      @select-object="selectMapObject"
    />
    <div class="map-intelligence-fallback" aria-hidden="true"></div>

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
        <div class="brand-subtitle">MAP-FIRST ONTOLOGY OPS · MAPLIBRE</div>
      </div>

      <div class="pipeline-strip">
        <button
          v-for="step in pipelineReadouts"
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
          <span>Map focus</span>
          <strong>{{ stats.visibleChunks }}</strong>
        </div>
        <div>
          <span>Detail modules</span>
          <strong>{{ stats.voxelEntities }}</strong>
        </div>
      </div>

      <div class="panel-domain map-domain">
        <div class="domain-heading">
          <span>MAP INTELLIGENCE</span>
          <small>Interactive base · {{ mapStatusLabel }}</small>
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
          <strong>Base map</strong>
          <small>MAPLIBRE · {{ mapBaseVisible ? mapStatusLabel : 'OFF' }}</small>
        </span>
      </button>

      <p v-if="mapStatus === 'error'" class="map-error-note">
        Map source unavailable. Keeping fallback ontology data available.
      </p>

      <div class="panel-domain overlay-domain">
        <div class="domain-heading">
          <span>OVERLAYS</span>
          <small>{{ activeOverlayCount }} active</small>
        </div>
      </div>

      <div class="overlay-category-stack">
        <div
          v-for="group in overlayGroups"
          :key="group.id"
          class="overlay-category"
        >
          <div class="overlay-category-heading">
            <span>{{ group.label }}</span>
            <small>{{ group.overlays.filter((layer) => layerState[layer.key]).length }}/{{ group.overlays.length }}</small>
          </div>
          <div class="layer-stack overlay-stack">
            <button
              v-for="layer in group.overlays"
              :key="layer.key"
              class="layer-pill"
              :class="{ active: layerState[layer.key], planned: layer.renderer?.status === 'planned' }"
              type="button"
              @click="toggleLayer(layer.key)"
            >
              <span class="layer-swatch" :style="{ background: layer.color }"></span>
              <span class="layer-main">
                <strong>{{ layer.label }}</strong>
                <small>
                  {{ layer.short }} · {{ layerState[layer.key] ? 'ON' : 'OFF' }}
                  <template v-if="layer.timelineAware"> · TIME</template>
                  <template v-if="layer.renderer?.status === 'planned'"> · PLANNED</template>
                </small>
              </span>
            </button>
          </div>
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

      <div class="voxel-detail-card">
        <div class="voxel-detail-heading">
          <span>VOXEL DETAIL</span>
          <strong>{{ selectedObject.type }}</strong>
        </div>
        <OntologyPreview :kind="selectedVoxelKind" />
      </div>

      <div v-if="hasStationLiveBoard" class="station-live-card">
        <div class="station-live-heading">
          <span>TDX LIVEBOARD</span>
          <strong>{{ selectedObject.rawProperties.liveSource ?? 'TDX MRT LiveBoard' }}</strong>
        </div>
        <div class="station-live-row" v-for="row in selectedLiveBoardRows" :key="`${row.line}-${row.direction}-${row.etaMinutes}`">
          <span>{{ row.line }}</span>
          <strong>{{ row.direction }} · {{ row.etaMinutes }} min</strong>
          <small>{{ row.destination }} · {{ row.status }}</small>
        </div>
      </div>

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
      <div class="corner-big">MAP</div>
      <div class="corner-small">ONTOLOGY · LIVE</div>
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
