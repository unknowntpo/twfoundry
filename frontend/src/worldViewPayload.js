import { layers } from './mockData.js';

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
    geoBounds: { west: 121.5165, south: 25.0492, east: 121.5248, north: 25.0558 },
    chunkSetId: 'zhongshan-station-v1',
  },
  chunks: [
    {
      id: 'chunk-zhongshan-station',
      label: 'Zhongshan Station / Nanjing West Road',
      sceneOrigin: { x: 0, y: 0, z: 0 },
      localToScene: { translate: { x: 0, y: 0, z: 0 }, scale: 1, rotationDegrees: 0 },
      localBounds: { minX: -9, minZ: -7, maxX: 9, maxZ: 7 },
      terrain: [
        { id: 'z-a', x: -2, z: -2, height: 2, kind: 'landmark', color: '#F596AA' },
        { id: 'z-b', x: 0, z: 0, height: 1, kind: 'street', color: '#E7D6C6' },
        { id: 'z-c', x: 2, z: -1, height: 1, kind: 'shopping', color: '#FFD2DC' },
        { id: 'z-d', x: -4, z: 3, height: 1, kind: 'alley', color: '#F3E5DA' },
      ],
      staticFeatures: [
        { id: 'station-anchor-R11-G14', ontologyObjectId: 'station-R11-G14', kind: 'station-anchor', geometry: { type: 'Point', coordinates: [0, 0.35, 0] }, visualState: { color: '#E16B8C' } },
        { id: 'building-shin-kong-nanxi', ontologyObjectId: 'landmark-shin-kong-nanxi', kind: 'department-store', geometry: { type: 'Point', coordinates: [-2.8, 0, -2.2] }, visualState: { floors: 5, width: 1.6, depth: 1.3, color: '#F596AA', accentColor: '#F596AA', signColor: '#FFB11B', sign: true } },
        { id: 'building-eslite-nanxi', ontologyObjectId: 'landmark-eslite-nanxi', kind: 'bookstore-mall', geometry: { type: 'Point', coordinates: [2.4, 0, -2.0] }, visualState: { floors: 4, width: 1.45, depth: 1.1, color: '#FFD2DC', accentColor: '#FFD2DC', signColor: '#81C7D4', sign: true } },
        { id: 'building-linsen-lane', kind: 'lane-shop', geometry: { type: 'Point', coordinates: [4.2, 0, 2.6] }, visualState: { floors: 3, width: 1.1, depth: 1.2, color: '#F8DDE7', accentColor: '#FFD2DC', signColor: '#B5CAA0', sign: false } },
        { id: 'building-chifeng-maker', kind: 'lane-shop', geometry: { type: 'Point', coordinates: [-4.4, 0, 2.8] }, visualState: { floors: 2, width: 1.0, depth: 1.0, color: '#F3E5DA', accentColor: '#FFD2DC', signColor: '#E16B8C', sign: false } },
      ],
      semanticZones: [
        { id: 'zone-nanxi-shopping', kind: 'shopping-corridor', geometry: { type: 'Polygon', coordinates: [[[-5, -3.5], [5, -3.5], [5, -0.3], [-5, -0.3], [-5, -3.5]]] }, state: { color: '#F596AA', opacity: 0.18 } },
      ],
    },
  ],
  objects: [
    {
      id: 'station-R11-G14',
      type: 'Station',
      name: 'Zhongshan',
      source: 'tdx',
      status: 'normal',
      summary: '台北捷運中山站 R11/G14，南西商圈 diorama anchor。',
      properties: { overlay: 'mrt', stationId: 'R11/G14', lineId: 'red-green' },
      relationships: [{ type: 'belongs_to', targetObjectId: 'route-R', targetType: 'Route', label: 'Tamsui-Xinyi' }],
    },
    {
      id: 'train-R22',
      type: 'Train',
      name: 'Train R22',
      source: 'tdx',
      status: 'live',
      summary: '淡水信義線列車，接近中山站。',
      properties: { overlay: 'mrt', route: 'Tamsui-Xinyi', nextStop: 'Zhongshan', etaMinutes: 2, load: 0.67 },
      relationships: [
        { type: 'belongs_to', targetObjectId: 'route-R', targetType: 'Route', label: 'Tamsui-Xinyi' },
        { type: 'near', targetObjectId: 'rain-R042', targetType: 'RainfallCell', label: 'Rain Cell R-042' },
      ],
    },
    {
      id: 'bus-stop-nanxi',
      type: 'BusStop',
      name: 'MRT Zhongshan Station Bus Stop',
      source: 'tdx',
      status: 'live',
      summary: '南京西路與中山北路周邊公車站牌，顯示候車與到站預估。',
      properties: { overlay: 'bus', route: '304', etaMinutes: 3, waiting: 4 },
      relationships: [{ type: 'near', targetObjectId: 'station-R11-G14', targetType: 'Station', label: 'Zhongshan' }],
    },
    {
      id: 'landmark-shin-kong-nanxi',
      type: 'Landmark',
      name: 'Shin Kong Mitsukoshi Nanxi',
      source: 'osm',
      status: 'reference',
      summary: '中山南西商圈百貨地標，作為 voxel chunk 的方向錨點。',
      properties: { overlay: 'mrt', kind: 'department-store', district: 'Nanxi shopping corridor' },
      relationships: [{ type: 'near', targetObjectId: 'station-R11-G14', targetType: 'Station', label: 'Zhongshan' }],
    },
    {
      id: 'landmark-eslite-nanxi',
      type: 'Landmark',
      name: 'Eslite Nanxi',
      source: 'osm',
      status: 'reference',
      summary: '南西商圈書店型商場地標，使用較低、水平的 bookstore-mall voxel 模組。',
      properties: { overlay: 'mrt', kind: 'bookstore-mall', district: 'Nanxi shopping corridor' },
      relationships: [{ type: 'near', targetObjectId: 'station-R11-G14', targetType: 'Station', label: 'Zhongshan' }],
    },
    {
      id: 'ubike-zhongshan',
      type: 'BikeStation',
      name: 'YouBike MRT Zhongshan Station',
      source: 'tdx',
      status: 'live',
      summary: '捷運中山站周邊 YouBike 站點，用 dock 與可借車數呈現。',
      properties: { overlay: 'ubike', availableBikes: 11, availableDocks: 9, capacity: 20 },
      relationships: [{ type: 'near', targetObjectId: 'station-R11-G14', targetType: 'Station', label: 'Zhongshan' }],
    },
    {
      id: 'rain-R042',
      type: 'RainfallCell',
      name: 'Rain Cell R-042',
      source: 'cwa',
      status: 'intense',
      summary: '中山站南西商圈短時強降雨，會影響步行、候車與 YouBike 轉乘。',
      properties: { overlay: 'rain', intensityMmHr: 38, confidence: 0.82, trend: 'rising' },
      relationships: [
        { type: 'covers', targetObjectId: 'chunk-zhongshan-station', targetType: 'DioramaChunk', label: 'Zhongshan Station / Nanjing West Road' },
        { type: 'affects', targetObjectId: 'bus-stop-nanxi', targetType: 'BusStop', label: 'MRT Zhongshan Station Bus Stop' },
      ],
    },
    {
      id: 'incident-I237',
      type: 'Incident',
      name: 'Incident I-237',
      source: 'ops',
      status: 'open',
      summary: '道路施工事件，與雨量和捷運 headway 形成跨 domain context。',
      properties: { overlay: 'incident', severity: 'medium', radiusMeters: 600 },
      relationships: [
        { type: 'coincident_with', targetObjectId: 'rain-R042', targetType: 'RainfallCell', label: 'Rain Cell R-042' },
      ],
    },
  ],
  projections: [
    { id: 'proj-train-R22-zhongshan', objectId: 'train-R22', chunkId: 'chunk-zhongshan-station', overlay: 'mrt', renderModule: 'voxel.mrt.train', geometry: { type: 'LineString', coordinates: [[-1.1, 1.1, -2.8], [-0.2, 1.1, -0.4]] }, visualState: { lineColor: '#E16B8C', cars: 3 } },
    { id: 'proj-bus-stop-nanxi', objectId: 'bus-stop-nanxi', chunkId: 'chunk-zhongshan-station', overlay: 'bus', renderModule: 'voxel.bus.stop', geometry: { type: 'Point', coordinates: [3.2, 0.45, 1.3] }, visualState: { color: '#5DAC81', waiting: 4, etaMinutes: 3 } },
    { id: 'proj-ubike-zhongshan', objectId: 'ubike-zhongshan', chunkId: 'chunk-zhongshan-station', overlay: 'ubike', renderModule: 'voxel.ubike.dock', geometry: { type: 'Point', coordinates: [2.4, 0.45, -1.8] }, visualState: { color: '#FFB11B', docks: 10, availableBikes: 6 } },
    { id: 'proj-rain-R042-zhongshan', objectId: 'rain-R042', chunkId: 'chunk-zhongshan-station', overlay: 'rain', renderModule: 'voxel.weather.rainCell', geometry: { type: 'Polygon', coordinates: [[[-4.5, -4.2], [4, -4.2], [4, 2], [-4.5, 2], [-4.5, -4.2]]] }, visualState: { color: '#81C7D4', opacity: 0.1, intensityMmHr: 18 } },
    { id: 'proj-incident-I237-zhongshan', objectId: 'incident-I237', chunkId: 'chunk-zhongshan-station', overlay: 'incident', renderModule: 'voxel.ops.incidentPulse', geometry: { type: 'Point', coordinates: [5.2, 0.9, 2.6] }, visualState: { color: '#B481BB', severity: 'medium' } },
  ],
  renderModules: [
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

export async function loadWorldViewPayload(fetcher = globalThis.fetch) {
  if (typeof fetcher !== 'function') {
    return { payload: fallbackWorldViewPayload, source: 'fallback' };
  }

  const urls = ['/api/world/view?focusId=zhongshan-station&lod=city&time=live'];
  return loadWorldViewPayloadFromUrls(fetcher, urls);
}

async function loadWorldViewPayloadFromUrls(fetcher, urls) {
  for (const url of urls) {
    try {
      const response = await fetcher(url);
      if (!response.ok) {
        throw new Error(`World view request failed: ${response.status}`);
      }
      const payload = await response.json();
      validateWorldViewPayload(payload);
      return { payload, source: 'api' };
    } catch {
      // Try the next configured endpoint before falling back to local fixtures.
    }
  }

  return { payload: fallbackWorldViewPayload, source: 'fallback' };
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

export function validateWorldViewPayload(payload) {
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
    const layer = layers.find((item) => item.key === overlay)?.label ?? overlay;
    return {
      id: object.id,
      name: object.name,
      type: formatType(object.type),
      layer,
      status: object.status,
      freshness: payload.freshness?.mode ?? payload.freshness?.status ?? 'unknown',
      summary: object.summary,
      properties: Object.entries(object.properties ?? {})
        .filter(([key]) => key !== 'overlay')
        .map(([key, value]) => `${toSnakeLabel(key)}: ${formatValue(value)}`),
      relationships: (object.relationships ?? []).map((item) => `${item.type} ${item.label ?? item.targetObjectId}`),
    };
  });
}

function estimateVoxelEntityCount(payload) {
  const terrainCells = payload.chunks.reduce((total, chunk) => total + (chunk.terrain?.length ?? 0), 0);
  const staticFeatures = payload.chunks.reduce((total, chunk) => total + (chunk.staticFeatures?.length ?? 0), 0);
  return terrainCells + staticFeatures + payload.projections.length;
}

function formatType(type) {
  return String(type ?? 'Object').replace(/([a-z])([A-Z])/g, '$1 $2');
}

function toSnakeLabel(key) {
  return String(key).replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
}

function formatValue(value) {
  if (typeof value === 'number' && value > 0 && value < 1) return `${Math.round(value * 100)}%`;
  return String(value);
}
