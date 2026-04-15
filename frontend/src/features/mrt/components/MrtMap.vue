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

const visibleStations = computed(() =>
  props.stations.filter((station) =>
    station.lineIds.some((lineId) => store.visibleLineIds.includes(lineId))
  )
);

onMounted(() => {
  if (appConfig.mapProvider !== "google") {
    return;
  }

  void initializeGoogleMap();
});

watch(
  () => [props.lines, visibleStations.value],
  () => {
    if (appConfig.mapProvider === "google" && googleReady.value) {
      void initializeGoogleMap();
    }
  },
  { deep: true }
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
    const google = await loadGoogleMaps(appConfig.googleMapsApiKey);
    const map = new google.maps.Map(mapElement.value, {
      center: { lat: 25.0418, lng: 121.5359 },
      zoom: 13,
      disableDefaultUI: true,
      gestureHandling: "greedy"
    });

    for (const line of props.lines) {
      new google.maps.Polyline({
        map,
        path: line.polyline,
        strokeColor: line.color,
        strokeOpacity: 0.95,
        strokeWeight: 5
      });
    }

    for (const station of visibleStations.value) {
      const marker = new google.maps.Marker({
        map,
        position: station.position,
        title: station.name
      });
      marker.addListener("click", () => store.selectStation(station.id));
    }

    googleReady.value = true;
    mapError.value = undefined;
  } catch (error) {
    mapError.value = error instanceof Error ? error.message : "Unable to load Google Maps.";
  }
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
  script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
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
    Map: new (element: HTMLElement, options: Record<string, unknown>) => unknown;
    Marker: new (options: Record<string, unknown>) => {
      addListener: (eventName: string, listener: () => void) => void;
    };
    Polyline: new (options: Record<string, unknown>) => unknown;
  };
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
  min-height: 100vh;
  overflow: hidden;
  background:
    linear-gradient(rgba(255, 255, 255, 0.42) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.42) 1px, transparent 1px),
    #dce6e6;
  background-size: 42px 42px;
}

.google-map {
  position: absolute;
  inset: 0;
}

.mock-lines {
  position: absolute;
  right: 18px;
  bottom: 18px;
  left: 18px;
  display: grid;
  gap: 8px;
  max-width: 520px;
}

.mock-line {
  height: 12px;
  border-radius: 8px;
  background: var(--line-color);
  color: #202124;
  font-size: 0;
  box-shadow: 0 6px 18px rgba(32, 33, 36, 0.12);
}

.station-marker {
  position: absolute;
  max-width: 140px;
  min-height: 34px;
  transform: translate(-50%, -50%);
  border: 2px solid #202124;
  border-radius: 8px;
  padding: 6px 9px;
  background: #ffffff;
  color: #202124;
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 700;
  box-shadow: 0 8px 20px rgba(32, 33, 36, 0.16);
}

.station-marker.selected {
  border-color: #006b5f;
  background: #e8f3ef;
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
  box-shadow: 0 8px 22px rgba(32, 33, 36, 0.16);
}

@media (max-width: 840px) {
  .mock-map,
  .google-map-shell {
    min-height: 520px;
  }
}
</style>
