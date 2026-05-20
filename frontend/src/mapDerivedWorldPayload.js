const R = 6378137;
const DEFAULT_BUILDING_LIMIT = 72;
const DEFAULT_ROAD_LIMIT = 80;
const DEFAULT_AREA_LIMIT = 24;
const DEFAULT_POI_LIMIT = 32;
const MAP_DERIVED_MAX_FLOORS = 4;

function mercatorMeters(lng, lat) {
  return {
    x: R * lng * Math.PI / 180,
    y: R * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)),
  };
}

function scenePointFromLngLat(coordinateSystem, [lng, lat], y = 0) {
  const origin = mercatorMeters(coordinateSystem.originLng, coordinateSystem.originLat);
  const point = mercatorMeters(lng, lat);
  const scale = coordinateSystem.sceneUnitsPerMeter ?? 1;
  return [
    Number(((point.x - origin.x) * scale).toFixed(3)),
    y,
    Number((-(point.y - origin.y) * scale).toFixed(3)),
  ];
}

function lngLatFromScenePoint(coordinateSystem, [x = 0, yOrZ = 0, maybeZ]) {
  const z = maybeZ === undefined ? yOrZ : maybeZ;
  const origin = mercatorMeters(coordinateSystem.originLng, coordinateSystem.originLat);
  const scale = coordinateSystem.sceneUnitsPerMeter ?? 1;
  const mercatorX = origin.x + x / scale;
  const mercatorY = origin.y - z / scale;
  return [
    mercatorX / R * 180 / Math.PI,
    (2 * Math.atan(Math.exp(mercatorY / R)) - Math.PI / 2) * 180 / Math.PI,
  ];
}

function chunkTransform(chunk = {}) {
  return chunk.localToScene ?? {
    translate: chunk.sceneOrigin ?? { x: 0, y: 0, z: 0 },
    scale: 1,
    rotationDegrees: 0,
  };
}

function scenePointFromChunkLocal(coordinate, chunk) {
  const [x = 0, yOrZ = 0, maybeZ] = coordinate ?? [];
  const y = maybeZ === undefined ? 0 : yOrZ;
  const z = maybeZ === undefined ? yOrZ : maybeZ;
  const transform = chunkTransform(chunk);
  const scale = transform.scale ?? 1;
  const translate = transform.translate ?? { x: 0, y: 0, z: 0 };
  const rotation = (transform.rotationDegrees ?? 0) * Math.PI / 180;
  const scaledX = x * scale;
  const scaledZ = z * scale;
  return [
    scaledX * Math.cos(rotation) - scaledZ * Math.sin(rotation) + (translate.x ?? 0),
    y * scale + (translate.y ?? 0),
    scaledX * Math.sin(rotation) + scaledZ * Math.cos(rotation) + (translate.z ?? 0),
  ];
}

function chunkLocalPointFromScenePoint(scenePoint, chunk) {
  const [sceneX = 0, sceneY = 0, sceneZ = 0] = scenePoint ?? [];
  const transform = chunkTransform(chunk);
  const scale = transform.scale ?? 1;
  const translate = transform.translate ?? { x: 0, y: 0, z: 0 };
  const rotation = -((transform.rotationDegrees ?? 0) * Math.PI / 180);
  const dx = sceneX - (translate.x ?? 0);
  const dz = sceneZ - (translate.z ?? 0);
  return [
    Number(((dx * Math.cos(rotation) - dz * Math.sin(rotation)) / scale).toFixed(3)),
    Number(((sceneY - (translate.y ?? 0)) / scale).toFixed(3)),
    Number(((dx * Math.sin(rotation) + dz * Math.cos(rotation)) / scale).toFixed(3)),
  ];
}

function localPointFromLngLat(payload, chunk, point, y = 0) {
  return chunkLocalPointFromScenePoint(scenePointFromLngLat(payload.coordinateSystem, point, y), chunk);
}

function normalizeId(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

function featureName(properties = {}, fallback) {
  return properties['name:zh'] || properties.name || properties['name:en'] || fallback;
}

function explicitFeatureName(properties = {}) {
  return featureName(properties, '');
}

function shortLabel(name, fallback = '') {
  const label = String(name || fallback || '').trim();
  if (!label) return '';
  return label.length <= 6 ? label : label.slice(0, 6);
}

function hashNumber(value) {
  return String(value ?? '').split('').reduce((total, char) => ((total << 5) - total + char.charCodeAt(0)) | 0, 0);
}

function paletteColor(id) {
  const palette = ['#FFD2DC', '#F8DDE7', '#BFE8F4', '#DDECCF', '#F7E6B8', '#D9C8F2'];
  return palette[Math.abs(hashNumber(id)) % palette.length];
}

function buildingKind(properties = {}) {
  const text = [
    properties.shop,
    properties.amenity,
    properties.building,
    properties.class,
    properties.type,
    properties.subclass,
    properties.name,
    properties['name:zh'],
  ].filter(Boolean).join(' ').toLowerCase();
  if (text.includes('department') || text.includes('mall') || text.includes('百貨') || text.includes('商場')) return 'department-store';
  if (text.includes('book') || text.includes('library') || text.includes('書')) return 'bookstore-mall';
  return 'lane-shop';
}

function urbanRole(properties = {}, kind = 'lane-shop') {
  const text = [
    properties.shop,
    properties.amenity,
    properties.building,
    properties.class,
    properties.type,
    properties.subclass,
  ].filter(Boolean).join(' ').toLowerCase();
  if (text.includes('market')) return 'market';
  if (text.includes('restaurant') || text.includes('cafe') || text.includes('food')) return 'restaurant';
  if (kind === 'department-store' || kind === 'bookstore-mall') return 'landmark';
  if (properties.name || properties['name:zh']) return 'creative-shop';
  return 'residential';
}

function floors(properties = {}, maxFloors = 12) {
  const explicit = Number.parseInt(properties['building:levels'] ?? properties.levels, 10);
  if (Number.isFinite(explicit)) return Math.max(1, Math.min(maxFloors, explicit));
  const height = Number.parseFloat(properties.render_height ?? properties.height);
  if (Number.isFinite(height) && height > 0) return Math.max(1, Math.min(maxFloors, Math.round(height / 3.6)));
  return 3;
}

function styleForBuilding(id, kind, role) {
  if (kind === 'department-store') return { color: '#F596AA', accentColor: '#F596AA', signColor: '#FFB11B' };
  if (kind === 'bookstore-mall') return { color: '#FFD2DC', accentColor: '#FFD2DC', signColor: '#81C7D4' };
  if (role === 'market' || role === 'restaurant') return { color: '#F7E6B8', accentColor: '#FFB11B', signColor: '#FFB11B' };
  const color = paletteColor(id);
  return { color, accentColor: color, signColor: role === 'residential' ? '#B5CAA0' : '#E16B8C' };
}

function validLngLat(point) {
  return Array.isArray(point)
    && typeof point[0] === 'number'
    && typeof point[1] === 'number'
    && Math.abs(point[0]) <= 180
    && Math.abs(point[1]) <= 90;
}

function closeRing(ring) {
  if (!Array.isArray(ring) || ring.length < 4) return null;
  const lngLatRing = ring.filter(validLngLat).map(([lng, lat]) => [lng, lat]);
  if (lngLatRing.length < 4) return null;
  const first = lngLatRing[0];
  const last = lngLatRing[lngLatRing.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) lngLatRing.push([...first]);
  return lngLatRing;
}

function polygonRings(geometry) {
  if (geometry?.type === 'Polygon') {
    const ring = closeRing(geometry.coordinates?.[0]);
    return ring ? [ring] : [];
  }
  if (geometry?.type === 'MultiPolygon') {
    return (geometry.coordinates ?? [])
      .map((polygon) => closeRing(polygon?.[0]))
      .filter(Boolean);
  }
  return [];
}

function linePaths(geometry) {
  if (geometry?.type === 'LineString') {
    const path = (geometry.coordinates ?? []).filter(validLngLat).map(([lng, lat]) => [lng, lat]);
    return path.length >= 2 ? [path] : [];
  }
  if (geometry?.type === 'MultiLineString') {
    return (geometry.coordinates ?? [])
      .map((path) => (path ?? []).filter(validLngLat).map(([lng, lat]) => [lng, lat]))
      .filter((path) => path.length >= 2);
  }
  return [];
}

function pointCoordinates(geometry) {
  if (geometry?.type === 'Point' && validLngLat(geometry.coordinates)) return geometry.coordinates;
  if (geometry?.type === 'MultiPoint') {
    return (geometry.coordinates ?? []).find(validLngLat) ?? null;
  }
  return null;
}

function paddedBounds(bounds, paddingRatio = 0.08) {
  if (!bounds) return null;
  const lngPadding = Math.max(0.00001, (bounds.east - bounds.west) * paddingRatio);
  const latPadding = Math.max(0.00001, (bounds.north - bounds.south) * paddingRatio);
  return {
    west: bounds.west - lngPadding,
    south: bounds.south - latPadding,
    east: bounds.east + lngPadding,
    north: bounds.north + latPadding,
  };
}

function pointInsideBounds([lng, lat], bounds) {
  if (!bounds) return true;
  return lng >= bounds.west && lng <= bounds.east && lat >= bounds.south && lat <= bounds.north;
}

function coordinateBounds(points) {
  if (!points?.length) return null;
  return {
    west: Math.min(...points.map(([lng]) => lng)),
    east: Math.max(...points.map(([lng]) => lng)),
    south: Math.min(...points.map(([, lat]) => lat)),
    north: Math.max(...points.map(([, lat]) => lat)),
  };
}

function boundsIntersect(left, right) {
  if (!left || !right) return true;
  return left.west <= right.east
    && left.east >= right.west
    && left.south <= right.north
    && left.north >= right.south;
}

function chunkGeoBounds(payload, chunk) {
  if (chunk?.geoBounds) return chunk.geoBounds;
  const bounds = chunk?.localBounds;
  if (!payload?.coordinateSystem || !bounds) return payload?.focus?.geoBounds ?? null;
  const corners = [
    [bounds.minX, 0, bounds.minZ],
    [bounds.maxX, 0, bounds.minZ],
    [bounds.maxX, 0, bounds.maxZ],
    [bounds.minX, 0, bounds.maxZ],
  ].map((point) => lngLatFromScenePoint(payload.coordinateSystem, scenePointFromChunkLocal(point, chunk)));
  return coordinateBounds(corners);
}

function orientation(a, b, c) {
  const value = (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1]);
  if (Math.abs(value) < 1e-12) return 0;
  return value > 0 ? 1 : 2;
}

function pointOnSegment(a, b, c) {
  return c[0] <= Math.max(a[0], b[0]) + 1e-12
    && c[0] >= Math.min(a[0], b[0]) - 1e-12
    && c[1] <= Math.max(a[1], b[1]) + 1e-12
    && c[1] >= Math.min(a[1], b[1]) - 1e-12;
}

function segmentsIntersect(a, b, c, d) {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && pointOnSegment(a, b, c)) return true;
  if (o2 === 0 && pointOnSegment(a, b, d)) return true;
  if (o3 === 0 && pointOnSegment(c, d, a)) return true;
  if (o4 === 0 && pointOnSegment(c, d, b)) return true;
  return false;
}

function segmentIntersectsBounds(start, end, bounds) {
  if (!bounds) return true;
  if (pointInsideBounds(start, bounds) || pointInsideBounds(end, bounds)) return true;
  const corners = {
    southwest: [bounds.west, bounds.south],
    southeast: [bounds.east, bounds.south],
    northeast: [bounds.east, bounds.north],
    northwest: [bounds.west, bounds.north],
  };
  return [
    [corners.southwest, corners.southeast],
    [corners.southeast, corners.northeast],
    [corners.northeast, corners.northwest],
    [corners.northwest, corners.southwest],
  ].some(([edgeStart, edgeEnd]) => segmentsIntersect(start, end, edgeStart, edgeEnd));
}

function pathTouchesBounds(path, bounds) {
  if (!bounds) return true;
  return boundsIntersect(coordinateBounds(path), bounds)
    && path.some((point, index) => index > 0 && segmentIntersectsBounds(path[index - 1], point, bounds));
}

function ringAcceptedForBounds(ring, bounds) {
  if (!bounds) return true;
  return boundsIntersect(coordinateBounds(ring), bounds)
    && ring.every((point) => pointInsideBounds(point, bounds));
}

function localLine(payload, chunk, path) {
  return path.map((point) => localPointFromLngLat(payload, chunk, point));
}

function localPolygon(payload, chunk, ring) {
  return ring.map((point) => localPointFromLngLat(payload, chunk, point));
}

function roadWidth(properties = {}) {
  const highway = String(properties.highway ?? properties.class ?? properties.type ?? '').toLowerCase();
  if (highway.includes('primary') || highway.includes('trunk')) return 18;
  if (highway.includes('secondary')) return 14;
  if (highway.includes('service') || highway.includes('path') || highway.includes('footway')) return 5;
  return 8;
}

function buildRoadFeatures(payload, chunk, roads, bounds) {
  const coordinateSystem = payload.coordinateSystem;
  return roads.flatMap((feature, featureIndex) => linePaths(feature.geometry)
    .filter((path) => pathTouchesBounds(path, bounds))
    .map((path, pathIndex) => {
    const properties = feature.properties ?? {};
    const widthMeters = roadWidth(properties);
    const sourceRef = properties.sourceRef ?? `openfreemap:road/${feature.id ?? featureIndex}`;
    const id = `map-road-${normalizeId(sourceRef)}-${pathIndex}`;
    return {
      id,
      kind: 'road-corridor',
      sourceRef,
      geometry: { type: 'LineString', coordinates: localLine(payload, chunk, path) },
      sourceGeometry: { type: 'LineString', coordinates: path },
      visualState: {
        ...(explicitFeatureName(properties) ? { label: explicitFeatureName(properties) } : {}),
        widthMeters,
        width: widthMeters * coordinateSystem.sceneUnitsPerMeter,
        displayWidth: Math.max(0.18, widthMeters * coordinateSystem.sceneUnitsPerMeter * 1.08),
        color: '#DDE3EA',
        edgeColor: '#F8FBFF',
        centerLineColor: '#F596AA',
        derivedFrom: 'maplibre-rendered-feature',
      },
    };
  }));
}

function buildAreaFeatures(payload, chunk, areas, bounds) {
  return areas.flatMap((feature, featureIndex) => polygonRings(feature.geometry)
    .filter((ring) => ringAcceptedForBounds(ring, bounds))
    .map((ring, ringIndex) => {
    const properties = feature.properties ?? {};
    const sourceRef = properties.sourceRef ?? `openfreemap:area/${feature.id ?? featureIndex}`;
    const id = `map-area-${normalizeId(sourceRef)}-${ringIndex}`;
    return {
      id,
      kind: 'green-space',
      sourceRef,
      geometry: { type: 'Polygon', coordinates: [localPolygon(payload, chunk, ring)] },
      sourceGeometry: { type: 'Polygon', coordinates: [ring] },
      visualState: {
        ...(explicitFeatureName(properties) ? { label: explicitFeatureName(properties) } : {}),
        color: '#DDECCF',
        edgeColor: '#B5CAA0',
        derivedFrom: 'maplibre-rendered-feature',
      },
    };
  }));
}

function buildStaticBuildings(payload, chunk, buildings, bounds) {
  return buildings.flatMap((feature, featureIndex) => polygonRings(feature.geometry)
    .filter((ring) => ringAcceptedForBounds(ring, bounds))
    .map((ring, ringIndex) => {
    const properties = feature.properties ?? {};
    const sourceRef = properties.sourceRef ?? `openfreemap:building/${feature.id ?? featureIndex}`;
    const id = `map-building-${normalizeId(sourceRef)}-${ringIndex}`;
    const name = explicitFeatureName(properties);
    const kind = buildingKind(properties);
    const role = urbanRole(properties, kind);
    const style = styleForBuilding(id, kind, role);
    return {
      id,
      featureId: `geo-${id}`,
      ...(name ? { ontologyObjectId: `map-derived-${id}` } : {}),
      kind,
      footprintSource: sourceRef,
      geometry: { type: 'Polygon', coordinates: [localPolygon(payload, chunk, ring)] },
      sourceGeometry: { type: 'Polygon', coordinates: [ring] },
      visualState: {
        floors: floors(properties, MAP_DERIVED_MAX_FLOORS),
        footprintScale: 0.92,
        footprintSource: sourceRef,
        urbanRole: role,
        ...style,
        ...(name ? { shortLabel: shortLabel(name, kind), label: name } : {}),
        sign: Boolean(name),
        derivedFrom: 'maplibre-rendered-feature',
      },
    };
  }));
}

function poiKind(properties = {}) {
  const text = [
    properties.shop,
    properties.amenity,
    properties.class,
    properties.type,
    properties.subclass,
    properties.name,
    properties['name:zh'],
  ].filter(Boolean).join(' ').toLowerCase();
  if (text.includes('station') || text.includes('subway') || text.includes('metro') || text.includes('捷運')) return 'station-anchor';
  if (text.includes('department') || text.includes('mall') || text.includes('百貨') || text.includes('商場')) return 'department-store';
  if (text.includes('book') || text.includes('library') || text.includes('書')) return 'bookstore-mall';
  return 'lane-shop';
}

function buildPoiAnchors(payload, chunk, pois, bounds) {
  return pois.flatMap((feature, featureIndex) => {
    const point = pointCoordinates(feature.geometry);
    if (!point || !pointInsideBounds(point, bounds)) return [];
    const properties = feature.properties ?? {};
    const sourceRef = properties.sourceRef ?? `openfreemap:poi/${feature.id ?? featureIndex}`;
    const id = `map-poi-${normalizeId(sourceRef)}`;
    const name = explicitFeatureName(properties);
    const kind = poiKind(properties);
    const role = urbanRole(properties, kind);
    const style = styleForBuilding(id, kind, role);
    return [{
      id,
      ...(name ? { ontologyObjectId: `map-derived-${id}` } : {}),
      kind,
      sourceRef,
      geometry: { type: 'Point', coordinates: localPointFromLngLat(payload, chunk, point, 0.18) },
      sourceGeometry: { type: 'Point', coordinates: point },
      visualState: {
        areaAnchor: true,
        width: 0.42,
        depth: 0.42,
        footprintScale: 1,
        urbanRole: role,
        ...style,
        ...(name ? { shortLabel: shortLabel(name, kind), label: name } : {}),
        sign: Boolean(name),
        derivedFrom: 'maplibre-rendered-poi',
      },
    }];
  });
}

function isReplaceableStaticBuildingFootprint(feature) {
  return feature?.geometry?.type === 'Polygon'
    && Boolean(feature.footprintSource ?? feature.visualState?.footprintSource)
    && feature.visualState?.derivedFrom !== 'maplibre-rendered-feature';
}

function isFixtureMapPlaceFeature(feature) {
  return feature?.visualState?.areaAnchor && feature?.visualState?.derivedFrom !== 'maplibre-rendered-poi';
}

function preserveNonDerivedStaticFeatures(staticFeatures = [], hasMapDerivedCityFabric = false) {
  return staticFeatures.filter((feature) => {
    if (isReplaceableStaticBuildingFootprint(feature)) return false;
    if (hasMapDerivedCityFabric && isFixtureMapPlaceFeature(feature)) return false;
    return true;
  });
}

function mapDerivedBuildingsForChunk(chunk, buildings, featureCatalog, options) {
  const replaceable = (chunk.staticFeatures ?? []).filter(isReplaceableStaticBuildingFootprint);
  const replacementMode = options.buildingReplacementMode ?? featureCatalog.coverage?.buildings ?? 'rendered-viewport';
  const canReplace = replacementMode === 'rendered-viewport'
    || replacementMode === 'replace-all'
    || replacementMode === 'complete';
  if (buildings.length === 0) return canReplace ? [] : replaceable;
  return canReplace ? buildings : replaceable;
}

function hasViewportCoverage(featureCatalog) {
  return Object.values(featureCatalog?.coverage ?? {}).includes('rendered-viewport');
}

function canCatalogReplaceCityFabricForChunk(featureCatalog, chunkBounds, options = {}) {
  if (!featureCatalog || !boundsIntersect(featureCatalog.bounds, chunkBounds)) return false;
  const replacementMode = options.buildingReplacementMode ?? featureCatalog.coverage?.buildings ?? 'rendered-viewport';
  return replacementMode === 'rendered-viewport'
    || replacementMode === 'replace-all'
    || replacementMode === 'complete';
}

function mapDerivedObjectFromFeature(feature, featureCatalog) {
  const name = feature.visualState?.label ?? feature.visualState?.shortLabel;
  if (!name || !feature.ontologyObjectId) return null;
  const sourceRef = feature.footprintSource ?? feature.sourceRef ?? feature.visualState?.footprintSource;
  return {
    id: feature.ontologyObjectId,
    name,
    type: feature.kind === 'station-anchor' ? 'MapDerivedStation' : 'MapDerivedPlace',
    source: featureCatalog.source ?? 'maplibre-rendered-features',
    status: 'context',
    summary: 'Named map feature promoted from the rendered map catalog for map drill-down.',
    properties: {
      overlay: 'tiles',
      sourceRef,
      kind: feature.kind,
      derivedFrom: feature.visualState?.derivedFrom ?? 'map-derived-feature',
      ...(feature.footprintSource ? { footprintSource: feature.footprintSource } : {}),
    },
    relationships: [],
  };
}

function appendMapDerivedObjects(payload, chunks, featureCatalog) {
  const preservedObjects = preservePayloadObjects(payload, chunks);
  const seenIds = new Set(preservedObjects.map((object) => object.id));
  const derivedObjects = [];
  chunks
    .flatMap((chunk) => chunk.staticFeatures ?? [])
    .map((feature) => mapDerivedObjectFromFeature(feature, featureCatalog))
    .filter(Boolean)
    .forEach((object) => {
      if (seenIds.has(object.id)) return;
      seenIds.add(object.id);
      derivedObjects.push(object);
    });
  return [...preservedObjects, ...derivedObjects];
}

function preservePayloadObjects(payload, chunks) {
  const referencedObjectIds = new Set([
    ...(payload.projections ?? []).map((projection) => projection.objectId),
    ...chunks.flatMap((chunk) => (chunk.staticFeatures ?? []).map((feature) => feature.ontologyObjectId).filter(Boolean)),
  ]);
  return (payload.objects ?? []).filter((object) => {
    if (referencedObjectIds.has(object.id)) return true;
    return object.status === 'live' || object.type === 'Station';
  });
}

export function deriveWorldPayloadFromMapFeatureCatalog(payload, featureCatalog, options = {}) {
  if (!payload?.coordinateSystem || !featureCatalog) return payload;
  const catalogBounds = featureCatalog.bounds ?? payload.focus?.geoBounds;
  const nextChunks = (payload.chunks ?? []).map((chunk) => {
    const bounds = chunkGeoBounds(payload, chunk) ?? catalogBounds;
    const catalogReplacesCityFabric = canCatalogReplaceCityFabricForChunk(featureCatalog, bounds, options);
    const roadBounds = paddedBounds(bounds);
    const roads = buildRoadFeatures(payload, chunk, featureCatalog.roads ?? [], roadBounds).slice(0, options.roadLimit ?? DEFAULT_ROAD_LIMIT);
    const buildings = buildStaticBuildings(payload, chunk, featureCatalog.buildings ?? [], bounds).slice(0, options.buildingLimit ?? DEFAULT_BUILDING_LIMIT);
    const areas = buildAreaFeatures(payload, chunk, featureCatalog.areas ?? [], bounds).slice(0, options.areaLimit ?? DEFAULT_AREA_LIMIT);
    const pois = buildPoiAnchors(payload, chunk, featureCatalog.pois ?? [], bounds).slice(0, options.poiLimit ?? DEFAULT_POI_LIMIT);
    const hasDerivedFeatures = roads.length > 0 || buildings.length > 0 || areas.length > 0 || pois.length > 0;
    const hasMapDerivedCityFabric = catalogReplacesCityFabric || buildings.length > 0 || pois.length > 0;
    const catalogAppliesToChunk = hasDerivedFeatures || catalogReplacesCityFabric;
    if (!catalogAppliesToChunk) return chunk;
    return {
      ...chunk,
      groundFeatures: [
        ...(roads.length > 0 ? roads : (chunk.groundFeatures ?? []).filter((feature) => feature.kind === 'road-corridor')),
        ...(areas.length > 0 ? areas : (chunk.groundFeatures ?? []).filter((feature) => feature.kind !== 'road-corridor')),
      ],
      staticFeatures: [
        ...preserveNonDerivedStaticFeatures(chunk.staticFeatures, hasMapDerivedCityFabric),
        ...mapDerivedBuildingsForChunk(chunk, buildings, featureCatalog, options),
        ...pois,
      ],
      sourceRefs: Array.from(new Set([
        ...(chunk.sourceRefs ?? []),
        ...(catalogAppliesToChunk ? ['openfreemap:rendered-feature-catalog', featureCatalog.source ?? 'maplibre-rendered-features'] : []),
      ])),
    };
  });
  const hasAnyDerivedFeature = nextChunks.some((chunk) => chunk.sourceRefs?.includes('openfreemap:rendered-feature-catalog'));
  if (!hasAnyDerivedFeature) return payload;
  const viewportDerived = hasViewportCoverage(featureCatalog);

  return {
    ...payload,
    chunks: nextChunks,
    objects: appendMapDerivedObjects(payload, nextChunks, featureCatalog),
    completeness: {
      ...(payload.completeness ?? { status: 'complete', missingOverlays: [], warnings: [] }),
      status: viewportDerived ? 'partial' : (payload.completeness?.status ?? 'complete'),
      warnings: Array.from(new Set([
        ...(payload.completeness?.warnings ?? []),
        'static city fabric derived from MapLibre rendered features',
        ...(viewportDerived ? ['MapLibre rendered-viewport catalog is a visual bootstrap source, not a complete OSM extract'] : []),
      ])),
    },
  };
}
