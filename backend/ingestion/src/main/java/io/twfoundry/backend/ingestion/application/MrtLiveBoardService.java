package io.twfoundry.backend.ingestion.application;

import com.fasterxml.jackson.databind.JsonNode;
import io.twfoundry.backend.ingestion.infrastructure.tdx.TdxLiveBoardGateway;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class MrtLiveBoardService {
  private final TdxLiveBoardGateway gateway;

  public MrtLiveBoardService(TdxLiveBoardGateway gateway) {
    this.gateway = gateway;
  }

  public MrtLiveBoardResponse fetch(String operator, String stationId) {
    List<JsonNode> rows = gateway.fetchLiveBoard(operator, stationId);
    return new MrtLiveBoardResponse(
        "tdx",
        Instant.now().toString(),
        rows.stream().map(row -> normalize(row, stationId)).toList());
  }

  private LiveBoardRow normalize(JsonNode row, String requestedStationId) {
    String stationId = text(row, "StationID", normalizeStationId(requestedStationId), "unknown");
    int estimateSeconds = integer(row, "EstimateTime", -1);
    boolean hasEstimate = estimateSeconds >= 0;
    int arrivalMinutes = hasEstimate ? Math.max(0, (int) Math.ceil(estimateSeconds / 60.0)) : 0;
    String lineId = resolveLineId(row);
    return new LiveBoardRow(
        "tdx-" + stationId + "-" + text(row, "DestinationStationID", "0"),
        stationId,
        lineId,
        normalizeDirection(text(row, "Direction", "")),
        text(
            row,
            "DestinationStationName",
            text(row, "TripHeadSign", text(row, "DestinationStationID", "Unknown destination"))),
        arrivalMinutes,
        normalizeStatus(integer(row, "StopStatus", null), arrivalMinutes, hasEstimate));
  }

  private String normalizeStationId(String stationId) {
    if (stationId == null || stationId.isBlank()) {
      return null;
    }
    int index = stationId.lastIndexOf('-');
    return index >= 0 ? stationId.substring(index + 1) : stationId;
  }

  private String resolveLineId(JsonNode row) {
    String value =
        (
                text(row, "LineID", "")
                    + " "
                    + text(row, "LineName", "")
                    + " "
                    + text(row, "StationID", ""))
            .toLowerCase();
    if (value.contains("blue") || value.contains("bl")) {
      return "blue";
    }
    if (value.contains("green") || value.contains("g")) {
      return "green";
    }
    return "red";
  }

  private String normalizeDirection(String direction) {
    if ("0".equals(direction)) {
      return "Outbound";
    }
    if ("1".equals(direction)) {
      return "Inbound";
    }
    return direction == null || direction.isBlank() ? "Scheduled" : direction;
  }

  private String normalizeStatus(Integer stopStatus, int arrivalMinutes, boolean hasEstimate) {
    if (!hasEstimate || Integer.valueOf(2).equals(stopStatus)) {
      return "delayed";
    }
    if (arrivalMinutes <= 1) {
      return "approaching";
    }
    return "on-time";
  }

  private String text(JsonNode row, String field, String fallback) {
    JsonNode value = row.path(field);
    if (value.isTextual()) {
      return value.asText();
    }
    if (value.isObject()) {
      String en = value.path("En").asText("");
      if (!en.isBlank()) {
        return en;
      }
      String zh = value.path("Zh_tw").asText("");
      if (!zh.isBlank()) {
        return zh;
      }
    }
    return fallback;
  }

  private String text(JsonNode row, String field, String fallback, String defaultValue) {
    String value = text(row, field, fallback);
    return value == null || value.isBlank() ? defaultValue : value;
  }

  private Integer integer(JsonNode row, String field, Integer fallback) {
    JsonNode value = row.path(field);
    if (value.isInt() || value.isLong()) {
      return value.asInt();
    }
    if (value.isTextual()) {
      try {
        return Integer.parseInt(value.asText());
      } catch (NumberFormatException ignored) {
        return fallback;
      }
    }
    return fallback;
  }

  public record MrtLiveBoardResponse(String source, String updatedAt, List<LiveBoardRow> rows) {}

  public record LiveBoardRow(
      String id,
      String stationId,
      String lineId,
      String direction,
      String destination,
      int arrivalMinutes,
      String status) {}
}
