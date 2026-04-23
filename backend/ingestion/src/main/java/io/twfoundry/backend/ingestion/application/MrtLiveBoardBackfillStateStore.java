package io.twfoundry.backend.ingestion.application;

import java.time.Instant;
import java.util.Optional;

public interface MrtLiveBoardBackfillStateStore {
  void saveCursor(String source, String operator, String consumerName, Instant cursorAt);

  Optional<MrtLiveBoardBackfillCursor> getCursor(String source, String operator, String consumerName);

  void deleteAll();

  record MrtLiveBoardBackfillCursor(
      String source, String operator, String consumerName, Instant cursorAt, Instant updatedAt) {}
}
