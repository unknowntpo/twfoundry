package io.twfoundry.backend.streams.bus;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.apache.flink.api.common.ExecutionConfig;
import org.apache.flink.api.common.typeinfo.TypeInformation;
import org.apache.flink.api.common.typeutils.TypeSerializer;
import org.junit.jupiter.api.Test;

/**
 * Round-trips a BusRouteSignal through Flink's record serializer (the same copy() the runtime does
 * between chained operators). Reproduces the UnsupportedOperationException that immutable
 * List.of(...) caused inside Kryo's collection copy, and guards the mutable-ArrayList fix.
 */
class BusRouteSignalSerializationTest {

  @Test
  @SuppressWarnings("deprecation")
  void busRouteSignalSurvivesFlinkSerializerCopy() {
    EnrichedBusVehicleObservation trailing = new EnrichedBusVehicleObservation(
        "2026-06-22T10:00+08:00", "2026-06-22", "TPE10832", "22", 1, "002-U3",
        121.5, 25.0, 0.10, 5.0, null, "2026-06-22T10:00:19+08:00", "2026-06-22T10:00:29+08:00");
    EnrichedBusVehicleObservation leading = new EnrichedBusVehicleObservation(
        "2026-06-22T10:00+08:00", "2026-06-22", "TPE10832", "22", 1, "002-U4",
        121.6, 25.1, 0.55, 4.0, null, "2026-06-22T10:00:19+08:00", "2026-06-22T10:00:29+08:00");

    BusRouteSignal signal = BusRouteSignal.of("suspected_gap", trailing, leading, 48.0, "2026-06-22T02:00:30Z");

    TypeSerializer<BusRouteSignal> serializer =
        TypeInformation.of(BusRouteSignal.class).createSerializer(new ExecutionConfig());

    // copy() is what CopyingChainingOutput does per record; this is where it failed in prod.
    BusRouteSignal copy = serializer.copy(signal);

    assertNotNull(copy);
    assertEquals(signal.evidenceVehicleIds(), copy.evidenceVehicleIds());
    assertEquals(signal.routeUid(), copy.routeUid());
    assertEquals(signal.type(), copy.type());
  }
}
