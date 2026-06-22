package io.twfoundry.backend.streams.bus;

import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.time.Clock;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.junit.jupiter.api.Test;

/**
 * Builds the sentinel transform graph in a local environment. Flink's ClosureCleaner runs as each
 * operator is added, so this fails fast on any non-serializable captured object (ObjectMapper,
 * config record, processor, ...) without needing a Kafka cluster. This is the local guard against
 * the class of NotSerializableException failures that only surface at job-submit runtime.
 */
class BusRouteSentinelJobGraphTest {

  @Test
  void buildSignalStreamHasNoNonSerializableClosures() {
    StreamExecutionEnvironment env = StreamExecutionEnvironment.createLocalEnvironment();

    DataStream<String> rawPositions = env.fromElements("{}");
    RouteGeometryIndex emptyIndex = RouteGeometryIndex.empty();
    BusRouteSentinelProcessor processor = new BusRouteSentinelProcessor(
        BusRouteSentinelProcessor.DEFAULT_ROUTE_MINUTES,
        BusRouteSentinelProcessor.DEFAULT_SERVICE_GAP_MINUTES,
        BusRouteSentinelProcessor.DEFAULT_BUNCHING_PROGRESS_GAP_RATIO,
        BusRouteSentinelProcessor.DEFAULT_BUNCHING_CONFIRMATION_SLOTS,
        Clock.systemUTC());

    // Throws InvalidProgramException at operator-add time if any closure is not serializable.
    DataStream<String> signals =
        BusRouteSentinelJob.buildSignalStream(rawPositions, emptyIndex, 120.0, processor);

    assertNotNull(signals);
  }
}
