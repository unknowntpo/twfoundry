import {
  BUS_PROJECTION_MANIFEST_KEY,
  selectSnapshot,
} from '../../../frontend/functions/_shared/busProjectionContract.js';

export { selectSnapshot };

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'public, max-age=60',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (request.method !== 'GET') {
      return jsonResponse({ error: 'method_not_allowed' }, 405);
    }

    if (!env.BUS_PROJECTION_BUCKET) {
      return jsonResponse({ error: 'missing_r2_binding' }, 500);
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === '/api/projections/bus_vehicles/timeline') {
        return await serveR2Json(env.BUS_PROJECTION_BUCKET, BUS_PROJECTION_MANIFEST_KEY);
      }

      if (url.pathname === '/api/projections/bus_vehicles') {
        return await serveProjection(env.BUS_PROJECTION_BUCKET, url.searchParams.get('slot'));
      }
    } catch (error) {
      return jsonResponse({ error: 'internal_error', message: error.message }, 500);
    }

    return jsonResponse({ error: 'not_found' }, 404);
  },
};

export async function serveProjection(bucket, slot) {
  const manifest = await readR2Json(bucket, BUS_PROJECTION_MANIFEST_KEY);
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

  return serveR2Json(bucket, key);
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
