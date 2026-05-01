package io.twfoundry.backend.common.domain;

import java.util.Optional;

public record FactResolution(
    FactResolutionAction action,
    FactObservation resolved,
    Optional<FactConflict> conflict,
    String reason) {
  public FactResolution {
    if (action == null) {
      throw new IllegalArgumentException("action must not be null.");
    }
    if (resolved == null) {
      throw new IllegalArgumentException("resolved must not be null.");
    }
    conflict = conflict == null ? Optional.empty() : conflict;
    if (reason == null || reason.isBlank()) {
      throw new IllegalArgumentException("reason must not be blank.");
    }
  }
}
