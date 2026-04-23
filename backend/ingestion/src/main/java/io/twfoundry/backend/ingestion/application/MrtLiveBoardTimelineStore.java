package io.twfoundry.backend.ingestion.application;

import io.twfoundry.backend.ingestion.application.MrtLiveBoardService.LiveBoardEntry;
import io.twfoundry.backend.ingestion.application.MrtLiveBoardService.MrtLiveBoardSnapshot;
import java.time.Instant;
import java.util.List;

public interface MrtLiveBoardTimelineStore {
  void saveSnapshot(String source, String operator, Instant updatedAt, List<LiveBoardEntry> rows);

  List<MrtLiveBoardSnapshot> findRecentSnapshots(String operator, int limit);

  void deleteAll();
}
