const R = 6378137;
const DEFAULT_ALIGNMENT_THRESHOLD_METERS = 15;
const EMPTY_REPORT = {
  thresholdMeters: DEFAULT_ALIGNMENT_THRESHOLD_METERS,
  status: 'WAITING_FOR_PAYLOAD',
  total: 0,
  statusCounts: {},
  diagnostics: [],
};

function explicitName(properties = {}) {
  return properties['name:zh'] || properties.name || properties['name:en'] || '';
}

function normalizeName(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s·・,，.。()（）[\]【】_-]+/g, '');
}

function normalizedNames(values = []) {
  return Array.from(new Set(values.map(normalizeName).filter(Boolean)));
}

function mercatorMeters([lng, lat]) {
  return {
    x: R * lng * Math.PI / 180,
    y: R * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)),
  };
}

function validLngLat(point) {
  return Array.isArray(point)
    && typeof point[0] === 'number'
    && typeof point[1] === 'number'
    && Math.abs(point[0]) <= 180
    && Math.abs(point[1]) <= 90;
}

function rawCoordinatesOfGeometry(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'Point') return validLngLat(geometry.coordinates) ? [geometry.coordinates] : [];
  if (geometry.type === 'LineString') return (geometry.coordinates ?? []).filter(validLngLat);
  if (geometry.type === 'Polygon') return ringWithoutClosingPoint((geometry.coordinates?.[0] ?? []).filter(validLngLat));
  if (geometry.type === 'MultiPoint') return (geometry.coordinates ?? []).filter(validLngLat);
  if (geometry.type === 'MultiLineString') return (geometry.coordinates ?? []).flatMap((path) => (path ?? []).filter(validLngLat));
  if (geometry.type === 'MultiPolygon') {
    return (geometry.coordinates ?? []).flatMap((polygon) => ringWithoutClosingPoint((polygon?.[0] ?? []).filter(validLngLat)));
  }
  return [];
}

function ringWithoutClosingPoint(ring) {
  if (ring.length < 2) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return ring.slice(0, -1);
  return ring;
}

function centroidLngLat(geometry) {
  const coordinates = rawCoordinatesOfGeometry(geometry);
  if (coordinates.length === 0) return null;
  const total = coordinates.reduce((sum, point) => ({ lng: sum.lng + point[0], lat: sum.lat + point[1] }), { lng: 0, lat: 0 });
  return [total.lng / coordinates.length, total.lat / coordinates.length];
}

function pointSegmentDistanceMeters(pointLngLat, startLngLat, endLngLat) {
  const point = mercatorMeters(pointLngLat);
  const start = mercatorMeters(startLngLat);
  const end = mercatorMeters(endLngLat);
  const vx = end.x - start.x;
  const vy = end.y - start.y;
  const wx = point.x - start.x;
  const wy = point.y - start.y;
  const lengthSquared = vx * vx + vy * vy;
  if (lengthSquared <= 0.000001) return Math.hypot(point.x - start.x, point.y - start.y);
  const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / lengthSquared));
  return Math.hypot(point.x - (start.x + t * vx), point.y - (start.y + t * vy));
}

function segmentDistanceMeters(leftStartLngLat, leftEndLngLat, rightStartLngLat, rightEndLngLat) {
  const leftStart = mercatorMeters(leftStartLngLat);
  const leftEnd = mercatorMeters(leftEndLngLat);
  const rightStart = mercatorMeters(rightStartLngLat);
  const rightEnd = mercatorMeters(rightEndLngLat);
  if (segmentsIntersect(leftStart, leftEnd, rightStart, rightEnd)) return 0;
  return Math.min(
    pointSegmentDistanceMeters(leftStartLngLat, rightStartLngLat, rightEndLngLat),
    pointSegmentDistanceMeters(leftEndLngLat, rightStartLngLat, rightEndLngLat),
    pointSegmentDistanceMeters(rightStartLngLat, leftStartLngLat, leftEndLngLat),
    pointSegmentDistanceMeters(rightEndLngLat, leftStartLngLat, leftEndLngLat),
  );
}

function signedOrientation(a, b, c) {
  return (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
}

function pointOnSegmentProjected(a, b, c) {
  return b.x <= Math.max(a.x, c.x) + 0.000001
    && b.x + 0.000001 >= Math.min(a.x, c.x)
    && b.y <= Math.max(a.y, c.y) + 0.000001
    && b.y + 0.000001 >= Math.min(a.y, c.y);
}

function segmentsIntersect(a, b, c, d) {
  const o1 = signedOrientation(a, b, c);
  const o2 = signedOrientation(a, b, d);
  const o3 = signedOrientation(c, d, a);
  const o4 = signedOrientation(c, d, b);
  if (o1 * o2 < 0 && o3 * o4 < 0) return true;
  if (Math.abs(o1) < 0.000001 && pointOnSegmentProjected(a, c, b)) return true;
  if (Math.abs(o2) < 0.000001 && pointOnSegmentProjected(a, d, b)) return true;
  if (Math.abs(o3) < 0.000001 && pointOnSegmentProjected(c, a, d)) return true;
  if (Math.abs(o4) < 0.000001 && pointOnSegmentProjected(c, b, d)) return true;
  return false;
}

function distanceMeters(leftLngLat, rightLngLat) {
  if (!validLngLat(leftLngLat) || !validLngLat(rightLngLat)) return Number.POSITIVE_INFINITY;
  const left = mercatorMeters(leftLngLat);
  const right = mercatorMeters(rightLngLat);
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function distanceToGeometryMeters(anchorLngLat, geometry) {
  if (!validLngLat(anchorLngLat) || !geometry) return Number.POSITIVE_INFINITY;
  if (geometry.type === 'Polygon') {
    const ring = ringWithoutClosingPoint((geometry.coordinates?.[0] ?? []).filter(validLngLat));
    if (pointInPolygon(anchorLngLat, ring) || pointOnRing(anchorLngLat, ring)) return 0;
    return ringDistanceMeters(anchorLngLat, ring);
  }
  if (geometry.type === 'LineString') {
    const path = (geometry.coordinates ?? []).filter(validLngLat);
    if (path.length < 2) return Number.POSITIVE_INFINITY;
    return Math.min(...path.slice(1).map((point, index) => pointSegmentDistanceMeters(anchorLngLat, path[index], point)));
  }
  const centroid = centroidLngLat(geometry);
  return centroid ? distanceMeters(anchorLngLat, centroid) : Number.POSITIVE_INFINITY;
}

function pointOnRing(point, ring) {
  if (ring.length < 2) return false;
  return ring.some((start, index) => {
    const end = ring[(index + 1) % ring.length];
    return pointSegmentDistanceMeters(point, start, end) < 0.01;
  });
}

function ringDistanceMeters(point, ring) {
  if (ring.length < 2) return Number.POSITIVE_INFINITY;
  return Math.min(...ring.map((start, index) => pointSegmentDistanceMeters(point, start, ring[(index + 1) % ring.length])));
}

function pointInPolygon(point, ring) {
  const polygon = ringWithoutClosingPoint((ring ?? []).filter(validLngLat));
  if (polygon.length < 3) return false;
  const p = mercatorMeters(point);
  const projected = polygon.map(mercatorMeters);
  let inside = false;
  for (let i = 0, j = projected.length - 1; i < projected.length; j = i, i += 1) {
    const pi = projected[i];
    const pj = projected[j];
    const denominator = pj.y - pi.y;
    if (Math.abs(denominator) < 0.000001) continue;
    const intersects = ((pi.y > p.y) !== (pj.y > p.y))
      && (p.x < (pj.x - pi.x) * (p.y - pi.y) / denominator + pi.x);
    if (intersects) inside = !inside;
  }
  return inside;
}

function geometryDistanceMeters(leftGeometry, rightGeometry) {
  if (leftGeometry?.type === 'MultiPolygon') {
    return Math.min(...(leftGeometry.coordinates ?? []).map((coordinates) => geometryDistanceMeters({ type: 'Polygon', coordinates }, rightGeometry)));
  }
  if (rightGeometry?.type === 'MultiPolygon') {
    return Math.min(...(rightGeometry.coordinates ?? []).map((coordinates) => geometryDistanceMeters(leftGeometry, { type: 'Polygon', coordinates })));
  }
  if (leftGeometry?.type === 'MultiLineString') {
    return Math.min(...(leftGeometry.coordinates ?? []).map((coordinates) => geometryDistanceMeters({ type: 'LineString', coordinates }, rightGeometry)));
  }
  if (rightGeometry?.type === 'MultiLineString') {
    return Math.min(...(rightGeometry.coordinates ?? []).map((coordinates) => geometryDistanceMeters(leftGeometry, { type: 'LineString', coordinates })));
  }
  const leftPoints = rawCoordinatesOfGeometry(leftGeometry);
  const rightPoints = rawCoordinatesOfGeometry(rightGeometry);
  if (leftPoints.length === 0 || rightPoints.length === 0) return Number.POSITIVE_INFINITY;
  if (leftGeometry?.type === 'Point') return distanceToGeometryMeters(leftGeometry.coordinates, rightGeometry);
  if (rightGeometry?.type === 'Point') return distanceToGeometryMeters(rightGeometry.coordinates, leftGeometry);
  if (leftGeometry?.type === 'Polygon' && rightGeometry?.type === 'Polygon') {
    const leftRing = ringWithoutClosingPoint((leftGeometry.coordinates?.[0] ?? []).filter(validLngLat));
    const rightRing = ringWithoutClosingPoint((rightGeometry.coordinates?.[0] ?? []).filter(validLngLat));
    if (ringsOverlap(leftRing, rightRing)) return 0;
    return ringToRingDistanceMeters(leftRing, rightRing);
  }
  return Math.min(
    ...leftPoints.map((point) => distanceToGeometryMeters(point, rightGeometry)),
    ...rightPoints.map((point) => distanceToGeometryMeters(point, leftGeometry)),
  );
}

function ringsOverlap(leftRing, rightRing) {
  if (leftRing.length < 3 || rightRing.length < 3) return false;
  if (leftRing.some((point) => pointInPolygon(point, rightRing) || pointOnRing(point, rightRing))) return true;
  if (rightRing.some((point) => pointInPolygon(point, leftRing) || pointOnRing(point, leftRing))) return true;
  return leftRing.some((leftStart, leftIndex) => {
    const leftEnd = leftRing[(leftIndex + 1) % leftRing.length];
    return rightRing.some((rightStart, rightIndex) => {
      const rightEnd = rightRing[(rightIndex + 1) % rightRing.length];
      return segmentDistanceMeters(leftStart, leftEnd, rightStart, rightEnd) === 0;
    });
  });
}

function ringToRingDistanceMeters(leftRing, rightRing) {
  if (leftRing.length < 2 || rightRing.length < 2) return Number.POSITIVE_INFINITY;
  return Math.min(...leftRing.flatMap((leftStart, leftIndex) => {
    const leftEnd = leftRing[(leftIndex + 1) % leftRing.length];
    return rightRing.map((rightStart, rightIndex) => {
      const rightEnd = rightRing[(rightIndex + 1) % rightRing.length];
      return segmentDistanceMeters(leftStart, leftEnd, rightStart, rightEnd);
    });
  }));
}

function sourceKind(sourceRef = '', derivedFrom = '') {
  if (String(derivedFrom).startsWith('maplibre') || String(sourceRef).startsWith('openfreemap:')) return 'maplibre-rendered';
  if (String(sourceRef).startsWith('fixture-')
    || String(sourceRef).startsWith('offline-')
    || String(sourceRef).startsWith('curated:')
    || String(sourceRef).startsWith('openstreetmap:')) {
    return 'curated-or-fixture';
  }
  return sourceRef ? 'external-source' : 'unknown';
}

function catalogEntries(featureCatalog) {
  const groups = [
    ['road', featureCatalog?.roads ?? []],
    ['building', featureCatalog?.buildings ?? []],
    ['area', featureCatalog?.areas ?? []],
    ['poi', featureCatalog?.pois ?? []],
  ];
  return groups.flatMap(([kind, features]) => features.map((feature) => {
    const name = explicitName(feature.properties);
    return {
      kind,
      id: String(feature.id ?? feature.properties?.sourceRef ?? ''),
      sourceRef: feature.properties?.sourceRef ?? '',
      name,
      aliases: normalizedNames([name, feature.properties?.short_name, feature.properties?.['short_name:zh']]),
      geometry: feature.geometry,
      centroid: centroidLngLat(feature.geometry),
    };
  }).filter((entry) => entry.sourceRef || entry.aliases.length > 0));
}

function countByKind(items = []) {
  return items.reduce((counts, item) => {
    counts[item.kind] = (counts[item.kind] ?? 0) + 1;
    return counts;
  }, {});
}

function relevantCatalogKinds(featureKind) {
  return ['road', 'building', 'area', 'poi'].filter((catalogKind) => candidateKindCompatible(featureKind, catalogKind));
}

function catalogWarnings(features, entries) {
  const entryCounts = countByKind(entries);
  const missing = Array.from(new Set(features
    .filter((feature) => relevantCatalogKinds(feature.kind).every((kind) => (entryCounts[kind] ?? 0) === 0))
    .map((feature) => `${feature.kind} (${relevantCatalogKinds(feature.kind).join('/') || 'any'})`)));
  return missing.map((item) => `no usable rendered catalog entries for ${item}`);
}

function duplicateMatchWarnings(diagnostics) {
  const byMatchSourceRef = diagnostics
    .filter((item) => item.matchSourceRef && (item.status === 'SOURCE_MATCHED' || item.status === 'GEOMETRY_VERIFIED'))
    .reduce((groups, item) => {
      const key = item.matchSourceRef;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
      return groups;
    }, new Map());
  return Array.from(byMatchSourceRef.entries())
    .filter(([, items]) => new Set(items.map((item) => item.sourceRef)).size > 1)
    .map(([sourceRef, items]) => {
      const names = items.map((item) => item.name).filter(Boolean).slice(0, 3).join(', ');
      return `multiple landmarks share rendered map feature ${sourceRef}: ${names}`;
    });
}

function namedStaticFeatures(payload) {
  const objects = new Map((payload?.objects ?? []).map((object) => [object.id, object]));
  return (payload?.chunks ?? []).flatMap((chunk) => (chunk.staticFeatures ?? []).map((feature) => {
    const object = objects.get(feature.ontologyObjectId);
    const name = feature.visualState?.label || feature.visualState?.shortLabel || object?.name || '';
    const sourceRef = feature.footprintSource ?? feature.sourceRef ?? feature.visualState?.footprintSource ?? feature.visualState?.sourceRef ?? '';
    const geometry = feature.sourceGeometry ?? null;
    const aliases = normalizedNames([
      name,
      feature.visualState?.shortLabel,
      ...(feature.visualState?.aliases ?? []),
      ...(feature.aliases ?? []),
    ]);
    return {
      id: feature.id,
      ontologyObjectId: feature.ontologyObjectId,
      kind: feature.kind,
      name,
      aliases,
      sourceRef,
      sourceKind: sourceKind(sourceRef, feature.visualState?.derivedFrom),
      sourceGeometry: geometry,
      anchor: centroidLngLat(geometry),
      derivedFrom: feature.visualState?.derivedFrom ?? null,
      chunkId: chunk.id,
    };
  })).filter((feature) => feature.aliases.length > 0);
}

function bestNameMatch(feature, entries) {
  if (feature.sourceKind === 'external-source') return null;
  const candidates = entries.filter((entry) => candidateKindCompatible(feature.kind, entry.kind)
    && entry.aliases.some((alias) => feature.aliases.includes(alias)));
  if (!candidates.length || !feature.sourceGeometry) return null;
  return candidates
    .map((entry) => ({ entry, distanceMeters: geometryDistanceMeters(feature.sourceGeometry, entry.geometry), matchType: 'name' }))
    .sort((left, right) => left.distanceMeters - right.distanceMeters)[0] ?? null;
}

function bestGeometryMatch(feature, entries) {
  if (feature.sourceKind === 'external-source') return null;
  if (!feature.sourceGeometry) return null;
  const candidates = entries.filter((entry) => candidateKindCompatible(feature.kind, entry.kind)
    && geometryFallbackComparable(feature.sourceGeometry, entry.geometry)
    && entry.geometry);
  if (!candidates.length) return null;
  return candidates
    .map((entry) => ({ entry, distanceMeters: geometryDistanceMeters(feature.sourceGeometry, entry.geometry), matchType: 'geometry' }))
    .filter((candidate) => Number.isFinite(candidate.distanceMeters))
    .sort((left, right) => left.distanceMeters - right.distanceMeters)[0] ?? null;
}

function geometryFallbackComparable(sourceGeometry, catalogGeometry) {
  if (!sourceGeometry || !catalogGeometry) return false;
  if (sourceGeometry.type === 'Polygon') return catalogGeometry.type === 'Polygon' || catalogGeometry.type === 'MultiPolygon';
  if (sourceGeometry.type === 'LineString') return catalogGeometry.type === 'LineString' || catalogGeometry.type === 'MultiLineString';
  return false;
}

function candidateKindCompatible(featureKind, catalogKind) {
  if (featureKind === 'station-anchor') return catalogKind === 'poi';
  if (featureKind === 'department-store' || featureKind === 'bookstore-mall') return catalogKind === 'building' || catalogKind === 'poi';
  if (featureKind === 'lane-shop') return catalogKind === 'building' || catalogKind === 'poi' || catalogKind === 'road';
  if (featureKind === 'road-corridor') return catalogKind === 'road';
  if (featureKind === 'green-space') return catalogKind === 'area';
  return false;
}

function directSourceMatch(feature, entries) {
  if (!feature.sourceRef) return null;
  const entry = entries.find((candidate) => candidate.sourceRef === feature.sourceRef
    && candidateKindCompatible(feature.kind, candidate.kind));
  if (!entry || !feature.sourceGeometry) return entry ? { entry, distanceMeters: null } : null;
  return { entry, distanceMeters: geometryDistanceMeters(feature.sourceGeometry, entry.geometry), matchType: 'sourceRef' };
}

function classifyDiagnostic(feature, match, thresholdMeters) {
  if (!feature.anchor) return 'NO_SOURCE_GEOMETRY';
  if (!match) return feature.sourceKind === 'maplibre-rendered' ? 'NO_MAP_MATCH' : 'CURATED_ONLY';
  if (typeof match.distanceMeters === 'number' && match.distanceMeters > thresholdMeters) return 'MISALIGNED';
  if (match.matchType === 'geometry') return 'GEOMETRY_VERIFIED';
  return 'SOURCE_MATCHED';
}

export function buildMapAlignmentDiagnostics(payload, featureCatalog, options = {}) {
  const thresholdMeters = options.thresholdMeters ?? DEFAULT_ALIGNMENT_THRESHOLD_METERS;
  if (!payload) return { ...EMPTY_REPORT, thresholdMeters };
  if (!featureCatalog) return { ...EMPTY_REPORT, thresholdMeters, status: 'WAITING_FOR_CATALOG' };
  const entries = catalogEntries(featureCatalog);
  if (entries.length === 0) {
    return {
      ...EMPTY_REPORT,
      thresholdMeters,
      status: 'EMPTY_CATALOG',
      catalogSummary: featureCatalog.summary ?? null,
      catalogUsableCounts: {},
      coverage: featureCatalog.coverage ?? null,
      warnings: ['rendered map catalog has no usable features'],
    };
  }
  const sourceFeatures = namedStaticFeatures(payload);
  const diagnostics = sourceFeatures.map((feature) => {
    const directMatch = directSourceMatch(feature, entries);
    const nameMatch = directMatch ?? bestNameMatch(feature, entries);
    const geometryMatch = nameMatch ?? bestGeometryMatch(feature, entries);
    const status = classifyDiagnostic(feature, geometryMatch, thresholdMeters);
    const distance = typeof geometryMatch?.distanceMeters === 'number' && Number.isFinite(geometryMatch.distanceMeters)
      ? Number(geometryMatch.distanceMeters.toFixed(1))
      : null;
    return {
      id: feature.id,
      objectId: feature.ontologyObjectId,
      name: feature.name,
      kind: feature.kind,
      status,
      sourceKind: feature.sourceKind,
      sourceRef: feature.sourceRef,
      matchSourceRef: geometryMatch?.entry?.sourceRef ?? null,
      matchKind: geometryMatch?.entry?.kind ?? null,
      matchName: geometryMatch?.entry?.name ?? null,
      matchType: geometryMatch?.matchType ?? null,
      distanceMeters: distance,
      thresholdMeters,
      chunkId: feature.chunkId,
    };
  });

  const statusCounts = diagnostics.reduce((counts, item) => {
    counts[item.status] = (counts[item.status] ?? 0) + 1;
    return counts;
  }, {});
  const issueRank = { MISALIGNED: 0, NO_MAP_MATCH: 1, NO_SOURCE_GEOMETRY: 2, CURATED_ONLY: 3, GEOMETRY_VERIFIED: 4, SOURCE_MATCHED: 5 };
  return {
    thresholdMeters,
    status: diagnostics.length > 0 ? 'READY' : 'NO_NAMED_LANDMARKS',
    total: diagnostics.length,
    catalogSummary: featureCatalog.summary ?? null,
    catalogUsableCounts: countByKind(entries),
    coverage: featureCatalog.coverage ?? null,
    warnings: [
      ...catalogWarnings(sourceFeatures, entries),
      ...duplicateMatchWarnings(diagnostics),
    ],
    statusCounts,
    diagnostics: diagnostics.sort((left, right) => {
      const rankDiff = (issueRank[left.status] ?? 9) - (issueRank[right.status] ?? 9);
      if (rankDiff !== 0) return rankDiff;
      return (right.distanceMeters ?? -1) - (left.distanceMeters ?? -1);
    }),
  };
}
