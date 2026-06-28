package io.twfoundry.backend.streams.bus;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.nio.file.Path;
import java.util.Optional;
import org.apache.flink.api.common.eventtime.WatermarkStrategy;
import org.apache.flink.api.common.serialization.SimpleStringSchema;
import org.apache.flink.connector.base.DeliveryGuarantee;
import org.apache.flink.connector.kafka.sink.KafkaRecordSerializationSchema;
import org.apache.flink.connector.kafka.sink.KafkaSink;
import org.apache.flink.connector.kafka.source.KafkaSource;
import org.apache.flink.connector.kafka.source.enumerator.initializer.OffsetsInitializer;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class BusRouteSentinelJob {
  private static final Logger LOG = LoggerFactory.getLogger(BusRouteSentinelJob.class);
  private static final String DEFAULT_INPUT_TOPIC = "normalized.tdx.bus_vehicle_position";
  private static final String DEFAULT_OUTPUT_TOPIC = "online.tdx.bus_route_signal";
  // Sourced from the shared detection-rule contract (contracts/bus-detection-rules.v1.json),
  // the same file the ClickHouse batch publish script reads, so the map-matching distance
  // gate cannot drift between speed and batch layers (UNK-37).
  private static final double DEFAULT_MAX_DISTANCE_TO_ROUTE_METERS =
      BusDetectionRules.DEFAULTS.maxDistanceToRouteMeters();

  // Static so the map lambdas reference it via getstatic instead of capturing it.
  // ObjectMapper's JavaTimeModule holds a non-serializable DateTimeFormatter, and a
  // captured (or bound-method-ref) mapper makes Flink's ClosureCleaner fail to serialize
  // the operator at job-submit time.
  private static final ObjectMapper MAPPER = new ObjectMapper().registerModule(new JavaTimeModule());

  private BusRouteSentinelJob() {}

  public static void main(String[] args) throws Exception {
    BusRouteSentinelConfig config = BusRouteSentinelConfig.fromEnv();
    RouteGeometryIndex geometryIndex = RouteGeometryIndex.loadFromRouteContextDirectory(Path.of(config.routeContextDirectory()));
    LOG.info("starting bus-route-sentinel: brokers={} input={} output={} group={} startingOffsets={} routeContextDir={} routeShapes={}",
        config.kafkaBrokers(), config.inputTopic(), config.outputTopic(), config.consumerGroup(),
        config.startingOffsets(), config.routeContextDirectory(), geometryIndex.size());

    StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
    // Speed layer is ephemeral live-alerting: it reads from the stream tip and emits transient
    // signals. Durable/replayable history is the batch layer's job (Lambda architecture), so by
    // default we do NOT checkpoint. Checkpointing the operator state here forced Kryo's
    // FieldSerializer onto our Java `record` state types (EnrichedBusVehicleObservation), which
    // throws "can't get field offset on a record class" every checkpoint -> the job restart-looped
    // and re-emitted the backlog (millions of duplicate signals). Enable only with a >0 interval
    // once the state types are real Flink POJOs.
    boolean checkpointing = config.checkpointIntervalMillis() > 0;
    if (checkpointing) {
      env.enableCheckpointing(config.checkpointIntervalMillis());
      env.getCheckpointConfig().setCheckpointStorage(config.checkpointDirectory());
    }

    KafkaSource<String> source = KafkaSource.<String>builder()
        .setBootstrapServers(config.kafkaBrokers())
        .setTopics(config.inputTopic())
        .setGroupId(config.consumerGroup())
        .setStartingOffsets(startingOffsets(config.startingOffsets()))
        .setValueOnlyDeserializer(new SimpleStringSchema())
        .build();

    KafkaSink<String> sink = KafkaSink.<String>builder()
        .setBootstrapServers(config.kafkaBrokers())
        .setRecordSerializer(KafkaRecordSerializationSchema.builder()
            .setTopic(config.outputTopic())
            .setValueSerializationSchema(new SimpleStringSchema())
            .build())
        .setDeliveryGuarantee(checkpointing ? DeliveryGuarantee.AT_LEAST_ONCE : DeliveryGuarantee.NONE)
        .build();

    DataStream<String> rawPositions =
        env.fromSource(source, WatermarkStrategy.noWatermarks(), "normalized-bus-positions");

    BusRouteSentinelProcessor processor = new BusRouteSentinelProcessor(
        config.routeMinutes(),
        config.serviceGapMinutes(),
        config.bunchingProgressGapRatio(),
        config.bunchingConfirmationSlots(),
        java.time.Clock.systemUTC());

    buildSignalStream(rawPositions, geometryIndex, config.maxDistanceToRouteMeters(), processor)
        .sinkTo(sink)
        .name("online-bus-route-signal-kafka");

    env.execute("twfoundry-bus-route-sentinel");
  }

  /**
   * Builds the bus-route-sentinel transform chain from raw normalized-position JSON to
   * serialized signal JSON. Kept separate from {@link #main} so a local test can exercise
   * Flink's ClosureCleaner (which runs as each operator is added) without a Kafka cluster.
   *
   * <p>Every object captured by the lambdas/functions here must be serializable: {@code MAPPER}
   * is a static field (referenced, not captured), {@code maxDistanceToRouteMeters} is a primitive,
   * {@code geometryIndex} is {@link RouteGeometryIndex} (Serializable), and {@code processor} is
   * {@link BusRouteSentinelProcessor} (Serializable).
   */
  public static DataStream<String> buildSignalStream(
      DataStream<String> rawPositions,
      RouteGeometryIndex geometryIndex,
      double maxDistanceToRouteMeters,
      BusRouteSentinelProcessor processor) {
    return rawPositions
        .map(value -> MAPPER.readValue(value, NormalizedBusVehiclePosition.class))
        .filter(NormalizedBusVehiclePosition::hasRequiredPosition)
        .flatMap((NormalizedBusVehiclePosition position, org.apache.flink.util.Collector<EnrichedBusVehicleObservation> out) -> {
          Optional<EnrichedBusVehicleObservation> enriched = geometryIndex.enrich(position, maxDistanceToRouteMeters);
          enriched.ifPresent(out::collect);
        })
        .returns(EnrichedBusVehicleObservation.class)
        .keyBy(EnrichedBusVehicleObservation::routeDirectionKey)
        .process(new BusRouteSentinelFunction(processor))
        .name("bus-route-sentinel")
        .map(value -> MAPPER.writeValueAsString(value))
        .name("online-bus-route-signal-json");
  }

  /** Maps BUS_SENTINEL_STARTING_OFFSETS (earliest|latest|committed) to a Flink initializer. */
  static OffsetsInitializer startingOffsets(String mode) {
    return switch (mode == null ? "latest" : mode.trim().toLowerCase()) {
      case "earliest" -> OffsetsInitializer.earliest();
      case "committed" -> OffsetsInitializer.committedOffsets(
          org.apache.kafka.clients.consumer.OffsetResetStrategy.EARLIEST);
      default -> OffsetsInitializer.latest();
    };
  }

  public record BusRouteSentinelConfig(
      String kafkaBrokers,
      String inputTopic,
      String outputTopic,
      String consumerGroup,
      String startingOffsets,
      String routeContextDirectory,
      double maxDistanceToRouteMeters,
      double routeMinutes,
      double serviceGapMinutes,
      double bunchingProgressGapRatio,
      int bunchingConfirmationSlots,
      long checkpointIntervalMillis,
      String checkpointDirectory
  ) {
    public static BusRouteSentinelConfig fromEnv() {
      return new BusRouteSentinelConfig(
          env("KAFKA_BROKERS", "localhost:9092"),
          env("BUS_SENTINEL_INPUT_TOPIC", DEFAULT_INPUT_TOPIC),
          env("BUS_SENTINEL_OUTPUT_TOPIC", DEFAULT_OUTPUT_TOPIC),
          env("BUS_SENTINEL_GROUP_ID", "bus-route-sentinel"),
          env("BUS_SENTINEL_STARTING_OFFSETS", "latest"),
          env("BUS_ROUTE_CONTEXT_DIR", "frontend/public/data/tdx-bus/route-context"),
          doubleEnv("BUS_SENTINEL_MAX_DISTANCE_TO_ROUTE_METERS", DEFAULT_MAX_DISTANCE_TO_ROUTE_METERS),
          doubleEnv("BUS_SENTINEL_ROUTE_MINUTES", BusRouteSentinelProcessor.DEFAULT_ROUTE_MINUTES),
          doubleEnv("BUS_SENTINEL_SERVICE_GAP_MINUTES", BusRouteSentinelProcessor.DEFAULT_SERVICE_GAP_MINUTES),
          doubleEnv("BUS_SENTINEL_BUNCHING_PROGRESS_GAP_RATIO", BusRouteSentinelProcessor.DEFAULT_BUNCHING_PROGRESS_GAP_RATIO),
          intEnv("BUS_SENTINEL_BUNCHING_CONFIRMATION_SLOTS", BusRouteSentinelProcessor.DEFAULT_BUNCHING_CONFIRMATION_SLOTS),
          longEnv("BUS_SENTINEL_CHECKPOINT_INTERVAL_MS", 0L),
          env("BUS_SENTINEL_CHECKPOINT_DIR", "file:///flink-checkpoints/bus-route-sentinel")
      );
    }

    private static String env(String key, String fallback) {
      String value = System.getenv(key);
      return value == null || value.isBlank() ? fallback : value;
    }

    private static double doubleEnv(String key, double fallback) {
      String value = System.getenv(key);
      if (value == null || value.isBlank()) return fallback;
      return Double.parseDouble(value);
    }

    private static int intEnv(String key, int fallback) {
      String value = System.getenv(key);
      if (value == null || value.isBlank()) return fallback;
      return Integer.parseInt(value);
    }

    private static long longEnv(String key, long fallback) {
      String value = System.getenv(key);
      if (value == null || value.isBlank()) return fallback;
      return Long.parseLong(value);
    }
  }
}
