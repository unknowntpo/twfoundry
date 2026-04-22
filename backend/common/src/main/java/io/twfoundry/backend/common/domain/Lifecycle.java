package io.twfoundry.backend.common.domain;

public interface Lifecycle {
  default void initialize() {}

  default void shutdown() {}
}
