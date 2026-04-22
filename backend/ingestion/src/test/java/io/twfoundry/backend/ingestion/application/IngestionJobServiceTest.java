package io.twfoundry.backend.ingestion.application;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

import io.twfoundry.backend.common.domain.RunMode;
import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.Test;

class IngestionJobServiceTest {
  @Test
  void acceptsMrtLiveJobRequest() {
    IngestionJobService service = new IngestionJobService();

    IngestionJobRequest request =
        new IngestionJobRequest(
            "tdx", "mrt_liveboard", RunMode.LIVE, Instant.parse("2026-04-22T00:00:00Z"), "test", Map.of());

    assertDoesNotThrow(() -> service.run(request));
  }
}
