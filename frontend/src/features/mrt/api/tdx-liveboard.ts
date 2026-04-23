import type { LiveBoardRow, LiveBoardSnapshot } from "../types";

export interface TdxLiveBoardProxyResponse {
  source: "tdx";
  updatedAt: string;
  rows: LiveBoardRow[];
}

export interface TdxLiveBoardTimelineResponse {
  source: "tdx";
  snapshots: LiveBoardSnapshot[];
}

export async function fetchTdxLiveBoard(
  stationId: string | undefined,
  proxyUrl: string,
  fetcher: typeof fetch = fetch,
): Promise<TdxLiveBoardProxyResponse> {
  const url = new URL("/api/mrt/liveboard", proxyUrl);
  url.searchParams.set("operator", "TRTC");
  if (stationId) {
    url.searchParams.set("stationId", stationId);
  }

  const response = await fetcher(url);
  const payload = await response.json().catch(() => undefined);

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "error" in payload
        ? String(payload.error)
        : "TDX LiveBoard proxy request failed.";
    throw new Error(message);
  }

  return isProxyResponse(payload)
    ? payload
    : {
        source: "tdx",
        updatedAt: new Date().toISOString(),
        rows: [],
      };
}

export async function fetchTdxLiveBoardRows(
  stationId: string | undefined,
  proxyUrl: string,
  fetcher: typeof fetch = fetch,
): Promise<LiveBoardRow[]> {
  const payload = await fetchTdxLiveBoard(stationId, proxyUrl, fetcher);
  return payload.rows;
}

export async function fetchTdxLiveBoardTimeline(
  proxyUrl: string,
  limit = 120,
  fetcher: typeof fetch = fetch,
): Promise<TdxLiveBoardTimelineResponse> {
  const url = new URL("/api/mrt/liveboard/timeline", proxyUrl);
  url.searchParams.set("operator", "TRTC");
  url.searchParams.set("limit", String(limit));

  const response = await fetcher(url);
  const payload = await response.json().catch(() => undefined);

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "error" in payload
        ? String(payload.error)
        : "TDX LiveBoard timeline request failed.";
    throw new Error(message);
  }

  return isTimelineResponse(payload)
    ? payload
    : {
        source: "tdx",
        snapshots: [],
      };
}

function isProxyResponse(value: unknown): value is TdxLiveBoardProxyResponse {
  return (
    typeof value === "object" && value !== null && Array.isArray((value as { rows?: unknown }).rows)
  );
}

function isTimelineResponse(value: unknown): value is TdxLiveBoardTimelineResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { snapshots?: unknown }).snapshots)
  );
}
