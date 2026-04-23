import type { LiveBoardRow, LocalizedText, MrtLineId } from "../types";

export interface TdxRawLiveBoardRow {
  StationID?: string;
  StationUID?: string;
  StationName?: string | { Zh_tw?: string; En?: string };
  LineID?: string;
  LineName?: string | { Zh_tw?: string; En?: string };
  Direction?: string | number;
  DestinationStationID?: string;
  DestinationStationName?: string | { Zh_tw?: string; En?: string };
  TripHeadSign?: string;
  EstimateTime?: string | number | null;
  StopStatus?: string | number | null;
  TrainNo?: string;
}

export function extractTdxLiveBoardRows(payload: unknown): TdxRawLiveBoardRow[] {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }

  if (isRecord(payload)) {
    const liveBoards = payload.LiveBoards ?? payload.liveBoards ?? payload.value;
    return Array.isArray(liveBoards) ? liveBoards.filter(isRecord) : [];
  }

  return [];
}

export function normalizeTdxLiveBoardRows(
  rows: TdxRawLiveBoardRow[],
  stationId?: string,
): LiveBoardRow[] {
  return rows
    .filter((row) => !stationId || matchesStation(row, stationId))
    .map((row, index) => normalizeTdxLiveBoardRow(row, stationId, index));
}

function normalizeTdxLiveBoardRow(
  row: TdxRawLiveBoardRow,
  requestedStationId: string | undefined,
  index: number,
): LiveBoardRow {
  const stationId = row.StationID ?? requestedStationId ?? suffixId(row.StationUID) ?? "unknown";
  const estimateSeconds = Number(row.EstimateTime);
  const hasEstimate = Number.isFinite(estimateSeconds);
  const arrivalMinutes = hasEstimate ? Math.max(0, Math.ceil(estimateSeconds / 60)) : 0;
  const lineId = resolveLineId(row.LineID, row.LineName, stationId);
  const destinationLabel =
    localizedText(row.DestinationStationName) ??
    row.TripHeadSign ??
    row.DestinationStationID ??
    "Unknown destination";

  return {
    id: `tdx-${stationId}-${row.DestinationStationID ?? index}`,
    trainCode: row.TrainNo ?? `${stationId}-${row.DestinationStationID ?? index}`,
    stationId,
    stationName: localizedValue(row.StationName),
    lineId,
    lineName: localizedValue(row.LineName),
    direction: normalizeDirection(row.Direction),
    destination: destinationLabel,
    destinationName:
      localizedValue(row.DestinationStationName) ?? localizedValue(destinationLabel),
    arrivalMinutes,
    status: normalizeStatus(row.StopStatus, arrivalMinutes, hasEstimate),
  };
}

function matchesStation(row: TdxRawLiveBoardRow, stationId: string): boolean {
  return (
    row.StationID === stationId ||
    row.StationUID === stationId ||
    suffixId(row.StationUID) === stationId
  );
}

function suffixId(value: string | undefined): string | undefined {
  return value?.split("-").at(-1);
}

function resolveLineId(
  lineId: string | undefined,
  lineName: TdxRawLiveBoardRow["LineName"],
  stationId: string,
): MrtLineId {
  const stationPrefix = stationId.toUpperCase().replace(/[^A-Z]/g, "");
  const rawLineId = (lineId ?? "").toUpperCase();
  const lineLabel = (localizedText(lineName) ?? "").toLowerCase();

  if (rawLineId === "BL" || stationPrefix.startsWith("BL")) {
    return "blue";
  }

  if (rawLineId === "BR" || stationPrefix.startsWith("BR")) {
    return "brown";
  }

  if (rawLineId === "G" || stationPrefix.startsWith("G")) {
    return "green";
  }

  if (rawLineId === "O" || stationPrefix.startsWith("O")) {
    return "orange";
  }

  if (rawLineId === "R" || stationPrefix.startsWith("R")) {
    return "red";
  }

  if (rawLineId === "Y" || stationPrefix.startsWith("Y")) {
    return "yellow";
  }

  if (lineLabel.includes("blue")) {
    return "blue";
  }

  if (lineLabel.includes("brown")) {
    return "brown";
  }

  if (lineLabel.includes("green")) {
    return "green";
  }

  if (lineLabel.includes("orange")) {
    return "orange";
  }

  if (lineLabel.includes("yellow")) {
    return "yellow";
  }

  return "red";
}

function normalizeDirection(direction: string | number | undefined): string {
  if (direction === 0 || direction === "0") {
    return "Outbound";
  }

  if (direction === 1 || direction === "1") {
    return "Inbound";
  }

  return typeof direction === "string" && direction ? direction : "Scheduled";
}

function normalizeStatus(
  stopStatus: string | number | null | undefined,
  arrivalMinutes: number,
  hasEstimate: boolean,
): LiveBoardRow["status"] {
  if (!hasEstimate || stopStatus === 2 || stopStatus === "2") {
    return "delayed";
  }

  if (arrivalMinutes <= 1) {
    return "approaching";
  }

  return "on-time";
}

function localizedText(value: TdxRawLiveBoardRow["StationName"]): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  return value?.En ?? value?.Zh_tw;
}

function localizedValue(value: TdxRawLiveBoardRow["StationName"]): LocalizedText | undefined {
  if (typeof value === "string") {
    return { En: value };
  }

  if (!value || (!value.En && !value.Zh_tw)) {
    return undefined;
  }

  return {
    En: value.En,
    Zh_tw: value.Zh_tw,
  };
}

function isRecord(value: unknown): value is TdxRawLiveBoardRow & Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
