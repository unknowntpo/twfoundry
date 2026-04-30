import { lngLatToGrid } from './geoProjection.js';

export function createOntologyProjection({
  id,
  kind,
  source,
  geometry,
  state = {},
  relationships = [],
  renderModule,
}) {
  if (!id || !kind || !source || !geometry || !renderModule) {
    throw new Error('OntologyProjection requires id, kind, source, geometry, and renderModule');
  }

  return {
    id,
    kind,
    source,
    geometry,
    state,
    relationships,
    renderModule,
  };
}

export function projectPointToGrid(projection, gridSize = 30) {
  if (projection.geometry.type !== 'Point') {
    throw new Error(`Cannot project ${projection.geometry.type} as a point`);
  }
  return lngLatToGrid(projection.geometry.coordinates, gridSize);
}

export function projectLineToGrid(projection, gridSize = 30) {
  if (projection.geometry.type !== 'LineString') {
    throw new Error(`Cannot project ${projection.geometry.type} as a line`);
  }
  return projection.geometry.coordinates.map((coordinate) => lngLatToGrid(coordinate, gridSize));
}

export function mrtRouteFeatureToProjection(feature) {
  return createOntologyProjection({
    id: `route-${feature.properties.id}`,
    kind: 'MrtRoute',
    source: 'TDX MRT static geometry mock',
    geometry: feature.geometry,
    state: {
      color: feature.properties.color,
      name: feature.properties.name,
    },
    relationships: ['owns station anchors', 'owns train projections'],
    renderModule: 'MrtRouteTube',
  });
}

export function mrtStationFeatureToProjection(feature) {
  return createOntologyProjection({
    id: `station-${feature.properties.id}`,
    kind: 'MrtStation',
    source: feature.properties.source,
    geometry: feature.geometry,
    state: {
      color: feature.properties.color,
      name: feature.properties.name,
      routeId: feature.properties.routeId,
      stationId: feature.properties.id,
    },
    relationships: ['belongs_to MRT route', 'anchors LiveBoard rows'],
    renderModule: 'StationAnchor',
  });
}
