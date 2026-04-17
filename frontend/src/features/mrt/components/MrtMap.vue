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
let googleMarkers: GoogleMarkerInstance[] = [];

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
    googleMarkerLibrary = await loadGoogleMarkerLibrary(googleApi);
    const GoogleMap = googleApi.maps.Map;
    if (!GoogleMap) {
      throw new Error("Google Maps library is not available.");
    }

    googleMap = new GoogleMap(mapElement.value, {
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
  if (!googleMap || !googleApi) {
    return;
  }

  const map = googleMap;
  const google = googleApi;
  const markerLibrary = googleMarkerLibrary;

  for (const marker of googleMarkers) {
    marker.setMap(null);
  }

  googleMarkers = visibleStations.value.map((station) => {
    const marker = createGoogleMapMarker(google, markerLibrary, map, station);
    marker.addListener("click", () => store.selectStation(station.id));
    return marker;
  });
}

function createGoogleMapMarker(
  google: GoogleMapsGlobal,
  markerLibrary: GoogleMarkerLibrary | undefined,
  map: GoogleMapInstance,
  station: MrtStation,
): GoogleMarkerInstance {
  if (markerLibrary) {
    const marker = new markerLibrary.AdvancedMarkerElement({
      map,
      position: station.position,
      title: station.name,
      content: createGoogleStationMarker(station),
      zIndex: station.id === store.selectedStationId ? 40 : 30,
    });

    return {
      addListener: marker.addListener.bind(marker),
      setMap: (nextMap) => {
        marker.map = nextMap;
      },
    };
  }

  return new google.maps.Marker({
    label: {
      color: readDesignToken("--twf-color-text", "#1f1b17"),
      fontWeight: "700",
      text: station.name,
    },
    map,
    position: station.position,
    title: station.name,
    zIndex: station.id === store.selectedStationId ? 40 : 30,
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
  return (
    props.lines.find((line) => line.id === primaryLineId)?.color ?? "var(--twf-color-route-red)"
  );
}

function readDesignToken(token: string, fallback: string): string {
  const value = window.getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return value || fallback;
}

function loadGoogleMaps(apiKey: string): Promise<GoogleMapsGlobal> {
  const existing = window.google;
  if (existing?.maps?.Map) {
    return Promise.resolve(existing);
  }

  if (existing?.maps?.importLibrary) {
    return ensureGoogleMapsLibrary(existing);
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

async function ensureGoogleMapsLibrary(google: GoogleMapsGlobal): Promise<GoogleMapsGlobal> {
  if (google.maps.Map) {
    return google;
  }

  if (!google.maps.importLibrary) {
    throw new Error("Google Maps library is not available.");
  }

  const mapsLibrary = await google.maps.importLibrary("maps");
  google.maps.Map = mapsLibrary.Map;
  return google;
}

async function loadGoogleMarkerLibrary(
  google: GoogleMapsGlobal,
): Promise<GoogleMarkerLibrary | undefined> {
  if (!google.maps.importLibrary) {
    return undefined;
  }

  return google.maps.importLibrary("marker");
}

function waitForGoogleMaps(): Promise<GoogleMapsGlobal> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      const google = window.google;
      if (google?.maps?.Map) {
        window.clearInterval(interval);
        resolve(google);
        return;
      }

      if (google?.maps?.importLibrary) {
        window.clearInterval(interval);
        ensureGoogleMapsLibrary(google).then(resolve, reject);
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
    importLibrary?: GoogleImportLibrary;
    Map?: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMapInstance;
    Marker: new (options: Record<string, unknown>) => GoogleLegacyMarkerInstance;
    TransitLayer: new () => {
      setMap: (map: GoogleMapInstance) => void;
    };
  };
}

type GoogleMapInstance = object;

interface GoogleImportLibrary {
  (name: "maps"): Promise<GoogleMapsLibrary>;
  (name: "marker"): Promise<GoogleMarkerLibrary>;
}

interface GoogleMapsLibrary {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMapInstance;
}

interface GoogleAdvancedMarkerInstance {
  map: GoogleMapInstance | null;
  addListener: (eventName: "click", listener: () => void) => void;
}

interface GoogleMarkerLibrary {
  AdvancedMarkerElement: new (options: Record<string, unknown>) => GoogleAdvancedMarkerInstance;
}

interface GoogleLegacyMarkerInstance {
  addListener: (eventName: "click", listener: () => void) => void;
  setMap: (map: GoogleMapInstance | null) => void;
}

interface GoogleMarkerInstance {
  addListener: (eventName: "click", listener: () => void) => void;
  setMap: (map: GoogleMapInstance | null) => void;
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
    var(--twf-color-map-canvas);
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
  background: var(--twf-color-surface-raised);
  color: var(--twf-color-text);
  cursor: pointer;
  font: 700 0.78rem Inter, ui-sans-serif, system-ui, sans-serif;
  box-shadow: var(--twf-shadow-floating);
}

:global(.google-station-marker[data-selected="true"]) {
  border-color: var(--twf-color-route-blue);
  box-shadow:
    var(--twf-shadow-route-blue-ring),
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
  .google-map-shell {
    min-height: 520px;
  }

  .map-legend,
  .coords {
    display: none;
  }
}
</style>
