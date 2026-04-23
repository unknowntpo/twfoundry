import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { useMrtDashboardStore } from "@/app/stores/mrt-dashboard";

describe("MRT dashboard store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("selects a known station and exposes its LiveBoard rows", () => {
    const store = useMrtDashboardStore();

    store.selectStation("BL18");

    expect(store.selectedStation?.name).toBe("Taipei City Hall");
    expect(store.selectedLiveBoards.length).toBeGreaterThan(0);
    expect(store.selectedLiveBoards.every((row) => row.stationId === "BL18")).toBe(true);
  });

  it("clears selection when an unknown station is selected", () => {
    const store = useMrtDashboardStore();

    store.selectStation("unknown");

    expect(store.selectedStation).toBeUndefined();
    expect(store.selectedLiveBoards).toEqual([]);
  });

  it("toggles MRT line visibility independently", () => {
    const store = useMrtDashboardStore();

    store.toggleLine("red");

    expect(store.visibleLineIds).toEqual(["blue", "green"]);

    store.toggleLine("red");

    expect(store.visibleLineIds).toEqual(["blue", "green", "red"]);
  });

  it("toggles overlay visibility independently", () => {
    const store = useMrtDashboardStore();

    store.toggleOverlay("mrt-estimated-trains");

    expect(store.visibleOverlayIds.includes("mrt-estimated-trains")).toBe(false);

    store.toggleOverlay("mrt-estimated-trains");

    expect(store.visibleOverlayIds.includes("mrt-estimated-trains")).toBe(true);
  });

  it("updates live timeline mode and refresh interval independently", () => {
    const store = useMrtDashboardStore();

    store.setTimelineMode("paused");
    store.setLiveRefreshIntervalMs(5000);

    expect(store.timelineMode).toBe("paused");
    expect(store.liveRefreshIntervalMs).toBe(5000);
  });

  it("keeps train selection only while the train still exists in the current rows", async () => {
    const store = useMrtDashboardStore();

    await store.selectStation("BL18");
    const firstTrainId = store.selectedLiveBoards[0]?.id;

    expect(firstTrainId).toBeDefined();

    store.selectTrain(firstTrainId);
    expect(store.selectedTrainId).toBe(firstTrainId);

    await store.selectStation("unknown");
    expect(store.selectedTrainId).toBeUndefined();
  });
});
