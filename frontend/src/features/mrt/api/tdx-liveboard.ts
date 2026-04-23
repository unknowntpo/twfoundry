import type { LiveBoardRow } from "../types";

export interface TdxLiveBoardProxyResponse {
  source: "tdx";
  updatedAt: string;
  rows: LiveBoardRow[];
}

export async function fetchTdxLiveBoard(
  stationId: string,
  proxyUrl: string,
  fetcher: typeof fetch = fetch,
): Promise<TdxLiveBoardProxyResponse> {
  const url = new URL("/api/mrt/liveboard", proxyUrl);
  url.searchParams.set("operator", "TRTC");
  url.searchParams.set("stationId", stationId);

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
  stationId: string,
  proxyUrl: string,
  fetcher: typeof fetch = fetch,
): Promise<LiveBoardRow[]> {
  const payload = await fetchTdxLiveBoard(stationId, proxyUrl, fetcher);
  return payload.rows;
}

function isProxyResponse(value: unknown): value is TdxLiveBoardProxyResponse {
  return (
    typeof value === "object" && value !== null && Array.isArray((value as { rows?: unknown }).rows)
  );
}
