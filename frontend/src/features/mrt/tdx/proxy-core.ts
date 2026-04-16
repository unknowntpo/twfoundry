import { extractTdxLiveBoardRows, normalizeTdxLiveBoardRows } from "./normalize";

const jsonHeaders = {
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

export interface TdxProxyConfig {
  clientId: string;
  clientSecret: string;
  authUrl: string;
  apiBaseUrl: string;
  rateLimitPerSecond: number;
}

export interface TdxProxyDeps {
  fetcher?: typeof fetch;
  now?: () => number;
  sleep?: (durationMs: number) => Promise<void>;
}

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

export function loadTdxProxyConfig(env: Record<string, string | undefined>): TdxProxyConfig {
  return {
    clientId: env.TDX_CLIENT_ID ?? "",
    clientSecret: env.TDX_CLIENT_SECRET ?? "",
    authUrl:
      env.TDX_AUTH_URL ??
      "https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token",
    apiBaseUrl: env.TDX_API_BASE_URL ?? "https://tdx.transportdata.tw/api/basic/v2",
    rateLimitPerSecond: Number(env.TDX_RATE_LIMIT_PER_SECOND ?? "5"),
  };
}

export function createTdxProxyHandler(config: TdxProxyConfig, deps: TdxProxyDeps = {}) {
  const fetcher = deps.fetcher ?? fetch;
  const now = deps.now ?? Date.now;
  const sleep =
    deps.sleep ??
    ((durationMs: number) => new Promise<void>((resolve) => setTimeout(resolve, durationMs)));
  const minIntervalMs = Math.ceil(1000 / Math.max(1, config.rateLimitPerSecond));
  let cachedToken: CachedToken | undefined;
  let nextTdxApiCallAt = 0;

  async function getAccessToken(): Promise<string> {
    if (cachedToken && cachedToken.expiresAt > now()) {
      return cachedToken.accessToken;
    }

    const body = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "client_credentials",
    });

    const response = await fetcher(config.authUrl, {
      body,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("TDX token request failed.");
    }

    const payload = (await response.json()) as { access_token?: string; expires_in?: number };
    if (!payload.access_token) {
      throw new Error("TDX token response did not include an access token.");
    }

    cachedToken = {
      accessToken: payload.access_token,
      expiresAt: now() + Math.max(0, (payload.expires_in ?? 0) * 1000 - 60_000),
    };
    return cachedToken.accessToken;
  }

  async function rateLimitTdxApiCall(): Promise<void> {
    const waitMs = Math.max(0, nextTdxApiCallAt - now());
    nextTdxApiCallAt = Math.max(nextTdxApiCallAt, now()) + minIntervalMs;

    if (waitMs > 0) {
      await sleep(waitMs);
    }
  }

  return async function handleTdxProxyRequest(request: Request): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: jsonHeaders, status: 204 });
    }

    const requestUrl = new URL(request.url);
    if (request.method !== "GET" || requestUrl.pathname !== "/api/mrt/liveboard") {
      return json({ error: "Not found." }, 404);
    }

    if (!config.clientId || !config.clientSecret) {
      return json({ error: "TDX credentials are not configured for the proxy process." }, 503);
    }

    try {
      const operator = requestUrl.searchParams.get("operator") || "TRTC";
      const stationId = requestUrl.searchParams.get("stationId") || undefined;
      const token = await getAccessToken();
      await rateLimitTdxApiCall();

      const tdxUrl = new URL(`/Rail/Metro/LiveBoard/${operator}`, config.apiBaseUrl);
      tdxUrl.searchParams.set("$format", "JSON");
      if (stationId) {
        tdxUrl.searchParams.set(
          "$filter",
          `StationID eq '${stationId}' or StationUID eq '${operator}-${stationId}'`,
        );
      }

      const response = await fetcher(tdxUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("TDX LiveBoard request failed.");
      }

      const payload = await response.json();
      const rawRows = extractTdxLiveBoardRows(payload);
      return json({
        rows: normalizeTdxLiveBoardRows(rawRows, stationId),
        source: "tdx",
        updatedAt: new Date(now()).toISOString(),
      });
    } catch (error) {
      return json(
        { error: error instanceof Error ? error.message : "TDX proxy request failed." },
        502,
      );
    }
  };
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    headers: jsonHeaders,
    status,
  });
}
