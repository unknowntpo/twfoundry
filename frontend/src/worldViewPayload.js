import { layers } from './mockData.js';
import { legacyOverlayLabels } from './overlayRegistry.js';
import osmFixture from '../../backend/ingestion/src/main/resources/world/zhongshan-osm-fixture.json';
import taipeiMainStationFixture from '../../backend/ingestion/src/main/resources/world/taipei-main-station-osm-fixture.json';

const ZHONGSHAN_GEO_BOUNDS = { west: 121.5165, south: 25.0492, east: 121.5248, north: 25.0558 };
const MERCATOR_RADIUS_METERS = 6378137;
const MERCATOR_ORIGIN = { lng: 121.5206, lat: 25.0527 };
const SCENE_UNITS_PER_METER = 0.02;

// Fallback-only mirror of backend projection for no-backend demos.
function mercatorMeters(lng, lat) {
  return {
    x: MERCATOR_RADIUS_METERS * lng * Math.PI / 180,
    y: MERCATOR_RADIUS_METERS * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)),
  };
}

const originMeters = mercatorMeters(MERCATOR_ORIGIN.lng, MERCATOR_ORIGIN.lat);

function localPointFromLngLat([lng, lat], y = 0) {
  const meters = mercatorMeters(lng, lat);
  const x = (meters.x - originMeters.x) * SCENE_UNITS_PER_METER;
  const z = -(meters.y - originMeters.y) * SCENE_UNITS_PER_METER;
  return [Number(x.toFixed(3)), y, Number(z.toFixed(3))];
}

function displayName(tags) {
  return tags?.['name:zh'] || tags?.name || null;
}

function shortLabel(tags, name) {
  const shortName = tags?.['short_name:zh'] || tags?.short_name;
  if (shortName) return shortName;
  if (!name) return null;
  return name.length <= 6 ? name : name.slice(0, 6);
}

function floorsFromTags(tags) {
  const floors = Number.parseInt(tags?.['building:levels'], 10);
  if (!Number.isFinite(floors)) return 3;
  return Math.max(1, Math.min(12, floors));
}

function kindFromTags(tags) {
  const shop = String(tags?.shop ?? '').toLowerCase();
  const amenity = String(tags?.amenity ?? '').toLowerCase();
  if (shop === 'department_store' || shop === 'mall') return 'department-store';
  if (shop === 'books' || amenity === 'library') return 'bookstore-mall';
  return 'lane-shop';
}

function urbanRoleFromTags(tags, kind) {
  const amenity = String(tags?.amenity ?? '').toLowerCase();
  const shop = String(tags?.shop ?? '').toLowerCase();
  if (amenity === 'marketplace' || shop === 'marketplace') return 'market';
  if (amenity === 'restaurant' || amenity === 'cafe' || shop === 'food') return 'restaurant';
  if (kind === 'department-store' || kind === 'bookstore-mall') return 'landmark';
  if (shop) return 'creative-shop';
  return 'residential';
}

function normalizeId(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function featureId(tags, fallback) {
  return tags?.['twfoundry:feature_id'] || fallback;
}

function objectId(tags, fallback) {
  return tags?.['twfoundry:object_id'] || fallback;
}

function styleForBuilding(row) {
  if (row.kind === 'department-store') return { color: '#F596AA', accentColor: '#F596AA', signColor: '#FFB11B' };
  if (row.kind === 'bookstore-mall') return { color: '#FFD2DC', accentColor: '#FFD2DC', signColor: '#81C7D4' };
  if (row.urbanRole === 'market') return { color: '#F7E6B8', accentColor: '#FFB11B', signColor: '#FFB11B' };
  if (row.urbanRole === 'restaurant') return { color: '#F8DDE7', accentColor: '#F8DDE7', signColor: '#FFB11B' };
  if (row.urbanRole === 'creative-shop') return { color: '#FFD2DC', accentColor: '#FFD2DC', signColor: '#E16B8C' };
  const palette = ['#FFD2DC', '#F8DDE7', '#BFE8F4', '#DDECCF', '#F7E6B8', '#D9C8F2'];
  const color = palette[Math.abs(row.id.length) % palette.length];
  return { color, accentColor: color, signColor: '#E16B8C' };
}

function buildingFeature(source) {
  const tags = source.tags ?? {};
  const name = displayName(tags);
  const kind = kindFromTags(tags);
  const row = {
    id: source.id,
    kind,
    shortLabel: shortLabel(tags, name),
    label: name,
    floors: floorsFromTags(tags),
    urbanRole: urbanRoleFromTags(tags, kind),
  };
  const style = styleForBuilding(row);
  const footprint = source.footprintLngLat ?? [];
  return {
    id: featureId(tags, `building-${normalizeId(row.id)}`),
    ontologyObjectId: objectId(tags, `landmark-${normalizeId(row.id)}`),
    kind: row.kind,
    footprintSource: source.sourceRef,
    geometry: { type: 'Polygon', coordinates: [footprint.map((point) => localPointFromLngLat(point))] },
    sourceGeometry: { type: 'Polygon', coordinates: [footprint] },
    visualState: {
      floors: row.floors,
      footprintScale: 0.92,
      footprintSource: source.sourceRef,
      urbanRole: row.urbanRole,
      ...style,
      ...(row.shortLabel ? { shortLabel: row.shortLabel } : {}),
      ...(row.label ? { label: row.label } : {}),
      sign: Boolean(row.label) && ['landmark', 'market'].includes(row.urbanRole),
    },
  };
}

const sourceRoadRows = osmFixture.roads ?? [];

function pointSegmentDistance(point, start, end) {
  const vx = end.x - start.x;
  const vz = end.z - start.z;
  const wx = point.x - start.x;
  const wz = point.z - start.z;
  const lengthSquared = vx * vx + vz * vz;
  if (lengthSquared <= 0.000001) return Math.hypot(point.x - start.x, point.z - start.z);
  const t = Math.max(0, Math.min(1, (wx * vx + wz * vz) / lengthSquared));
  return Math.hypot(point.x - (start.x + t * vx), point.z - (start.z + t * vz));
}

function orientation(a, b, c) {
  return (b.z - a.z) * (c.x - b.x) - (b.x - a.x) * (c.z - b.z);
}

function onSegment(a, b, c) {
  return b.x <= Math.max(a.x, c.x) + 0.000001
    && b.x + 0.000001 >= Math.min(a.x, c.x)
    && b.z <= Math.max(a.z, c.z) + 0.000001
    && b.z + 0.000001 >= Math.min(a.z, c.z);
}

function segmentsIntersect(a, b, c, d) {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  if (o1 * o2 < 0 && o3 * o4 < 0) return true;
  if (Math.abs(o1) < 0.000001 && onSegment(a, c, b)) return true;
  if (Math.abs(o2) < 0.000001 && onSegment(a, d, b)) return true;
  if (Math.abs(o3) < 0.000001 && onSegment(c, a, d)) return true;
  if (Math.abs(o4) < 0.000001 && onSegment(c, b, d)) return true;
  return false;
}

function pointInPolygon(point, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const pi = ring[i];
    const pj = ring[j];
    const denominator = pj.z - pi.z;
    if (Math.abs(denominator) < 0.000001) continue;
    const intersects = ((pi.z > point.z) !== (pj.z > point.z))
      && (point.x < (pj.x - pi.x) * (point.z - pi.z) / denominator + pi.x);
    if (intersects) inside = !inside;
  }
  return inside;
}

function segmentDistance(a, b, c, d) {
  if (segmentsIntersect(a, b, c, d)) return 0;
  return Math.min(
    pointSegmentDistance(a, c, d),
    pointSegmentDistance(b, c, d),
    pointSegmentDistance(c, a, b),
    pointSegmentDistance(d, a, b),
  );
}

function buildingClearsRoadCorridors(row) {
  const ring = (row.footprintLngLat ?? [])
    .map((point) => {
      const [x, , z] = localPointFromLngLat(point);
      return { x, z };
    });
  return sourceRoadRows.every((road) => {
    const path = (road.pathLngLat ?? []).map((point) => {
      const [x, , z] = localPointFromLngLat(point);
      return { x, z };
    });
    const clearance = Math.max(0.1, road.widthMeters * SCENE_UNITS_PER_METER * 0.55) / 2 + 0.01;
    for (let i = 0; i < path.length - 1; i += 1) {
      if (pointInPolygon(path[i], ring) || pointInPolygon(path[i + 1], ring)) return false;
      for (let edgeIndex = 0; edgeIndex < ring.length - 1; edgeIndex += 1) {
        if (segmentDistance(path[i], path[i + 1], ring[edgeIndex], ring[edgeIndex + 1]) < clearance) {
          return false;
        }
      }
    }
    return true;
  });
}

const sourceBuildingRows = osmFixture.buildings ?? [];
const sourceBuildingFeatures = sourceBuildingRows
  .filter(buildingClearsRoadCorridors)
  .map(buildingFeature);

const sourceAreaRows = osmFixture.areas ?? [];

function roadGroundFeature(row) {
  const path = row.pathLngLat ?? [];
  return {
    id: row.id,
    kind: 'road-corridor',
    sourceRef: row.sourceRef,
    geometry: { type: 'LineString', coordinates: path.map((point) => localPointFromLngLat(point)) },
    sourceGeometry: { type: 'LineString', coordinates: path },
    visualState: {
      ...(displayName(row.tags) ? { label: displayName(row.tags) } : {}),
      widthMeters: row.widthMeters,
      width: row.widthMeters * SCENE_UNITS_PER_METER,
      displayWidth: Math.max(0.24, row.widthMeters * SCENE_UNITS_PER_METER * 1.15),
      color: '#DDE3EA',
      edgeColor: '#F8FBFF',
      centerLineColor: '#F596AA',
    },
  };
}

function areaGroundFeature(row) {
  const ring = row.footprintLngLat ?? [];
  return {
    id: row.id,
    kind: 'green-space',
    sourceRef: row.sourceRef,
    geometry: { type: 'Polygon', coordinates: [ring.map((point) => localPointFromLngLat(point))] },
    sourceGeometry: { type: 'Polygon', coordinates: [ring] },
    visualState: {
      ...(displayName(row.tags) ? { label: displayName(row.tags) } : {}),
      color: '#DDECCF',
      edgeColor: '#B5CAA0',
    },
  };
}

const sourceGroundFeatures = [
  ...sourceRoadRows.map(roadGroundFeature),
  ...sourceAreaRows.map(areaGroundFeature),
];

const fallbackChunkSourceRefs = Array.from(new Set([
  'openfreemap:zhongshan-station-focus',
  'tdx:mrt-static',
  'tdx:bus-mock',
  'tdx:bike-mock',
  'openstreetmap:road-corridor-contract',
  ...(osmFixture.sourceRefs ?? []),
]));

function areaAnchorFeature(source) {
  const tags = source.tags ?? {};
  const name = displayName(tags);
  const kind = kindFromTags(tags);
  const urbanRole = urbanRoleFromTags(tags, kind);
  const style = styleForBuilding({ id: source.id, kind, urbanRole });
  return {
    id: featureId(tags, `area-${normalizeId(source.id)}`),
    ontologyObjectId: objectId(tags, `landmark-${normalizeId(source.id)}`),
    kind,
    geometry: { type: 'Point', coordinates: localPointFromLngLat([source.lng, source.lat]) },
    sourceGeometry: { type: 'Point', coordinates: [source.lng, source.lat] },
    visualState: {
      sourceRef: source.sourceRef,
      areaAnchor: true,
      width: 0.42,
      depth: 0.42,
      footprintScale: 1,
      urbanRole,
      color: style.color,
      accentColor: style.color,
      signColor: style.signColor,
      ...(shortLabel(tags, name) ? { shortLabel: shortLabel(tags, name) } : {}),
      ...(name ? { label: name } : {}),
      sign: false,
    },
  };
}

const sourceAreaAnchorFeatures = (osmFixture.pois ?? []).map(areaAnchorFeature);
const fallbackCuratedObjectIds = new Set([
  'station-R11-G14',
  'train-R22',
  'bus-stop-nanxi',
  'landmark-shin-kong-nanxi',
  'landmark-eslite-nanxi',
  'ubike-zhongshan',
  'landmark-linsen-lane-shop',
  'landmark-chifeng-maker-lane',
  'rain-R042',
  'incident-I237',
]);
const fallbackStaticFeatureObjects = fixtureLandmarkObjects(
  [...sourceBuildingFeatures, ...sourceAreaAnchorFeatures],
  {
    label: 'Zhongshan Station / Nanjing West Road',
    stationLabel: '中山站',
    stationObjectId: 'station-R11-G14',
  },
).filter((object) => !fallbackCuratedObjectIds.has(object.id));

const northwest = localPointFromLngLat([ZHONGSHAN_GEO_BOUNDS.west, ZHONGSHAN_GEO_BOUNDS.north]);
const southeast = localPointFromLngLat([ZHONGSHAN_GEO_BOUNDS.east, ZHONGSHAN_GEO_BOUNDS.south]);
const ZHONGSHAN_LOCAL_BOUNDS = {
  minX: northwest[0],
  minZ: northwest[2],
  maxX: southeast[0],
  maxZ: southeast[2],
};

function makeLocalProjector(origin) {
  const localOriginMeters = mercatorMeters(origin.lng, origin.lat);
  return function projectLngLat([lng, lat], y = 0) {
    const meters = mercatorMeters(lng, lat);
    const x = (meters.x - localOriginMeters.x) * SCENE_UNITS_PER_METER;
    const z = -(meters.y - localOriginMeters.y) * SCENE_UNITS_PER_METER;
    return [Number(x.toFixed(3)), y, Number(z.toFixed(3))];
  };
}

function localBoundsFromGeoBounds(bounds, project) {
  const localNorthwest = project([bounds.west, bounds.north]);
  const localSoutheast = project([bounds.east, bounds.south]);
  return {
    minX: localNorthwest[0],
    minZ: localNorthwest[2],
    maxX: localSoutheast[0],
    maxZ: localSoutheast[2],
  };
}

function buildingFeatureFromFixture(source, project) {
  const tags = source.tags ?? {};
  const name = displayName(tags);
  const kind = kindFromTags(tags);
  const row = {
    id: source.id,
    kind,
    shortLabel: shortLabel(tags, name),
    label: name,
    floors: floorsFromTags(tags),
    urbanRole: urbanRoleFromTags(tags, kind),
  };
  const style = styleForBuilding(row);
  const footprint = source.footprintLngLat ?? [];
  return {
    id: featureId(tags, `building-${normalizeId(row.id)}`),
    ontologyObjectId: objectId(tags, `landmark-${normalizeId(row.id)}`),
    kind: row.kind,
    footprintSource: source.sourceRef,
    geometry: { type: 'Polygon', coordinates: [footprint.map((point) => project(point))] },
    sourceGeometry: { type: 'Polygon', coordinates: [footprint] },
    visualState: {
      floors: row.floors,
      footprintScale: 0.92,
      footprintSource: source.sourceRef,
      urbanRole: row.urbanRole,
      ...style,
      ...(row.shortLabel ? { shortLabel: row.shortLabel } : {}),
      ...(row.label ? { label: row.label } : {}),
      sign: Boolean(row.label) && ['landmark', 'market'].includes(row.urbanRole),
    },
  };
}

function buildingClearsFixtureRoadCorridors(row, roadRows, project) {
  const ring = (row.footprintLngLat ?? [])
    .map((point) => {
      const [x, , z] = project(point);
      return { x, z };
    });
  return roadRows.every((road) => {
    const path = (road.pathLngLat ?? []).map((point) => {
      const [x, , z] = project(point);
      return { x, z };
    });
    const clearance = Math.max(0.1, road.widthMeters * SCENE_UNITS_PER_METER * 0.55) / 2 + 0.01;
    for (let i = 0; i < path.length - 1; i += 1) {
      if (pointInPolygon(path[i], ring) || pointInPolygon(path[i + 1], ring)) return false;
      for (let edgeIndex = 0; edgeIndex < ring.length - 1; edgeIndex += 1) {
        if (segmentDistance(path[i], path[i + 1], ring[edgeIndex], ring[edgeIndex + 1]) < clearance) {
          return false;
        }
      }
    }
    return true;
  });
}

function roadGroundFeatureFromFixture(row, project) {
  const path = row.pathLngLat ?? [];
  return {
    id: row.id,
    kind: 'road-corridor',
    sourceRef: row.sourceRef,
    geometry: { type: 'LineString', coordinates: path.map((point) => project(point)) },
    sourceGeometry: { type: 'LineString', coordinates: path },
    visualState: {
      ...(displayName(row.tags) ? { label: displayName(row.tags) } : {}),
      widthMeters: row.widthMeters,
      width: row.widthMeters * SCENE_UNITS_PER_METER,
      displayWidth: Math.max(0.24, row.widthMeters * SCENE_UNITS_PER_METER * 1.15),
      color: '#DDE3EA',
      edgeColor: '#F8FBFF',
      centerLineColor: '#F596AA',
    },
  };
}

function areaGroundFeatureFromFixture(row, project) {
  const ring = row.footprintLngLat ?? [];
  return {
    id: row.id,
    kind: 'green-space',
    sourceRef: row.sourceRef,
    geometry: { type: 'Polygon', coordinates: [ring.map((point) => project(point))] },
    sourceGeometry: { type: 'Polygon', coordinates: [ring] },
    visualState: {
      ...(displayName(row.tags) ? { label: displayName(row.tags) } : {}),
      color: '#DDECCF',
      edgeColor: '#B5CAA0',
    },
  };
}

function areaAnchorFeatureFromFixture(source, project) {
  const tags = source.tags ?? {};
  const name = displayName(tags);
  const kind = kindFromTags(tags);
  const urbanRole = urbanRoleFromTags(tags, kind);
  const style = styleForBuilding({ id: source.id, kind, urbanRole });
  return {
    id: featureId(tags, `area-${normalizeId(source.id)}`),
    ontologyObjectId: objectId(tags, `landmark-${normalizeId(source.id)}`),
    kind,
    geometry: { type: 'Point', coordinates: project([source.lng, source.lat]) },
    sourceGeometry: { type: 'Point', coordinates: [source.lng, source.lat] },
    visualState: {
      sourceRef: source.sourceRef,
      areaAnchor: true,
      width: 0.42,
      depth: 0.42,
      footprintScale: 1,
      urbanRole,
      color: style.color,
      accentColor: style.color,
      signColor: style.signColor,
      ...(shortLabel(tags, name) ? { shortLabel: shortLabel(tags, name) } : {}),
      ...(name ? { label: name } : {}),
      sign: false,
    },
  };
}

function fixtureLandmarkObjects(features, focus) {
  return features
    .filter((feature) => feature.ontologyObjectId)
    .map((feature) => ({
      id: feature.ontologyObjectId,
      type: 'Landmark',
      name: feature.visualState?.label ?? feature.visualState?.shortLabel ?? feature.id,
      source: 'frontend:fallback',
      status: 'reference',
      summary: `Fallback fixture：${feature.visualState?.label ?? feature.id}，由 ${focus.label} 地圖資料推導成地圖地標。`,
      properties: {
        overlay: 'mrt',
        kind: feature.kind,
        intendedSource: 'osm',
        sourceRef: feature.footprintSource ?? feature.visualState?.sourceRef,
      },
      relationships: [{ type: 'near', targetObjectId: focus.stationObjectId, targetType: 'Station', label: focus.stationLabel }],
    }));
}

function focusConfigFromFixture(fixture) {
  const focus = fixture.focus;
  const station = fixture.stationAnchors?.[0];
  return {
    id: focus.id,
    label: focus.label,
    stationLabel: station?.tags?.['short_name:zh'] ?? station?.tags?.['name:zh'] ?? focus.label,
    stationObjectId: station?.objectId,
    chunkSetId: focus.chunkSetId,
    chunkId: focus.chunkId,
    coordinateSystemId: focus.coordinateSystemId,
    geoBounds: focus.geoBounds,
    origin: focus.origin,
    fixture,
  };
}

const TAIPEI_MAIN_STATION_FOCUS = focusConfigFromFixture(taipeiMainStationFixture);

function semanticZoneFromFixture(zone, project) {
  return {
    id: zone.id,
    kind: zone.kind,
    geometry: {
      type: 'Polygon',
      coordinates: [(zone.footprintLngLat ?? []).map((point) => project(point))],
    },
    state: zone.state ?? {},
  };
}

function objectFromFixture(object) {
  return {
    id: object.id,
    type: object.type,
    name: object.name,
    source: object.source ?? 'frontend:fallback',
    status: object.status,
    summary: object.summary,
    properties: object.properties ?? {},
    relationships: object.relationships ?? [],
  };
}

function projectionGeometryFromFixture(geometry, project) {
  if (geometry?.type === 'Point') {
    const [lng, lat, y = 0] = geometry.coordinates ?? [];
    return { type: 'Point', coordinates: project([lng, lat], y) };
  }
  if (geometry?.type === 'LineString') {
    return { type: 'LineString', coordinates: (geometry.coordinates ?? []).map((point) => project(point)) };
  }
  if (geometry?.type === 'Polygon') {
    return {
      type: 'Polygon',
      coordinates: (geometry.coordinates ?? []).map((ring) => ring.map((point) => project(point))),
    };
  }
  return { type: 'Point', coordinates: project([0, 0]) };
}

function projectionFromFixture(projection, focus, project) {
  return {
    id: projection.id,
    objectId: projection.objectId,
    chunkId: projection.chunkId ?? focus.chunkId,
    overlay: projection.overlay,
    renderModule: projection.renderModule,
    geometry: projectionGeometryFromFixture(projection.geometry, project),
    visualState: projection.visualState ?? {},
  };
}

function buildFixtureWorldViewPayload(focus) {
  const project = makeLocalProjector(focus.origin);
  const station = focus.fixture.stationAnchors?.[0];
  const roadRows = focus.fixture.roads ?? [];
  const buildingFeatures = (focus.fixture.buildings ?? [])
    .filter((building) => buildingClearsFixtureRoadCorridors(building, roadRows, project))
    .map((building) => buildingFeatureFromFixture(building, project));
  const areaAnchorFeatures = (focus.fixture.pois ?? []).map((poi) => areaAnchorFeatureFromFixture(poi, project));
  const groundFeatures = [
    ...roadRows.map((road) => roadGroundFeatureFromFixture(road, project)),
    ...(focus.fixture.areas ?? []).map((area) => areaGroundFeatureFromFixture(area, project)),
  ];
  const staticFeatures = [
    {
      id: station.id,
      ontologyObjectId: station.objectId,
      kind: 'station-anchor',
      geometry: { type: 'Point', coordinates: project([station.lng, station.lat], 0.35) },
      sourceGeometry: { type: 'Point', coordinates: [station.lng, station.lat] },
      visualState: {
        sourceRef: station.sourceRef,
        color: '#E16B8C',
        footprintScale: 0.56,
        shortLabel: station.tags?.['short_name:zh'] ?? station.tags?.['name:zh'],
        label: station.tags?.['name:zh'],
        aliases: station.aliases ?? [],
      },
    },
    ...buildingFeatures,
    ...areaAnchorFeatures,
  ];
  const sourceRefs = Array.from(new Set([
    `openfreemap:${focus.id}-focus`,
    'tdx:mrt-static',
    'tdx:bus-mock',
    'tdx:bike-mock',
    'openstreetmap:road-corridor-contract',
    ...(focus.fixture.sourceRefs ?? []),
  ]));
  const localBounds = localBoundsFromGeoBounds(focus.geoBounds, project);
  const landmarkObjects = fixtureLandmarkObjects([...buildingFeatures, ...areaAnchorFeatures], {
    label: focus.label,
    stationLabel: station.tags?.['short_name:zh'] ?? focus.stationLabel,
    stationObjectId: station.objectId,
  });

  return {
    schemaVersion: 'world-view.v1',
    request: {
      focusId: focus.id,
      lod: 'city',
      time: 'live',
      overlays: ['mrt', 'bus', 'ubike', 'rain', 'pm25', 'incident'],
      debugGeo: false,
    },
    focus: {
      id: focus.id,
      label: focus.label,
      geoBounds: focus.geoBounds,
      chunkSetId: focus.chunkSetId,
    },
    coordinateSystem: {
      id: focus.coordinateSystemId,
      projection: 'EPSG:3857 Web Mercator',
      originLng: focus.origin.lng,
      originLat: focus.origin.lat,
      sceneUnitsPerMeter: SCENE_UNITS_PER_METER,
      xAxis: 'east',
      zAxis: 'south',
    },
    chunks: [
      {
        id: focus.chunkId,
        label: focus.label,
        sceneOrigin: { x: 0, y: 0, z: 0 },
        localToScene: { translate: { x: 0, y: 0, z: 0 }, scale: 1, rotationDegrees: 0 },
        localBounds,
        groundFeatures,
        terrain: [],
        staticFeatures,
        semanticZones: (focus.fixture.semanticZones ?? []).map((zone) => semanticZoneFromFixture(zone, project)),
        sourceRefs,
      },
    ],
    objects: [
      ...(focus.fixture.objects ?? []).map(objectFromFixture),
      ...landmarkObjects,
    ],
    projections: (focus.fixture.projections ?? []).map((projection) => projectionFromFixture(projection, focus, project)),
    renderModules: [
      { id: 'voxel.mrt.route', kind: 'path' },
      { id: 'voxel.mrt.train', kind: 'entity' },
      { id: 'voxel.bus.stop', kind: 'entity' },
      { id: 'voxel.ubike.dock', kind: 'entity' },
      { id: 'voxel.weather.rainCell', kind: 'volume' },
      { id: 'voxel.ops.incidentPulse', kind: 'marker' },
    ],
    freshness: {
      mode: 'fallback',
      generatedAt: new Date(0).toISOString(),
      maxSourceLagSeconds: 60,
      sources: [
        { source: 'frontend:fallback', status: 'fallback', updatedAt: new Date(0).toISOString(), lagSeconds: 60 },
      ],
    },
    completeness: { status: 'complete', missingOverlays: [], warnings: ['frontend fallback payload'] },
  };
}

export const fallbackWorldViewPayload = {
  schemaVersion: 'world-view.v1',
  request: {
    focusId: 'zhongshan-station',
    lod: 'city',
    time: 'live',
    overlays: ['mrt', 'bus', 'ubike', 'rain', 'pm25', 'incident'],
    debugGeo: false,
  },
  focus: {
    id: 'zhongshan-station',
    label: 'Zhongshan Station / Nanjing West Road',
    geoBounds: ZHONGSHAN_GEO_BOUNDS,
    chunkSetId: 'zhongshan-station-v1',
  },
  coordinateSystem: {
    id: 'zhongshan-web-mercator-local-v1',
    projection: 'EPSG:3857 Web Mercator',
    originLng: MERCATOR_ORIGIN.lng,
    originLat: MERCATOR_ORIGIN.lat,
    sceneUnitsPerMeter: SCENE_UNITS_PER_METER,
    xAxis: 'east',
    zAxis: 'south',
  },
  chunks: [
    {
      id: 'chunk-zhongshan-station',
      label: 'Zhongshan Station / Nanjing West Road',
      sceneOrigin: { x: 0, y: 0, z: 0 },
      localToScene: { translate: { x: 0, y: 0, z: 0 }, scale: 1, rotationDegrees: 0 },
      localBounds: ZHONGSHAN_LOCAL_BOUNDS,
      groundFeatures: sourceGroundFeatures,
      terrain: [],
      staticFeatures: [
        { id: 'station-anchor-R11-G14', ontologyObjectId: 'station-R11-G14', kind: 'station-anchor', geometry: { type: 'Point', coordinates: localPointFromLngLat([121.5206, 25.0527], 0.35) }, sourceGeometry: { type: 'Point', coordinates: [121.5206, 25.0527] }, visualState: { sourceRef: 'tdx:mrt-station/R11-G14', color: '#E16B8C', footprintScale: 0.48, shortLabel: '中山站', label: '捷運中山站', aliases: ['中山'] } },
        ...sourceBuildingFeatures,
        ...sourceAreaAnchorFeatures,
      ],
      semanticZones: [
        { id: 'zone-nanxi-shopping', kind: 'shopping-corridor', geometry: { type: 'Polygon', coordinates: [[[-5, -3.5], [5, -3.5], [5, -0.3], [-5, -0.3], [-5, -3.5]]] }, state: { color: '#F596AA', opacity: 0.18 } },
      ],
      sourceRefs: fallbackChunkSourceRefs,
    },
  ],
  objects: [
    {
      id: 'station-R11-G14',
      type: 'Station',
      name: 'Zhongshan',
      source: 'frontend:fallback',
      status: 'normal',
      summary: 'Fallback fixture：中山站 R11/G14，Phase 1 唯一 live context 由 TDX MRT LiveBoard 表達。',
      properties: {
        overlay: 'mrt',
        stationId: 'R11/G14',
        lineId: 'red-green',
        intendedSource: 'tdx',
        liveSource: 'TDX MRT LiveBoard',
        maxSourceLagSeconds: 12,
        liveBoardRows: [
          { line: '淡水信義線', direction: '往淡水', destination: '淡水', etaMinutes: 2, status: 'approaching' },
          { line: '松山新店線', direction: '往新店', destination: '新店', etaMinutes: 4, status: 'boarding' },
        ],
      },
      relationships: [{ type: 'belongs_to', targetObjectId: 'route-R', targetType: 'Route', label: 'Tamsui-Xinyi' }],
    },
    {
      id: 'train-R22',
      type: 'Train',
      name: 'Train R22',
      source: 'frontend:fallback',
      status: 'live',
      summary: 'Fallback fixture：測試地下捷運列車 projection、hover 與 ontology drill-down。',
      properties: { overlay: 'mrt', route: 'Tamsui-Xinyi', nextStop: 'Zhongshan', etaMinutes: 2, load: 0.67, intendedSource: 'tdx' },
      relationships: [
        { type: 'belongs_to', targetObjectId: 'route-R', targetType: 'Route', label: 'Tamsui-Xinyi' },
        { type: 'near', targetObjectId: 'rain-R042', targetType: 'RainfallCell', label: 'Rain Cell R-042' },
      ],
    },
    {
      id: 'bus-stop-nanxi',
      type: 'BusStop',
      name: 'MRT Zhongshan Station Bus Stop',
      source: 'frontend:fallback',
      status: 'live',
      summary: 'Fallback fixture：測試公車站牌 render module 與轉乘 context。',
      properties: { overlay: 'bus', route: '304', etaMinutes: 3, waiting: 4, intendedSource: 'tdx' },
      relationships: [{ type: 'near', targetObjectId: 'station-R11-G14', targetType: 'Station', label: 'Zhongshan' }],
    },
    {
      id: 'landmark-shin-kong-nanxi',
      type: 'Landmark',
      name: 'Shin Kong Mitsukoshi Nanxi',
      source: 'frontend:fallback',
      status: 'reference',
      summary: 'Fallback fixture：測試 department-store render module 與南西商圈方向錨點。',
      properties: { overlay: 'mrt', kind: 'department-store', district: 'Nanxi shopping corridor', intendedSource: 'osm' },
      relationships: [{ type: 'near', targetObjectId: 'station-R11-G14', targetType: 'Station', label: 'Zhongshan' }],
    },
    {
      id: 'landmark-eslite-nanxi',
      type: 'Landmark',
      name: 'Eslite Nanxi',
      source: 'frontend:fallback',
      status: 'reference',
      summary: 'Fallback fixture：測試 bookstore-mall render module 與可辨識商場造型。',
      properties: { overlay: 'mrt', kind: 'bookstore-mall', district: 'Nanxi shopping corridor', intendedSource: 'osm' },
      relationships: [{ type: 'near', targetObjectId: 'station-R11-G14', targetType: 'Station', label: 'Zhongshan' }],
    },
    {
      id: 'ubike-zhongshan',
      type: 'BikeStation',
      name: 'YouBike MRT Zhongshan Station',
      source: 'frontend:fallback',
      status: 'live',
      summary: 'Fallback fixture：測試 YouBike dock render module 與容量狀態。',
      properties: { overlay: 'ubike', availableBikes: 11, availableDocks: 9, capacity: 20, intendedSource: 'tdx' },
      relationships: [{ type: 'near', targetObjectId: 'station-R11-G14', targetType: 'Station', label: 'Zhongshan' }],
    },
    {
      id: 'landmark-linsen-lane-shop',
      type: 'Landmark',
      name: 'Linsen Lane Shop Block',
      source: 'frontend:fallback',
      status: 'reference',
      summary: 'Fallback fixture：測試 lane-shop render module、巷弄商店辨識與 hover metadata。',
      properties: { overlay: 'mrt', kind: 'lane-shop', district: 'Zhongshan lane context', intendedSource: 'osm' },
      relationships: [{ type: 'near', targetObjectId: 'station-R11-G14', targetType: 'Station', label: 'Zhongshan' }],
    },
    {
      id: 'landmark-chifeng-maker-lane',
      type: 'Landmark',
      name: 'Chifeng Maker Lane',
      source: 'frontend:fallback',
      status: 'reference',
      summary: 'Fallback fixture：測試低樓層巷弄店家與 maker-lane 類型的 voxel 呈現。',
      properties: { overlay: 'mrt', kind: 'lane-shop', district: 'Chifeng Street context', intendedSource: 'osm' },
      relationships: [{ type: 'near', targetObjectId: 'station-R11-G14', targetType: 'Station', label: 'Zhongshan' }],
    },
    {
      id: 'rain-R042',
      type: 'RainfallCell',
      name: 'Rain Cell R-042',
      source: 'frontend:fallback',
      status: 'intense',
      summary: 'Fallback fixture：測試雨量 cell 對步行、候車與 YouBike 轉乘的跨 domain context。',
      properties: { overlay: 'rain', intensityMmHr: 38, confidence: 0.82, trend: 'rising', intendedSource: 'cwa' },
      relationships: [
        { type: 'covers', targetObjectId: 'chunk-zhongshan-station', targetType: 'DioramaChunk', label: 'Zhongshan Station / Nanjing West Road' },
        { type: 'affects', targetObjectId: 'bus-stop-nanxi', targetType: 'BusStop', label: 'MRT Zhongshan Station Bus Stop' },
      ],
    },
    {
      id: 'incident-I237',
      type: 'Incident',
      name: 'Incident I-237',
      source: 'frontend:fallback',
      status: 'open',
      summary: 'Fallback fixture：測試 incident pulse 與雨量、捷運 headway 的跨 domain context。',
      properties: { overlay: 'incident', severity: 'medium', radiusMeters: 600, intendedSource: 'ops' },
      relationships: [
        { type: 'coincident_with', targetObjectId: 'rain-R042', targetType: 'RainfallCell', label: 'Rain Cell R-042' },
      ],
    },
    ...fallbackStaticFeatureObjects,
  ],
  projections: [
    { id: 'proj-route-R-zhongshan', objectId: 'station-R11-G14', chunkId: 'chunk-zhongshan-station', overlay: 'mrt', renderModule: 'voxel.mrt.route', geometry: { type: 'LineString', coordinates: [[-2.4, 0, -3.4], [-1.2, 0, -2.4], [-0.2, 0, -0.4], [0.2, 0, 1.4]] }, visualState: { lineColor: '#E16B8C', thickness: 0.08, grade: 'underground', undergroundDepth: 0.72, tunnelColor: '#81C7D4', tunnelOpacity: 0.16 } },
    { id: 'proj-train-R22-zhongshan', objectId: 'train-R22', chunkId: 'chunk-zhongshan-station', overlay: 'mrt', renderModule: 'voxel.mrt.train', geometry: { type: 'LineString', coordinates: [[-1.1, 0, -2.8], [-0.2, 0, -0.4]] }, visualState: { lineColor: '#E16B8C', cars: 3, grade: 'underground', undergroundDepth: 0.72 } },
    { id: 'proj-bus-stop-nanxi', objectId: 'bus-stop-nanxi', chunkId: 'chunk-zhongshan-station', overlay: 'bus', renderModule: 'voxel.bus.stop', geometry: { type: 'Point', coordinates: [3.2, 0.45, 1.3] }, visualState: { color: '#5DAC81', waiting: 4, etaMinutes: 3 } },
    { id: 'proj-ubike-zhongshan', objectId: 'ubike-zhongshan', chunkId: 'chunk-zhongshan-station', overlay: 'ubike', renderModule: 'voxel.ubike.dock', geometry: { type: 'Point', coordinates: [2.4, 0.45, -1.8] }, visualState: { color: '#FFB11B', docks: 10, availableBikes: 6 } },
    { id: 'proj-rain-R042-zhongshan', objectId: 'rain-R042', chunkId: 'chunk-zhongshan-station', overlay: 'rain', renderModule: 'voxel.weather.rainCell', geometry: { type: 'Polygon', coordinates: [[[-4.5, -4.2], [4, -4.2], [4, 2], [-4.5, 2], [-4.5, -4.2]]] }, visualState: { color: '#81C7D4', opacity: 0.1, intensityMmHr: 18 } },
    { id: 'proj-incident-I237-zhongshan', objectId: 'incident-I237', chunkId: 'chunk-zhongshan-station', overlay: 'incident', renderModule: 'voxel.ops.incidentPulse', geometry: { type: 'Point', coordinates: [5.2, 0.9, 2.6] }, visualState: { color: '#B481BB', severity: 'medium' } },
  ],
  renderModules: [
    { id: 'voxel.mrt.route', kind: 'path' },
    { id: 'voxel.mrt.train', kind: 'entity' },
    { id: 'voxel.bus.stop', kind: 'entity' },
    { id: 'voxel.ubike.dock', kind: 'entity' },
    { id: 'voxel.weather.rainCell', kind: 'volume' },
    { id: 'voxel.ops.incidentPulse', kind: 'marker' },
  ],
  freshness: {
    mode: 'fallback',
    generatedAt: new Date(0).toISOString(),
    maxSourceLagSeconds: 60,
    sources: [
      { source: 'frontend:fallback', status: 'fallback', updatedAt: new Date(0).toISOString(), lagSeconds: 60 },
    ],
  },
  completeness: { status: 'complete', missingOverlays: [], warnings: ['frontend fallback payload'] },
};

export function fallbackWorldViewPayloadForFocus(focusId = 'zhongshan-station') {
  if (focusId === TAIPEI_MAIN_STATION_FOCUS.id) return buildFixtureWorldViewPayload(TAIPEI_MAIN_STATION_FOCUS);
  return fallbackWorldViewPayload;
}

export async function loadWorldViewPayload(fetcher = globalThis.fetch, options = {}) {
  const focusId = options.focusId ?? 'zhongshan-station';
  const fallbackPayload = fallbackWorldViewPayloadForFocus(focusId);
  if (typeof fetcher !== 'function') {
    return { payload: fallbackPayload, source: 'fallback' };
  }

  const explicitFetcher = fetcher !== globalThis.fetch;
  const envWantsApi = import.meta.env?.VITE_WORLD_VIEW_SOURCE === 'api';
  const apiEnabled = options.useApi ?? (explicitFetcher || envWantsApi);
  if (!apiEnabled) {
    return { payload: fallbackPayload, source: 'fallback' };
  }

  const urls = [`/api/world/view?focusId=${encodeURIComponent(focusId)}&lod=city&time=live`];
  return loadWorldViewPayloadFromUrls(fetcher, urls, fallbackPayload);
}

async function loadWorldViewPayloadFromUrls(fetcher, urls, fallbackPayload = fallbackWorldViewPayload) {
  for (const url of urls) {
    try {
      const response = await fetcher(url);
      if (!response.ok) {
        throw new Error(`World view request failed: ${response.status}`);
      }
      const payload = await response.json();
      validateWorldViewPayload(payload, { expectedFocusId: fallbackPayload.request?.focusId });
      return { payload, source: 'api' };
    } catch {
      // Try the next configured endpoint before falling back to local fixtures.
    }
  }

  return { payload: fallbackPayload, source: 'fallback' };
}

export async function loadWorldViewPayloadFromUrl(fetcher = globalThis.fetch, url) {
  try {
    const response = await fetcher(url);
    if (!response.ok) {
      throw new Error(`World view request failed: ${response.status}`);
    }
    const payload = await response.json();
    validateWorldViewPayload(payload);
    return { payload, source: 'api' };
  } catch {
    return { payload: fallbackWorldViewPayload, source: 'fallback' };
  }
}

export function validateWorldViewPayload(payload, options = {}) {
  const requiredArrays = ['chunks', 'objects', 'projections', 'renderModules'];
  if (!payload || payload.schemaVersion !== 'world-view.v1') {
    throw new Error('Unsupported world view payload schema');
  }
  requiredArrays.forEach((key) => {
    if (!Array.isArray(payload[key])) {
      throw new Error(`World view payload missing array: ${key}`);
    }
  });
  if (!payload.completeness?.status) {
    throw new Error('World view payload missing completeness status');
  }
  if (!payload.freshness?.mode || typeof payload.freshness.maxSourceLagSeconds !== 'number' || !Array.isArray(payload.freshness.sources)) {
    throw new Error('World view payload missing freshness metadata');
  }
  if (!payload.request?.focusId || !payload.focus?.id || payload.request.focusId !== payload.focus.id) {
    throw new Error('World view payload focus mismatch');
  }
  if (options.expectedFocusId && payload.focus.id !== options.expectedFocusId) {
    throw new Error(`World view payload unexpected focus: ${payload.focus.id}`);
  }
  if (!payload.focus.chunkSetId || !payload.coordinateSystem?.id) {
    throw new Error('World view payload missing focus coordinate metadata');
  }
  const chunkIds = new Set(payload.chunks.map((chunk) => chunk.id));
  const objectIds = new Set(payload.objects.map((object) => object.id));
  const renderModuleIds = new Set(payload.renderModules.map((module) => module.id));
  payload.chunks.forEach((chunk) => {
    (chunk.staticFeatures ?? []).forEach((feature) => {
      if (feature.ontologyObjectId && !objectIds.has(feature.ontologyObjectId)) {
        throw new Error(`World view static feature references unknown object: ${feature.ontologyObjectId}`);
      }
    });
  });
  payload.projections.forEach((projection) => {
    if (!chunkIds.has(projection.chunkId)) {
      throw new Error(`World view projection references unknown chunk: ${projection.chunkId}`);
    }
    if (!objectIds.has(projection.objectId)) {
      throw new Error(`World view projection references unknown object: ${projection.objectId}`);
    }
    if (!renderModuleIds.has(projection.renderModule)) {
      throw new Error(`World view projection references unknown render module: ${projection.renderModule}`);
    }
  });
}

export function summarizeWorldView(payload) {
  return {
    visibleChunks: payload.chunks.length,
    observations: payload.projections.length,
    ontologyObjects: payload.objects.length,
    voxelEntities: estimateVoxelEntityCount(payload),
  };
}

export function toUiOntologyObjects(payload) {
  return payload.objects.map((object) => {
    const overlay = object.properties?.overlay ?? object.source ?? 'world';
    const layer = layers.find((item) => item.key === overlay)?.label ?? legacyOverlayLabels[overlay] ?? overlay;
    return {
      id: object.id,
      name: object.name,
      type: formatType(object.type),
      layer,
      status: object.status,
      freshness: payload.freshness?.mode ?? payload.freshness?.status ?? 'unknown',
      summary: object.summary,
      properties: Object.entries(object.properties ?? {})
        .filter(([key]) => key !== 'overlay' && key !== 'liveBoardRows')
        .map(([key, value]) => `${toSnakeLabel(key)}: ${formatValue(value)}`),
      relationships: (object.relationships ?? []).map((item) => `${item.type} ${item.label ?? item.targetObjectId}`),
      rawProperties: object.properties ?? {},
    };
  });
}

function estimateVoxelEntityCount(payload) {
  const staticFeatures = payload.chunks.reduce((total, chunk) => total + (chunk.staticFeatures?.length ?? 0), 0);
  return staticFeatures + payload.projections.length;
}

function formatType(type) {
  return String(type ?? 'Object').replace(/([a-z])([A-Z])/g, '$1 $2');
}

function toSnakeLabel(key) {
  return String(key).replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
}

function formatValue(value) {
  if (typeof value === 'number' && value > 0 && value < 1) return `${Math.round(value * 100)}%`;
  if (Array.isArray(value)) return `${value.length} rows`;
  if (value && typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
