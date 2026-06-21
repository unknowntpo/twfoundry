import {
  BUS_PROJECTION_MANIFEST_KEY,
  BUS_PROJECTION_R2_PREFIX,
  BUS_PROJECTION_TRACK_B_MANIFEST_KEY,
  selectSnapshot,
} from '../../_shared/busProjectionContract.js';

export { selectSnapshot };

const staticProjectionAssetPrefix = '/data/cloudflare-bus-projections';

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'public, max-age=60',
};

export async function onRequest(context) {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (context.request.method !== 'GET') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  const url = new URL(context.request.url);
  const path = Array.isArray(context.params.path) ? context.params.path : [context.params.path].filter(Boolean);
  const store = projectionStore(context);

  try {
    if (path.length === 2 && path[1] === 'timeline') {
      const manifestKey = manifestKeyForLayer(path[0]);
      if (manifestKey) {
        return await store.serveJson(manifestKey);
      }
    }

    if (path.length === 1) {
      const manifestKey = manifestKeyForLayer(path[0]);
      if (manifestKey) {
        return await serveProjection(store, url.searchParams.get('slot'), manifestKey);
      }
    }
  } catch (error) {
    return jsonResponse({ error: 'internal_error', message: error.message }, 500);
  }

  return jsonResponse({ error: 'not_found' }, 404);
}

export function projectionStore(context) {
  if (context.env.BUS_PROJECTION_BUCKET) {
    return {
      serveJson: (key) => serveR2Json(context.env.BUS_PROJECTION_BUCKET, key),
      readJson: (key) => readR2Json(context.env.BUS_PROJECTION_BUCKET, key),
    };
  }

  return {
    serveJson: (key) => serveAssetJson(context, key),
    readJson: (key) => readAssetJson(context, key),
  };
}

export async function serveProjection(store, slot, manifestKey = BUS_PROJECTION_MANIFEST_KEY) {
  const manifest = await store.readJson(manifestKey);
  if (!Array.isArray(manifest.snapshots) || manifest.snapshots.length === 0) {
    return jsonResponse({ error: 'empty_projection_manifest' }, 404);
  }

  const entry = selectSnapshot(manifest, slot);
  if (!entry) {
    return jsonResponse({ error: 'unknown_slot', slot }, 404);
  }

  const key = entry.projectionPath;
  if (!key) {
    return jsonResponse({ error: 'missing_projection_path', slot: entry.slotKey }, 500);
  }

  return store.serveJson(key);
}

function manifestKeyForLayer(layerId) {
  if (layerId === 'bus_vehicles') {
    return BUS_PROJECTION_MANIFEST_KEY;
  }
  if (layerId === 'bus_vehicles_track_b') {
    return BUS_PROJECTION_TRACK_B_MANIFEST_KEY;
  }
  return null;
}

async function serveR2Json(bucket, key) {
  const object = await bucket.get(key);
  if (!object) {
    return jsonResponse({ error: 'r2_object_not_found', key }, 404);
  }

  const headers = new Headers(jsonHeaders);
  Object.entries(corsHeaders()).forEach(([name, value]) => headers.set(name, value));
  if (object.httpEtag) headers.set('etag', object.httpEtag);
  return new Response(object.body, { headers });
}

async function readR2Json(bucket, key) {
  const object = await bucket.get(key);
  if (!object) {
    throw new Error(`R2 object not found: ${key}`);
  }
  return object.json();
}

async function serveAssetJson(context, key) {
  const response = await fetchAsset(context, key);
  if (!response.ok) {
    return jsonResponse({ error: 'asset_not_found', key }, 404);
  }

  const headers = new Headers(jsonHeaders);
  Object.entries(corsHeaders()).forEach(([name, value]) => headers.set(name, value));
  const etag = response.headers.get('etag');
  if (etag) headers.set('etag', etag);
  return new Response(response.body, { headers });
}

async function readAssetJson(context, key) {
  const response = await fetchAsset(context, key);
  if (!response.ok) {
    throw new Error(`Static projection asset not found: ${key}`);
  }
  return response.json();
}

async function fetchAsset(context, key) {
  if (!context.env.ASSETS) {
    return jsonResponse({ error: 'missing_assets_binding' }, 500);
  }

  const url = new URL(context.request.url);
  url.pathname = assetPathForProjectionKey(key);
  url.search = '';
  return context.env.ASSETS.fetch(new Request(url.toString(), { method: 'GET' }));
}

function assetPathForProjectionKey(key) {
  if (key === BUS_PROJECTION_MANIFEST_KEY) {
    return `${staticProjectionAssetPrefix}/manifest.json`;
  }

  const prefix = `${BUS_PROJECTION_R2_PREFIX}/`;
  if (key.startsWith(prefix)) {
    return `${staticProjectionAssetPrefix}/${key.slice(prefix.length)}`;
  }

  return `${staticProjectionAssetPrefix}/${key}`;
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...jsonHeaders,
      ...corsHeaders(),
    },
  });
}

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'content-type',
  };
}
