package io.twfoundry.backend.ingestion.application.bus;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;

public record BusSnapshot(
    String schema,
    BusArchiveManifest.Source source,
    String captureDate,
    String capturedAt,
    Slot slot,
    int count,
    int routeCount,
    BusArchiveManifest.Bounds bounds,
    List<JsonNode> records) {
  public BusSnapshot {
    records = records == null ? List.of() : List.copyOf(records);
  }

  public record Slot(
      String key,
      String date,
      String timeLabel,
      int intervalMinutes,
      String timeZone) {}
}
