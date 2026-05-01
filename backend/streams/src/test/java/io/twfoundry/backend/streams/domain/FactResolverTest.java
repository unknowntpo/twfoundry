package io.twfoundry.backend.streams.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.twfoundry.backend.common.domain.FactObservation;
import io.twfoundry.backend.common.domain.FactResolution;
import io.twfoundry.backend.common.domain.FactResolutionAction;
import io.twfoundry.backend.common.domain.SourceMode;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class FactResolverTest {
  private final FactResolver resolver = new FactResolver();

  @Test
  void promotesHistoricalCorrectionWhenAuthorityIsHigherThanLiveStream() {
    FactObservation live =
        observation("180.12", SourceMode.LIVE_STREAM, 10, 1, 0.80, "2026-04-29T10:00:01Z", "live-1");
    FactObservation historical =
        observation(
            "180.08",
            SourceMode.HISTORICAL_SNAPSHOT,
            20,
            1,
            0.95,
            "2026-04-29T10:05:00Z",
            "hist-1");

    FactResolution resolution = resolver.resolve(Optional.of(live), historical);

    assertEquals(FactResolutionAction.PROMOTE_INCOMING, resolution.action());
    assertEquals("180.08", resolution.resolved().value());
    assertEquals("incoming source has higher authority", resolution.reason());
  }

  @Test
  void reportsConflictWhenEqualAuthorityAndRevisionProduceDifferentValues() {
    FactObservation current =
        observation("180.12", SourceMode.HISTORICAL_SNAPSHOT, 20, 2, 0.95, "2026-04-29T10:05:00Z", "hist-1");
    FactObservation incoming =
        observation("180.08", SourceMode.HISTORICAL_SNAPSHOT, 20, 2, 0.95, "2026-04-29T10:06:00Z", "hist-2");

    FactResolution resolution = resolver.resolve(Optional.of(current), incoming);

    assertEquals(FactResolutionAction.CONFLICT, resolution.action());
    assertEquals("180.12", resolution.resolved().value());
    assertTrue(resolution.conflict().isPresent());
    assertTrue(resolution.conflict().get().requiresReview());
  }

  @Test
  void keepsCurrentWhenIncomingAuthorityIsLower() {
    FactObservation official =
        observation(
            "arrived_BR11",
            SourceMode.HISTORICAL_SNAPSHOT,
            30,
            3,
            0.95,
            "2026-04-29T10:05:00Z",
            "official-1");
    FactObservation inferred =
        observation(
            "between_BR10_BR11",
            SourceMode.INFERRED_LIVE,
            5,
            4,
            0.70,
            "2026-04-29T10:05:10Z",
            "inferred-1");

    FactResolution resolution = resolver.resolve(Optional.of(official), inferred);

    assertEquals(FactResolutionAction.KEEP_CURRENT, resolution.action());
    assertEquals("arrived_BR11", resolution.resolved().value());
  }

  private FactObservation observation(
      String value,
      SourceMode mode,
      int authorityRank,
      long revision,
      double confidence,
      String ingestedAt,
      String eventKey) {
    return new FactObservation(
        "AAPL",
        "price",
        Instant.parse("2026-04-29T10:00:00Z"),
        value,
        "yahoo_finance",
        mode,
        authorityRank,
        revision,
        confidence,
        Instant.parse(ingestedAt),
        eventKey);
  }
}
