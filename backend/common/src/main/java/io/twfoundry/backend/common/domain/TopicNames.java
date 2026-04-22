package io.twfoundry.backend.common.domain;

public final class TopicNames {
  private TopicNames() {}

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
}
