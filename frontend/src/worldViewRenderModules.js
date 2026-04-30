import * as THREE from 'three';
import { createMrtTrain } from './voxelTrain.js';

const COLORS = {
  paper: '#FFF7FA',
  sakura: '#F596AA',
  rose: '#E16B8C',
  sky: '#78C8F8',
  water: '#81C7D4',
  gold: '#FFB11B',
  fuji: '#B481BB',
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
  return new THREE.Vector3(
    x * scale + (translate.x ?? 0),
    y * scale + (translate.y ?? 0),
    z * scale + (translate.z ?? 0),
  );
}

function chunkTransform(chunk) {
  if (chunk?.localToScene) return chunk.localToScene;
  return { translate: chunk?.sceneOrigin ?? { x: 0, y: 0, z: 0 }, scale: 1, rotationDegrees: 0 };
}

function linePoints(geometry, transform) {
  return (geometry?.coordinates ?? []).map((coordinate) => pointFromLocal(coordinate, transform));
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

function attachObject(group, object, projection) {
  group.userData.twObject = object;
  group.userData.worldViewProjection = projection;
  return group;
}

function createRouteProjection(projection, transform) {
  const points = linePoints(projection.geometry, transform);
  const group = new THREE.Group();
  if (points.length < 2) return group;
  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.36);
  const color = projection.visualState?.lineColor ?? COLORS.rose;
  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 80, projection.visualState?.thickness ?? 0.14, 6, false),
    material(color, { emissive: color, emissiveIntensity: 0.18 }),
  );
  tube.name = 'payload MRT route tube';
  group.add(tube);
  return group;
}

function createTrainProjection(projection, transform) {
  const points = linePoints(projection.geometry, transform);
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

export function createWorldViewLayer(payload, uiObjects = []) {
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
