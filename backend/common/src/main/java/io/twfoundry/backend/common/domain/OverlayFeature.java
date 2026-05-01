package io.twfoundry.backend.common.domain;

import java.time.Instant;
import java.util.Map;

public record OverlayFeature(
    String featureId,
    String objectRef,
    String layerId,
    String geometryJson,
    Instant validAt,
    Map<String, String> properties) {
  public OverlayFeature {
    require(featureId, "featureId");
    require(objectRef, "objectRef");
    require(layerId, "layerId");
    require(geometryJson, "geometryJson");
    if (validAt == null) {
      throw new IllegalArgumentException("validAt must not be null.");
    }
    properties = properties == null ? Map.of() : Map.copyOf(properties);
  }

  private static void require(String value, String field) {
    if (value == null || value.isBlank()) {
      throw new IllegalArgumentException(field + " must not be blank.");
    }
  }
}
