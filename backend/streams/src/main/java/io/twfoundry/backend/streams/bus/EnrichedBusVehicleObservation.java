package io.twfoundry.backend.streams.bus;

import java.io.Serializable;

public record EnrichedBusVehicleObservation(
    String slotKey,
    String serviceDate,
    String routeUid,
    String routeName,
    int direction,
    String vehicleId,
    double longitude,
    double latitude,
    double progressRatio,
    double distanceToRouteMeters,
    Double speedKph,
    String gpsTime,
    String updateTime
) implements Serializable {
  public String routeDirectionKey() {
    return routeUid + "|" + direction;
  }
}
