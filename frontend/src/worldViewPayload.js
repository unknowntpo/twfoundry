import { layers } from './mockData.js';

export const fallbackWorldViewPayload = {
  schemaVersion: 'world-view.v1',
  request: {
    focusId: 'taipei-core',
    lod: 'city',
    time: 'live',
    overlays: ['mrt', 'rain', 'pm25', 'incident'],
    debugGeo: false,
  },
  focus: {
    id: 'taipei-core',
    label: 'Taipei core diorama',
    geoBounds: { west: 121.492, south: 25.018, east: 121.57, north: 25.086 },
    chunkSetId: 'taipei-core-v1',
  },
  chunks: [
    { id: 'chunk-taipei-core-west', label: 'Taipei core west' },
    { id: 'chunk-taipei-core-east', label: 'Taipei core east' },
  ],
  objects: [
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
      id: 'rain-R042',
      type: 'RainfallCell',
      name: 'Rain Cell R-042',
      source: 'cwa',
      status: 'intense',
      summary: '跨越兩個 diorama chunk 的短時強降雨。',
      properties: { overlay: 'rain', intensityMmHr: 38, confidence: 0.82, trend: 'rising' },
      relationships: [
        { type: 'covers', targetObjectId: 'chunk-taipei-core-west', targetType: 'DioramaChunk', label: 'Taipei core west' },
        { type: 'covers', targetObjectId: 'chunk-taipei-core-east', targetType: 'DioramaChunk', label: 'Taipei core east' },
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
    { id: 'proj-train-R22-west', objectId: 'train-R22', chunkId: 'chunk-taipei-core-west', overlay: 'mrt' },
    { id: 'proj-rain-R042-west', objectId: 'rain-R042', chunkId: 'chunk-taipei-core-west', overlay: 'rain' },
    { id: 'proj-rain-R042-east', objectId: 'rain-R042', chunkId: 'chunk-taipei-core-east', overlay: 'rain' },
    { id: 'proj-incident-I237-east', objectId: 'incident-I237', chunkId: 'chunk-taipei-core-east', overlay: 'incident' },
  ],
  renderModules: [
    { id: 'voxel.mrt.train', kind: 'entity' },
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

  const urls = ['/api/world/view?focusId=taipei-core&lod=city&time=live'];
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
