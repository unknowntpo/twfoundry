package io.twfoundry.backend.streams.bus;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.io.Serializable;
import java.util.List;

public record BusRouteSignal(
    String schema,
    String type,
    @JsonProperty("route_uid") String routeUid,
    @JsonProperty("route_name") String routeName,
    int direction,
    @JsonProperty("slot_key") String slotKey,
    @JsonProperty("service_date") String serviceDate,
    @JsonProperty("trailing_vehicle_id") String trailingVehicleId,
    @JsonProperty("leading_vehicle_id") String leadingVehicleId,
    @JsonProperty("trailing_progress") double trailingProgress,
    @JsonProperty("leading_progress") double leadingProgress,
    @JsonProperty("progress_gap_ratio") double progressGapRatio,
    @JsonProperty("headway_min_est") double headwayMinutesEstimated,
    String state,
    @JsonProperty("detected_at") String detectedAt,
    @JsonProperty("source") String source,
    @JsonProperty("evidence_vehicle_ids") List<String> evidenceVehicleIds
) implements Serializable {
  public static final String SCHEMA = "twfoundry.online.tdx.bus_route_signal.v1";

  public static BusRouteSignal of(
      String type,
      EnrichedBusVehicleObservation trailing,
      EnrichedBusVehicleObservation leading,
      double routeMinutes,
      String detectedAt
  ) {
    double gapRatio = leading.progressRatio() - trailing.progressRatio();
    return new BusRouteSignal(
        SCHEMA,
        type,
        trailing.routeUid(),
        trailing.routeName(),
        trailing.direction(),
        trailing.slotKey(),
        trailing.serviceDate(),
        trailing.vehicleId(),
        leading.vehicleId(),
        round4(trailing.progressRatio()),
        round4(leading.progressRatio()),
        round4(gapRatio),
        round1(gapRatio * routeMinutes),
        "ongoing",
        detectedAt,
        "flink-speed-layer",
        List.of(trailing.vehicleId(), leading.vehicleId())
    );
  }

  private static double round1(double value) {
    return Math.round(value * 10.0) / 10.0;
  }

  private static double round4(double value) {
    return Math.round(value * 10_000.0) / 10_000.0;
  }
}
