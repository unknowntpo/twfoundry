package io.twfoundry.backend.streams.bus;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.InputStream;
import org.junit.jupiter.api.Test;

/**
 * UNK-37 contract test: the Flink speed layer and the ClickHouse batch publish script must
 * read the SAME detection parameters from contracts/bus-detection-rules.v1.json. This asserts
 * the speed layer's compiled defaults equal the on-disk contract, so a contract edit that the
 * Java side fails to pick up — or a stray hardcoded constant — fails the build. The matching
 * batch-side assertion lives in frontend/tests/busDetectionRulesContract.test.mjs.
 */
class BusDetectionRulesContractTest {

  @Test
  void contractLoadsFromClasspath() {
    assertNotNull(BusDetectionRules.DEFAULTS, "contract must be packaged on the classpath");
  }

  @Test
  void speedLayerConstantsMatchContract() {
    BusDetectionRules rules = BusDetectionRules.DEFAULTS;
    // The processor/job defaults must delegate to the contract, never to inline magic numbers.
    assertEquals(rules.routeMinutes(), BusRouteSentinelProcessor.DEFAULT_ROUTE_MINUTES);
    assertEquals(rules.serviceGapMinutes(), BusRouteSentinelProcessor.DEFAULT_SERVICE_GAP_MINUTES);
    assertEquals(
        rules.bunchingProgressGapRatio(),
        BusRouteSentinelProcessor.DEFAULT_BUNCHING_PROGRESS_GAP_RATIO);
    assertEquals(
        rules.bunchingConfirmationSlots(),
        BusRouteSentinelProcessor.DEFAULT_BUNCHING_CONFIRMATION_SLOTS);
  }

  @Test
  void loadedValuesEqualRawContractFile() throws Exception {
    JsonNode params;
    try (InputStream in =
        getClass().getClassLoader().getResourceAsStream(BusDetectionRules.CONTRACT_RESOURCE)) {
      assertNotNull(in, "contract resource must exist: " + BusDetectionRules.CONTRACT_RESOURCE);
      params = new ObjectMapper().readTree(in).path("parameters");
    }
    BusDetectionRules rules = BusDetectionRules.DEFAULTS;
    assertEquals(params.get("routeMinutes").asDouble(), rules.routeMinutes());
    assertEquals(params.get("serviceGapMinutes").asDouble(), rules.serviceGapMinutes());
    assertEquals(
        params.get("bunchingProgressGapRatio").asDouble(), rules.bunchingProgressGapRatio());
    assertEquals(
        params.get("bunchingConfirmationSlots").asInt(), rules.bunchingConfirmationSlots());
    assertEquals(
        params.get("maxDistanceToRouteMeters").asDouble(), rules.maxDistanceToRouteMeters());
  }
}
