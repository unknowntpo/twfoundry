package io.twfoundry.backend.streams.bus;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;

/**
 * Diagnostic (not a strict assertion): runs the real RouteGeometryIndex + processor over a dump of
 * real Kafka messages to confirm the live pipeline will actually emit signals, and to see the
 * enrichment/detection yield. Skipped when /tmp/real-slot.jsonl is absent (e.g. in CI).
 *
 * Dump with:
 *   kubectl exec ... kafka-console-consumer --topic normalized.tdx.bus_vehicle_position \
 *     --from-beginning --max-messages 2500 > /tmp/real-slot.jsonl
 */
class RealSlotDetectionDiagnosticTest {

  @Test
  void reportEnrichmentAndDetectionYieldOnRealSlot() throws Exception {
    Path dump = Path.of("/tmp/real-slot.jsonl");
    Assumptions.assumeTrue(Files.isRegularFile(dump), "no /tmp/real-slot.jsonl dump present");

    RouteGeometryIndex index = RouteGeometryIndex.loadFromRouteContextDirectory(
        Path.of("../../frontend/public/data/tdx-bus/route-context"));
    BusRouteSentinelProcessor processor = new BusRouteSentinelProcessor();
    ObjectMapper mapper = new ObjectMapper().registerModule(new JavaTimeModule());

    // group enriched observations by slot then by route-direction key
    Map<String, Map<String, List<EnrichedBusVehicleObservation>>> bySlotThenKey = new LinkedHashMap<>();
    int total = 0;
    int enriched = 0;
    for (String line : Files.readAllLines(dump)) {
      if (line.isBlank()) continue;
      total++;
      NormalizedBusVehiclePosition pos = mapper.readValue(line, NormalizedBusVehiclePosition.class);
      if (!pos.hasRequiredPosition()) continue;
      var e = index.enrich(pos, 120.0);
      if (e.isEmpty()) continue;
      enriched++;
      EnrichedBusVehicleObservation obs = e.get();
      bySlotThenKey
          .computeIfAbsent(obs.slotKey(), k -> new HashMap<>())
          .computeIfAbsent(obs.routeDirectionKey(), k -> new ArrayList<>())
          .add(obs);
    }

    int gapSignals = 0;
    int bunchingSignals = 0;
    Map<String, Integer> streaks = new HashMap<>();
    List<String> sampleSignals = new ArrayList<>();
    // simulate two consecutive slots so bunching streaks can confirm
    for (var slotEntry : bySlotThenKey.entrySet()) {
      for (var keyEntry : slotEntry.getValue().entrySet()) {
        var result = processor.processSlot(keyEntry.getValue(), streaks);
        for (var s : result.bunchingStreaks().entrySet()) streaks.put(s.getKey(), s.getValue());
        for (BusRouteSignal sig : result.signals()) {
          if ("suspected_gap".equals(sig.type())) gapSignals++;
          else bunchingSignals++;
          if (sampleSignals.size() < 8) {
            sampleSignals.add(sig.type() + " route=" + sig.routeName() + " slot=" + sig.slotKey());
          }
        }
      }
    }

    System.out.println("=== REAL SLOT DETECTION DIAGNOSTIC ===");
    System.out.println("messages=" + total + " enriched=" + enriched
        + " (" + (total == 0 ? 0 : enriched * 100 / total) + "%)");
    System.out.println("slots=" + bySlotThenKey.size());
    System.out.println("gapSignals=" + gapSignals + " bunchingSignals=" + bunchingSignals);
    sampleSignals.forEach(s -> System.out.println("  " + s));
  }
}
