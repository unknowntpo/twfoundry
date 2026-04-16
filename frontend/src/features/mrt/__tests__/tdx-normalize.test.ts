import { describe, expect, it } from "vitest";
import { extractTdxLiveBoardRows, normalizeTdxLiveBoardRows } from "../tdx/normalize";

describe("TDX LiveBoard normalization", () => {
  it("extracts rows from common TDX response shapes", () => {
    expect(extractTdxLiveBoardRows([{ StationID: "BL18" }])).toHaveLength(1);
    expect(extractTdxLiveBoardRows({ LiveBoards: [{ StationID: "BL18" }] })).toHaveLength(1);
    expect(extractTdxLiveBoardRows({ value: [{ StationID: "BL18" }] })).toHaveLength(1);
  });

  it("normalizes matching TDX rows into LiveBoard UI rows", () => {
    const rows = normalizeTdxLiveBoardRows(
      [
        {
          DestinationStationName: { En: "Nangang Exhibition Center" },
          Direction: 1,
          EstimateTime: 95,
          LineID: "BL",
          StationID: "BL18",
          StopStatus: 0,
        },
      ],
      "BL18",
    );

    expect(rows).toEqual([
      expect.objectContaining({
        arrivalMinutes: 2,
        destination: "Nangang Exhibition Center",
        direction: "Inbound",
        lineId: "blue",
        stationId: "BL18",
        status: "on-time",
      }),
    ]);
  });

  it("filters by StationID, StationUID suffix, and requested station", () => {
    const rows = normalizeTdxLiveBoardRows(
      [
        { EstimateTime: 0, LineID: "R", StationUID: "TRTC-R10" },
        { EstimateTime: 120, LineID: "G", StationID: "G12" },
      ],
      "R10",
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      lineId: "red",
      stationId: "R10",
      status: "approaching",
    });
  });

  it("marks missing estimate rows as delayed", () => {
    const rows = normalizeTdxLiveBoardRows([{ LineID: "G", StationID: "G12" }], "G12");

    expect(rows[0]?.status).toBe("delayed");
  });
});
