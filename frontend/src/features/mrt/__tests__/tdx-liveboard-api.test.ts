import { describe, expect, it, vi } from "vitest";
import { fetchTdxLiveBoardTimeline } from "../api/tdx-liveboard";

describe("TDX LiveBoard API client", () => {
  it("requests persisted timeline snapshots with operator and limit", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL) =>
      Response.json({
        source: "tdx",
        snapshots: [{ updatedAt: "2026-04-23T01:00:00.000Z", rows: [] }],
      }),
    );

    const payload = await fetchTdxLiveBoardTimeline("http://localhost:8080", 25, fetcher);
    const requestedUrl = new URL(String(fetcher.mock.calls[0]?.[0]));

    expect(requestedUrl.pathname).toBe("/api/mrt/liveboard/timeline");
    expect(requestedUrl.searchParams.get("operator")).toBe("TRTC");
    expect(requestedUrl.searchParams.get("limit")).toBe("25");
    expect(payload.snapshots).toHaveLength(1);
  });

  it("returns an empty timeline when the backend payload shape is unknown", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL) =>
      Response.json({ source: "tdx", rows: [] }),
    );

    await expect(fetchTdxLiveBoardTimeline("http://localhost:8080", 120, fetcher)).resolves.toEqual(
      {
        source: "tdx",
        snapshots: [],
      },
    );
  });
});
