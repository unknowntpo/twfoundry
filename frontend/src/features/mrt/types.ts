export type MrtLineId = "red" | "blue" | "green" | "orange" | "brown" | "yellow";

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

export interface LocalizedText {
  Zh_tw?: string;
  En?: string;
}

export interface LiveBoardRow {
  id: string;
  trainCode: string;
  stationId: string;
  stationName?: LocalizedText;
  lineId: MrtLineId;
  lineName?: LocalizedText;
  direction: string;
  destination: string;
  destinationName?: LocalizedText;
  arrivalMinutes: number;
  status: "on-time" | "approaching" | "delayed";
}

export interface LiveBoardSnapshot {
  updatedAt: string;
  rows: LiveBoardRow[];
}
