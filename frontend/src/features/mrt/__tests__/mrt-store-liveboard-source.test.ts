import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LiveBoardRow } from "../types";

const tdxRows: LiveBoardRow[] = [
  {
    arrivalMinutes: 1,
    destination: "Nangang Exhibition Center",
    direction: "Inbound",
    id: "tdx-bl18",
    trainCode: "BL18-BL23",
    lineId: "blue",
    stationId: "BL18",
    status: "approaching",
  },
];

describe("MRT dashboard store LiveBoard source", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    setActivePinia(createPinia());
  });

  it("loads TDX rows when live source is enabled", async () => {
    const fetchTdxLiveBoard = vi.fn().mockResolvedValue({
      source: "tdx",
      updatedAt: "2026-04-23T01:00:00.000Z",
      rows: tdxRows,
    });
    vi.doMock("@/shared/config/env", () => ({
      appConfig: {
        mrtLiveBoardSource: "tdx",
        tdxProxyUrl: "http://localhost:5174",
      },
    }));
    vi.doMock("@/features/mrt/api/tdx-liveboard", () => ({ fetchTdxLiveBoard }));

    const { useMrtDashboardStore } = await import("@/app/stores/mrt-dashboard");
    const store = useMrtDashboardStore();

    await store.selectStation("BL18");

    expect(fetchTdxLiveBoard).toHaveBeenCalledWith(undefined, "http://localhost:5174");
    expect(store.selectedLiveBoards).toEqual(tdxRows);
    expect(store.networkLiveBoards).toEqual(tdxRows);
    expect(store.liveBoardUpdatedAt).toBe("2026-04-23T01:00:00.000Z");
    expect(store.liveBoardError).toBeUndefined();
  });

  it("keeps station selection and exposes an error when TDX fails", async () => {
    vi.doMock("@/shared/config/env", () => ({
      appConfig: {
        mrtLiveBoardSource: "tdx",
        tdxProxyUrl: "http://localhost:5174",
      },
    }));
    vi.doMock("@/features/mrt/api/tdx-liveboard", () => ({
      fetchTdxLiveBoard: vi.fn().mockRejectedValue(new Error("proxy unavailable")),
    }));

    const { useMrtDashboardStore } = await import("@/app/stores/mrt-dashboard");
    const store = useMrtDashboardStore();

    await store.selectStation("BL18");

    expect(store.selectedStation?.id).toBe("BL18");
    expect(store.selectedLiveBoards).toEqual([]);
    expect(store.liveBoardUpdatedAt).toBeUndefined();
    expect(store.liveBoardError).toBe("proxy unavailable");
  });
});
