package io.twfoundry.backend.common.domain;

import java.time.Instant;

public record FactObservation(
    String entityId,
    String metric,
    Instant eventTime,
    String value,
    String sourceId,
    SourceMode sourceMode,
    int authorityRank,
    long revision,
    double confidence,
    Instant ingestedAt,
    String eventKey) {
  public FactObservation {
    require(entityId, "entityId");
    require(metric, "metric");
    require(value, "value");
    require(sourceId, "sourceId");
    require(eventKey, "eventKey");
    if (eventTime == null) {
      throw new IllegalArgumentException("eventTime must not be null.");
    }
    if (sourceMode == null) {
      throw new IllegalArgumentException("sourceMode must not be null.");
    }
    if (ingestedAt == null) {
      throw new IllegalArgumentException("ingestedAt must not be null.");
    }
    if (confidence < 0.0 || confidence > 1.0) {
      throw new IllegalArgumentException("confidence must be between 0.0 and 1.0.");
    }
  }

  public String factKey() {
    return "%s:%s:%s".formatted(entityId, metric, eventTime);
  }

  public boolean sameFactAs(FactObservation other) {
    return other != null
        && entityId.equals(other.entityId())
        && metric.equals(other.metric())
        && eventTime.equals(other.eventTime());
  }

  private static void require(String value, String field) {
    if (value == null || value.isBlank()) {
      throw new IllegalArgumentException(field + " must not be blank.");
    }
  }
}
