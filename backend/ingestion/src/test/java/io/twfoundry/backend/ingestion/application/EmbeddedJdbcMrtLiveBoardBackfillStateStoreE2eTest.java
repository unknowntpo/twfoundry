package io.twfoundry.backend.ingestion.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.twfoundry.backend.ingestion.application.MrtLiveBoardBackfillStateStore.MrtLiveBoardBackfillCursor;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("e2e")
class EmbeddedJdbcMrtLiveBoardBackfillStateStoreE2eTest {
  @Autowired private MrtLiveBoardBackfillStateStore backfillStateStore;

  @BeforeEach
  void clearState() {
    backfillStateStore.deleteAll();
  }

  @Test
  void savesAndReadsBackfillCursor() {
    Instant cursorAt = Instant.parse("2026-04-23T10:00:00Z");

    backfillStateStore.saveCursor("tdx", "TRTC", "hourly-backfill", cursorAt);

    Optional<MrtLiveBoardBackfillCursor> cursor =
        backfillStateStore.getCursor("tdx", "TRTC", "hourly-backfill");

    assertTrue(cursor.isPresent());
    assertEquals("tdx", cursor.get().source());
    assertEquals("TRTC", cursor.get().operator());
    assertEquals("hourly-backfill", cursor.get().consumerName());
    assertEquals(cursorAt, cursor.get().cursorAt());
  }

  @Test
  void upsertsCursorBySourceOperatorAndConsumer() {
    backfillStateStore.saveCursor(
        "tdx", "TRTC", "hourly-backfill", Instant.parse("2026-04-23T10:00:00Z"));
    backfillStateStore.saveCursor(
        "tdx", "TRTC", "hourly-backfill", Instant.parse("2026-04-23T11:00:00Z"));

    Optional<MrtLiveBoardBackfillCursor> cursor =
        backfillStateStore.getCursor("tdx", "TRTC", "hourly-backfill");

    assertTrue(cursor.isPresent());
    assertEquals(Instant.parse("2026-04-23T11:00:00Z"), cursor.get().cursorAt());
  }
}
