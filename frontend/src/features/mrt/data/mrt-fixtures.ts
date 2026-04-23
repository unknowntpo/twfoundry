import type { LiveBoardRow, LiveBoardSnapshot, MrtStation } from "../types";
import { mrtLines, mrtStations } from "./mrt-network.generated";

export { mrtLines, mrtStations };

export const liveBoardRows: LiveBoardRow[] = [
  {
    id: "lb-bl18-1",
    trainCode: "BL18-BL01",
    stationId: "BL18",
    stationName: { Zh_tw: "台北市政府", En: "Taipei City Hall" },
    lineId: "blue",
    lineName: { Zh_tw: "板南線", En: "Bannan Line" },
    direction: "Westbound",
    destination: "Dingpu",
    destinationName: { Zh_tw: "頂埔", En: "Dingpu" },
    arrivalMinutes: 2,
    status: "approaching",
  },
  {
    id: "lb-bl18-2",
    trainCode: "BL18-BL23",
    stationId: "BL18",
    stationName: { Zh_tw: "台北市政府", En: "Taipei City Hall" },
    lineId: "blue",
    lineName: { Zh_tw: "板南線", En: "Bannan Line" },
    direction: "Eastbound",
    destination: "Nangang Exhibition Center",
    destinationName: { Zh_tw: "南港展覽館", En: "Nangang Exhibition Center" },
    arrivalMinutes: 5,
    status: "on-time",
  },
  {
    id: "lb-r10-1",
    trainCode: "R10-R02",
    stationId: "R10",
    stationName: { Zh_tw: "台北車站", En: "Taipei Main Station" },
    lineId: "red",
    lineName: { Zh_tw: "淡水信義線", En: "Tamsui-Xinyi Line" },
    direction: "Southbound",
    destination: "Xiangshan",
    destinationName: { Zh_tw: "象山", En: "Xiangshan" },
    arrivalMinutes: 3,
    status: "on-time",
  },
  {
    id: "lb-g12-1",
    trainCode: "G12-G19",
    stationId: "G12",
    stationName: { Zh_tw: "西門", En: "Ximen" },
    lineId: "green",
    lineName: { Zh_tw: "松山新店線", En: "Songshan-Xindian Line" },
    direction: "Eastbound",
    destination: "Songshan",
    destinationName: { Zh_tw: "松山", En: "Songshan" },
    arrivalMinutes: 4,
    status: "delayed",
  },
];

export const liveBoardSnapshots: LiveBoardSnapshot[] = [
  {
    updatedAt: "2026-04-23T08:00:00.000Z",
    rows: liveBoardRows.map((row) => ({
      ...row,
      arrivalMinutes: Math.max(0, row.arrivalMinutes + 3),
      status: row.arrivalMinutes <= 1 ? row.status : "on-time",
    })),
  },
  {
    updatedAt: "2026-04-23T08:01:00.000Z",
    rows: liveBoardRows.map((row) => ({
      ...row,
      arrivalMinutes: Math.max(0, row.arrivalMinutes + 1),
    })),
  },
  {
    updatedAt: "2026-04-23T08:02:00.000Z",
    rows: liveBoardRows,
  },
];

export function findStationById(stationId: string): MrtStation | undefined {
  return mrtStations.find((station) => station.id === stationId);
}

export function findLiveBoardRowsByStation(stationId: string): LiveBoardRow[] {
  return liveBoardRows.filter((row) => row.stationId === stationId);
}
