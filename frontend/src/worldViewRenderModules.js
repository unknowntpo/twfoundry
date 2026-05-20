import * as THREE from 'three';
import { createMrtTrain } from './voxelTrain.js';
import { createStaticFeatureVoxel } from './voxelLandmarkRenderers.js';

const COLORS = {
  paper: '#FFF7FA',
  base: '#EAF8FF',
  baseEdge: '#CDEBF5',
  sakura: '#F596AA',
  sakuraLight: '#FFD2DC',
  rose: '#E16B8C',
  sky: '#78C8F8',
  water: '#81C7D4',
  gold: '#FFB11B',
  fuji: '#B481BB',
  leaf: '#B5CAA0',
  leafDeep: '#5DAC81',
  street: '#E7D6C6',
  stone: '#D2C3C3',
  ink: '#2B2330',
};

function material(color, opts = {}) {
  if (opts.glass) {
    return new THREE.MeshPhysicalMaterial({
      color,
      transparent: true,
      opacity: opts.opacity ?? 0.34,
      transmission: opts.transmission ?? 0.36,
      roughness: opts.roughness ?? 0.18,
      clearcoat: opts.clearcoat ?? 0.5,
      depthWrite: opts.depthWrite ?? false,
      emissive: opts.emissive ?? color,
      emissiveIntensity: opts.emissiveIntensity ?? 0.04,
    });
  }
  return new THREE.MeshLambertMaterial({
    color,
    transparent: opts.opacity !== undefined,
    opacity: opts.opacity ?? 1,
    emissive: opts.emissive ?? color,
    emissiveIntensity: opts.emissiveIntensity ?? 0.04,
  });
}

function box(width, height, depth, color, opts = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material(color, opts));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function pointFromLocal(coordinates, transform) {
  const [x = 0, yOrZ = 0, maybeZ] = coordinates ?? [];
  const y = maybeZ === undefined ? 0 : yOrZ;
  const z = maybeZ === undefined ? yOrZ : maybeZ;
  const scale = transform?.scale ?? 1;
  const translate = transform?.translate ?? { x: 0, y: 0, z: 0 };
  const rotation = (transform?.rotationDegrees ?? 0) * Math.PI / 180;
  const scaledX = x * scale;
  const scaledZ = z * scale;
  const rotatedX = scaledX * Math.cos(rotation) - scaledZ * Math.sin(rotation);
  const rotatedZ = scaledX * Math.sin(rotation) + scaledZ * Math.cos(rotation);
  return new THREE.Vector3(
    rotatedX + (translate.x ?? 0),
    y * scale + (translate.y ?? 0),
    rotatedZ + (translate.z ?? 0),
  );
}

function localFromLngLat(payload, lng, lat, y = 0) {
  const coordinateSystem = payload?.coordinateSystem;
  if (!coordinateSystem) return null;
  const radiusMeters = 6378137;
  const originX = radiusMeters * coordinateSystem.originLng * Math.PI / 180;
  const originY = radiusMeters * Math.log(Math.tan(Math.PI / 4 + coordinateSystem.originLat * Math.PI / 360));
  const mercatorX = radiusMeters * lng * Math.PI / 180;
  const mercatorY = radiusMeters * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
  const scale = coordinateSystem.sceneUnitsPerMeter ?? 1;
  return new THREE.Vector3(
    (mercatorX - originX) * scale,
    y,
    -(mercatorY - originY) * scale,
  );
}

function chunkTransform(chunk) {
  if (chunk?.localToScene) return chunk.localToScene;
  return { translate: chunk?.sceneOrigin ?? { x: 0, y: 0, z: 0 }, scale: 1, rotationDegrees: 0 };
}

function mapReferenceBounds(mapReference) {
  return mapReference?.frame?.bounds ?? null;
}

function mapReferenceCornerPoints(payload, frame) {
  const corners = frame?.corners;
  if (!corners?.northwest || !corners?.northeast || !corners?.southeast || !corners?.southwest) return null;
  const northwest = localFromLngLat(payload, corners.northwest[0], corners.northwest[1], -0.08);
  const northeast = localFromLngLat(payload, corners.northeast[0], corners.northeast[1], -0.08);
  const southeast = localFromLngLat(payload, corners.southeast[0], corners.southeast[1], -0.08);
  const southwest = localFromLngLat(payload, corners.southwest[0], corners.southwest[1], -0.08);
  if (!northwest || !northeast || !southeast || !southwest) return null;
  return { northwest, northeast, southeast, southwest };
}

function createMapReferenceGeometry(payload, mapReference, bounds) {
  const cornerPoints = mapReferenceCornerPoints(payload, mapReference?.frame);
  if (cornerPoints) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([
      cornerPoints.northwest.x, cornerPoints.northwest.y, cornerPoints.northwest.z,
      cornerPoints.southwest.x, cornerPoints.southwest.y, cornerPoints.southwest.z,
      cornerPoints.northeast.x, cornerPoints.northeast.y, cornerPoints.northeast.z,
      cornerPoints.northeast.x, cornerPoints.northeast.y, cornerPoints.northeast.z,
      cornerPoints.southwest.x, cornerPoints.southwest.y, cornerPoints.southwest.z,
      cornerPoints.southeast.x, cornerPoints.southeast.y, cornerPoints.southeast.z,
    ], 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute([
      0, 1,
      0, 0,
      1, 1,
      1, 1,
      0, 0,
      1, 0,
    ], 2));
    geometry.computeVertexNormals();
    return { geometry, center: null, usesExactCorners: true };
  }

  const northwest = localFromLngLat(payload, bounds.west, bounds.north, -0.08);
  const southeast = localFromLngLat(payload, bounds.east, bounds.south, -0.08);
  if (!northwest || !southeast) return null;

  const width = Math.max(1, southeast.x - northwest.x);
  const depth = Math.max(1, southeast.z - northwest.z);
  return {
    geometry: new THREE.PlaneGeometry(width, depth),
    center: new THREE.Vector3(
      (northwest.x + southeast.x) / 2,
      -0.08,
      (northwest.z + southeast.z) / 2,
    ),
    usesExactCorners: false,
  };
}

function createMapReferencePlane(payload, mapReference) {
  const bounds = mapReferenceBounds(mapReference);
  const canvas = mapReference?.canvas;
  const isCanvasLike = canvas
    && typeof canvas.width === 'number'
    && typeof canvas.height === 'number'
    && typeof canvas.getContext === 'function';
  if (!bounds || !isCanvasLike) return null;
  const referenceGeometry = createMapReferenceGeometry(payload, mapReference, bounds);
  if (!referenceGeometry) return null;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  texture.userData.layerOwned = true;

  const plane = new THREE.Mesh(
    referenceGeometry.geometry,
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
  );
  plane.name = 'maplibre web mercator reference plane';
  plane.userData.mapReferencePlane = true;
  plane.userData.mapReferenceFrame = {
    bounds,
    corners: mapReference?.frame?.corners ?? null,
    pixelSize: mapReference?.frame?.pixelSize ?? null,
    projection: mapReference?.frame?.projection ?? payload.coordinateSystem?.projection ?? null,
    usesExactCorners: referenceGeometry.usesExactCorners,
  };
  if (referenceGeometry.center) {
    plane.rotation.x = -Math.PI / 2;
    plane.position.copy(referenceGeometry.center);
  }
  plane.renderOrder = -20;
  plane.receiveShadow = false;
  return plane;
}

function linePoints(geometry, transform) {
  return (geometry?.coordinates ?? []).map((coordinate) => pointFromLocal(coordinate, transform));
}

function withGrade(point, visualState = {}) {
  if (visualState.grade !== 'underground') return point;
  const depth = visualState.undergroundDepth ?? 0.72;
  return new THREE.Vector3(point.x, -Math.abs(depth), point.z);
}

function projectionLinePoints(projection, transform) {
  return linePoints(projection.geometry, transform).map((point) => withGrade(point, projection.visualState));
}

function polygonBounds(geometry, transform) {
  const ring = geometry?.coordinates?.[0] ?? [];
  const points = ring.map((coordinate) => pointFromLocal(coordinate, transform));
  const box3 = new THREE.Box3().setFromPoints(points);
  return {
    center: box3.getCenter(new THREE.Vector3()),
    size: box3.getSize(new THREE.Vector3()),
  };
}

const groundLabelTextureCache = new Map();

function getGroundLabelTexture(text) {
  const label = String(text ?? '').trim();
  if (!label) return null;
  if (groundLabelTextureCache.has(label)) return groundLabelTextureCache.get(label);
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.fillRect(0, 34, canvas.width, 60);
  ctx.fillStyle = '#4B5563';
  ctx.font = '900 42px Inter, "Noto Sans TC", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label.slice(0, 12), canvas.width / 2, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  groundLabelTextureCache.set(label, texture);
  return texture;
}

function addGroundLabel(group, label, center, angle, scale = 1, options = {}) {
  if (options.mapAligned && !options.showLabels) return;
  const texture = getGroundLabelTexture(label);
  if (!texture) return;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.25 * scale, 0.56 * scale),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  mesh.name = 'ground feature label';
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = -angle;
  mesh.position.set(center.x, 0.13, center.z);
  mesh.renderOrder = 4;
  group.add(mesh);
}

function createLineGroundFeature(feature, transform, options = {}) {
  const group = new THREE.Group();
  const points = linePoints(feature.geometry, transform);
  const width = Math.max(0.18, feature.visualState?.displayWidth ?? feature.visualState?.width ?? 0.32);
  const color = feature.visualState?.color ?? '#DDE3EA';
  const edgeColor = feature.visualState?.edgeColor ?? '#F8FBFF';
  const centerLineColor = feature.visualState?.centerLineColor;
  const baseOpacity = options.mapAligned ? 0.32 : (feature.visualState?.opacity ?? 0.98);
  const edgeOpacity = options.mapAligned ? 0.28 : 0.92;
  const centerLineOpacity = options.mapAligned ? 0.62 : 0.78;

  points.slice(0, -1).forEach((start, index) => {
    const end = points[index + 1];
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const length = Math.hypot(dx, dz);
    if (length <= 0.001) return;
    const angle = Math.atan2(dz, dx);
    const center = new THREE.Vector3((start.x + end.x) / 2, 0.02, (start.z + end.z) / 2);
    const road = box(length, 0.045, width, color, {
      opacity: baseOpacity,
      emissive: color,
      emissiveIntensity: 0.035,
    });
    road.name = 'ground road corridor';
    road.position.copy(center);
    road.position.y = 0.11;
    road.rotation.y = -angle;
    road.receiveShadow = false;
    road.renderOrder = 2;
    group.add(road);

    const edge = box(length, 0.052, Math.min(width * 0.16, 0.08), edgeColor, {
      opacity: edgeOpacity,
      emissive: edgeColor,
      emissiveIntensity: 0.02,
    });
    edge.name = 'ground road edge stripe';
    edge.position.set(center.x, 0.145, center.z);
    edge.rotation.y = -angle;
    edge.translateZ(width * 0.43);
    edge.renderOrder = 3;
    group.add(edge);

    const edge2 = edge.clone();
    edge2.position.set(center.x, 0.148, center.z);
    edge2.rotation.y = -angle;
    edge2.translateZ(-width * 0.43);
    edge2.renderOrder = 3;
    group.add(edge2);

    if (centerLineColor) {
      const centerLine = box(length, 0.058, Math.min(width * 0.1, 0.055), centerLineColor, {
        opacity: centerLineOpacity,
        emissive: centerLineColor,
        emissiveIntensity: 0.04,
      });
      centerLine.name = 'ground road center line';
      centerLine.position.set(center.x, 0.155, center.z);
      centerLine.rotation.y = -angle;
      centerLine.renderOrder = 4;
      group.add(centerLine);
    }

    if (index === Math.floor((points.length - 2) / 2)) {
      addGroundLabel(
        group,
        feature.visualState?.label,
        center,
        angle,
        Math.max(0.85, Math.min(1.4, width * 2.8)),
        { mapAligned: options.mapAligned, showLabels: false },
      );
    }
  });

  return group;
}

function createPolygonGroundFeature(feature, transform, options = {}) {
  const ring = (feature.geometry?.coordinates?.[0] ?? []).map((coordinate) => pointFromLocal(coordinate, transform));
  const openRing = ring.length > 1 && ring[0].distanceTo(ring[ring.length - 1]) < 0.0001
    ? ring.slice(0, -1)
    : ring;
  const { center, size } = polygonBounds(feature.geometry, transform);
  const color = feature.visualState?.color ?? COLORS.leaf;
  let mesh;
  if (openRing.length >= 3) {
    const vertices = [];
    const faces = THREE.ShapeUtils.triangulateShape(
      openRing.map((point) => new THREE.Vector2(point.x, point.z)),
      [],
    );
    faces.forEach((face) => {
      face.forEach((index) => {
        const point = openRing[index];
        vertices.push(point.x, 0.095, point.z);
      });
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    mesh = new THREE.Mesh(geometry, material(color, {
      opacity: options.mapAligned ? 0.22 : (feature.visualState?.opacity ?? 0.82),
      emissive: color,
      emissiveIntensity: 0.03,
    }));
    mesh.material.side = THREE.DoubleSide;
  } else {
    mesh = box(Math.max(size.x, 1), 0.045, Math.max(size.z, 1), color, {
      opacity: options.mapAligned ? 0.22 : (feature.visualState?.opacity ?? 0.82),
      emissive: color,
      emissiveIntensity: 0.03,
    });
    mesh.position.set(center.x, 0.095, center.z);
  }
  mesh.name = 'ground polygon surface';
  mesh.renderOrder = 1;
  const group = new THREE.Group();
  group.add(mesh);
  addGroundLabel(
    group,
    feature.visualState?.label,
    new THREE.Vector3(center.x, 0, center.z),
    0,
    0.9,
    { mapAligned: options.mapAligned, showLabels: false },
  );
  return group;
}

function createGroundFeature(feature, transform, options = {}) {
  const group = feature.geometry?.type === 'LineString'
    ? createLineGroundFeature(feature, transform, options)
    : createPolygonGroundFeature(feature, transform, options);
  group.name = `ground feature ${feature.kind}`;
  group.userData.worldViewGroundFeature = feature;
  return group;
}

function attachObject(group, object, projection) {
  group.userData.twObject = object;
  group.userData.worldViewProjection = projection;
  return group;
}

function attachStaticObject(group, object, feature) {
  if (object) group.userData.twObject = object;
  group.userData.worldViewStaticFeature = feature;
  return group;
}

function createBusStopProjection(projection, transform) {
  const point = pointFromLocal(projection.geometry?.coordinates, transform);
  const group = new THREE.Group();
  const color = projection.visualState?.color ?? COLORS.leafDeep;
  const pole = box(0.16, 1.6, 0.16, color, { emissive: color, emissiveIntensity: 0.12 });
  pole.position.set(point.x, point.y + 0.8, point.z);
  group.add(pole);
  const sign = box(0.72, 0.42, 0.12, COLORS.paper, { emissive: color, emissiveIntensity: 0.08 });
  sign.position.set(point.x, point.y + 1.58, point.z);
  group.add(sign);
  const roof = box(1.9, 0.16, 0.72, COLORS.leaf, { glass: true, opacity: 0.5, emissive: COLORS.leaf });
  roof.position.set(point.x + 0.65, point.y + 1.25, point.z);
  group.add(roof);
  const waiting = projection.visualState?.waiting ?? 3;
  for (let i = 0; i < waiting; i += 1) {
    const body = box(0.22, 0.38, 0.22, i % 2 ? COLORS.sakura : COLORS.gold, { emissiveIntensity: 0.04 });
    body.position.set(point.x + 0.2 + i * 0.32, point.y + 0.25, point.z + 0.55);
    group.add(body);
  }
  return group;
}

function createUbikeProjection(projection, transform) {
  const point = pointFromLocal(projection.geometry?.coordinates, transform);
  const group = new THREE.Group();
  const color = projection.visualState?.color ?? COLORS.gold;
  const docks = projection.visualState?.docks ?? 8;
  for (let i = 0; i < docks; i += 1) {
    const dock = box(0.18, 0.34, 0.42, COLORS.paper, { emissive: color, emissiveIntensity: 0.06 });
    dock.position.set(point.x + (i - docks / 2) * 0.32, point.y + 0.18, point.z);
    group.add(dock);
    if (i < (projection.visualState?.availableBikes ?? 4)) {
      const bike = box(0.18, 0.18, 0.62, color, { emissive: color, emissiveIntensity: 0.12 });
      bike.position.set(dock.position.x, point.y + 0.52, point.z);
      group.add(bike);
    }
  }
  const kiosk = box(0.5, 1.05, 0.42, COLORS.gold, { emissive: COLORS.gold, emissiveIntensity: 0.14 });
  kiosk.position.set(point.x - docks * 0.19 - 0.42, point.y + 0.52, point.z);
  group.add(kiosk);
  return group;
}

function createTerrainCell(cell, transform) {
  const point = pointFromLocal([cell.x, 0, cell.z], transform);
  const kindColor = {
    street: COLORS.street,
    plaza: COLORS.paper,
    shopping: COLORS.sakuraLight,
    park: COLORS.leaf,
    landmark: COLORS.sakura,
    alley: '#F3E5DA',
  };
  const color = cell.color ?? kindColor[cell.kind] ?? COLORS.base;
  const height = Math.max(0.16, (cell.height ?? 1) * 0.28);
  const mesh = box(0.92, height, 0.92, color, {
    emissive: color,
    emissiveIntensity: cell.kind === 'street' ? 0.015 : 0.035,
  });
  mesh.name = `terrain cell ${cell.kind}`;
  mesh.position.set(point.x, point.y + height / 2, point.z);
  mesh.renderOrder = -2;
  return mesh;
}

function createSemanticZone(zone, transform) {
  const { center, size } = polygonBounds(zone.geometry, transform);
  const color = zone.state?.color ?? COLORS.sakura;
  const mesh = box(Math.max(size.x, 1), 0.08, Math.max(size.z, 1), color, {
    glass: true,
    opacity: zone.state?.opacity ?? 0.18,
    emissive: color,
    emissiveIntensity: 0.04,
  });
  mesh.position.set(center.x, 0.68, center.z);
  mesh.name = `semantic zone ${zone.kind}`;
  return mesh;
}

function createStaticFeature(feature, chunk, object) {
  const transform = chunkTransform(chunk);
  const mesh = createStaticFeatureVoxel(feature, transform);
  return attachStaticObject(mesh, object, feature);
}

function createRouteProjection(projection, transform) {
  const points = projectionLinePoints(projection, transform);
  const group = new THREE.Group();
  if (points.length < 2) return group;
  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.36);
  const color = projection.visualState?.lineColor ?? COLORS.rose;
  if (projection.visualState?.grade === 'underground') {
    const tunnel = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 80, projection.visualState?.tunnelRadius ?? 0.34, 8, false),
      material(projection.visualState?.tunnelColor ?? COLORS.water, {
        glass: true,
        opacity: projection.visualState?.tunnelOpacity ?? 0.18,
        transmission: 0.48,
        emissive: projection.visualState?.tunnelColor ?? COLORS.water,
        emissiveIntensity: 0.035,
      }),
    );
    tunnel.name = 'payload underground MRT tunnel volume';
    group.add(tunnel);
  }
  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 80, projection.visualState?.thickness ?? 0.14, 6, false),
    material(color, { emissive: color, emissiveIntensity: 0.18 }),
  );
  tube.name = 'payload MRT route tube';
  group.add(tube);
  return group;
}

function createTrainProjection(projection, transform) {
  const points = projectionLinePoints(projection, transform);
  const color = projection.visualState?.lineColor ?? COLORS.rose;
  const train = createMrtTrain({
    lineColor: color,
    carCount: projection.visualState?.cars ?? 3,
    scale: 0.72,
    name: projection.interaction?.hoverLabel ?? 'payload MRT train',
  });
  if (points.length > 0) {
    const center = points[Math.floor(points.length / 2)];
    train.position.copy(center);
    const next = points[Math.min(points.length - 1, Math.floor(points.length / 2) + 1)] ?? center.clone().add(new THREE.Vector3(0, 0, 1));
    train.rotation.y = Math.atan2(next.x - center.x, next.z - center.z);
  }
  return train;
}

function createRainProjection(projection, transform) {
  const { center, size } = polygonBounds(projection.geometry, transform);
  const group = new THREE.Group();
  const color = projection.visualState?.color ?? COLORS.water;
  const height = Math.max(2.4, (projection.visualState?.intensityMmHr ?? 20) / 8);
  const volume = box(Math.max(size.x, 1), height, Math.max(size.z, 1), color, {
    glass: true,
    opacity: projection.visualState?.opacity ?? 0.24,
    transmission: 0.62,
    emissiveIntensity: 0.08,
  });
  volume.position.set(center.x, height / 2 + 1.8, center.z);
  group.add(volume);
  for (let i = 0; i < 9; i += 1) {
    const streak = box(0.07, 0.74, 0.07, '#D8EEF8', { opacity: 0.72, emissive: '#D8EEF8' });
    streak.position.set(
      center.x + (i % 3 - 1) * Math.max(size.x / 4, 0.8),
      2.8 + (i % 4) * 0.42,
      center.z + (Math.floor(i / 3) - 1) * Math.max(size.z / 4, 0.8),
    );
    group.add(streak);
  }
  return group;
}

function createHazeProjection(projection, transform) {
  const point = pointFromLocal(projection.geometry?.coordinates, transform);
  const group = new THREE.Group();
  const color = projection.visualState?.color ?? COLORS.gold;
  const mast = box(0.36, 3.2, 0.36, color, { emissiveIntensity: 0.1 });
  mast.position.set(point.x, point.y + 1.6, point.z);
  group.add(mast);
  for (let i = 0; i < 8; i += 1) {
    const puff = box(0.5, 0.5, 0.5, i % 2 ? color : '#F7D94C', {
      glass: true,
      opacity: projection.visualState?.opacity ?? 0.32,
    });
    puff.position.set(point.x + Math.sin(i) * 1.35, point.y + 3 + (i % 3) * 0.46, point.z + Math.cos(i) * 1.2);
    group.add(puff);
  }
  return group;
}

function createIncidentProjection(projection, transform) {
  const point = pointFromLocal(projection.geometry?.coordinates, transform);
  const group = new THREE.Group();
  const color = projection.visualState?.color ?? COLORS.fuji;
  for (let i = 0; i < 3; i += 1) {
    const block = box(0.9 - i * 0.08, 0.52, 0.9 - i * 0.08, i === 1 ? COLORS.rose : color, {
      glass: i === 2,
      opacity: i === 2 ? 0.62 : undefined,
      emissiveIntensity: 0.16,
    });
    block.position.set(point.x, point.y + i * 0.58, point.z);
    group.add(block);
  }
  return group;
}

function createGenericProjection(projection, transform) {
  const point = pointFromLocal(projection.geometry?.coordinates, transform);
  const color = projection.visualState?.color ?? COLORS.paper;
  const marker = box(0.8, 0.8, 0.8, color, { emissiveIntensity: 0.08 });
  marker.position.copy(point);
  return marker;
}

export function createProjectionObject(projection, chunk, object) {
  const transform = chunkTransform(chunk);
  let group;
  if (projection.renderModule === 'voxel.mrt.route') {
    group = createRouteProjection(projection, transform);
  } else if (projection.renderModule === 'voxel.mrt.train') {
    group = createTrainProjection(projection, transform);
  } else if (projection.renderModule === 'voxel.bus.stop') {
    group = createBusStopProjection(projection, transform);
  } else if (projection.renderModule === 'voxel.ubike.dock') {
    group = createUbikeProjection(projection, transform);
  } else if (projection.renderModule === 'voxel.weather.rainCell') {
    group = createRainProjection(projection, transform);
  } else if (projection.renderModule === 'voxel.air.haze') {
    group = createHazeProjection(projection, transform);
  } else if (projection.renderModule === 'voxel.ops.incidentPulse') {
    group = createIncidentProjection(projection, transform);
  } else {
    group = createGenericProjection(projection, transform);
  }
  group.name = projection.renderModule;
  return attachObject(group, object, projection);
}

export function createWorldViewBaseLayer(payload, uiObjects = [], options = {}) {
  const root = new THREE.Group();
  root.name = 'payload diorama chunk base layer';
  const objects = new Map(uiObjects.map((object) => [object.id, object]));
  const backendObjects = new Map((payload.objects ?? []).map((object) => [object.id, object]));
  const mapReferencePlane = createMapReferencePlane(payload, options.mapReference);
  const mapAligned = Boolean(mapReferencePlane);
  if (mapReferencePlane) root.add(mapReferencePlane);

  (payload.chunks ?? []).forEach((chunk) => {
    const chunkGroup = new THREE.Group();
    chunkGroup.name = `chunk ${chunk.label ?? chunk.id}`;
    const transform = chunkTransform(chunk);

    const bounds = chunk.localBounds;
    if (bounds && !mapAligned) {
      const width = Math.max(1, bounds.maxX - bounds.minX + 2);
      const depth = Math.max(1, bounds.maxZ - bounds.minZ + 2);
      const center = pointFromLocal([(bounds.minX + bounds.maxX) / 2, -0.28, (bounds.minZ + bounds.maxZ) / 2], transform);
      const plate = box(width, 0.32, depth, COLORS.base, {
        emissive: COLORS.baseEdge,
        emissiveIntensity: 0.015,
        opacity: 0.94,
      });
      plate.position.copy(center);
      chunkGroup.add(plate);
    }

    (chunk.groundFeatures ?? []).forEach((feature) => {
      chunkGroup.add(createGroundFeature(feature, transform, { mapAligned }));
    });

    if (!mapAligned) {
      (chunk.terrain ?? []).forEach((cell) => {
        chunkGroup.add(createTerrainCell(cell, transform));
      });

      (chunk.semanticZones ?? []).forEach((zone) => {
        chunkGroup.add(createSemanticZone(zone, transform));
      });
    }

    (chunk.staticFeatures ?? []).forEach((feature) => {
      const object = objects.get(feature.ontologyObjectId) ?? backendObjects.get(feature.ontologyObjectId);
      chunkGroup.add(createStaticFeature(feature, chunk, object));
    });

    root.add(chunkGroup);
  });

  return root;
}

export function createWorldViewLayer(payload, uiObjects = [], options = {}) {
  const root = new THREE.Group();
  root.name = 'payload world view layer';
  const chunks = new Map((payload.chunks ?? []).map((chunk) => [chunk.id, chunk]));
  const objects = new Map(uiObjects.map((object) => [object.id, object]));
  const backendObjects = new Map((payload.objects ?? []).map((object) => [object.id, object]));

  (payload.projections ?? []).forEach((projection) => {
    const chunk = chunks.get(projection.chunkId);
    const object = objects.get(projection.objectId) ?? backendObjects.get(projection.objectId);
    const mesh = createProjectionObject(projection, chunk, object);
    mesh.userData.overlay = projection.overlay;
    root.add(mesh);
  });

  return root;
}
