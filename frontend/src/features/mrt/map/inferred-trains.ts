import type { Coordinates, LiveBoardRow, MrtLine, MrtStation } from "../types";

export interface InferredTrainMarker {
  id: string;
  trainCode: string;
  stationId: string;
  lineId: LiveBoardRow["lineId"];
  direction: LiveBoardRow["direction"];
  position: Coordinates;
  arrivalMinutes: number;
  destination: string;
  status: LiveBoardRow["status"];
  layoutOffset: {
    x: number;
    y: number;
  };
}

export function inferTrainMarkers(
  rows: LiveBoardRow[],
  stations: MrtStation[],
  lines: MrtLine[],
): InferredTrainMarker[] {
  return rows.flatMap((row, rowIndex) => {
    const station = stations.find((item) => item.id === row.stationId);
    if (!station) {
      return [];
    }

    const line = lines.find((item) => item.id === row.lineId);
    return [
      {
        id: row.id,
        trainCode: row.trainCode,
        stationId: station.id,
        lineId: row.lineId,
        direction: row.direction,
        position: resolvePosition(station, line, stations, rowIndex, row.arrivalMinutes),
        arrivalMinutes: row.arrivalMinutes,
        destination: row.destination,
        status: row.status,
        layoutOffset: resolveLayoutOffset(rowIndex, row.arrivalMinutes),
      },
    ];
  });
}

function resolvePosition(
  station: MrtStation,
  line: MrtLine | undefined,
  stations: MrtStation[],
  rowIndex: number,
  arrivalMinutes: number,
): Coordinates {
  if (!line) {
    return offsetCoordinate(station.position, resolveLayoutOffset(rowIndex, arrivalMinutes));
  }

  const stationIndex = line.stationIds.indexOf(station.id);
  const preferredNeighborIndex = rowIndex % 2 === 0 ? stationIndex + 1 : stationIndex - 1;
  const fallbackNeighborIndex = rowIndex % 2 === 0 ? stationIndex - 1 : stationIndex + 1;
  const neighbor =
    findStation(line.stationIds[preferredNeighborIndex], stations) ??
    findStation(line.stationIds[fallbackNeighborIndex], stations);

  if (!neighbor) {
    return offsetCoordinate(station.position, resolveLayoutOffset(rowIndex, arrivalMinutes));
  }

  const progress = Math.min(0.7, 0.22 + Math.min(arrivalMinutes, 6) * 0.08);
  const lat = station.position.lat + (neighbor.position.lat - station.position.lat) * progress;
  const lng = station.position.lng + (neighbor.position.lng - station.position.lng) * progress;
  const jitter = resolveLayoutOffset(rowIndex, arrivalMinutes);
  return offsetCoordinate({ lat, lng }, { x: jitter.x * 0.35, y: jitter.y * 0.35 });
}

function findStation(stationId: string | undefined, stations: MrtStation[]): MrtStation | undefined {
  return stationId ? stations.find((item) => item.id === stationId) : undefined;
}

function resolveLayoutOffset(rowIndex: number, arrivalMinutes: number): { x: number; y: number } {
  const polarity = rowIndex % 2 === 0 ? 1 : -1;
  const distance = 16 + Math.min(arrivalMinutes, 6) * 6;
  return {
    x: polarity * distance,
    y: ((rowIndex % 3) - 1) * 10,
  };
}

function offsetCoordinate(
  position: Coordinates,
  offset: { x: number; y: number },
): Coordinates {
  return {
    lat: position.lat - offset.y * 0.00004,
    lng: position.lng + offset.x * 0.00004,
  };
}
