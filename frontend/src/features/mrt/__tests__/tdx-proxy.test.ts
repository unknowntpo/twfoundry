import { describe, expect, it, vi } from "vitest";
import { createTdxProxyHandler, loadTdxProxyConfig } from "../tdx/proxy-core";

describe("TDX proxy core", () => {
  it("rejects missing credentials without leaking secret values", async () => {
    const handler = createTdxProxyHandler(loadTdxProxyConfig({}));

    const response = await handler(new Request("http://localhost/api/mrt/liveboard"));
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.error).toContain("TDX credentials");
    expect(JSON.stringify(payload)).not.toContain("client_secret");
  });

  it("sends form-encoded client credentials for token exchange", async () => {
    const requests: Request[] = [];
    const handler = createTdxProxyHandler(
      loadTdxProxyConfig({
        TDX_CLIENT_ID: "client-id",
        TDX_CLIENT_SECRET: "client-secret",
      }),
      {
        fetcher: vi.fn(async (input, init) => {
          requests.push(new Request(input, init));
          if (String(input).includes("openid-connect")) {
            return Response.json({ access_token: "token", expires_in: 3600 });
          }
          return Response.json([{ EstimateTime: 60, LineID: "BL", StationID: "BL18" }]);
        }),
        now: () => 0,
      },
    );

    await handler(new Request("http://localhost/api/mrt/liveboard?stationId=BL18"));

    const tokenBody = await requests[0].text();
    expect(new URLSearchParams(tokenBody).get("grant_type")).toBe("client_credentials");
    expect(new URLSearchParams(tokenBody).get("client_id")).toBe("client-id");
    expect(new URLSearchParams(tokenBody).get("client_secret")).toBe("client-secret");
  });

  it("caches tokens and rate-limits TDX API calls", async () => {
    const sleepDurations: number[] = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("openid-connect")) {
        return Response.json({ access_token: "token", expires_in: 3600 });
      }
      expect(init?.headers).toEqual({ Authorization: "Bearer token" });
      return Response.json([{ EstimateTime: 60, LineID: "BL", StationID: "BL18" }]);
    });
    const handler = createTdxProxyHandler(
      loadTdxProxyConfig({
        TDX_CLIENT_ID: "client-id",
        TDX_CLIENT_SECRET: "client-secret",
        TDX_RATE_LIMIT_PER_SECOND: "5",
      }),
      {
        fetcher,
        now: () => 0,
        sleep: async (durationMs) => {
          sleepDurations.push(durationMs);
        },
      },
    );

    await handler(new Request("http://localhost/api/mrt/liveboard?stationId=BL18"));
    await handler(new Request("http://localhost/api/mrt/liveboard?stationId=BL18"));

    expect(
      fetcher.mock.calls.filter(([input]) => String(input).includes("openid-connect")),
    ).toHaveLength(1);
    expect(sleepDurations).toEqual([200]);
  });
});
