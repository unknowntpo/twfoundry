package io.twfoundry.backend.streams.bus;

import java.io.Serializable;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

// Serializable because BusRouteSentinelFunction holds it as a non-transient field
// and Flink serializes the operator at job-submit time. All fields are primitives
// or a Serializable Clock.
public final class BusRouteSentinelProcessor implements Serializable {
  public static final double DEFAULT_ROUTE_MINUTES = 48.0;
  public static final double DEFAULT_SERVICE_GAP_MINUTES = 14.0;
  public static final double DEFAULT_BUNCHING_PROGRESS_GAP_RATIO = 0.04;
  public static final int DEFAULT_BUNCHING_CONFIRMATION_SLOTS = 2;

  private final double routeMinutes;
  private final double serviceGapMinutes;
  private final double bunchingProgressGapRatio;
  private final int bunchingConfirmationSlots;
  private final Clock clock;

  public BusRouteSentinelProcessor() {
    this(
        DEFAULT_ROUTE_MINUTES,
        DEFAULT_SERVICE_GAP_MINUTES,
        DEFAULT_BUNCHING_PROGRESS_GAP_RATIO,
        DEFAULT_BUNCHING_CONFIRMATION_SLOTS,
        Clock.systemUTC()
    );
  }

  public BusRouteSentinelProcessor(
      double routeMinutes,
      double serviceGapMinutes,
      double bunchingProgressGapRatio,
      int bunchingConfirmationSlots,
      Clock clock
  ) {
    this.routeMinutes = routeMinutes;
    this.serviceGapMinutes = serviceGapMinutes;
    this.bunchingProgressGapRatio = bunchingProgressGapRatio;
    this.bunchingConfirmationSlots = Math.max(1, bunchingConfirmationSlots);
    this.clock = clock;
  }

  public ProcessResult processSlot(
      List<EnrichedBusVehicleObservation> observations,
      Map<String, Integer> priorBunchingStreaks
  ) {
    if (observations == null || observations.size() < 2) {
      return new ProcessResult(List.of(), Map.of());
    }

    List<EnrichedBusVehicleObservation> sorted = observations.stream()
        .sorted(Comparator.comparingDouble(EnrichedBusVehicleObservation::progressRatio))
        .toList();
    Map<String, Integer> nextStreaks = new HashMap<>();
    List<BusRouteSignal> signals = new ArrayList<>();
    String detectedAt = Instant.now(clock).toString();

    for (int index = 0; index < sorted.size() - 1; index += 1) {
      EnrichedBusVehicleObservation trailing = sorted.get(index);
      EnrichedBusVehicleObservation leading = sorted.get(index + 1);
      double progressGap = leading.progressRatio() - trailing.progressRatio();
      double headwayMinutes = progressGap * routeMinutes;

      if (headwayMinutes >= serviceGapMinutes) {
        signals.add(BusRouteSignal.of("suspected_gap", trailing, leading, routeMinutes, detectedAt));
      }

      if (progressGap <= bunchingProgressGapRatio) {
        String pairKey = pairKey(trailing, leading);
        int streak = priorBunchingStreaks.getOrDefault(pairKey, 0) + 1;
        nextStreaks.put(pairKey, streak);
        if (streak >= bunchingConfirmationSlots) {
          signals.add(BusRouteSignal.of("suspected_bunching", trailing, leading, routeMinutes, detectedAt));
        }
      }
    }

    return new ProcessResult(signals, nextStreaks);
  }

  public record ProcessResult(List<BusRouteSignal> signals, Map<String, Integer> bunchingStreaks) {}

  private static String pairKey(EnrichedBusVehicleObservation trailing, EnrichedBusVehicleObservation leading) {
    return trailing.routeUid()
        + "|"
        + trailing.direction()
        + "|"
        + trailing.vehicleId()
        + "|"
        + leading.vehicleId();
  }
}
