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
});
