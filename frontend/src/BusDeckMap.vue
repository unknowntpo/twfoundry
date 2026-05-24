<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import maplibregl from 'maplibre-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { ScatterplotLayer } from '@deck.gl/layers';
import 'maplibre-gl/dist/maplibre-gl.css';

const props = defineProps({
  observations: {
    type: Array,
    default: () => [],
  },
  selectedObservationId: {
    type: String,
    default: '',
  },
  visible: {
    type: Boolean,
    default: true,
  },
  pointScale: {
    type: Number,
    default: 1,
  },
  pointOpacity: {
    type: Number,
    default: 0.92,
  },
  fitKey: {
    type: String,
    default: '',
  },
});

const emit = defineEmits([
  'select-observation',
  'clear-observation',
  'hover-observation',
  'leave-observation',
  'map-state',
  'status',
]);

const mapEl = ref(null);
const cameraState = ref({ zoom: 11, pitch: 34, bearing: -8 });
let map = null;
let overlay = null;
let loaded = false;
let shiftPitchHandlersMounted = false;
const shiftPitchDrag = {
  active: false,
  startX: 0,
  startY: 0,
  startPitch: 0,
  startBearing: 0,
};

const ROAD_READABLE_STYLE_URL = 'https://tiles.openfreemap.org/styles/fiord';
const INTERACTION_PICK_RADIUS_PIXELS = 22;

const DARK_NAVIGATION_PAINT = [
  ['background', 'background-color', '#050912'],
  ['water', 'fill-color', '#071522'],
  ['waterway', 'line-color', '#1e5570'],
  ['waterway', 'line-opacity', 0.62],
  ['landuse_residential', 'fill-color', '#0b111b'],
  ['landuse_residential', 'fill-opacity', 0.8],
  ['landcover_wood', 'fill-color', '#0f1c20'],
  ['landcover_wood', 'fill-opacity', 0.64],
  ['park', 'fill-color', '#10201e'],
  ['park', 'fill-opacity', 0.66],
  ['building', 'fill-color', '#243044'],
  ['building', 'fill-opacity', 0.72],
  ['tunnel_motorway_casing', 'line-color', '#121a29'],
  ['tunnel_motorway_inner', 'line-color', '#56657e'],
  ['highway_path', 'line-color', '#3d4a5e'],
  ['highway_path', 'line-opacity', 0.58],
  ['highway_minor', 'line-color', '#455368'],
  ['highway_minor', 'line-opacity', 0.78],
  ['highway_major_casing', 'line-color', '#162033'],
  ['highway_major_inner', 'line-color', '#7c8aa6'],
  ['highway_major_subtle', 'line-color', '#59687f'],
  ['highway_major_subtle', 'line-opacity', 0.66],
  ['highway_motorway_casing', 'line-color', '#17243a'],
  ['highway_motorway_casing', 'line-opacity', 0.95],
  ['highway_motorway_inner', 'line-color', '#91a0bc'],
  ['highway_motorway_subtle', 'line-color', '#526d8c'],
  ['railway_transit', 'line-color', '#7387a7'],
  ['railway_transit_dashline', 'line-color', '#172030'],
  ['railway_service', 'line-color', '#4a5a70'],
  ['railway_service_dashline', 'line-color', '#121823'],
  ['railway', 'line-color', '#4d5d72'],
  ['railway_dashline', 'line-color', '#121823'],
  ['boundary_state', 'line-color', '#314053'],
  ['boundary_state', 'line-opacity', 0.46],
  ['boundary_country_z5-', 'line-color', '#314053'],
  ['boundary_country_z5-', 'line-opacity', 0.5],
];

onMounted(() => {
  map = new maplibregl.Map({
    container: mapEl.value,
    style: ROAD_READABLE_STYLE_URL,
    center: [121.56, 25.05],
    zoom: 11,
    pitch: 34,
    bearing: -8,
    attributionControl: false,
  });

  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
  map.dragRotate.enable();
  map.boxZoom.disable();
  map.touchZoomRotate.enableRotation();
  mountShiftPitchGesture();
  map.on('style.load', tuneDarkNavigationStyle);

  overlay = new MapboxOverlay({
    interleaved: false,
    layers: [],
  });
  map.addControl(overlay);

  map.on('move', emitMapState);
  map.on('zoom', emitMapState);
  map.on('pitch', emitMapState);
  map.on('rotate', emitMapState);
  map.on('click', handleMapClick);
  map.on('mousemove', handleMapHover);
  map.on('mouseout', clearMapHover);
  map.on('error', (event) => {
    emit('status', {
      level: 'warn',
      message: event?.error?.message ?? 'Map renderer emitted an error.',
    });
  });

  map.once('load', () => {
    loaded = true;
    tuneDarkNavigationStyle();
    updateLayers();
    fitToObservations(false);
    emitMapState();
    emit('status', {
      level: 'ready',
      message: 'MapLibre base map and deck.gl overlay ready.',
    });
  });
});

onBeforeUnmount(() => {
  unmountShiftPitchGesture();
  if (map && overlay) {
    try {
      map.removeControl(overlay);
    } catch {
      // The map may already be finalizing.
    }
  }
  overlay?.finalize();
  overlay = null;
  map?.remove();
  map = null;
  loaded = false;
});

watch(
  () => [
    props.observations,
    props.selectedObservationId,
    props.visible,
    props.pointScale,
    props.pointOpacity,
  ],
  updateLayers,
);

watch(
  () => props.fitKey,
  () => {
    fitToObservations(true);
  },
);

function updateLayers() {
  if (!overlay || !loaded) return;

  const data = props.visible ? validObservations(props.observations) : [];
  const selectedData = data.filter((observation) => observation.id === props.selectedObservationId);

  overlay.setProps({
    layers: [
      new ScatterplotLayer({
        id: 'twf-bus-points',
        data,
        pickable: true,
        radiusUnits: 'pixels',
        lineWidthUnits: 'pixels',
        opacity: props.pointOpacity,
        stroked: true,
        filled: true,
        getPosition: (observation) => [
          observation.position.longitude,
          observation.position.latitude,
        ],
        getRadius: () => 4.8 * props.pointScale,
        getLineWidth: 1,
        getFillColor: (observation) => observationFillColor(observation),
        getLineColor: (observation) => observationLineColor(observation),
        updateTriggers: {
          getRadius: [props.pointScale],
          getFillColor: [props.selectedObservationId],
          getLineColor: [props.selectedObservationId],
        },
        transitions: {
          getPosition: 820,
          getRadius: 160,
        },
      }),
      new ScatterplotLayer({
        id: 'twf-bus-selected-core',
        data: selectedData,
        pickable: true,
        radiusUnits: 'pixels',
        lineWidthUnits: 'pixels',
        opacity: props.pointOpacity,
        stroked: true,
        filled: true,
        getPosition: (observation) => [
          observation.position.longitude,
          observation.position.latitude,
        ],
        getRadius: () => 6.8 * props.pointScale,
        getLineWidth: 2,
        getFillColor: [255, 204, 74, 242],
        getLineColor: [255, 252, 220, 245],
        updateTriggers: {
          getRadius: [props.pointScale],
        },
        transitions: {
          getRadius: 160,
        },
      }),
      new ScatterplotLayer({
        id: 'twf-bus-selected-halo',
        data: selectedData,
        pickable: false,
        radiusUnits: 'pixels',
        lineWidthUnits: 'pixels',
        stroked: true,
        filled: true,
        getPosition: (observation) => [
          observation.position.longitude,
          observation.position.latitude,
        ],
        getRadius: 18 * props.pointScale,
        getLineWidth: 2.4,
        getFillColor: [255, 255, 255, 0],
        getLineColor: [255, 218, 92, 230],
        transitions: {
          getRadius: 160,
        },
      }),
    ],
  });
}

function handleMapClick(event) {
  if (!overlay || shiftPitchDrag.active) return;
  const picked = pickObservationAt(event.point);

  if (picked?.object?.id) {
    emit('select-observation', picked.object.id);
    return;
  }

  emit('clear-observation');
  emit('leave-observation');
}

function handleMapHover(event) {
  if (!overlay || shiftPitchDrag.active) return;
  const picked = pickObservationAt(event.point);

  if (!picked?.object) {
    clearMapHover();
    return;
  }

  setMapCursor('pointer');
  const rect = map.getCanvas().getBoundingClientRect();
  emit('hover-observation', {
    observation: picked.object,
    x: rect.left + event.point.x,
    y: rect.top + event.point.y,
  });
}

function clearMapHover() {
  setMapCursor('');
  emit('leave-observation');
}

function pickObservationAt(point) {
  return overlay?.pickObject({
    x: point.x,
    y: point.y,
    radius: INTERACTION_PICK_RADIUS_PIXELS,
    layerIds: ['twf-bus-selected-core', 'twf-bus-points'],
  });
}

function setMapCursor(cursor) {
  if (!map || shiftPitchDrag.active) return;
  map.getCanvas().style.cursor = cursor;
}

function hideTextLabels() {
  if (!map) return;
  const labelLayers = map.getStyle().layers?.filter((layer) => layer.type === 'symbol') ?? [];
  labelLayers.forEach((layer) => {
    if (map.getLayer(layer.id)) {
      map.setLayoutProperty(layer.id, 'visibility', 'none');
    }
  });
}

function tuneDarkNavigationStyle() {
  if (!map) return;
  DARK_NAVIGATION_PAINT.forEach(([layerId, property, value]) => {
    if (map.getLayer(layerId)) {
      try {
        map.setPaintProperty(layerId, property, value);
      } catch {
        // Vector basemap styles can change layer capabilities across releases.
      }
    }
  });
  hideTextLabels();
}

function observationFillColor(observation) {
  if (observation.id === props.selectedObservationId) return [0, 190, 240, 240];
  if (observation.status.freshness === 'stale') return [0, 151, 200, 118];
  return [0, 151, 200, 172];
}

function observationLineColor(observation) {
  if (observation.id === props.selectedObservationId) return [255, 255, 255, 245];
  if (observation.status.freshness === 'stale') return [165, 237, 255, 132];
  return [238, 253, 255, 210];
}

function fitToObservations(animate = true) {
  if (!map || !loaded) return;
  const data = validObservations(props.observations);
  if (data.length === 0) {
    map.easeTo({
      center: [121.56, 25.05],
      zoom: 11,
      pitch: 34,
      bearing: -8,
      duration: animate ? 260 : 0,
    });
    return;
  }

  const bounds = new maplibregl.LngLatBounds();
  data.forEach((observation) => {
    bounds.extend([observation.position.longitude, observation.position.latitude]);
  });
  const rect = mapEl.value.getBoundingClientRect();
  const wide = rect.width >= 980;

  map.resize();
  map.fitBounds(bounds, {
    padding: wide
      ? { top: 78, right: 420, bottom: 128, left: 360 }
      : { top: 82, right: 72, bottom: 142, left: 42 },
    maxZoom: 13.4,
    pitch: 34,
    bearing: -8,
    duration: animate ? 360 : 0,
  });
}

function zoomBy(delta) {
  if (!map) return;
  map.easeTo({
    zoom: clamp(map.getZoom() + delta, 8, 17),
    duration: 180,
  });
}

function resetView() {
  fitToObservations(true);
}

function followObservation(observation, { animate = true } = {}) {
  if (!map || !loaded) return;
  const longitude = observation?.position?.longitude;
  const latitude = observation?.position?.latitude;
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return;

  map.easeTo({
    center: [longitude, latitude],
    duration: animate ? 520 : 0,
    essential: true,
  });
}

function mountShiftPitchGesture() {
  if (!map || shiftPitchHandlersMounted) return;
  const canvasContainer = map.getCanvasContainer();
  canvasContainer.addEventListener('mousedown', onShiftPitchMouseDown, true);
  window.addEventListener('mousemove', onShiftPitchMouseMove, true);
  window.addEventListener('mouseup', endShiftPitchDrag, true);
  window.addEventListener('blur', endShiftPitchDrag, true);
  shiftPitchHandlersMounted = true;
}

function unmountShiftPitchGesture() {
  if (!map || !shiftPitchHandlersMounted) return;
  const canvasContainer = map.getCanvasContainer();
  canvasContainer.removeEventListener('mousedown', onShiftPitchMouseDown, true);
  window.removeEventListener('mousemove', onShiftPitchMouseMove, true);
  window.removeEventListener('mouseup', endShiftPitchDrag, true);
  window.removeEventListener('blur', endShiftPitchDrag, true);
  shiftPitchHandlersMounted = false;
}

function onShiftPitchMouseDown(event) {
  if (!map || event.button !== 0 || !event.shiftKey) return;
  event.preventDefault();
  event.stopPropagation();

  shiftPitchDrag.active = true;
  shiftPitchDrag.startX = event.clientX;
  shiftPitchDrag.startY = event.clientY;
  shiftPitchDrag.startPitch = map.getPitch();
  shiftPitchDrag.startBearing = map.getBearing();
  map.dragPan.disable();
  mapEl.value?.classList.add('is-shift-pitching');
  emit('status', {
    level: 'interaction',
    message: 'Shift drag camera tilt active.',
  });
}

function onShiftPitchMouseMove(event) {
  if (!map || !shiftPitchDrag.active) return;
  event.preventDefault();
  event.stopPropagation();

  const deltaX = event.clientX - shiftPitchDrag.startX;
  const deltaY = event.clientY - shiftPitchDrag.startY;
  map.jumpTo({
    pitch: clamp(shiftPitchDrag.startPitch - deltaY * 0.32, 0, 72),
    bearing: shiftPitchDrag.startBearing - deltaX * 0.12,
  });
  emitMapState();
}

function endShiftPitchDrag(event) {
  if (!shiftPitchDrag.active) return;
  event?.preventDefault?.();
  event?.stopPropagation?.();

  shiftPitchDrag.active = false;
  map?.dragPan.enable();
  setMapCursor('');
  mapEl.value?.classList.remove('is-shift-pitching');
  emitMapState();
  emit('status', {
    level: 'ready',
    message: 'MapLibre base map and deck.gl overlay ready.',
  });
}

function emitMapState() {
  if (!map) return;
  const center = map.getCenter();
  cameraState.value = {
    zoom: map.getZoom(),
    pitch: map.getPitch(),
    bearing: map.getBearing(),
  };
  emit('map-state', {
    ...cameraState.value,
    center: [center.lng, center.lat],
  });
}

function validObservations(observations) {
  return observations.filter((observation) => (
    Number.isFinite(observation.position?.longitude)
    && Number.isFinite(observation.position?.latitude)
  ));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

defineExpose({
  followObservation,
  resetView,
  zoomBy,
});
</script>

<template>
  <div
    ref="mapEl"
    class="deck-map-root"
    aria-label="interactive bus map"
    data-basemap-style="dark-shapes-no-labels"
    :data-zoom="cameraState.zoom.toFixed(2)"
    :data-pitch="cameraState.pitch.toFixed(2)"
    :data-bearing="cameraState.bearing.toFixed(2)"
  ></div>
</template>

<style scoped>
.deck-map-root {
  position: absolute;
  inset: 0;
  background: #07101c;
}

.deck-map-root.is-shift-pitching {
  cursor: ns-resize;
}

:deep(.maplibregl-canvas) {
  outline: none;
}

:deep(.maplibregl-ctrl-attrib) {
  border-radius: 7px 0 0 0;
  background: rgba(8, 15, 26, 0.72);
  color: rgba(218, 230, 242, 0.72);
  font: 10px/1.4 var(--font-mono);
}

:deep(.maplibregl-ctrl-attrib a) {
  color: rgba(126, 213, 240, 0.82);
}
</style>
