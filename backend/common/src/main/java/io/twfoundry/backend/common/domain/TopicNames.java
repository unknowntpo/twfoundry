package io.twfoundry.backend.common.domain;

public final class TopicNames {
  private TopicNames() {}

  public static final String DEFAULT_VERSION = "v1";

  public static String raw(String domain, String source, String dataset) {
    return "raw.%s.%s.%s".formatted(domain, source, dataset);
  }

  public static String normalized(String domain, String entity) {
    return "normalized.%s.%s".formatted(domain, entity);
  }

  public static String state(String domain, String entity) {
    return "state.%s.%s".formatted(domain, entity);
  }

  public static String deadLetter(String domain, String source, String dataset) {
    return "dlq.%s.%s.%s".formatted(domain, source, dataset);
  }

  public static String sourceRaw(String source, String dataset) {
    return sourceRaw(source, dataset, DEFAULT_VERSION);
  }

  public static String sourceRaw(String source, String dataset, String version) {
    return "source.%s.%s.raw.%s".formatted(requireToken(source), requireToken(dataset), requireToken(version));
  }

  public static String sourceReplayRaw(String source, String dataset, String runId) {
    return "source.%s.%s.raw.replay.%s"
        .formatted(requireToken(source), requireToken(dataset), requireToken(runId));
  }

  public static String observations(String observationType) {
    return observations(observationType, DEFAULT_VERSION);
  }

  public static String observations(String observationType, String version) {
    return "twf.observations.%s.%s".formatted(requireToken(observationType), requireToken(version));
  }

  public static String overlayEvents() {
    return overlayEvents(DEFAULT_VERSION);
  }

  public static String overlayEvents(String version) {
    return "twf.overlay.events.%s".formatted(requireToken(version));
  }

  public static String auditEvents() {
    return auditEvents(DEFAULT_VERSION);
  }

  public static String auditEvents(String version) {
    return "twf.audit.events.%s".formatted(requireToken(version));
  }

  private static String requireToken(String value) {
    if (value == null || value.isBlank()) {
      throw new IllegalArgumentException("Topic name token must not be blank.");
    }
    if (!value.matches("[a-zA-Z0-9_-]+")) {
      throw new IllegalArgumentException("Topic name token contains unsupported characters: " + value);
    }
    return value;
  }
}
