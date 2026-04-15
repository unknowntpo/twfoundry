import type { LiveBoardRow, MrtLine, MrtStation } from "../types";

export const mrtStations: MrtStation[] = [
  {
    id: "R10",
    name: "Taipei Main Station",
    lineIds: ["red", "blue"],
    position: { lat: 25.0478, lng: 121.517 }
  },
  {
    id: "R05",
    name: "Daan",
    lineIds: ["red"],
    position: { lat: 25.033, lng: 121.5437 }
  },
  {
    id: "R02",
    name: "Xiangshan",
    lineIds: ["red"],
    position: { lat: 25.0328, lng: 121.5696 }
  },
  {
    id: "BL12",
    name: "Taipei Main Station",
    lineIds: ["blue", "red"],
    position: { lat: 25.0478, lng: 121.517 }
  },
  {
    id: "BL15",
    name: "Zhongxiao Fuxing",
    lineIds: ["blue"],
    position: { lat: 25.0416, lng: 121.5438 }
  },
  {
    id: "BL18",
    name: "Taipei City Hall",
    lineIds: ["blue"],
    position: { lat: 25.0412, lng: 121.5655 }
  },
  {
    id: "G12",
    name: "Ximen",
    lineIds: ["green"],
    position: { lat: 25.0421, lng: 121.5083 }
  },
  {
    id: "G10",
    name: "Chiang Kai-shek Memorial Hall",
    lineIds: ["green"],
    position: { lat: 25.0327, lng: 121.5183 }
  },
  {
    id: "G16",
    name: "Nanjing Fuxing",
    lineIds: ["green"],
    position: { lat: 25.0523, lng: 121.544 }
  }
];

export const mrtLines: MrtLine[] = [
  {
    id: "red",
    name: "Red Line",
    color: "#d4212f",
    stationIds: ["R10", "R05", "R02"],
    polyline: [
      { lat: 25.0478, lng: 121.517 },
      { lat: 25.033, lng: 121.5437 },
      { lat: 25.0328, lng: 121.5696 }
    ]
  },
  {
    id: "blue",
    name: "Blue Line",
    color: "#0070bd",
    stationIds: ["BL12", "BL15", "BL18"],
    polyline: [
      { lat: 25.0478, lng: 121.517 },
      { lat: 25.0416, lng: 121.5438 },
      { lat: 25.0412, lng: 121.5655 }
    ]
  },
  {
    id: "green",
    name: "Green Line",
    color: "#008659",
    stationIds: ["G12", "G10", "G16"],
    polyline: [
      { lat: 25.0421, lng: 121.5083 },
      { lat: 25.0327, lng: 121.5183 },
      { lat: 25.0523, lng: 121.544 }
    ]
  }
];

export const liveBoardRows: LiveBoardRow[] = [
  {
    id: "lb-bl18-1",
    stationId: "BL18",
    lineId: "blue",
    direction: "Westbound",
    destination: "Dingpu",
    arrivalMinutes: 2,
    status: "approaching"
  },
  {
    id: "lb-bl18-2",
    stationId: "BL18",
    lineId: "blue",
    direction: "Eastbound",
    destination: "Nangang Exhibition Center",
    arrivalMinutes: 5,
    status: "on-time"
  },
  {
    id: "lb-r10-1",
    stationId: "R10",
    lineId: "red",
    direction: "Southbound",
    destination: "Xiangshan",
    arrivalMinutes: 3,
    status: "on-time"
  },
  {
    id: "lb-g12-1",
    stationId: "G12",
    lineId: "green",
    direction: "Eastbound",
    destination: "Songshan",
    arrivalMinutes: 4,
    status: "delayed"
  }
];

export function findStationById(stationId: string): MrtStation | undefined {
  return mrtStations.find((station) => station.id === stationId);
}

export function findLiveBoardRowsByStation(stationId: string): LiveBoardRow[] {
  return liveBoardRows.filter((row) => row.stationId === stationId);
}
