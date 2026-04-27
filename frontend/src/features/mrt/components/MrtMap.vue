<script setup lang="ts">
import "maplibre-gl/dist/maplibre-gl.css";
import type * as MapLibreModule from "maplibre-gl";
import type {
  GeoJSONSource,
  LngLatLike,
  Map as MapLibreMap,
  Marker as MapLibreMarker,
} from "maplibre-gl";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useMrtDashboardStore } from "@/app/stores/mrt-dashboard";
import { appConfig } from "@/shared/config/env";
import { resolveMrtLineLabel } from "../line-names";
import { inferTrainMarkers } from "../map/inferred-trains";
import type { MrtLine, MrtStation } from "../types";

const props = defineProps<{
  lines: MrtLine[];
  stations: MrtStation[];
}>();

const store = useMrtDashboardStore();
const { locale, t } = useI18n();
const mapElement = ref<HTMLElement | null>(null);
const mapError = ref<string | undefined>();
const mapReady = ref(false);
const hoveredTrainId = ref<string | undefined>();
const hoveredTrainTooltip = ref<{ left: number; top: number } | null>(null);
type MapLibreRuntime = typeof MapLibreModule;
let mapLibreMap: MapLibreMap | undefined;
let mapLibreRuntime: MapLibreRuntime | undefined;
let mapLibreStationMarkers: MapLibreMarker[] = [];
let mapLibreTrainMarkers: MapLibreMarker[] = [];

const visibleStations = computed(() =>
  props.stations.filter((station) =>
    station.lineIds.some((lineId) => store.visibleLineIds.includes(lineId)),
  ),
);
const routeOverlayVisible = computed(() => store.visibleOverlayIds.includes("mrt-routes"));
const stationOverlayVisible = computed(() => store.visibleOverlayIds.includes("mrt-stations"));
const estimatedTrainOverlayVisible = computed(() =>
  store.visibleOverlayIds.includes("mrt-estimated-trains"),
);
const inferredTrains = computed(() =>
  inferTrainMarkers(store.displayedLiveBoards, props.stations, props.lines).filter((train) =>
    store.visibleLineIds.includes(train.lineId),
  ),
);
const selectedTrain = computed(() =>
  inferredTrains.value.find((train) => train.id === store.selectedTrainId),
);
const hoveredTrain = computed(() =>
  inferredTrains.value.find((train) => train.id === hoveredTrainId.value),
);

function lineLabel(line: MrtLine): string {
  return resolveMrtLineLabel(
    t,
    locale.value,
    line.id,
    store.displayedLiveBoards.find((row) => row.lineId === line.id)?.lineName,
  );
}

onMounted(() => {
  if (appConfig.mapProvider !== "maplibre") {
    return;
  }

  void initializeMapLibreMap();
});

onBeforeUnmount(() => {
  clearMapLibreMarkers();
  mapLibreMap?.remove();
  mapLibreMap = undefined;
});

watch(
  () => [props.lines, visibleStations.value, store.selectedStationId, store.displayedLiveBoards],
  () => {
    if (appConfig.mapProvider === "maplibre" && mapReady.value) {
      renderMapLibreOverlays();
    }
  },
  { deep: true },
);

watch(
  () => [store.selectedTrainId, inferredTrains.value],
  () => {
    if (appConfig.mapProvider === "maplibre" && mapReady.value) {
      renderMapLibreOverlays();
    }
  },
  { deep: true },
);

async function initializeMapLibreMap(): Promise<void> {
  if (!mapElement.value) {
    return;
  }

  try {
    const mapLibre = await import("maplibre-gl");
    mapLibreRuntime = mapLibre;
    mapLibreMap = new mapLibre.Map({
      attributionControl: false,
      bearing: 0,
      center: [121.5134, 25.044],
      container: mapElement.value,
      pitch: 45,
      style: appConfig.mapLibreStyle,
      zoom: 12,
    });

    mapLibreMap.addControl(new mapLibre.NavigationControl({ visualizePitch: true }), "top-right");
    mapLibreMap.addControl(new mapLibre.AttributionControl({ compact: true }), "bottom-left");
    mapLibreMap.on("load", () => {
      mapReady.value = true;
      mapError.value = undefined;
      renderMapLibreOverlays();
    });
    mapLibreMap.on("error", () => {
      mapError.value = t("dashboard.map.mapLibreLoadFailed");
    });
  } catch (error) {
    mapError.value =
      error instanceof Error ? error.message : t("dashboard.map.mapLibreUnknownError");
  }
}

function renderMapLibreOverlays(): void {
  if (!mapLibreMap) {
    return;
  }

  const map = mapLibreMap;
  renderMapLibreRoutes(map);
  clearMapLibreMarkers();

  mapLibreStationMarkers = stationOverlayVisible.value
    ? visibleStations.value.map((station) => createMapLibreStationMarker(map, station))
    : [];
  mapLibreTrainMarkers = estimatedTrainOverlayVisible.value
    ? inferredTrains.value.map((train) => createMapLibreTrainMarker(map, train))
    : [];

  focusSelectedTrain();
}

function renderMapLibreRoutes(map: MapLibreMap): void {
  const sourceId = "mrt-routes";
  const layerId = "mrt-routes-line";
  const routeGeoJson = {
    type: "FeatureCollection" as const,
    features: routeOverlayVisible.value
      ? props.lines
          .filter((line) => store.visibleLineIds.includes(line.id))
          .map((line) => ({
            type: "Feature" as const,
            properties: {
              color: line.color,
              id: line.id,
            },
            geometry: {
              type: "LineString" as const,
              coordinates: line.polyline.map((point) => [point.lng, point.lat]),
            },
          }))
      : [],
  };

  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, {
      type: "geojson",
      data: routeGeoJson,
    });
  } else {
    const source = map.getSource(sourceId) as GeoJSONSource;
    source.setData(routeGeoJson as Parameters<GeoJSONSource["setData"]>[0]);
  }

  if (!map.getLayer(layerId)) {
    map.addLayer({
      id: layerId,
      type: "line",
      source: sourceId,
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": ["get", "color"],
        "line-opacity": 0.9,
        "line-width": 5,
      },
    });
  }
}

function createMapLibreStationMarker(map: MapLibreMap, station: MrtStation): MapLibreMarker {
  if (!mapLibreRuntime) {
    throw new Error(t("dashboard.map.mapLibreUnknownError"));
  }

  const element = createMapLibreStationMarkerElement(station);
  element.addEventListener("click", () => store.selectStation(station.id));

  return new mapLibreRuntime.Marker({
    anchor: "center",
    element,
  })
    .setLngLat(toLngLat(station.position))
    .addTo(map);
}

function createMapLibreTrainMarker(
  map: MapLibreMap,
  train: ReturnType<typeof inferTrainMarkers>[number],
): MapLibreMarker {
  if (!mapLibreRuntime) {
    throw new Error(t("dashboard.map.mapLibreUnknownError"));
  }

  const element = createMapLibreTrainMarkerElement(train);
  bindTrainHover(element, train);
  element.addEventListener("click", () => store.selectTrain(train.id));

  return new mapLibreRuntime.Marker({
    anchor: "center",
    element,
  })
    .setLngLat(toLngLat(train.position))
    .addTo(map);
}

function createMapLibreStationMarkerElement(station: MrtStation): HTMLElement {
  const selected = station.id === store.selectedStationId;
  const marker = document.createElement("button");
  marker.type = "button";
  marker.className = "maplibre-station-marker";
  marker.dataset.selected = String(selected);
  marker.setAttribute("aria-label", t("dashboard.map.selectStation", { station: station.name }));
  marker.style.setProperty("--station-line-color", resolveStationColor(station));
  const dot = document.createElement("span");
  dot.className = "maplibre-station-marker-dot";
  marker.append(dot);
  if (selected) {
    const label = document.createElement("span");
    label.className = "maplibre-station-marker-label";
    label.textContent = station.name;
    marker.append(label);
  }
  return marker;
}

function createMapLibreTrainMarkerElement(
  train: ReturnType<typeof inferTrainMarkers>[number],
): HTMLElement {
  const marker = document.createElement("div");
  marker.className = "maplibre-train-marker";
  marker.dataset.status = train.status;
  marker.dataset.selected = String(store.selectedTrainId === train.id);
  marker.title = train.trainCode;
  marker.style.setProperty("--train-line-color", resolveLineColor(train.lineId));
  return marker;
}

function bindTrainHover(
  element: HTMLElement,
  train: ReturnType<typeof inferTrainMarkers>[number],
): void {
  element.addEventListener("mouseenter", (event) => {
    updateHoveredTrain(train, event);
  });
  element.addEventListener("mousemove", (event) => {
    updateHoveredTrain(train, event);
  });
  element.addEventListener("mouseleave", () => {
    clearHoveredTrain();
  });
}

function resolveStationColor(station: MrtStation): string {
  return resolveLineColor(station.lineIds[0]);
}

function resolveLineColor(lineId: string | undefined): string {
  return props.lines.find((line) => line.id === lineId)?.color ?? "var(--twf-color-route-red)";
}

function resolveMockTrainStyle(
  train: ReturnType<typeof inferTrainMarkers>[number],
): Record<string, string> {
  const stationIndex = visibleStations.value.findIndex((station) => station.id === train.stationId);
  if (stationIndex < 0) {
    return { display: "none" };
  }

  return {
    left: `${120 + ((stationIndex % 3) * 190) + train.layoutOffset.x}px`,
    top: `${140 + (Math.floor(stationIndex / 3) * 120) + train.layoutOffset.y}px`,
    "--train-line-color": resolveLineColor(train.lineId),
  };
}

function updateHoveredTrain(
  train: ReturnType<typeof inferTrainMarkers>[number],
  event: MouseEvent,
): void {
  hoveredTrainId.value = train.id;
  if (!mapElement.value) {
    hoveredTrainTooltip.value = null;
    return;
  }

  const bounds = mapElement.value.getBoundingClientRect();
  hoveredTrainTooltip.value = {
    left: event.clientX - bounds.left + 12,
    top: event.clientY - bounds.top - 14,
  };
}

function clearHoveredTrain(): void {
  hoveredTrainId.value = undefined;
  hoveredTrainTooltip.value = null;
}

function formatTrainTooltip(train: ReturnType<typeof inferTrainMarkers>[number]): string {
  return train.trainCode;
}

function focusSelectedTrain(): void {
  if (!mapLibreMap || !selectedTrain.value) {
    return;
  }

  mapLibreMap.easeTo({
    center: toLngLat(selectedTrain.value.position),
    duration: 500,
    zoom: Math.max(mapLibreMap.getZoom(), 14),
  });
}

function clearMapLibreMarkers(): void {
  for (const marker of mapLibreStationMarkers) {
    marker.remove();
  }
  for (const marker of mapLibreTrainMarkers) {
    marker.remove();
  }
  mapLibreStationMarkers = [];
  mapLibreTrainMarkers = [];
}

function toLngLat(position: { lat: number; lng: number }): LngLatLike {
  return [position.lng, position.lat];
}
</script>

<template>
  <div
    v-if="appConfig.mapProvider === 'mock'"
    ref="mapElement"
    class="mock-map"
    data-testid="mock-map"
  >
    <div
      v-if="routeOverlayVisible"
      class="mock-lines"
      :aria-label="t('dashboard.map.visibleLines')"
    >
      <div
        v-for="line in lines"
        :key="line.id"
        class="mock-line"
        :style="{ '--line-color': line.color }"
      >
        {{ lineLabel(line) }}
      </div>
    </div>

    <button
      v-for="(station, index) in stationOverlayVisible ? visibleStations : []"
      :key="station.id"
      type="button"
      class="station-marker"
      :class="{ selected: store.selectedStationId === station.id }"
      :style="{
        left: `${120 + ((index % 3) * 190)}px`,
        top: `${140 + (Math.floor(index / 3) * 120)}px`
      }"
      :aria-label="t('dashboard.map.selectStation', { station: station.name })"
      :data-testid="`station-${station.id}`"
      @click="store.selectStation(station.id)"
    >
      {{ station.name }}
    </button>

    <div
      v-for="train in estimatedTrainOverlayVisible ? inferredTrains : []"
      :key="train.id"
      class="train-circle"
      :class="{ selected: store.selectedTrainId === train.id }"
      :style="resolveMockTrainStyle(train)"
      :data-testid="`train-${train.id}`"
      :title="train.trainCode"
      @mouseenter="updateHoveredTrain(train, $event)"
      @mousemove="updateHoveredTrain(train, $event)"
      @mouseleave="clearHoveredTrain()"
      @click="store.selectTrain(train.id)"
    />

    <div
      v-if="hoveredTrain && hoveredTrainTooltip"
      class="train-tooltip"
      :style="{
        left: `${hoveredTrainTooltip.left}px`,
        top: `${hoveredTrainTooltip.top}px`
      }"
      data-testid="train-tooltip"
    >
      {{ formatTrainTooltip(hoveredTrain) }}
    </div>

    <aside class="map-legend" :aria-label="t('dashboard.map.overlaySpec')">
      <h2>{{ t("dashboard.map.overlayTitle") }}</h2>
      <p v-for="line in lines" :key="line.id">
        <span class="legend-line" :style="{ '--line-color': line.color }" aria-hidden="true" />
        {{ t("dashboard.map.polyline", { line: lineLabel(line) }) }}
      </p>
      <p>
        <span class="legend-dot" aria-hidden="true" />
        {{ t("dashboard.map.marker") }}
      </p>
      <p>
        <span class="legend-dot selected" aria-hidden="true" />
        {{ t("dashboard.map.selectedMarker") }}
      </p>
      <p>
        <span class="legend-train" aria-hidden="true" />
        {{ t("dashboard.map.estimatedTrain") }}
      </p>
    </aside>

    <div class="coords">25.0440, 121.5134 z12<br />tilt 45 bearing 0</div>
  </div>

  <div v-else class="maplibre-map-shell">
    <div ref="mapElement" class="maplibre-map" data-testid="maplibre-map" />
    <div
      v-if="hoveredTrain && hoveredTrainTooltip"
      class="train-tooltip"
      :style="{
        left: `${hoveredTrainTooltip.left}px`,
        top: `${hoveredTrainTooltip.top}px`
      }"
      data-testid="train-tooltip"
    >
      {{ formatTrainTooltip(hoveredTrain) }}
    </div>
    <p v-if="mapError" class="map-error">{{ mapError }}</p>
  </div>
</template>

<style scoped>
.mock-map,
.maplibre-map-shell {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 100%;
  overflow: hidden;
  background:
    radial-gradient(circle at 22% 28%, rgba(196, 212, 224, 0.8) 0 11%, transparent 12%),
    radial-gradient(circle at 78% 42%, rgba(205, 224, 203, 0.8) 0 13%, transparent 14%),
    linear-gradient(120deg, transparent 0 18%, rgba(212, 207, 191, 0.72) 18% 19%, transparent 19% 100%),
    linear-gradient(40deg, transparent 0 34%, rgba(212, 207, 191, 0.72) 34% 35%, transparent 35% 100%),
    var(--twf-color-map-canvas);
  background-size: auto, auto, 160px 160px, 220px 220px, auto;
}

.maplibre-map {
  position: absolute;
  inset: 0;
}

:global(.maplibre-station-marker) {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
}

:global(.maplibre-station-marker-dot) {
  width: 12px;
  height: 12px;
  border: 2px solid #fffaf2;
  border-radius: 50%;
  background: var(--station-line-color);
  box-shadow:
    0 0 0 5px color-mix(in srgb, var(--station-line-color) 18%, transparent),
    var(--twf-shadow-floating);
}

:global(.maplibre-station-marker-label) {
  max-width: 148px;
  border: 2px solid var(--station-line-color);
  border-radius: 8px;
  padding: 6px 9px;
  background: var(--twf-color-surface-raised);
  color: var(--twf-color-text);
  font: 700 0.78rem Inter, ui-sans-serif, system-ui, sans-serif;
  box-shadow: var(--twf-shadow-floating);
}

:global(.maplibre-station-marker[data-selected="true"] .maplibre-station-marker-dot) {
  box-shadow:
    0 0 0 3px #fffaf2,
    0 0 0 9px color-mix(in srgb, var(--station-line-color) 24%, transparent),
    var(--twf-shadow-floating);
}

:global(.maplibre-station-marker[data-selected="true"] .maplibre-station-marker-label) {
  border-color: var(--twf-color-route-blue);
  box-shadow:
    var(--twf-shadow-route-blue-ring),
    var(--twf-shadow-floating);
}

:global(.maplibre-train-marker) {
  width: 16px;
  height: 16px;
  border: 2px solid #fffaf2;
  border-radius: 50%;
  background: var(--train-line-color);
  box-shadow:
    0 0 0 5px color-mix(in srgb, var(--train-line-color) 18%, transparent),
    var(--twf-shadow-floating);
}

:global(.maplibre-train-marker[data-status="approaching"]) {
  box-shadow:
    0 0 0 7px color-mix(in srgb, var(--train-line-color) 24%, transparent),
    var(--twf-shadow-floating);
}

:global(.maplibre-train-marker[data-selected="true"]) {
  box-shadow:
    0 0 0 4px #fffaf2,
    0 0 0 10px color-mix(in srgb, var(--train-line-color) 26%, transparent),
    var(--twf-shadow-floating);
}

.mock-lines {
  position: absolute;
  top: 45%;
  left: 16%;
  width: 66%;
  height: 220px;
  pointer-events: none;
}

.mock-line {
  position: absolute;
  left: 0;
  width: 100%;
  height: 5px;
  transform-origin: left center;
  border-radius: 999px;
  background: var(--line-color);
  color: var(--twf-color-text);
  font-size: 0;
  box-shadow: 0 0 0 5px color-mix(in srgb, var(--line-color) 20%, transparent);
}

.mock-line:nth-child(1) {
  top: 20px;
  transform: rotate(-18deg);
}

.mock-line:nth-child(2) {
  top: 112px;
  transform: rotate(5deg);
}

.mock-line:nth-child(3) {
  top: 188px;
  transform: rotate(20deg);
}

.station-marker {
  position: absolute;
  max-width: 140px;
  min-height: 34px;
  transform: translate(-50%, -50%);
  border: 2px solid var(--twf-color-route-red);
  border-radius: var(--twf-radius-md);
  padding: 6px 9px;
  background: var(--twf-color-surface-raised);
  color: var(--twf-color-text);
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 700;
  box-shadow: var(--twf-shadow-floating);
}

.station-marker.selected {
  border-color: var(--twf-color-route-blue);
  background: var(--twf-color-surface-raised);
  box-shadow:
    var(--twf-shadow-route-blue-ring),
    var(--twf-shadow-floating);
}

.train-circle {
  position: absolute;
  width: 16px;
  height: 16px;
  transform: translate(-50%, -50%);
  border: 2px solid #fffaf2;
  border-radius: 50%;
  background: var(--train-line-color);
  box-shadow:
    0 0 0 5px color-mix(in srgb, var(--train-line-color) 18%, transparent),
    var(--twf-shadow-floating);
}

.train-circle.selected {
  box-shadow:
    0 0 0 3px #fffaf2,
    0 0 0 9px color-mix(in srgb, var(--train-line-color) 24%, transparent),
    var(--twf-shadow-floating);
}

.train-tooltip {
  position: absolute;
  z-index: 8;
  max-width: 220px;
  border: 1px solid var(--twf-color-border);
  border-radius: 8px;
  padding: 6px 10px;
  background: color-mix(in srgb, var(--twf-color-surface-raised) 94%, white);
  color: var(--twf-color-text);
  box-shadow: var(--twf-shadow-floating);
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1.35;
  pointer-events: none;
  transform: translateY(-100%);
  white-space: nowrap;
}

.map-legend {
  position: absolute;
  right: 18px;
  bottom: 18px;
  z-index: 2;
  width: min(286px, calc(100% - 36px));
  border: 1px solid var(--twf-color-border);
  border-radius: var(--twf-radius-md);
  padding: 12px;
  background: color-mix(in srgb, var(--twf-color-surface) 92%, transparent);
  color: var(--twf-color-text-muted);
  box-shadow: var(--twf-shadow-panel);
}

.map-legend h2 {
  margin: 0 0 9px;
  color: var(--twf-color-text);
  font-size: 0.76rem;
}

.map-legend p {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 7px 0;
  font-size: 0.72rem;
}

.legend-line {
  width: 30px;
  height: 4px;
  border-radius: 999px;
  background: var(--line-color);
}

.legend-dot {
  width: 11px;
  height: 11px;
  border: 2px solid var(--twf-color-route-red);
  border-radius: 50%;
  background: var(--twf-color-surface-raised);
}

.legend-dot.selected {
  box-shadow: var(--twf-shadow-route-red-ring);
}

.legend-train {
  width: 12px;
  height: 12px;
  border: 2px solid #fffaf2;
  border-radius: 50%;
  background: var(--twf-color-route-blue);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--twf-color-route-blue) 16%, transparent);
}

.coords {
  position: absolute;
  right: 18px;
  top: 18px;
  border: 1px solid var(--twf-color-border);
  border-radius: var(--twf-radius-md);
  padding: 9px 10px;
  background: color-mix(in srgb, var(--twf-color-surface) 82%, transparent);
  color: var(--twf-color-text-muted);
  font-size: 0.7rem;
  line-height: 1.45;
  text-align: right;
}

.map-error {
  position: absolute;
  right: 18px;
  bottom: 18px;
  max-width: 360px;
  border-radius: var(--twf-radius-md);
  padding: 12px 14px;
  background: var(--twf-color-map-error-bg);
  color: var(--twf-color-map-error);
  box-shadow: var(--twf-shadow-floating);
}

@media (max-width: 639px) {
  .mock-map,
  .maplibre-map-shell {
    height: 100%;
    min-height: 100%;
  }

  .map-legend,
  .coords {
    display: none;
  }
}
</style>
