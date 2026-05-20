<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { TAIPEI_DIORAMA_SURFACE_VIEW } from './geoProjection.js';
import {
  applyRegisteredOverlayVisibility,
  mountRegisteredMapOverlays,
} from './mapOverlayRenderers.js';

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
  overlayVisibility: {
    type: Object,
    default: () => ({}),
  },
  debugReference: {
    type: Object,
    default: null,
  },
  debugVisible: {
    type: Boolean,
    default: false,
  },
  focusBounds: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['status', 'texture', 'select-object']);

const mapEl = ref(null);
let map = null;
let loaded = false;
let textureRefreshQueued = false;
let textureRefreshTimer = 0;
let textureRetryCount = 0;
const MAX_RENDERED_ROADS = 96;
const MAX_RENDERED_BUILDINGS = 180;
const MAX_RENDERED_AREAS = 42;
const MAX_RENDERED_POIS = 72;
const TEXTURE_SNAPSHOT_SIZE = 1024;

const debugLayerIds = [
  'twf-debug-bounds-fill',
  'twf-debug-bounds-line',
  'twf-debug-reference-line',
  'twf-debug-anchor-halo',
  'twf-debug-anchor-dot',
  'twf-debug-anchor-label',
];

function debugReferenceEnabled() {
  return props.variant === 'debug' || props.debugVisible;
}

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

function emptyDebugReference() {
  return { type: 'FeatureCollection', features: [] };
}

function setDebugReferenceVisibility() {
  if (!map || !loaded) return;
  const visibility = debugReferenceEnabled() ? 'visible' : 'none';
  debugLayerIds.forEach((id) => {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visibility);
  });
}

function upsertDebugReference() {
  if (!map || !loaded) return;
  const data = debugReferenceEnabled()
    ? (props.debugReference ?? emptyDebugReference())
    : emptyDebugReference();
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
      id: 'twf-debug-reference-line',
      type: 'line',
      source: 'twf-debug-reference',
      filter: ['==', '$type', 'LineString'],
      paint: {
        'line-color': ['get', 'color'],
        'line-width': ['case', ['==', ['get', 'selected'], true], 5, 3],
        'line-opacity': 0.88,
        'line-dasharray': [1, 1],
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
    setDebugReferenceVisibility();
    return;
  }
  map.getSource('twf-debug-reference')?.setData(data);
  setDebugReferenceVisibility();
}

function fitFocusBounds() {
  if (!map || !loaded || !props.focusBounds) return;
  map.resize();
  map.fitBounds(
    [
      [props.focusBounds.west, props.focusBounds.south],
      [props.focusBounds.east, props.focusBounds.north],
    ],
    {
      padding: props.variant === 'texture' ? 0 : 44,
      animate: false,
      bearing: 0,
      pitch: 0,
    },
  );
}

function snapshotHasVisibleDetail(canvas) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return false;
  try {
    const step = Math.max(16, Math.floor(Math.min(canvas.width, canvas.height) / 18));
    let samples = 0;
    let minLum = 255;
    let maxLum = 0;
    for (let y = step / 2; y < canvas.height; y += step) {
      for (let x = step / 2; x < canvas.width; x += step) {
        const [r, g, b, a] = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
        if (a < 24) continue;
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        minLum = Math.min(minLum, lum);
        maxLum = Math.max(maxLum, lum);
        samples += 1;
      }
    }
    return samples > 0 && maxLum - minLum > 8;
  } catch {
    return false;
  }
}

function layerSourceLayer(layer) {
  return String(layer?.['source-layer'] ?? layer?.sourceLayer ?? '').toLowerCase();
}

function layerId(layer) {
  return String(layer?.id ?? '').toLowerCase();
}

function isRoadLayer(layer) {
  const id = layerId(layer);
  const sourceLayer = layerSourceLayer(layer);
  return layer?.type === 'line'
    && !id.startsWith('twf-')
    && (
      id.includes('road')
      || id.includes('street')
      || id.includes('transport')
      || sourceLayer.includes('transportation')
    );
}

function isBuildingLayer(layer) {
  const id = layerId(layer);
  const sourceLayer = layerSourceLayer(layer);
  return layer?.type === 'fill'
    && !id.startsWith('twf-')
    && (id.includes('building') || sourceLayer.includes('building'));
}

function isAreaLayer(layer) {
  const id = layerId(layer);
  const sourceLayer = layerSourceLayer(layer);
  return layer?.type === 'fill'
    && !id.startsWith('twf-')
    && (
      id.includes('park')
      || id.includes('green')
      || id.includes('landcover')
      || sourceLayer.includes('landcover')
      || sourceLayer.includes('park')
    );
}

function isPoiLayer(layer) {
  const id = layerId(layer);
  const sourceLayer = layerSourceLayer(layer);
  return layer?.type === 'symbol'
    && !id.startsWith('twf-')
    && (
      id.includes('poi')
      || id.includes('place')
      || id.includes('station')
      || id.includes('transit')
      || sourceLayer.includes('poi')
      || sourceLayer.includes('place')
    );
}

function featureCoordinatesAreLngLat(geometry) {
  const first = firstCoordinate(geometry?.coordinates);
  if (!first) return false;
  const [lng, lat] = first;
  return Math.abs(lng) <= 180 && Math.abs(lat) <= 90;
}

function firstCoordinate(value) {
  if (!Array.isArray(value)) return null;
  if (typeof value[0] === 'number' && typeof value[1] === 'number') return value;
  for (const child of value) {
    const found = firstCoordinate(child);
    if (found) return found;
  }
  return null;
}

function simplifiedProperties(properties = {}) {
  const keys = [
    'name',
    'name:zh',
    'name:en',
    'class',
    'type',
    'subclass',
    'layer',
    'brunnel',
    'highway',
    'shop',
    'amenity',
    'building',
    'building:levels',
    'height',
    'render_height',
    'rank',
  ];
  return Object.fromEntries(keys
    .filter((key) => properties[key] !== undefined && properties[key] !== null && properties[key] !== '')
    .map((key) => [key, properties[key]]));
}

function renderedSourceRef(feature, layerIdValue, index) {
  const sourceLayer = feature.sourceLayer || feature.sourceLayerId || feature.layer?.['source-layer'] || 'unknown-layer';
  const featureId = feature.id ?? feature.properties?.osm_id ?? feature.properties?.id ?? index;
  return `openfreemap:${sourceLayer}/${featureId}`;
}

function renderedFeatureKey(feature, layerIdValue, index) {
  const sourceRef = renderedSourceRef(feature, layerIdValue, index);
  const coordinates = JSON.stringify(feature.geometry?.coordinates ?? []).slice(0, 260);
  return `${sourceRef}:${coordinates}`;
}

function extractRenderedFeatures(layerPredicate, limit) {
  if (!map || !loaded) return [];
  const layerIds = (map.getStyle().layers ?? [])
    .filter(layerPredicate)
    .map((layer) => layer.id)
    .filter((id) => map.getLayer(id));
  if (layerIds.length === 0) return [];

  const seen = new Set();
  const features = [];
  layerIds.forEach((layerIdValue) => {
    let rendered = [];
    try {
      rendered = map.queryRenderedFeatures(undefined, { layers: [layerIdValue] });
    } catch {
      rendered = [];
    }
    rendered.forEach((feature, index) => {
      if (!feature?.geometry || !featureCoordinatesAreLngLat(feature.geometry)) return;
      const key = renderedFeatureKey(feature, layerIdValue, index);
      if (seen.has(key)) return;
      seen.add(key);
      features.push({
        type: 'Feature',
        id: String(feature.id ?? feature.properties?.osm_id ?? `${layerIdValue}-${index}`),
        properties: {
          ...simplifiedProperties(feature.properties),
          renderLayerId: layerIdValue,
          sourceLayer: feature.sourceLayer || feature.layer?.['source-layer'] || null,
          sourceRef: renderedSourceRef(feature, layerIdValue, index),
        },
        geometry: {
          type: feature.geometry.type,
          coordinates: feature.geometry.coordinates,
        },
      });
    });
  });
  return features.slice(0, limit);
}

function mapFeatureCatalog(bounds) {
  const roads = extractRenderedFeatures(isRoadLayer, MAX_RENDERED_ROADS);
  const buildings = extractRenderedFeatures(isBuildingLayer, MAX_RENDERED_BUILDINGS);
  const areas = extractRenderedFeatures(isAreaLayer, MAX_RENDERED_AREAS);
  const pois = extractRenderedFeatures(isPoiLayer, MAX_RENDERED_POIS)
    .filter((feature) => feature.geometry?.type === 'Point')
    .filter((feature) => feature.properties?.name || feature.properties?.['name:zh'] || feature.properties?.['name:en']);
  return {
    source: 'openfreemap-rendered-features',
    projection: 'EPSG:3857 Web Mercator',
    generatedAt: new Date().toISOString(),
    bounds,
    coverage: {
      roads: 'rendered-viewport',
      buildings: 'rendered-viewport',
      areas: 'rendered-viewport',
      pois: 'rendered-viewport',
    },
    roads,
    buildings,
    areas,
    pois,
    summary: {
      roads: roads.length,
      buildings: buildings.length,
      areas: areas.length,
      pois: pois.length,
    },
  };
}

function captureMapSnapshot() {
  const source = map?.getCanvas();
  if (!source?.width || !source?.height) return null;
  const snapshot = document.createElement('canvas');
  snapshot.width = TEXTURE_SNAPSHOT_SIZE;
  snapshot.height = TEXTURE_SNAPSHOT_SIZE;
  const ctx = snapshot.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  try {
    ctx.drawImage(source, 0, 0, snapshot.width, snapshot.height);
    return snapshotHasVisibleDetail(snapshot) ? snapshot : null;
  } catch {
    return null;
  }
}

function lngLatArray(lngLat) {
  return [lngLat.lng, lngLat.lat];
}

function mapReferenceFrame(snapshot) {
  const source = map?.getCanvas();
  if (!source || !snapshot) return null;
  const cssWidth = source.clientWidth || map?.getContainer()?.clientWidth || snapshot.width;
  const cssHeight = source.clientHeight || map?.getContainer()?.clientHeight || snapshot.height;
  if (!cssWidth || !cssHeight) return null;

  const northwest = lngLatArray(map.unproject([0, 0]));
  const northeast = lngLatArray(map.unproject([cssWidth, 0]));
  const southeast = lngLatArray(map.unproject([cssWidth, cssHeight]));
  const southwest = lngLatArray(map.unproject([0, cssHeight]));
  const lngs = [northwest[0], northeast[0], southeast[0], southwest[0]];
  const lats = [northwest[1], northeast[1], southeast[1], southwest[1]];

  return {
    projection: 'EPSG:3857 Web Mercator',
    pixelSize: {
      width: snapshot.width,
      height: snapshot.height,
      cssWidth,
      cssHeight,
    },
    corners: {
      northwest,
      northeast,
      southeast,
      southwest,
    },
    bounds: {
      west: Math.min(...lngs),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      north: Math.max(...lats),
    },
  };
}

function retryTextureRefresh() {
  if (textureRetryCount > 18) {
    emit('status', 'error');
    return;
  }
  textureRetryCount += 1;
  if (textureRefreshTimer) window.clearTimeout(textureRefreshTimer);
  textureRefreshTimer = window.setTimeout(() => {
    textureRefreshQueued = false;
    scheduleTextureRefresh();
  }, 450);
}

function emitTextureCanvas() {
  if (!map || !loaded || props.variant !== 'texture') return;
  textureRefreshQueued = false;
  if (textureRefreshTimer) {
    window.clearTimeout(textureRefreshTimer);
    textureRefreshTimer = 0;
  }
  if (typeof map.areTilesLoaded === 'function' && !map.areTilesLoaded() && textureRetryCount < 4) {
    retryTextureRefresh();
    return;
  }
  const snapshot = captureMapSnapshot();
  if (!snapshot) {
    retryTextureRefresh();
    return;
  }
  const frame = mapReferenceFrame(snapshot);
  if (!frame) {
    retryTextureRefresh();
    return;
  }
  emit('texture', {
    canvas: snapshot,
    bounds: frame.bounds,
    frame,
    featureCatalog: mapFeatureCatalog(frame.bounds),
  });
  textureRetryCount = 0;
  emit('status', 'ready');
}

function isFatalMapError(event) {
  if (loaded) return false;
  if (event?.sourceId || event?.tile) return false;
  const message = String(event?.error?.message ?? event?.error ?? '');
  if (message.match(/tile|glyph|sprite|image/i)) return false;
  return true;
}

function scheduleTextureRefresh() {
  if (!map || !loaded || props.variant !== 'texture') return;
  if (textureRefreshQueued) return;
  textureRefreshQueued = true;
  emit('status', 'loading');
  map.off('idle', emitTextureCanvas);
  map.once('idle', emitTextureCanvas);
  textureRefreshTimer = window.setTimeout(emitTextureCanvas, 1400);
}

function onStyleReady() {
  if (loaded) return;
  loaded = true;
  map.resize();
  if (props.variant !== 'texture' && props.variant !== 'main') applySakuraStyleOverride();
  mountRegisteredMapOverlays(map, {
    onSelectObject: (object) => emit('select-object', object),
  });
  applyRegisteredOverlayVisibility(map, props.overlayVisibility);
  fitFocusBounds();
  upsertDebugReference();
  if (props.variant !== 'texture') emit('status', 'ready');
  scheduleTextureRefresh();
}

function installMissingImageFallback() {
  if (!map) return;
  map.on('styleimagemissing', (event) => {
    if (!map || !event?.id || map.hasImage(event.id)) return;
    const size = 4;
    map.addImage(event.id, {
      width: size,
      height: size,
      data: new Uint8Array(size * size * 4),
    });
  });
}

onMounted(() => {
  emit('status', 'loading');
  map = new maplibregl.Map({
    container: mapEl.value,
    style: 'https://tiles.openfreemap.org/styles/bright',
    center: TAIPEI_DIORAMA_SURFACE_VIEW.center,
    zoom: props.variant === 'texture' ? 15 : TAIPEI_DIORAMA_SURFACE_VIEW.zoom,
    pitch: props.variant === 'texture' ? 0 : TAIPEI_DIORAMA_SURFACE_VIEW.pitch,
    bearing: props.variant === 'texture' ? 0 : TAIPEI_DIORAMA_SURFACE_VIEW.bearing,
    attributionControl: false,
    interactive: props.interactive,
    preserveDrawingBuffer: props.variant === 'texture' || props.variant === 'main',
  });

  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
  installMissingImageFallback();

  map.on('load', onStyleReady);
  map.on('style.load', onStyleReady);
  map.on('styledata', () => {
    if (!loaded && typeof map?.isStyleLoaded === 'function' && map.isStyleLoaded()) {
      onStyleReady();
    }
  });
  window.setTimeout(() => {
    if (!loaded && typeof map?.isStyleLoaded === 'function' && map.isStyleLoaded()) {
      onStyleReady();
    }
  }, 1800);
  window.requestAnimationFrame(() => map?.resize());

  map.on('error', (event) => {
    if (isFatalMapError(event)) emit('status', 'error');
  });
});

watch(() => props.visible, (visible) => {
  if (visible && map) window.requestAnimationFrame(() => map?.resize());
});

watch(() => props.mrtVisible, (visible) => {
  applyRegisteredOverlayVisibility(map, {
    ...props.overlayVisibility,
    'mrt-routes': visible,
    'mrt-stations': visible,
  });
  textureRetryCount = 0;
  scheduleTextureRefresh();
});
watch(() => props.overlayVisibility, (visibility) => {
  applyRegisteredOverlayVisibility(map, visibility);
  textureRetryCount = 0;
  scheduleTextureRefresh();
}, { deep: true });
watch(() => props.debugReference, () => {
  upsertDebugReference();
}, { deep: true });
watch(() => props.debugVisible, () => {
  upsertDebugReference();
});
watch(() => props.focusBounds, () => {
  map?.resize();
  fitFocusBounds();
  textureRetryCount = 0;
  scheduleTextureRefresh();
}, { deep: true });

onBeforeUnmount(() => {
  if (textureRefreshTimer) window.clearTimeout(textureRefreshTimer);
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
