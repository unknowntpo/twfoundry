package io.twfoundry.backend.ingestion.application.bus;

import java.util.List;

public record BusVehicleProjection(
    String layerId,
    String projectionType,
    String capturedAt,
    String timelineSlot,
    List<BusMapFeature> features,
    BusProjectionSummary summary) {
  public static final String LAYER_ID = "bus_vehicles";
  public static final String PROJECTION_TYPE = "vehicle_position_projection";

  public BusVehicleProjection {
    features = features == null ? List.of() : List.copyOf(features);
  }
}
