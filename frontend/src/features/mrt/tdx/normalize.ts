import type { LiveBoardRow, MrtLineId } from "../types";

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

  return {
    id: `tdx-${stationId}-${row.DestinationStationID ?? index}`,
    stationId,
    lineId,
    direction: normalizeDirection(row.Direction),
    destination:
      localizedText(row.DestinationStationName) ??
      row.TripHeadSign ??
      row.DestinationStationID ??
      "Unknown destination",
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
  const value = `${lineId ?? ""} ${localizedText(lineName) ?? ""} ${stationId}`.toLowerCase();

  if (value.includes("blue") || value.includes("bl")) {
    return "blue";
  }

  if (value.includes("green") || value.includes("g")) {
    return "green";
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

function isRecord(value: unknown): value is TdxRawLiveBoardRow & Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
