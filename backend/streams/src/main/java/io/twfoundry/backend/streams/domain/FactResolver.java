package io.twfoundry.backend.streams.domain;

import io.twfoundry.backend.common.domain.FactConflict;
import io.twfoundry.backend.common.domain.FactObservation;
import io.twfoundry.backend.common.domain.FactResolution;
import io.twfoundry.backend.common.domain.FactResolutionAction;
import java.util.Optional;

public final class FactResolver {
  public FactResolution resolve(Optional<FactObservation> current, FactObservation incoming) {
    if (incoming == null) {
      throw new IllegalArgumentException("incoming must not be null.");
    }
    if (current == null || current.isEmpty()) {
      return promote(incoming, "no current resolved fact exists");
    }

    FactObservation existing = current.get();
    if (!incoming.sameFactAs(existing)) {
      throw new IllegalArgumentException("Cannot resolve observations for different facts.");
    }

    if (incoming.authorityRank() > existing.authorityRank()) {
      return promote(incoming, "incoming source has higher authority");
    }
    if (incoming.authorityRank() < existing.authorityRank()) {
      return keep(existing, "current source has higher authority");
    }

    if (incoming.revision() > existing.revision()) {
      return promote(incoming, "incoming revision is newer");
    }
    if (incoming.revision() < existing.revision()) {
      return keep(existing, "current revision is newer");
    }

    if (!incoming.value().equals(existing.value())) {
      FactConflict conflict =
          new FactConflict(
              existing.factKey(),
              existing,
              incoming,
              "same authority and revision produced different values",
              true);
      return new FactResolution(FactResolutionAction.CONFLICT, existing, Optional.of(conflict), conflict.reason());
    }

    if (incoming.confidence() > existing.confidence()) {
      return promote(incoming, "incoming confidence is higher for the same value");
    }
    if (incoming.confidence() < existing.confidence()) {
      return keep(existing, "current confidence is higher for the same value");
    }

    if (incoming.ingestedAt().isAfter(existing.ingestedAt())) {
      return promote(incoming, "incoming ingest timestamp is newer for the same value");
    }

    return keep(existing, "current fact wins deterministic tie-break");
  }

  private FactResolution promote(FactObservation incoming, String reason) {
    return new FactResolution(FactResolutionAction.PROMOTE_INCOMING, incoming, Optional.empty(), reason);
  }

  private FactResolution keep(FactObservation current, String reason) {
    return new FactResolution(FactResolutionAction.KEEP_CURRENT, current, Optional.empty(), reason);
  }
}
