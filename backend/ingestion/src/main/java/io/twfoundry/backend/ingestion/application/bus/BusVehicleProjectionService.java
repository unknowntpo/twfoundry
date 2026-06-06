package io.twfoundry.backend.ingestion.application.bus;

import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class BusVehicleProjectionService {
  private final BusArchiveGateway archiveGateway;
  private final VehicleObservationNormalizer normalizer;

  public BusVehicleProjectionService(
      BusArchiveGateway archiveGateway, VehicleObservationNormalizer normalizer) {
    this.archiveGateway = archiveGateway;
    this.normalizer = normalizer;
  }

  public BusVehicleProjection buildProjection(String slot) {
    BusArchiveManifest manifest = archiveGateway.loadManifest();
    BusArchiveManifest.SnapshotEntry entry = selectSnapshot(manifest, slot);
    BusSnapshot snapshot = archiveGateway.loadSnapshot(entry.path());
    List<BusMapFeature> features =
        snapshot.records().stream().map(normalizer::toMapFeature).toList();

    return new BusVehicleProjection(
        BusVehicleProjection.LAYER_ID,
        BusVehicleProjection.PROJECTION_TYPE,
        snapshot.capturedAt(),
        snapshot.slot() == null ? entry.timeLabel() : snapshot.slot().timeLabel(),
        features,
        summarize(features));
  }

  public BusVehicleProjectionTimeline buildTimeline() {
    BusArchiveManifest manifest = archiveGateway.loadManifest();
    return new BusVehicleProjectionTimeline(
        BusVehicleProjection.LAYER_ID,
        BusVehicleProjection.PROJECTION_TYPE,
        manifest.source(),
        manifest.intervalMinutes(),
        manifest.generatedAt(),
        manifest.latestSlotKey(),
        manifest.snapshots().stream()
            .map(
                entry ->
                    new BusVehicleProjectionTimeline.SnapshotEntry(
                        entry.slotKey(),
                        entry.captureDate(),
                        entry.capturedAt(),
                        entry.timeLabel(),
                        entry.intervalMinutes(),
                        entry.count(),
                        entry.routeCount(),
                        entry.bounds()))
            .toList());
  }

  private BusArchiveManifest.SnapshotEntry selectSnapshot(BusArchiveManifest manifest, String slot) {
    if (manifest.snapshots().isEmpty()) {
      throw new IllegalArgumentException("Bus archive manifest has no snapshots.");
    }

    String requestedSlot = slot == null || slot.isBlank() ? "latest" : slot.trim();
    if ("latest".equalsIgnoreCase(requestedSlot)) {
      return manifest.snapshots().stream()
          .filter(entry -> entry.slotKey().equals(manifest.latestSlotKey()))
          .findFirst()
          .orElseGet(
              () ->
                  manifest.snapshots().stream()
                      .max(Comparator.comparing(BusArchiveManifest.SnapshotEntry::capturedAt))
                      .orElseThrow());
    }

    String normalizedSlot = requestedSlot.replace(':', '-');
    return manifest.snapshots().stream()
        .filter(
            entry ->
                requestedSlot.equals(entry.slotKey())
                    || requestedSlot.equals(entry.timeLabel())
                    || normalizedSlot.equals(entry.timeLabel().replace(':', '-')))
        .findFirst()
        .orElseThrow(
            () -> new IllegalArgumentException("Unknown bus archive slot: " + requestedSlot));
  }

  private BusProjectionSummary summarize(List<BusMapFeature> features) {
    int vehicleCount = features.size();
    int routeCount =
        (int) features.stream().map(BusMapFeature::routeName).filter(value -> !value.isBlank()).distinct().count();
    int freshCount = (int) features.stream().filter(feature -> "fresh".equals(feature.freshness())).count();
    int staleCount = (int) features.stream().filter(feature -> "stale".equals(feature.freshness())).count();
    double averageCompleteness =
        features.stream().mapToDouble(BusMapFeature::completeness).average().orElse(0);

    return new BusProjectionSummary(
        vehicleCount, routeCount, freshCount, staleCount, averageCompleteness);
  }
}
