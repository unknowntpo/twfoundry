<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { TAIPEI_DIORAMA_SURFACE_VIEW } from './geoProjection.js';
import { mrtRouteGeoJson, mrtStationGeoJson } from './mrtMapData.js';

const props = defineProps({
  visible: {
    type: Boolean,
    default: true,
  },
  mrtVisible: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(['status']);

const mapEl = ref(null);
let map = null;
let loaded = false;

const mrtLayerIds = [
  'twf-mrt-route-glow',
  'twf-mrt-route-casing',
  'twf-mrt-route-line',
  'twf-mrt-station-halo',
  'twf-mrt-station-dot',
  'twf-mrt-station-label',
];

function applySakuraStyleOverride() {
  if (!map || !loaded) return;

  map.getStyle().layers?.forEach((layer) => {
    try {
      if (layer.type === 'background') {
        map.setPaintProperty(layer.id, 'background-color', '#FFF7FA');
      }
      if (layer.type === 'fill') {
        map.setPaintProperty(layer.id, 'fill-color', [
          'match',
          ['get', 'class'],
          'park',
          '#DDECCF',
          'water',
          '#BFE8F4',
          'landcover',
          '#F9E8EF',
          '#FFF7FA',
        ]);
        map.setPaintProperty(layer.id, 'fill-opacity', 0.82);
      }
      if (layer.type === 'line') {
        map.setPaintProperty(layer.id, 'line-opacity', 0.48);
      }
      if (layer.type === 'symbol') {
        map.setPaintProperty(layer.id, 'text-opacity', 0.64);
        map.setPaintProperty(layer.id, 'text-color', '#6F5060');
        map.setPaintProperty(layer.id, 'text-halo-color', '#FFF9FB');
        map.setPaintProperty(layer.id, 'text-halo-width', 1.1);
      }
    } catch {
      // MapLibre styles differ by provider; unsupported paint properties are skipped.
    }
  });
}

function setMrtVisibility(visible) {
  if (!map || !loaded) return;
  const value = visible ? 'visible' : 'none';
  mrtLayerIds.forEach((id) => {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', value);
  });
}

function addMrtOverlay() {
  if (!map || map.getSource('twf-mrt-routes')) return;

  map.addSource('twf-mrt-routes', {
    type: 'geojson',
    data: mrtRouteGeoJson,
  });
  map.addSource('twf-mrt-stations', {
    type: 'geojson',
    data: mrtStationGeoJson,
  });

  map.addLayer({
    id: 'twf-mrt-route-glow',
    type: 'line',
    source: 'twf-mrt-routes',
    paint: {
      'line-color': ['get', 'color'],
      'line-width': 15,
      'line-opacity': 0.18,
      'line-blur': 5,
    },
  });

  map.addLayer({
    id: 'twf-mrt-route-casing',
    type: 'line',
    source: 'twf-mrt-routes',
    paint: {
      'line-color': '#FFF9FB',
      'line-width': 8,
      'line-opacity': 0.86,
    },
  });

  map.addLayer({
    id: 'twf-mrt-route-line',
    type: 'line',
    source: 'twf-mrt-routes',
    paint: {
      'line-color': ['get', 'color'],
      'line-width': 4,
      'line-opacity': 0.94,
    },
  });

  map.addLayer({
    id: 'twf-mrt-station-halo',
    type: 'circle',
    source: 'twf-mrt-stations',
    paint: {
      'circle-radius': 8,
      'circle-color': '#FFF9FB',
      'circle-opacity': 0.82,
      'circle-stroke-color': ['get', 'color'],
      'circle-stroke-width': 1.5,
      'circle-stroke-opacity': 0.42,
    },
  });

  map.addLayer({
    id: 'twf-mrt-station-dot',
    type: 'circle',
    source: 'twf-mrt-stations',
    paint: {
      'circle-radius': 4.2,
      'circle-color': ['get', 'color'],
      'circle-opacity': 0.92,
      'circle-stroke-color': '#FFF9FB',
      'circle-stroke-width': 2,
    },
  });

  map.addLayer({
    id: 'twf-mrt-station-label',
    type: 'symbol',
    source: 'twf-mrt-stations',
    minzoom: 11.2,
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Noto Sans Regular'],
      'text-size': 11,
      'text-offset': [0, 1.25],
      'text-anchor': 'top',
      'text-allow-overlap': false,
    },
    paint: {
      'text-color': '#7F3550',
      'text-halo-color': '#FFF9FB',
      'text-halo-width': 1.5,
      'text-opacity': 0.8,
    },
  });

  setMrtVisibility(props.mrtVisible);
}

onMounted(() => {
  emit('status', 'loading');
  map = new maplibregl.Map({
    container: mapEl.value,
    style: 'https://tiles.openfreemap.org/styles/bright',
    center: TAIPEI_DIORAMA_SURFACE_VIEW.center,
    zoom: TAIPEI_DIORAMA_SURFACE_VIEW.zoom,
    pitch: TAIPEI_DIORAMA_SURFACE_VIEW.pitch,
    bearing: TAIPEI_DIORAMA_SURFACE_VIEW.bearing,
    attributionControl: false,
    interactive: false,
  });

  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

  map.on('load', () => {
    loaded = true;
    applySakuraStyleOverride();
    addMrtOverlay();
    emit('status', 'ready');
  });

  map.on('error', () => {
    emit('status', 'error');
  });
});

watch(() => props.visible, (visible) => {
  if (visible && map) window.requestAnimationFrame(() => map?.resize());
});

watch(() => props.mrtVisible, setMrtVisibility);

onBeforeUnmount(() => {
  map?.remove();
  map = null;
});
</script>

<template>
  <div class="maplibre-overlay" :class="{ hidden: !visible }" aria-hidden="true">
    <div ref="mapEl" class="maplibre-canvas"></div>
    <div class="maplibre-tint"></div>
  </div>
</template>
