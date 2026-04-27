import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { useMrtDashboardStore } from "@/app/stores/mrt-dashboard";
import { mrtLines, mrtStations } from "../data/mrt-fixtures";
import { inferTrainMarkers } from "../map/inferred-trains";

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

    expect(store.visibleLineIds.includes("red")).toBe(false);
    expect(store.visibleLineIds.includes("blue")).toBe(true);
    expect(store.visibleLineIds.includes("green")).toBe(true);

    store.toggleLine("red");

    expect(store.visibleLineIds.includes("red")).toBe(true);
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

  it("switches displayed snapshot rows when the timeline is scrubbed", async () => {
    const store = useMrtDashboardStore();

    await store.selectStation("BL18");
    const latestArrival = store.selectedLiveBoards[0]?.arrivalMinutes;

    store.scrubTimeline(0);

    expect(store.timelineMode).toBe("paused");
    expect(store.selectedLiveBoards[0]?.arrivalMinutes).not.toBe(latestArrival);
    expect(store.displayedUpdatedAt).toBe("2026-04-23T08:00:00.000Z");
  });

  it("keeps the paused replay cursor when a newer live snapshot arrives", async () => {
    const store = useMrtDashboardStore();

    await store.selectStation("BL18");
    store.scrubTimeline(0);
    const pausedUpdatedAt = store.displayedUpdatedAt;

    await store.refreshLiveBoards();

    expect(store.timelineMode).toBe("paused");
    expect(store.displayedUpdatedAt).toBe(pausedUpdatedAt);
  });

  it("changes inferred train positions from the selected replay snapshot", async () => {
    const store = useMrtDashboardStore();

    await store.selectStation("BL18");
    const latestMarkers = inferTrainMarkers(store.displayedLiveBoards, mrtStations, mrtLines);

    store.scrubTimeline(0);
    const replayMarkers = inferTrainMarkers(store.displayedLiveBoards, mrtStations, mrtLines);

    expect(replayMarkers[0]?.position.lng).not.toBe(latestMarkers[0]?.position.lng);
    expect(replayMarkers[0]?.position.lat).not.toBe(latestMarkers[0]?.position.lat);
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
