<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useMrtDashboardStore } from "@/app/stores/mrt-dashboard";
import { appConfig } from "@/shared/config/env";
import type { MrtLine, MrtStation } from "../types";

const props = defineProps<{
  lines: MrtLine[];
  stations: MrtStation[];
}>();

const store = useMrtDashboardStore();
const mapElement = ref<HTMLElement | null>(null);
const mapError = ref<string | undefined>();
const googleReady = ref(false);
let googleMap: GoogleMapInstance | undefined;
let googleApi: GoogleMapsGlobal | undefined;
let googleMarkerLibrary: GoogleMarkerLibrary | undefined;
let googlePolylines: GooglePolylineInstance[] = [];
let googleMarkers: GoogleAdvancedMarkerInstance[] = [];

const visibleStations = computed(() =>
  props.stations.filter((station) =>
    station.lineIds.some((lineId) => store.visibleLineIds.includes(lineId)),
  ),
);

onMounted(() => {
  if (appConfig.mapProvider !== "google") {
    return;
  }

  void initializeGoogleMap();
});

watch(
  () => [props.lines, visibleStations.value, store.selectedStationId],
  () => {
    if (appConfig.mapProvider === "google" && googleReady.value) {
      renderGoogleMapOverlays();
    }
  },
  { deep: true },
);

async function initializeGoogleMap(): Promise<void> {
  if (!mapElement.value) {
    return;
  }

  if (!appConfig.googleMapsApiKey) {
    mapError.value = "Set VITE_GOOGLE_MAPS_API_KEY to use Google Maps.";
    return;
  }

  try {
    googleApi = await loadGoogleMaps(appConfig.googleMapsApiKey);
    googleMarkerLibrary = await googleApi.maps.importLibrary("marker");
    googleMap = new googleApi.maps.Map(mapElement.value, {
      center: { lat: 25.044, lng: 121.5134 },
      zoom: 12,
      tilt: 45,
      mapId: appConfig.googleMapsMapId,
      disableDefaultUI: true,
      gestureHandling: "greedy",
    });

    new googleApi.maps.TransitLayer().setMap(googleMap);
    renderGoogleMapOverlays();

    googleReady.value = true;
    mapError.value = undefined;
  } catch (error) {
    mapError.value = error instanceof Error ? error.message : "Unable to load Google Maps.";
  }
}

function renderGoogleMapOverlays(): void {
  if (!googleMap || !googleApi || !googleMarkerLibrary) {
    return;
  }

  const map = googleMap;
  const google = googleApi;
  const markerLibrary = googleMarkerLibrary;

  for (const polyline of googlePolylines) {
    polyline.setMap(null);
  }

  for (const marker of googleMarkers) {
    marker.map = null;
  }

  googlePolylines = props.lines.map((line) => {
    return new google.maps.Polyline({
      map,
      path: line.polyline,
      strokeColor: line.color,
      strokeOpacity: 0.92,
      strokeWeight: 5,
      zIndex: 20,
    });
  });

  googleMarkers = visibleStations.value.map((station) => {
    const marker = new markerLibrary.AdvancedMarkerElement({
      map,
      position: station.position,
      title: station.name,
      content: createGoogleStationMarker(station),
      zIndex: station.id === store.selectedStationId ? 40 : 30,
    });
    marker.addListener("click", () => store.selectStation(station.id));
    return marker;
  });
}

function createGoogleStationMarker(station: MrtStation): HTMLElement {
  const marker = document.createElement("button");
  marker.type = "button";
  marker.className = "google-station-marker";
  marker.dataset.selected = String(station.id === store.selectedStationId);
  marker.textContent = station.name;
  marker.setAttribute("aria-label", `Select ${station.name}`);
  marker.style.setProperty("--station-line-color", resolveStationColor(station));
  return marker;
}

function resolveStationColor(station: MrtStation): string {
  const primaryLineId = station.lineIds[0];
  return props.lines.find((line) => line.id === primaryLineId)?.color ?? "#d92d3a";
}

function loadGoogleMaps(apiKey: string): Promise<GoogleMapsGlobal> {
  const existing = window.google;
  if (existing?.maps) {
    return Promise.resolve(existing);
  }

  const scriptId = "google-maps-js";
  const currentScript = document.getElementById(scriptId);
  if (currentScript) {
    return waitForGoogleMaps();
  }

  const script = document.createElement("script");
  script.id = scriptId;
  script.async = true;
  script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async`;
  script.onerror = () => {
    mapError.value = "Google Maps script failed to load.";
  };
  document.head.appendChild(script);

  return waitForGoogleMaps();
}

function waitForGoogleMaps(): Promise<GoogleMapsGlobal> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      if (window.google?.maps) {
        window.clearInterval(interval);
        resolve(window.google);
        return;
      }

      if (Date.now() - startedAt > 8000) {
        window.clearInterval(interval);
        reject(new Error("Google Maps did not become available."));
      }
    }, 50);
  });
}

interface GoogleMapsGlobal {
  maps: {
    importLibrary: (name: "marker") => Promise<GoogleMarkerLibrary>;
    Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMapInstance;
    Polyline: new (options: Record<string, unknown>) => GooglePolylineInstance;
    TransitLayer: new () => {
      setMap: (map: GoogleMapInstance) => void;
    };
  };
}

type GoogleMapInstance = object;

interface GooglePolylineInstance {
  setMap: (map: GoogleMapInstance | null) => void;
}

interface GoogleAdvancedMarkerInstance {
  map: GoogleMapInstance | null;
  addListener: (eventName: "click", listener: () => void) => void;
}

interface GoogleMarkerLibrary {
  AdvancedMarkerElement: new (options: Record<string, unknown>) => GoogleAdvancedMarkerInstance;
}

declare global {
  interface Window {
    google?: GoogleMapsGlobal;
  }
}
</script>

<template>
  <div v-if="appConfig.mapProvider === 'mock'" class="mock-map" data-testid="mock-map">
    <div class="mock-lines" aria-label="Visible MRT lines">
      <div
        v-for="line in lines"
        :key="line.id"
        class="mock-line"
        :style="{ '--line-color': line.color }"
      >
        {{ line.name }}
      </div>
    </div>

    <button
      v-for="(station, index) in visibleStations"
      :key="station.id"
      type="button"
      class="station-marker"
      :class="{ selected: store.selectedStationId === station.id }"
      :style="{
        left: `${120 + ((index % 3) * 190)}px`,
        top: `${140 + (Math.floor(index / 3) * 120)}px`
      }"
      :aria-label="`Select ${station.name}`"
      :data-testid="`station-${station.id}`"
      @click="store.selectStation(station.id)"
    >
      {{ station.name }}
    </button>

    <aside class="map-legend" aria-label="Map overlay specification">
      <h2>Map Overlay Spec</h2>
      <p v-for="line in lines" :key="line.id">
        <span class="legend-line" :style="{ '--line-color': line.color }" aria-hidden="true" />
        {{ line.name }} · Polyline · weight 4
      </p>
      <p>
        <span class="legend-dot" aria-hidden="true" />
        Station marker · white + line border
      </p>
      <p>
        <span class="legend-dot selected" aria-hidden="true" />
        Selected station · pulse ring
      </p>
    </aside>

    <div class="coords">25.0440, 121.5134 z12<br />tilt 45 bearing 0</div>
  </div>

  <div v-else class="google-map-shell">
    <div ref="mapElement" class="google-map" data-testid="google-map" />
    <p v-if="mapError" class="map-error">{{ mapError }}</p>
  </div>
</template>

<style scoped>
.mock-map,
.google-map-shell {
  position: relative;
  width: 100%;
  min-height: 100%;
  overflow: hidden;
  background:
    radial-gradient(circle at 22% 28%, rgba(196, 212, 224, 0.8) 0 11%, transparent 12%),
    radial-gradient(circle at 78% 42%, rgba(205, 224, 203, 0.8) 0 13%, transparent 14%),
    linear-gradient(120deg, transparent 0 18%, rgba(212, 207, 191, 0.72) 18% 19%, transparent 19% 100%),
    linear-gradient(40deg, transparent 0 34%, rgba(212, 207, 191, 0.72) 34% 35%, transparent 35% 100%),
    #e6e2d8;
  background-size: auto, auto, 160px 160px, 220px 220px, auto;
}

.google-map {
  position: absolute;
  inset: 0;
}

:global(.google-station-marker) {
  max-width: 140px;
  min-height: 34px;
  border: 2px solid var(--station-line-color);
  border-radius: 8px;
  padding: 6px 9px;
  background: #ffffff;
  color: #26241e;
  cursor: pointer;
  font: 700 0.78rem Inter, ui-sans-serif, system-ui, sans-serif;
  box-shadow: 0 8px 20px rgba(38, 36, 30, 0.16);
}

:global(.google-station-marker[data-selected="true"]) {
  border-color: #2f6fd6;
  box-shadow:
    0 0 0 5px rgba(47, 111, 214, 0.2),
    0 8px 20px rgba(38, 36, 30, 0.16);
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
  color: #26241e;
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
  border: 2px solid #d92d3a;
  border-radius: 8px;
  padding: 6px 9px;
  background: #ffffff;
  color: #26241e;
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 700;
  box-shadow: 0 8px 20px rgba(38, 36, 30, 0.16);
}

.station-marker.selected {
  border-color: #2f6fd6;
  background: #ffffff;
  box-shadow:
    0 0 0 5px rgba(47, 111, 214, 0.2),
    0 8px 20px rgba(38, 36, 30, 0.16);
}

.map-legend {
  position: absolute;
  right: 18px;
  bottom: 18px;
  z-index: 2;
  width: min(286px, calc(100% - 36px));
  border: 1px solid #ddd9ce;
  border-radius: 8px;
  padding: 12px;
  background: rgba(250, 250, 247, 0.92);
  color: #6b6557;
  box-shadow: 0 10px 28px rgba(38, 36, 30, 0.12);
}

.map-legend h2 {
  margin: 0 0 9px;
  color: #26241e;
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
  border: 2px solid #d92d3a;
  border-radius: 50%;
  background: #ffffff;
}

.legend-dot.selected {
  box-shadow: 0 0 0 3px rgba(217, 45, 58, 0.2);
}

.coords {
  position: absolute;
  right: 18px;
  top: 18px;
  border: 1px solid #ddd9ce;
  border-radius: 8px;
  padding: 9px 10px;
  background: rgba(250, 250, 247, 0.82);
  color: #6b6557;
  font-size: 0.7rem;
  line-height: 1.45;
  text-align: right;
}

.map-error {
  position: absolute;
  right: 18px;
  bottom: 18px;
  max-width: 360px;
  border-radius: 8px;
  padding: 12px 14px;
  background: #fff4d8;
  color: #684600;
  box-shadow: 0 8px 22px rgba(38, 36, 30, 0.16);
}

@media (max-width: 840px) {
  .mock-map,
  .google-map-shell {
    min-height: 520px;
  }

  .map-legend,
  .coords {
    display: none;
  }
}
</style>
