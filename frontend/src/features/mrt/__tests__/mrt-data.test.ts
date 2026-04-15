import { describe, expect, it } from "vitest";
import { findStationById, mrtLines, mrtStations } from "../data/mrt-fixtures";

describe("MRT mock fixtures", () => {
  it("seeds Red, Blue, and Green lines with three representative stations each", () => {
    expect(mrtLines.map((line) => line.id)).toEqual(["red", "blue", "green"]);
    expect(mrtLines.map((line) => line.stationIds)).toEqual([
      ["R10", "R05", "R02"],
      ["BL12", "BL15", "BL18"],
      ["G12", "G10", "G16"]
    ]);
    expect(mrtStations).toHaveLength(9);
  });

  it("finds stations by id without returning an arbitrary fallback", () => {
    expect(findStationById("BL18")?.name).toBe("Taipei City Hall");
    expect(findStationById("missing")).toBeUndefined();
  });
});
