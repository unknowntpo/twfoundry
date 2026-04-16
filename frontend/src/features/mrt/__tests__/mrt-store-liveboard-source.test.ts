import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LiveBoardRow } from "../types";

const tdxRows: LiveBoardRow[] = [
  {
    arrivalMinutes: 1,
    destination: "Nangang Exhibition Center",
    direction: "Inbound",
    id: "tdx-bl18",
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
    const fetchTdxLiveBoardRows = vi.fn().mockResolvedValue(tdxRows);
    vi.doMock("@/shared/config/env", () => ({
      appConfig: {
        mrtLiveBoardSource: "tdx",
        tdxProxyUrl: "http://localhost:5174",
      },
    }));
    vi.doMock("@/features/mrt/api/tdx-liveboard", () => ({ fetchTdxLiveBoardRows }));

    const { useMrtDashboardStore } = await import("@/app/stores/mrt-dashboard");
    const store = useMrtDashboardStore();

    await store.selectStation("BL18");

    expect(fetchTdxLiveBoardRows).toHaveBeenCalledWith("BL18", "http://localhost:5174");
    expect(store.selectedLiveBoards).toEqual(tdxRows);
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
      fetchTdxLiveBoardRows: vi.fn().mockRejectedValue(new Error("proxy unavailable")),
    }));

    const { useMrtDashboardStore } = await import("@/app/stores/mrt-dashboard");
    const store = useMrtDashboardStore();

    await store.selectStation("BL18");

    expect(store.selectedStation?.id).toBe("BL18");
    expect(store.selectedLiveBoards).toEqual([]);
    expect(store.liveBoardError).toBe("proxy unavailable");
  });
});
