import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("MRT dashboard live mode", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    setActivePinia(createPinia());
  });

  it("polls the network live feed while live mode is active", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const fetchTdxLiveBoard = vi
      .fn()
      .mockResolvedValue({
        source: "tdx",
        updatedAt: "2026-04-23T01:00:00.000Z",
        rows: [],
      });

    vi.doMock("@/shared/config/env", () => ({
      appConfig: {
        mapProvider: "mock",
        googleMapsApiKey: "",
        googleMapsMapId: "DEMO_MAP_ID",
        mrtLiveBoardSource: "tdx",
        tdxProxyUrl: "http://localhost:5174",
      },
    }));
    vi.doMock("@/features/mrt/api/tdx-liveboard", () => ({ fetchTdxLiveBoard }));

    const { i18n } = await import("@/shared/i18n");
    const { useMrtDashboardStore } = await import("@/app/stores/mrt-dashboard");
    const MrtDashboard = (await import("@/features/mrt/components/MrtDashboard.vue")).default;

    const store = useMrtDashboardStore();
    store.setLiveRefreshIntervalMs(5000);
    await store.selectStation("BL18");
    fetchTdxLiveBoard.mockClear();

    mount(MrtDashboard, {
      global: {
        plugins: [pinia, i18n],
        stubs: {
          RouterLink: {
            template: "<a><slot /></a>",
          },
        },
      },
    });

    await vi.advanceTimersByTimeAsync(5000);

    expect(fetchTdxLiveBoard).toHaveBeenCalledWith(undefined, "http://localhost:5174");
  });
});
