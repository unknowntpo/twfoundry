package io.twfoundry.backend.ingestion.application;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.twfoundry.backend.ingestion.application.MrtLiveBoardService.LiveBoardEntry;
import io.twfoundry.backend.ingestion.application.MrtLiveBoardService.MrtLiveBoardSnapshot;
import java.io.IOException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@ConditionalOnProperty(
    name = "twfoundry.mrt.timeline.store",
    havingValue = "embedded-jdbc",
    matchIfMissing = true)
public class EmbeddedJdbcMrtLiveBoardTimelineStore implements MrtLiveBoardTimelineStore {
  private static final TypeReference<List<LiveBoardEntry>> ROWS_TYPE = new TypeReference<>() {};

  private final JdbcTemplate jdbcTemplate;
  private final ObjectMapper objectMapper;

  public EmbeddedJdbcMrtLiveBoardTimelineStore(
      JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
    this.jdbcTemplate = jdbcTemplate;
    this.objectMapper = objectMapper;
  }

  @Override
  public void saveSnapshot(String source, String operator, Instant updatedAt, List<LiveBoardEntry> rows) {
    jdbcTemplate.update(
        """
        MERGE INTO mrt_liveboard_snapshot (source, operator, updated_at, row_count, rows_json)
        KEY (source, operator, updated_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        source,
        operator,
        updatedAt.toString(),
        rows.size(),
        writeRows(rows));
  }

  @Override
  public List<MrtLiveBoardSnapshot> findRecentSnapshots(String operator, int limit) {
    int boundedLimit = Math.max(1, Math.min(limit, 500));
    return jdbcTemplate.query(
        """
        SELECT updated_at, rows_json
        FROM (
          SELECT updated_at, rows_json
          FROM mrt_liveboard_snapshot
          WHERE operator = ?
          ORDER BY updated_at DESC
          LIMIT ?
        ) recent
        ORDER BY updated_at ASC
        """,
        (resultSet, rowNum) -> mapSnapshot(resultSet),
        operator,
        boundedLimit);
  }

  @Override
  public void deleteAll() {
    jdbcTemplate.update("DELETE FROM mrt_liveboard_snapshot");
  }

  private MrtLiveBoardSnapshot mapSnapshot(ResultSet resultSet) throws SQLException {
    Instant updatedAt = Instant.parse(resultSet.getString("updated_at"));
    String rowsJson = resultSet.getString("rows_json");
    return new MrtLiveBoardSnapshot(updatedAt.toString(), readRows(rowsJson));
  }

  private String writeRows(List<LiveBoardEntry> rows) {
    try {
      return objectMapper.writeValueAsString(rows);
    } catch (IOException error) {
      throw new IllegalStateException("Unable to persist MRT liveboard snapshot.", error);
    }
  }

  private List<LiveBoardEntry> readRows(String rowsJson) {
    try {
      return objectMapper.readValue(rowsJson, ROWS_TYPE);
    } catch (IOException error) {
      throw new IllegalStateException("Unable to read MRT liveboard snapshot history.", error);
    }
  }
}
