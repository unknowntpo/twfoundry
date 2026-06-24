const ANALYTICS_PREFIX = 'analytics/bus';

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

  const file = requestedFile(context.params.path);
  if (!file || !isSafeJsonPath(file)) {
    return jsonResponse({ error: 'bad_analytics_path' }, 400);
  }

  if (!context.env.BUS_PROJECTION_BUCKET) {
    return jsonResponse({ error: 'missing_bus_projection_bucket' }, 500);
  }

  try {
    return await serveR2Json(context.env.BUS_PROJECTION_BUCKET, `${ANALYTICS_PREFIX}/${file}`);
  } catch (error) {
    return jsonResponse({ error: 'internal_error', message: error.message }, 500);
  }
}

function requestedFile(pathParam) {
  const parts = Array.isArray(pathParam) ? pathParam : [pathParam].filter(Boolean);
  return parts.join('/');
}

function isSafeJsonPath(file) {
  return file.endsWith('.json')
    && !file.startsWith('/')
    && !file.includes('\\')
    && file.split('/').every((part) => part && part !== '.' && part !== '..');
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
