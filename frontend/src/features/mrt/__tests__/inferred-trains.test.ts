import { describe, expect, it } from "vitest";
import { mrtLines, mrtStations } from "../data/mrt-fixtures";
import { inferTrainMarkers } from "../map/inferred-trains";
import type { LiveBoardRow } from "../types";

describe("inferTrainMarkers", () => {
  it("derives estimated train circles from liveboard rows", () => {
    const rows: LiveBoardRow[] = [
      {
        id: "tdx-BL18-1",
        stationId: "BL18",
        lineId: "blue",
        direction: "Inbound",
        destination: "Taipei Main Station",
        arrivalMinutes: 1,
        status: "approaching",
      },
      {
        id: "tdx-BL18-2",
        stationId: "BL18",
        lineId: "blue",
        direction: "Outbound",
        destination: "Dingpu",
        arrivalMinutes: 4,
        status: "on-time",
      },
    ];

    const markers = inferTrainMarkers(rows, mrtStations, mrtLines);

    expect(markers).toHaveLength(2);
    expect(markers.every((item) => item.stationId === "BL18")).toBe(true);
    expect(markers.every((item) => item.lineId === "blue")).toBe(true);
    expect(markers[0]?.position.lng).not.toBe(markers[1]?.position.lng);
    expect(markers[0]?.layoutOffset.x).toBeGreaterThan(0);
    expect(markers[1]?.layoutOffset.x).toBeLessThan(0);
  });
});
