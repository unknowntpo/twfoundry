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
  variant: {
    type: String,
    default: 'diorama',
  },
  interactive: {
    type: Boolean,
    default: false,
  },
  mrtVisible: {
    type: Boolean,
    default: true,
  },
  debugReference: {
    type: Object,
    default: null,
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
const debugLayerIds = [
  'twf-debug-bounds-fill',
  'twf-debug-bounds-line',
  'twf-debug-anchor-halo',
  'twf-debug-anchor-dot',
  'twf-debug-anchor-label',
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

function emptyDebugReference() {
  return { type: 'FeatureCollection', features: [] };
}

function upsertDebugReference() {
  if (!map || !loaded || props.variant !== 'debug') return;
  const data = props.debugReference ?? emptyDebugReference();
  if (!map.getSource('twf-debug-reference')) {
    map.addSource('twf-debug-reference', {
      type: 'geojson',
      data,
    });

    map.addLayer({
      id: 'twf-debug-bounds-fill',
      type: 'fill',
      source: 'twf-debug-reference',
      filter: ['==', '$type', 'Polygon'],
      paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': [
          'match',
          ['get', 'kind'],
          'focus-bounds',
          0.08,
          'chunk-bounds',
          0.12,
          0.08,
        ],
      },
    });

    map.addLayer({
      id: 'twf-debug-bounds-line',
      type: 'line',
      source: 'twf-debug-reference',
      filter: ['==', '$type', 'Polygon'],
      paint: {
        'line-color': ['get', 'color'],
        'line-width': [
          'match',
          ['get', 'kind'],
          'focus-bounds',
          3,
          'chunk-bounds',
          2,
          2,
        ],
        'line-opacity': 0.86,
        'line-dasharray': [2, 1],
      },
    });

    map.addLayer({
      id: 'twf-debug-anchor-halo',
      type: 'circle',
      source: 'twf-debug-reference',
      filter: ['==', '$type', 'Point'],
      paint: {
        'circle-radius': ['case', ['==', ['get', 'selected'], true], 12, 8],
        'circle-color': '#FFF9FB',
        'circle-opacity': 0.78,
        'circle-stroke-color': ['get', 'color'],
        'circle-stroke-width': ['case', ['==', ['get', 'selected'], true], 4, 2],
      },
    });

    map.addLayer({
      id: 'twf-debug-anchor-dot',
      type: 'circle',
      source: 'twf-debug-reference',
      filter: ['==', '$type', 'Point'],
      paint: {
        'circle-radius': ['case', ['==', ['get', 'selected'], true], 5.8, 4.2],
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.95,
      },
    });

    map.addLayer({
      id: 'twf-debug-anchor-label',
      type: 'symbol',
      source: 'twf-debug-reference',
      filter: ['==', '$type', 'Point'],
      layout: {
        'text-field': ['get', 'name'],
        'text-size': 10,
        'text-offset': [0, 1.25],
        'text-anchor': 'top',
        'text-allow-overlap': true,
      },
      paint: {
        'text-color': '#7F3550',
        'text-halo-color': '#FFF9FB',
        'text-halo-width': 1.5,
      },
    });
    return;
  }
  map.getSource('twf-debug-reference')?.setData(data);
}

function onStyleReady() {
  if (loaded) return;
  loaded = true;
  applySakuraStyleOverride();
  addMrtOverlay();
  upsertDebugReference();
  emit('status', 'ready');
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
    interactive: props.interactive,
  });

  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

  map.on('load', onStyleReady);
  map.on('style.load', onStyleReady);

  map.on('error', () => {
    emit('status', 'error');
  });
});

watch(() => props.visible, (visible) => {
  if (visible && map) window.requestAnimationFrame(() => map?.resize());
});

watch(() => props.mrtVisible, setMrtVisibility);
watch(() => props.debugReference, upsertDebugReference, { deep: true });

onBeforeUnmount(() => {
  map?.remove();
  map = null;
});
</script>

<template>
  <div
    class="maplibre-overlay"
    :class="[{ hidden: !visible }, `maplibre-overlay-${variant}`]"
    :aria-hidden="!visible"
  >
    <div ref="mapEl" class="maplibre-canvas"></div>
    <div v-if="variant !== 'debug'" class="maplibre-tint"></div>
  </div>
</template>
