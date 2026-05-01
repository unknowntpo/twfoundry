package io.twfoundry.backend.common.domain;

public record FactConflict(
    String factKey,
    FactObservation current,
    FactObservation incoming,
    String reason,
    boolean requiresReview) {}
