package io.twfoundry.backend.streams.bus;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class BusRouteSentinelProcessorTest {
  private final BusRouteSentinelProcessor processor = new BusRouteSentinelProcessor(
      48.0,
      14.0,
      0.04,
      2,
      Clock.fixed(Instant.parse("2026-06-22T09:00:00Z"), ZoneOffset.UTC)
  );

  @Test
  void emitsServiceGapForLargeAdjacentProgressGap() {
    BusRouteSentinelProcessor.ProcessResult result = processor.processSlot(
        List.of(obs("A", 0.10), obs("B", 0.50)),
        Map.of()
    );

    assertEquals(1, result.signals().size());
    BusRouteSignal signal = result.signals().getFirst();
    assertEquals("suspected_gap", signal.type());
    assertEquals(19.2, signal.headwayMinutesEstimated(), 0.01);
    assertEquals("2026-06-22T09:00:00Z", signal.detectedAt());
  }

  @Test
  void confirmsBunchingOnlyAfterConsecutiveSlots() {
    BusRouteSentinelProcessor.ProcessResult first = processor.processSlot(
        List.of(obs("A", 0.10), obs("B", 0.12)),
        Map.of()
    );
    assertTrue(first.signals().isEmpty());

    BusRouteSentinelProcessor.ProcessResult second = processor.processSlot(
        List.of(obs("A", 0.11), obs("B", 0.13)),
        first.bunchingStreaks()
    );
    assertEquals(1, second.signals().size());
    assertEquals("suspected_bunching", second.signals().getFirst().type());
  }

  @Test
  void resetsBunchingStreakWhenPairSeparates() {
    BusRouteSentinelProcessor.ProcessResult first = processor.processSlot(
        List.of(obs("A", 0.10), obs("B", 0.12)),
        Map.of()
    );
    BusRouteSentinelProcessor.ProcessResult second = processor.processSlot(
        List.of(obs("A", 0.10), obs("B", 0.30)),
        first.bunchingStreaks()
    );

    assertTrue(second.bunchingStreaks().isEmpty());
    assertTrue(second.signals().stream().noneMatch(signal -> signal.type().equals("suspected_bunching")));
  }

  private static EnrichedBusVehicleObservation obs(String vehicleId, double progressRatio) {
    return new EnrichedBusVehicleObservation(
        "2026-06-22T17:00+08:00",
        "2026-06-22",
        "TPE-1",
        "1",
        0,
        vehicleId,
        121.0,
        25.0,
        progressRatio,
        10.0,
        20.0,
        "2026-06-22T08:59:00Z",
        "2026-06-22T08:59:10Z"
    );
  }
}
