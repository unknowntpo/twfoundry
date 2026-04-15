export type MrtLineId = "red" | "blue" | "green";

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface MrtLine {
  id: MrtLineId;
  name: string;
  color: string;
  stationIds: string[];
  polyline: Coordinates[];
}

export interface MrtStation {
  id: string;
  name: string;
  lineIds: MrtLineId[];
  position: Coordinates;
}

export interface LiveBoardRow {
  id: string;
  stationId: string;
  lineId: MrtLineId;
  direction: string;
  destination: string;
  arrivalMinutes: number;
  status: "on-time" | "approaching" | "delayed";
}
