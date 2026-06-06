package io.twfoundry.backend.ingestion.application.bus;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

@Component
public class VehicleObservationNormalizer {
  public BusMapFeature toMapFeature(JsonNode row) {
    String vehicleId = text(row, "PlateNumb", "unknown");
    String routeUid = text(row, "RouteUID", "");
    String routeName = text(row, "RouteName", "unknown");

    return new BusMapFeature(
        "bus:" + vehicleId,
        number(row.path("BusPosition"), "PositionLon", 0),
        number(row.path("BusPosition"), "PositionLat", 0),
        vehicleId,
        routeUid,
        routeName,
        integer(row, "Direction", -1),
        number(row, "Speed", 0),
        number(row, "Azimuth", 0),
        text(row, "GPSTime", ""),
        text(row, "UpdateTime", ""),
        text(row, "freshness", "unknown"),
        number(row, "completeness", 0));
  }

  private String text(JsonNode row, String field, String fallback) {
    JsonNode value = row.path(field);
    return value.isTextual() ? value.asText() : fallback;
  }

  private int integer(JsonNode row, String field, int fallback) {
    JsonNode value = row.path(field);
    if (value.isInt() || value.isLong()) return value.asInt();
    if (!value.isTextual()) return fallback;
    try {
      return Integer.parseInt(value.asText());
    } catch (NumberFormatException ignored) {
      return fallback;
    }
  }

  private double number(JsonNode row, String field, double fallback) {
    JsonNode value = row.path(field);
    if (value.isNumber()) return value.asDouble();
    if (!value.isTextual()) return fallback;
    try {
      return Double.parseDouble(value.asText());
    } catch (NumberFormatException ignored) {
      return fallback;
    }
  }
}
