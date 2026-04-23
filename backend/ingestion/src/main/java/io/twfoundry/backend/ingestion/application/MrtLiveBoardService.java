package io.twfoundry.backend.ingestion.application;

import com.fasterxml.jackson.databind.JsonNode;
import io.twfoundry.backend.ingestion.infrastructure.tdx.TdxLiveBoardGateway;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class MrtLiveBoardService {
  private final TdxLiveBoardGateway gateway;
  private final MrtLiveBoardTimelineStore timelineStore;

  public MrtLiveBoardService(
      TdxLiveBoardGateway gateway, MrtLiveBoardTimelineStore timelineStore) {
    this.gateway = gateway;
    this.timelineStore = timelineStore;
  }

  public MrtLiveBoardResponse fetch(String operator, String stationId) {
    List<JsonNode> rows = gateway.fetchLiveBoard(operator, stationId);
    Instant updatedAt = Instant.now();
    List<LiveBoardRow> normalizedRows = rows.stream().map(row -> normalize(row, stationId)).toList();
    timelineStore.saveSnapshot("tdx", operator, updatedAt, normalizedRows);
    return new MrtLiveBoardResponse("tdx", updatedAt.toString(), normalizedRows);
  }

  public MrtLiveBoardTimelineResponse fetchTimeline(String operator, int limit) {
    return new MrtLiveBoardTimelineResponse("tdx", timelineStore.findRecentSnapshots(operator, limit));
  }

  private LiveBoardRow normalize(JsonNode row, String requestedStationId) {
    String stationId = text(row, "StationID", normalizeStationId(requestedStationId), "unknown");
    int estimateSeconds = integer(row, "EstimateTime", -1);
    boolean hasEstimate = estimateSeconds >= 0;
    int arrivalMinutes = hasEstimate ? Math.max(0, (int) Math.ceil(estimateSeconds / 60.0)) : 0;
    String lineId = resolveLineId(row);
    String destinationLabel =
        text(
            row,
            "DestinationStationName",
            text(row, "TripHeadSign", text(row, "DestinationStationID", "Unknown destination")));
    return new LiveBoardRow(
        "tdx-" + stationId + "-" + text(row, "DestinationStationID", "0"),
        text(row, "TrainNo", stationId + "-" + text(row, "DestinationStationID", "0")),
        stationId,
        localizedText(row, "StationName"),
        lineId,
        localizedText(row, "LineName"),
        normalizeDirection(text(row, "Direction", "")),
        destinationLabel,
        localizedText(row, "DestinationStationName", destinationLabel),
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
    String rawLineId = text(row, "LineID", "").toUpperCase();
    String stationId = text(row, "StationID", "").toUpperCase();
    String stationPrefix = stationId.replaceAll("[^A-Z]", "");
    String lineName = text(row, "LineName", "").toLowerCase();

    if ("BL".equals(rawLineId) || stationPrefix.startsWith("BL")) {
      return "blue";
    }
    if ("BR".equals(rawLineId) || stationPrefix.startsWith("BR")) {
      return "brown";
    }
    if ("G".equals(rawLineId) || stationPrefix.startsWith("G")) {
      return "green";
    }
    if ("O".equals(rawLineId) || stationPrefix.startsWith("O")) {
      return "orange";
    }
    if ("R".equals(rawLineId) || stationPrefix.startsWith("R")) {
      return "red";
    }
    if ("Y".equals(rawLineId) || stationPrefix.startsWith("Y")) {
      return "yellow";
    }
    if (lineName.contains("blue")) {
      return "blue";
    }
    if (lineName.contains("brown")) {
      return "brown";
    }
    if (lineName.contains("green")) {
      return "green";
    }
    if (lineName.contains("orange")) {
      return "orange";
    }
    if (lineName.contains("yellow")) {
      return "yellow";
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

  private LocalizedText localizedText(JsonNode row, String field) {
    return localizedText(row, field, null);
  }

  private LocalizedText localizedText(JsonNode row, String field, String fallback) {
    JsonNode value = row.path(field);
    if (value.isTextual()) {
      String text = value.asText();
      return text.isBlank() ? null : new LocalizedText(null, text);
    }
    if (value.isObject()) {
      String zh = value.path("Zh_tw").asText("");
      String en = value.path("En").asText("");
      if (zh.isBlank() && en.isBlank()) {
        return null;
      }
      return new LocalizedText(zh.isBlank() ? null : zh, en.isBlank() ? null : en);
    }
    return fallback == null || fallback.isBlank() ? null : new LocalizedText(null, fallback);
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

  public record MrtLiveBoardTimelineResponse(String source, List<MrtLiveBoardSnapshot> snapshots) {}

  public record MrtLiveBoardSnapshot(String updatedAt, List<LiveBoardRow> rows) {}

  public record LiveBoardRow(
      String id,
      String trainCode,
      String stationId,
      LocalizedText stationName,
      String lineId,
      LocalizedText lineName,
      String direction,
      String destination,
      LocalizedText destinationName,
      int arrivalMinutes,
      String status) {}

  public record LocalizedText(String Zh_tw, String En) {}
}
