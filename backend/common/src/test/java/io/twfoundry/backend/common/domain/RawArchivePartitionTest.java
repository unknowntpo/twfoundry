package io.twfoundry.backend.common.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.Test;

class RawArchivePartitionTest {
  @Test
  void buildsPartitionPathFromRawEnvelopeMetadata() {
    RawEnvelope<String> envelope =
        new RawEnvelope<>(
            "evt-1",
            "tdx",
            "mrt_vehicle",
            "transit",
            "tdx:mrt_vehicle:BR-102:2026-04-29T10:15:30Z",
            Instant.parse("2026-04-29T10:15:30Z"),
            Instant.parse("2026-04-29T10:15:35Z"),
            IngestionMethod.EVENT_STREAM,
            RunMode.LIVE,
            "v1",
            "application/json",
            "{}",
            Map.of());

    assertEquals(
        "raw_history/source_id=tdx/dataset_id=mrt_vehicle/run_mode=live/dt=2026-04-29",
        RawArchivePartition.pathFor(envelope));
  }
}
