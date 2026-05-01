package io.twfoundry.backend.common.domain;

import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

public final class RawArchivePartition {
  private static final DateTimeFormatter DATE = DateTimeFormatter.ISO_LOCAL_DATE.withZone(ZoneOffset.UTC);

  private RawArchivePartition() {}

  public static String pathFor(RawEnvelope<?> envelope) {
    if (envelope == null) {
      throw new IllegalArgumentException("envelope must not be null.");
    }
    return "raw_history/source_id=%s/dataset_id=%s/run_mode=%s/dt=%s"
        .formatted(
            require(envelope.source(), "source"),
            require(envelope.dataset(), "dataset"),
            envelope.runMode().name().toLowerCase(),
            DATE.format(envelope.observedAt()));
  }

  private static String require(String value, String field) {
    if (value == null || value.isBlank()) {
      throw new IllegalArgumentException(field + " must not be blank.");
    }
    return value;
  }
}
