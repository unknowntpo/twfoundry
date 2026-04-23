package io.twfoundry.backend.ingestion.application;

import io.twfoundry.backend.ingestion.application.MrtLiveBoardService.LiveBoardRow;
import io.twfoundry.backend.ingestion.application.MrtLiveBoardService.MrtLiveBoardSnapshot;
import java.time.Instant;
import java.util.List;

public interface MrtLiveBoardTimelineStore {
  void saveSnapshot(String source, String operator, Instant updatedAt, List<LiveBoardRow> rows);

  List<MrtLiveBoardSnapshot> findRecentSnapshots(String operator, int limit);

  void deleteAll();
}
