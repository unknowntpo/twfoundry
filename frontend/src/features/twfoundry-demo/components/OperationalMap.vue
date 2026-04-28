<script setup lang="ts">
import "maplibre-gl/dist/maplibre-gl.css";
import type * as MapLibreModule from "maplibre-gl";
import type { GeoJSONSource, Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { mrtLines, mrtStations } from "@/features/mrt/data/mrt-fixtures";
import type { MrtLineId } from "@/features/mrt/types";
import type { MapFeature, Scenario } from "../data";

const props = defineProps<{
  visibleLayerIds: string[];
  selectedFeatureId: string | null;
  scenario: Scenario;
  currentMinute: number;
  features: MapFeature[];
}>();

const emit = defineEmits<{
  selectFeature: [feature: MapFeature];
}>();

const lineNameById: Record<MrtLineId, string> = {
  blue: "Bannan Line",
  brown: "Wenhu Line",
  green: "Songshan-Xindian Line",
  orange: "Zhonghe-Xinlu Line",
  red: "Tamsui-Xinyi Line",
  yellow: "Circular Line",
};

interface ScreenPoint {
  x: number;
  y: number;
}

const offlineTrainPaths: Record<string, ScreenPoint[]> = {
  "Tamsui-Xinyi": [
    { x: 20, y: 18 },
    { x: 24, y: 24 },
    { x: 23, y: 30 },
    { x: 29, y: 27 },
    { x: 34, y: 29 },
    { x: 39, y: 38 },
    { x: 38, y: 48 },
    { x: 36, y: 57 },
    { x: 41, y: 66 },
  ],
  Bannan: [
    { x: 3, y: 72 },
    { x: 12, y: 63 },
    { x: 22, y: 58 },
    { x: 33, y: 52 },
    { x: 46, y: 48 },
    { x: 58, y: 47 },
    { x: 70, y: 45 },
  ],
};

const selectedFeature = computed(() =>
  props.features.find((feature) => feature.id === props.selectedFeatureId),
);
const visibleOfflineFeatures = computed(() =>
  props.features.filter((feature) => {
    if (feature.kind === "train") {
      return props.visibleLayerIds.includes("metro");
    }

    if (feature.kind === "sensor") {
      return props.visibleLayerIds.includes("pm25");
    }

    if (feature.kind === "incident") {
      return props.visibleLayerIds.includes("incidents");
    }

    return true;
  }),
);
const currentTimeLabel = computed(() => {
  const hour = Math.floor(props.currentMinute / 60) % 24;
  const minute = Math.floor(props.currentMinute % 60);
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
});
const mapView = ref({ scale: 1, x: -19, y: -5 });
const animatedPhase = computed(() => props.currentMinute / 1440);
const fallbackStyle = computed(() => ({
  transform: `translate(${mapView.value.x + Math.sin(animatedPhase.value * Math.PI * 2) * 0.7}%, ${
    mapView.value.y + Math.cos(animatedPhase.value * Math.PI * 2) * 0.45
  }%) scale(${mapView.value.scale})`,
}));

const mapElement = ref<HTMLDivElement | null>(null);
let map: MapLibreMap | undefined;
let mapLibre: typeof MapLibreModule | undefined;
let featureMarkers: MapLibreMarker[] = [];

onMounted(() => {
  void initializeMap();
});

onBeforeUnmount(() => {
  clearFeatureMarkers();
  map?.remove();
  map = undefined;
});

watch(
  () => [props.visibleLayerIds, props.selectedFeatureId],
  () => {
    renderMapLayers();
    renderFeatureMarkers();
  },
  { deep: true },
);

async function initializeMap(): Promise<void> {
  if (!mapElement.value) {
    return;
  }

  mapLibre = await import("maplibre-gl");
  map = new mapLibre.Map({
    attributionControl: false,
    center: [121.54, 25.05],
    container: mapElement.value,
    style: "https://tiles.openfreemap.org/styles/positron",
    zoom: 11.15,
  });
  map.addControl(new mapLibre.NavigationControl({ showCompass: false }), "top-right");
  map.addControl(new mapLibre.AttributionControl({ compact: true }), "bottom-right");
  map.on("load", () => {
    renderMapLayers();
    renderFeatureMarkers();
  });
}

function renderMapLayers(): void {
  if (!map?.loaded()) {
    return;
  }

  renderRoutes();
  renderStations();
  renderIncidents();
}

function renderRoutes(): void {
  if (!map) {
    return;
  }

  const routeSource = {
    type: "FeatureCollection" as const,
    features: props.visibleLayerIds.includes("metro")
      ? mrtLines.map((line) => ({
          type: "Feature" as const,
          properties: {
            color: line.color,
            id: line.id,
            name: lineNameById[line.id],
          },
          geometry: {
            type: "LineString" as const,
            coordinates: line.polyline.map((point) => [point.lng, point.lat]),
          },
        }))
      : [],
  };

  setGeoJsonSource("demo-routes", routeSource);
  addLineLayer("demo-routes-casing", "demo-routes", {
    "line-color": "rgba(255, 255, 255, 0.88)",
    "line-width": 8,
  });
  addLineLayer("demo-routes-line", "demo-routes", {
    "line-color": ["get", "color"],
    "line-width": 5,
  });
}

function renderStations(): void {
  if (!map) {
    return;
  }

  const stationSource = {
    type: "FeatureCollection" as const,
    features: props.visibleLayerIds.includes("metro")
      ? mrtStations.map((station) => {
          const line = mrtLines.find((item) => item.id === station.lineIds[0]);
          return {
            type: "Feature" as const,
            properties: {
              color: line?.color ?? "#1f1b17",
              id: station.id,
              name: station.name,
            },
            geometry: {
              type: "Point" as const,
              coordinates: [station.position.lng, station.position.lat],
            },
          };
        })
      : [],
  };

  setGeoJsonSource("demo-stations", stationSource);
  if (!map.getLayer("demo-station-dots")) {
    map.addLayer({
      id: "demo-station-dots",
      type: "circle",
      source: "demo-stations",
      paint: {
        "circle-color": "#fbf8f3",
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 3, 12, 5, 14, 7],
        "circle-stroke-color": ["get", "color"],
        "circle-stroke-width": 2.2,
      },
    });
  }
}

function renderIncidents(): void {
  if (!map) {
    return;
  }

  const incidentSource = {
    type: "FeatureCollection" as const,
    features: props.visibleLayerIds.includes("incidents")
      ? props.features
          .filter((feature) => feature.kind === "incident")
          .map((feature) => ({
            type: "Feature" as const,
            properties: { id: feature.id },
            geometry: { type: "Point" as const, coordinates: [feature.lng, feature.lat] },
          }))
      : [],
  };

  setGeoJsonSource("demo-incidents", incidentSource);
  if (!map.getLayer("demo-incident-dots")) {
    map.addLayer({
      id: "demo-incident-dots",
      type: "symbol",
      source: "demo-incidents",
      layout: {
        "text-field": "▲",
        "text-size": 24,
      },
      paint: {
        "text-color": "#c97b63",
        "text-halo-color": "#fbf8f3",
        "text-halo-width": 2,
      },
    });
  }
}

function setGeoJsonSource(sourceId: string, data: Parameters<GeoJSONSource["setData"]>[0]): void {
  if (!map) {
    return;
  }

  const source = map.getSource(sourceId) as GeoJSONSource | undefined;
  if (source) {
    source.setData(data);
    return;
  }

  map.addSource(sourceId, {
    type: "geojson",
    data,
  });
}

function addLineLayer(layerId: string, sourceId: string, paint: Record<string, unknown>): void {
  if (!map || map.getLayer(layerId)) {
    return;
  }

  map.addLayer({
    id: layerId,
    type: "line",
    source: sourceId,
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint,
  });
}

function renderFeatureMarkers(): void {
  if (!map || !mapLibre) {
    return;
  }

  const runtime = mapLibre;
  clearFeatureMarkers();
  if (!props.visibleLayerIds.includes("metro")) {
    return;
  }

  featureMarkers = props.features
    .filter((feature) => feature.kind === "train" || feature.kind === "sensor")
    .filter((feature) => feature.kind !== "sensor" || props.visibleLayerIds.includes("pm25"))
    .map((feature) => {
      const marker = document.createElement("button");
      marker.type = "button";
      marker.className = "demo-map-marker";
      marker.dataset.tone = feature.tone;
      marker.dataset.selected = String(feature.id === props.selectedFeatureId);
      marker.innerHTML = `<span></span><strong>${feature.label}</strong>`;
      marker.addEventListener("click", () => emit("selectFeature", feature));

      return new runtime.Marker({ anchor: "center", element: marker })
        .setLngLat([feature.lng, feature.lat])
        .addTo(map as MapLibreMap);
    });
}

function clearFeatureMarkers(): void {
  for (const marker of featureMarkers) {
    marker.remove();
  }
  featureMarkers = [];
}

function setOfflineView(view: { scale: number; x: number; y: number }): void {
  mapView.value = view;
}

function zoomOffline(delta: number): void {
  mapView.value = {
    ...mapView.value,
    scale: Math.min(1.25, Math.max(0.82, mapView.value.scale + delta)),
  };
}

function markerStyle(feature: MapFeature): Record<string, string> {
  if (feature.kind === "train") {
    const offset = feature.id === "T1005" ? 0.08 : 0.46;
    const phase = (props.currentMinute / 220 + offset) % 1;
    const point = pointAlongPath(offlineTrainPaths[feature.source] ?? [], phase);
    return {
      left: `${point.x}%`,
      top: `${point.y}%`,
    };
  }

  return {
    left: `${feature.x}%`,
    top: `${feature.y}%`,
  };
}

function trainDirection(feature: MapFeature): string {
  return feature.id === "T1005" ? "↘" : "→";
}

function trainTooltip(feature: MapFeature): string {
  if (feature.id === "T1005") {
    return "Train no. T1005 · Tamsui-Xinyi · toward Tamsui · next Yuanshan";
  }

  return "Train no. T1014 · Bannan · westbound · next Ximen";
}

function pointAlongPath(path: ScreenPoint[], phase: number): ScreenPoint {
  if (path.length === 0) {
    return { x: 50, y: 50 };
  }

  if (path.length === 1) {
    return path[0];
  }

  const segmentCount = path.length - 1;
  const scaled = phase * segmentCount;
  const index = Math.min(segmentCount - 1, Math.floor(scaled));
  const local = scaled - index;
  const from = path[index];
  const to = path[index + 1];

  return {
    x: from.x + (to.x - from.x) * local,
    y: from.y + (to.y - from.y) * local,
  };
}
</script>

<template>
  <main class="map-stage">
    <img
      class="map-fallback"
      src="/twfoundry-demo/map-reference.png"
      alt=""
      aria-hidden="true"
      :style="fallbackStyle"
    />
    <div ref="mapElement" class="map-container" />

    <div v-if="visibleLayerIds.includes('rainfall')" class="rainfall-wash" aria-hidden="true" />

    <div class="map-badge">
      <span>View · Taiwan</span>
      <span>Proj · TWD97</span>
      <span>T · {{ currentTimeLabel }}</span>
    </div>

    <div class="zoom-card">
      <button type="button" @click="zoomOffline(0.06)">+</button>
      <button type="button" @click="zoomOffline(-0.06)">−</button>
      <button type="button" @click="setOfflineView({ scale: 1, x: -19, y: -5 })">Fit</button>
    </div>

    <div class="jump-card">
      <span>Jump to</span>
      <button type="button" @click="setOfflineView({ scale: 1.05, x: -22, y: -8 })">Taipei City</button>
      <button type="button" @click="setOfflineView({ scale: 1.16, x: -30, y: -18 })">Daan / Xinyi</button>
      <button type="button" @click="setOfflineView({ scale: 1.16, x: -8, y: -18 })">Banqiao</button>
      <button type="button" @click="setOfflineView({ scale: 1.2, x: -7, y: 2 })">Tamsui</button>
    </div>

    <div class="offline-markers">
      <button
        v-for="feature in visibleOfflineFeatures"
        :key="feature.id"
        type="button"
        class="offline-marker"
        :class="{ selected: feature.id === selectedFeatureId, train: feature.kind === 'train' }"
        :data-tone="feature.tone"
        :data-kind="feature.kind"
        :style="markerStyle(feature)"
        :aria-label="feature.kind === 'train' ? trainTooltip(feature) : feature.detail"
        @click="emit('selectFeature', feature)"
      >
        <template v-if="feature.kind === 'train'">
          <span class="train-pulse" aria-hidden="true" />
          <span class="train-dot" aria-hidden="true">
            <i />
          </span>
          <span class="train-arrow" aria-hidden="true">{{ trainDirection(feature) }}</span>
          <span class="train-tooltip" role="tooltip">
            <b>{{ feature.label }}</b>
            <em>{{ feature.source }}</em>
            <small>{{ feature.detail }}</small>
          </span>
        </template>
        <template v-else>
          <span class="non-train-dot" aria-hidden="true" />
          <strong>{{ feature.label }}</strong>
        </template>
      </button>
    </div>

    <div v-if="selectedFeature" class="selected-chip">
      <strong>{{ selectedFeature.label }}</strong>
      <span>{{ selectedFeature.source }}</span>
    </div>
  </main>
</template>

<style scoped>
.map-stage {
  position: relative;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  background: #b8c5d4;
}

.map-fallback {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 126%;
  height: 112%;
  object-fit: cover;
  object-position: center;
  filter: saturate(0.58) contrast(0.84) brightness(1.04);
  transition: transform 420ms ease;
  transform-origin: center;
}

.map-container {
  position: absolute;
  inset: 0;
  z-index: 1;
  opacity: 0;
  pointer-events: none;
}

.rainfall-wash {
  position: absolute;
  inset: 0;
  z-index: 2;
  background:
    radial-gradient(ellipse at 62% 34%, rgba(72, 95, 170, 0.28), transparent 36%),
    radial-gradient(ellipse at 52% 58%, rgba(72, 95, 170, 0.32), transparent 46%),
    linear-gradient(90deg, rgba(210, 225, 233, 0.16), rgba(78, 76, 163, 0.28));
  pointer-events: none;
  mix-blend-mode: multiply;
}

.map-badge,
.jump-card,
.zoom-card,
.selected-chip {
  position: absolute;
  z-index: 3;
  border: 1px solid var(--twf-color-border);
  background: rgba(251, 248, 243, 0.93);
  color: var(--twf-color-text);
  box-shadow: var(--twf-shadow-hairline);
}

.map-badge {
  top: 18px;
  left: 28px;
  display: flex;
  gap: 16px;
  padding: 9px 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.zoom-card {
  top: 18px;
  right: 28px;
  display: grid;
  width: 142px;
}

.zoom-card button,
.jump-card button {
  border: 0;
  border-bottom: 1px solid var(--twf-color-border);
  background: transparent;
  color: var(--twf-color-text);
  cursor: pointer;
  padding: 9px 12px;
}

.zoom-card button:last-child,
.jump-card button:last-child {
  border-bottom: 0;
}

.zoom-card button {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.88rem;
  text-transform: uppercase;
}

.jump-card {
  top: 176px;
  right: 28px;
  display: grid;
  min-width: 170px;
  padding: 10px 0;
}

.jump-card span {
  padding: 0 12px 5px;
  color: var(--twf-color-text-faint);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.66rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.jump-card button {
  text-align: left;
  font-size: 0.86rem;
}

.selected-chip {
  right: 210px;
  bottom: 34px;
  display: grid;
  gap: 2px;
  min-width: 138px;
  padding: 9px 12px;
}

.selected-chip strong {
  font-size: 0.9rem;
}

.selected-chip span {
  color: var(--twf-color-text-faint);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.66rem;
  text-transform: uppercase;
}

.offline-markers {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
}

.offline-marker {
  position: absolute;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  transform: translate(-50%, -50%);
  border: 1px solid rgba(31, 27, 23, 0.88);
  border-radius: 4px;
  background: var(--twf-color-surface-raised);
  padding: 5px 8px;
  color: var(--twf-color-text);
  cursor: pointer;
  filter: drop-shadow(0 4px 8px rgba(31, 27, 23, 0.24));
  pointer-events: auto;
  transition:
    left 220ms linear,
    top 220ms linear,
    box-shadow 140ms ease,
    transform 140ms ease;
}

.offline-marker.train {
  border: 0;
  background: transparent;
  padding: 0;
  filter: none;
}

.offline-marker:hover,
.offline-marker.selected {
  box-shadow: 0 0 0 5px rgba(201, 123, 99, 0.24);
}

.offline-marker.train:hover,
.offline-marker.train.selected {
  box-shadow: none;
}

.offline-marker:active {
  transform: translate(-50%, -50%) scale(0.96);
}

.non-train-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: currentColor;
}

.offline-marker strong {
  font-size: 0.78rem;
}

.train-dot {
  position: absolute;
  left: -14px;
  top: -14px;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 4px solid var(--twf-color-surface-raised);
  border-radius: 999px;
  background: currentColor;
  color: var(--twf-color-surface-raised);
  box-shadow:
    0 0 0 1px rgba(31, 27, 23, 0.58),
    0 5px 10px rgba(31, 27, 23, 0.28);
}

.train-dot i {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--twf-color-surface-raised);
}

.train-arrow {
  position: absolute;
  left: 10px;
  top: -17px;
  z-index: 3;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border: 1px solid rgba(31, 27, 23, 0.78);
  border-radius: 999px;
  background: var(--twf-color-surface-raised);
  color: var(--twf-color-text);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.82rem;
  font-weight: 900;
  line-height: 1;
  box-shadow: 0 3px 7px rgba(31, 27, 23, 0.2);
}

.train-pulse {
  position: absolute;
  left: -20px;
  top: -20px;
  z-index: 1;
  width: 40px;
  height: 40px;
  border: 2px solid currentColor;
  border-radius: 999px;
  opacity: 0.22;
  animation: train-pulse 1.4s ease-out infinite;
}

.train-tooltip {
  position: absolute;
  bottom: 22px;
  left: 50%;
  z-index: 6;
  display: grid;
  gap: 2px;
  min-width: 220px;
  transform: translateX(-50%) translateY(4px);
  border: 1px solid rgba(31, 27, 23, 0.82);
  border-radius: 3px;
  background: rgba(251, 248, 243, 0.98);
  padding: 8px 10px;
  color: var(--twf-color-text);
  font-family: var(--twf-font-family);
  opacity: 0;
  pointer-events: none;
  text-align: left;
  transition:
    opacity 120ms ease,
    transform 120ms ease;
}

.train-tooltip b {
  font-size: 0.82rem;
}

.train-tooltip em,
.train-tooltip small {
  color: var(--twf-color-text-muted);
  font-style: normal;
  font-size: 0.72rem;
}

.offline-marker.train:hover .train-tooltip,
.offline-marker.train:focus-visible .train-tooltip {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

@keyframes train-pulse {
  0% {
    opacity: 0.26;
    transform: scale(0.55);
  }

  100% {
    opacity: 0;
    transform: scale(1.2);
  }
}

.offline-marker[data-tone="red"] {
  color: var(--twf-color-route-red);
}

.offline-marker[data-tone="blue"] {
  color: var(--twf-color-route-blue);
}

.offline-marker[data-tone="orange"] {
  color: var(--twf-color-status-warning);
}

.offline-marker[data-tone="brown"] {
  color: #8c6322;
}

:global(.demo-map-marker) {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 1px solid rgba(31, 27, 23, 0.88);
  border-radius: 4px;
  background: var(--twf-color-surface-raised);
  padding: 5px 8px;
  color: var(--twf-color-text);
  cursor: pointer;
  filter: drop-shadow(0 4px 8px rgba(31, 27, 23, 0.24));
}

:global(.demo-map-marker[data-selected="true"]) {
  box-shadow: 0 0 0 5px rgba(201, 123, 99, 0.24);
}

:global(.demo-map-marker span) {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

:global(.demo-map-marker strong) {
  font-size: 0.78rem;
}

:global(.demo-map-marker[data-tone="red"] span) {
  background: var(--twf-color-route-red);
}

:global(.demo-map-marker[data-tone="blue"] span) {
  background: var(--twf-color-route-blue);
}

:global(.demo-map-marker[data-tone="orange"] span) {
  background: var(--twf-color-status-warning);
}

:global(.maplibregl-ctrl-group) {
  display: none;
}

@media (max-width: 760px) {
  .map-stage {
    min-height: 620px;
  }

  .map-badge {
    right: 14px;
    left: 14px;
    flex-wrap: wrap;
  }

  .zoom-card,
  .jump-card,
  .selected-chip {
    display: none;
  }
}
</style>
