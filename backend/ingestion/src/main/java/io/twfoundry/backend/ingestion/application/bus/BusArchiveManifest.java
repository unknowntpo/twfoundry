package io.twfoundry.backend.ingestion.application.bus;

import java.util.List;

public record BusArchiveManifest(
    String schema,
    Source source,
    int intervalMinutes,
    String generatedAt,
    String latestSlotKey,
    List<SnapshotEntry> snapshots) {
  public BusArchiveManifest {
    snapshots = snapshots == null ? List.of() : List.copyOf(snapshots);
  }

  public record Source(String provider, String dataset, String city, String mode) {}

  public record SnapshotEntry(
      String slotKey,
      String captureDate,
      String capturedAt,
      String timeLabel,
      int intervalMinutes,
      String path,
      int count,
      int routeCount,
      Bounds bounds) {}

  public record Bounds(double minLat, double maxLat, double minLon, double maxLon) {}
}
