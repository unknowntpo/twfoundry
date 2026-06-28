package io.twfoundry.backend.streams.bus;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.io.InputStream;
import java.io.Serializable;
import java.io.UncheckedIOException;

/**
 * Shared bus anomaly-detection parameters loaded from the language-neutral contract
 * {@code contracts/bus-detection-rules.v1.json} (single source of truth, UNK-37).
 *
 * <p>The same JSON file is read by the ClickHouse batch publish script
 * {@code frontend/scripts/publish-clickhouse-bus-analytics.mjs}, so the speed layer
 * (this job) and the batch layer cannot drift on gap threshold, bunching ratio,
 * confirmation slots, route minutes, or the map-matching distance gate.
 *
 * <p>The contract is packaged onto the classpath via the Gradle resource directory
 * (see {@code backend/streams/build.gradle.kts}). {@link #DEFAULTS} is the canonical
 * in-process copy used as the source of the {@code DEFAULT_*} constants. Tests assert
 * the constants equal the on-disk contract so a contract edit that is not mirrored
 * here fails the build.
 */
public final class BusDetectionRules implements Serializable {
  /** Classpath location of the packaged contract. Matches the Gradle resource wiring. */
  public static final String CONTRACT_RESOURCE = "contracts/bus-detection-rules.v1.json";

  public static final String CONTRACT_SCHEMA = "twfoundry.contracts.bus_detection_rules.v1";

  private final double routeMinutes;
  private final double serviceGapMinutes;
  private final double bunchingProgressGapRatio;
  private final int bunchingConfirmationSlots;
  private final double maxDistanceToRouteMeters;

  public BusDetectionRules(
      double routeMinutes,
      double serviceGapMinutes,
      double bunchingProgressGapRatio,
      int bunchingConfirmationSlots,
      double maxDistanceToRouteMeters) {
    this.routeMinutes = routeMinutes;
    this.serviceGapMinutes = serviceGapMinutes;
    this.bunchingProgressGapRatio = bunchingProgressGapRatio;
    this.bunchingConfirmationSlots = bunchingConfirmationSlots;
    this.maxDistanceToRouteMeters = maxDistanceToRouteMeters;
  }

  /**
   * The contract values loaded from the packaged classpath resource at class-init time.
   * This is the canonical default set; the {@code DEFAULT_*} constants on
   * {@link BusRouteSentinelProcessor} and {@link BusRouteSentinelJob} delegate here.
   */
  public static final BusDetectionRules DEFAULTS = loadFromClasspath();

  static BusDetectionRules loadFromClasspath() {
    ClassLoader loader = BusDetectionRules.class.getClassLoader();
    try (InputStream in = loader.getResourceAsStream(CONTRACT_RESOURCE)) {
      if (in == null) {
        throw new IllegalStateException(
            "Missing detection-rule contract on classpath: " + CONTRACT_RESOURCE
                + " (check backend/streams/build.gradle.kts resource wiring)");
      }
      return parse(new ObjectMapper().readTree(in));
    } catch (IOException e) {
      throw new UncheckedIOException("Failed to read detection-rule contract " + CONTRACT_RESOURCE, e);
    }
  }

  static BusDetectionRules parse(JsonNode root) {
    String schema = root.path("schema").asText("");
    if (!CONTRACT_SCHEMA.equals(schema)) {
      throw new IllegalStateException(
          "Unexpected detection-rule contract schema: '" + schema + "', expected " + CONTRACT_SCHEMA);
    }
    JsonNode params = root.path("parameters");
    return new BusDetectionRules(
        required(params, "routeMinutes").asDouble(),
        required(params, "serviceGapMinutes").asDouble(),
        required(params, "bunchingProgressGapRatio").asDouble(),
        required(params, "bunchingConfirmationSlots").asInt(),
        required(params, "maxDistanceToRouteMeters").asDouble());
  }

  private static JsonNode required(JsonNode params, String name) {
    JsonNode node = params.get(name);
    if (node == null || node.isNull()) {
      throw new IllegalStateException("Detection-rule contract missing parameter: " + name);
    }
    return node;
  }

  public double routeMinutes() {
    return routeMinutes;
  }

  public double serviceGapMinutes() {
    return serviceGapMinutes;
  }

  public double bunchingProgressGapRatio() {
    return bunchingProgressGapRatio;
  }

  public int bunchingConfirmationSlots() {
    return bunchingConfirmationSlots;
  }

  public double maxDistanceToRouteMeters() {
    return maxDistanceToRouteMeters;
  }
}
