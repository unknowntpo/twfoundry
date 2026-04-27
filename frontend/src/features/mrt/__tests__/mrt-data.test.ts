import { describe, expect, it } from "vitest";
import { findStationById, mrtLines, mrtStations } from "../data/mrt-fixtures";

describe("MRT mock fixtures", () => {
  it("seeds the supported MRT network lines with station geometry", () => {
    expect(mrtLines.map((line) => line.id)).toEqual(["blue", "brown", "green", "orange", "red"]);
    expect(mrtLines.every((line) => line.stationIds.length > 0)).toBe(true);
    expect(mrtLines.every((line) => line.polyline.length > 0)).toBe(true);
    expect(mrtStations.length).toBeGreaterThan(100);
  });

  it("finds stations by id without returning an arbitrary fallback", () => {
    expect(findStationById("BL18")?.name).toBe("Taipei City Hall");
    expect(findStationById("missing")).toBeUndefined();
  });
});
