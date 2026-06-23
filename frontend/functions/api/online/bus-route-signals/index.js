const SIGNAL_BUNDLE_KEY = 'online/bus-route-signals/latest.json';
const SIGNAL_ASSET_PATH = '/data/online/bus-route-signals/latest.json';

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'public, max-age=15',
};

export async function onRequest(context) {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (context.request.method !== 'GET') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  try {
    const bundle = await readSignalBundle(context);
    return jsonResponse(limitSignals(bundle, new URL(context.request.url).searchParams));
  } catch (error) {
    return jsonResponse({ error: 'internal_error', message: error.message }, 500);
  }
}

export async function readSignalBundle(context) {
  if (context.env.BUS_PROJECTION_BUCKET) {
    const object = await context.env.BUS_PROJECTION_BUCKET.get(SIGNAL_BUNDLE_KEY);
    if (object) return object.json();
  }

  if (context.env.ASSETS) {
    const url = new URL(context.request.url);
    url.pathname = SIGNAL_ASSET_PATH;
    url.search = '';
    const response = await context.env.ASSETS.fetch(new Request(url.toString(), { method: 'GET' }));
    if (response.ok) return response.json();
  }

  return emptyBundle();
}

function limitSignals(bundle, searchParams) {
  const limit = Math.max(1, Math.min(100, Number(searchParams.get('limit') || 20)));
  const signals = Array.isArray(bundle.signals) ? bundle.signals.slice(0, limit) : [];
  return {
    schema: 'twfoundry.online.tdx.bus_route_signal_bundle.v1',
    source: bundle.source ?? 'flink-speed-layer',
    status: bundle.status ?? (signals.length > 0 ? 'ok' : 'waiting_for_flink'),
    generatedAt: bundle.generatedAt ?? null,
    latestSlotKey: bundle.latestSlotKey ?? null,
    counts: bundle.counts ?? null,
    signals,
  };
}

function emptyBundle() {
  return {
    schema: 'twfoundry.online.tdx.bus_route_signal_bundle.v1',
    source: 'flink-speed-layer',
    status: 'waiting_for_flink',
    generatedAt: null,
    latestSlotKey: null,
    counts: null,
    signals: [],
  };
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
