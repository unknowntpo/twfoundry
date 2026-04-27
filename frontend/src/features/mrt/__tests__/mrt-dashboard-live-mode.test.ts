import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
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
    const fetchTdxLiveBoard = vi.fn().mockResolvedValue({
      source: "tdx",
      updatedAt: "2026-04-23T01:00:00.000Z",
      rows: [],
    });
    const fetchTdxLiveBoardTimeline = vi.fn().mockResolvedValue({
      source: "tdx",
      snapshots: [],
    });

    vi.doMock("@/shared/config/env", () => ({
      appConfig: {
        mapProvider: "mock",
        mapLibreStyleUrl: "https://demotiles.maplibre.org/style.json",
        mrtLiveBoardSource: "tdx",
        tdxProxyUrl: "http://localhost:5174",
      },
    }));
    vi.doMock("@/features/mrt/api/tdx-liveboard", () => ({
      fetchTdxLiveBoard,
      fetchTdxLiveBoardTimeline,
    }));

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

  it("updates the rendered liveboard when the replay snapshot changes", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const fetchTdxLiveBoard = vi.fn().mockResolvedValue({
      source: "tdx",
      updatedAt: "2026-04-23T01:02:00.000Z",
      rows: [
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
      ],
    });
    const fetchTdxLiveBoardTimeline = vi.fn().mockResolvedValue({
      source: "tdx",
      snapshots: [
        {
          updatedAt: "2026-04-23T01:00:00.000Z",
          rows: [
            {
              arrivalMinutes: 4,
              destination: "Nangang Exhibition Center",
              direction: "Inbound",
              id: "tdx-bl18",
              trainCode: "BL18-BL23",
              lineId: "blue",
              stationId: "BL18",
              status: "on-time",
            },
          ],
        },
        {
          updatedAt: "2026-04-23T01:02:00.000Z",
          rows: [
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
          ],
        },
      ],
    });

    vi.doMock("@/shared/config/env", () => ({
      appConfig: {
        mapProvider: "mock",
        mapLibreStyleUrl: "https://demotiles.maplibre.org/style.json",
        mrtLiveBoardSource: "tdx",
        tdxProxyUrl: "http://localhost:5174",
      },
    }));
    vi.doMock("@/features/mrt/api/tdx-liveboard", () => ({
      fetchTdxLiveBoard,
      fetchTdxLiveBoardTimeline,
    }));

    const { i18n } = await import("@/shared/i18n");
    const { useMrtDashboardStore } = await import("@/app/stores/mrt-dashboard");
    const MrtDashboard = (await import("@/features/mrt/components/MrtDashboard.vue")).default;

    const store = useMrtDashboardStore();
    await store.selectStation("BL18");

    const wrapper = mount(MrtDashboard, {
      global: {
        plugins: [pinia, i18n],
        stubs: {
          RouterLink: {
            template: "<a><slot /></a>",
          },
        },
      },
    });

    await flushPromises();
    store.scrubTimeline(0);
    await wrapper.vm.$nextTick();

    expect(store.timelineMode).toBe("paused");
    expect(store.selectedLiveBoards[0]?.arrivalMinutes).toBe(4);
    expect(wrapper.get("[data-testid='liveboard-list']").text()).toContain("4");
  });
});
