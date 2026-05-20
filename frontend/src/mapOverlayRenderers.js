import { mrtRouteGeoJson, mrtStationGeoJson } from './mrtMapData.js';

export const mrtRouteLayerIds = [
  'twf-mrt-route-glow',
  'twf-mrt-route-casing',
  'twf-mrt-route-line',
];

export const mrtStationLayerIds = [
  'twf-mrt-station-halo',
  'twf-mrt-station-dot',
  'twf-mrt-station-label',
];

export function setLayerIdsVisibility(map, layerIds, visible) {
  if (!map) return;
  const value = visible ? 'visible' : 'none';
  layerIds.forEach((id) => {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', value);
  });
}

export function mountMrtRouteOverlay(map) {
  if (!map || map.getSource('twf-mrt-routes')) return;

  map.addSource('twf-mrt-routes', {
    type: 'geojson',
    data: mrtRouteGeoJson,
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
}

export function mountMrtStationOverlay(map, onSelect) {
  if (!map || map.getSource('twf-mrt-stations')) return;

  map.addSource('twf-mrt-stations', {
    type: 'geojson',
    data: mrtStationGeoJson,
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

  map.on('click', 'twf-mrt-station-dot', (event) => {
    const feature = event.features?.[0];
    if (!feature?.properties) return;
    onSelect?.({
      source: 'mrt-stations',
      id: feature.properties.id,
      name: feature.properties.name,
      routeId: feature.properties.routeId,
      objectType: 'Station',
    });
  });
  map.on('mouseenter', 'twf-mrt-station-dot', () => {
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mouseleave', 'twf-mrt-station-dot', () => {
    map.getCanvas().style.cursor = '';
  });
}

export function mountRegisteredMapOverlays(map, options = {}) {
  mountMrtRouteOverlay(map);
  mountMrtStationOverlay(map, options.onSelectObject);
}

export function applyRegisteredOverlayVisibility(map, visibility = {}) {
  setLayerIdsVisibility(map, mrtRouteLayerIds, visibility['mrt-routes'] ?? true);
  setLayerIdsVisibility(map, mrtStationLayerIds, visibility['mrt-stations'] ?? true);
}
