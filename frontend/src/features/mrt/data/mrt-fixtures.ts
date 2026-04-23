import type { LiveBoardRow, MrtStation } from "../types";
import { mrtLines, mrtStations } from "./mrt-network.generated";

export { mrtLines, mrtStations };

export const liveBoardRows: LiveBoardRow[] = [
  {
    id: "lb-bl18-1",
    trainCode: "BL18-BL01",
    stationId: "BL18",
    lineId: "blue",
    direction: "Westbound",
    destination: "Dingpu",
    arrivalMinutes: 2,
    status: "approaching",
  },
  {
    id: "lb-bl18-2",
    trainCode: "BL18-BL23",
    stationId: "BL18",
    lineId: "blue",
    direction: "Eastbound",
    destination: "Nangang Exhibition Center",
    arrivalMinutes: 5,
    status: "on-time",
  },
  {
    id: "lb-r10-1",
    trainCode: "R10-R02",
    stationId: "R10",
    lineId: "red",
    direction: "Southbound",
    destination: "Xiangshan",
    arrivalMinutes: 3,
    status: "on-time",
  },
  {
    id: "lb-g12-1",
    trainCode: "G12-G19",
    stationId: "G12",
    lineId: "green",
    direction: "Eastbound",
    destination: "Songshan",
    arrivalMinutes: 4,
    status: "delayed",
  },
];

export function findStationById(stationId: string): MrtStation | undefined {
  return mrtStations.find((station) => station.id === stationId);
}

export function findLiveBoardRowsByStation(stationId: string): LiveBoardRow[] {
  return liveBoardRows.filter((row) => row.stationId === stationId);
}
