package io.twfoundry.backend.ingestion.application.bus;

import java.util.List;

public record BusVehicleProjectionTimeline(
    String layerId,
    String projectionType,
    BusArchiveManifest.Source source,
    int intervalMinutes,
    String generatedAt,
    String latestSlotKey,
    List<SnapshotEntry> snapshots) {
  public BusVehicleProjectionTimeline {
    snapshots = snapshots == null ? List.of() : List.copyOf(snapshots);
  }

  public record SnapshotEntry(
      String slotKey,
      String captureDate,
      String capturedAt,
      String timeLabel,
      int intervalMinutes,
      int count,
      int routeCount,
      BusArchiveManifest.Bounds bounds) {}
}
