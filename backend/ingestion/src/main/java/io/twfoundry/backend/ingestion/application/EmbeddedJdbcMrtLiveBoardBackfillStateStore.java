package io.twfoundry.backend.ingestion.application;

import io.twfoundry.backend.ingestion.application.MrtLiveBoardBackfillStateStore.MrtLiveBoardBackfillCursor;
import java.time.Instant;
import java.util.Optional;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@ConditionalOnProperty(
    name = "twfoundry.mrt.timeline.store",
    havingValue = "embedded-jdbc",
    matchIfMissing = true)
public class EmbeddedJdbcMrtLiveBoardBackfillStateStore implements MrtLiveBoardBackfillStateStore {
  private final JdbcTemplate jdbcTemplate;

  public EmbeddedJdbcMrtLiveBoardBackfillStateStore(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  @Override
  public void saveCursor(String source, String operator, String consumerName, Instant cursorAt) {
    jdbcTemplate.update(
        """
        MERGE INTO mrt_liveboard_backfill_state
          (source, operator, consumer_name, cursor_at, updated_at)
        KEY (source, operator, consumer_name)
        VALUES (?, ?, ?, ?, ?)
        """,
        source,
        operator,
        consumerName,
        cursorAt.toString(),
        Instant.now().toString());
  }

  @Override
  public Optional<MrtLiveBoardBackfillCursor> getCursor(
      String source, String operator, String consumerName) {
    return jdbcTemplate
        .query(
            """
            SELECT source, operator, consumer_name, cursor_at, updated_at
            FROM mrt_liveboard_backfill_state
            WHERE source = ? AND operator = ? AND consumer_name = ?
            """,
            (resultSet, rowNum) ->
                new MrtLiveBoardBackfillCursor(
                    resultSet.getString("source"),
                    resultSet.getString("operator"),
                    resultSet.getString("consumer_name"),
                    Instant.parse(resultSet.getString("cursor_at")),
                    Instant.parse(resultSet.getString("updated_at"))),
            source,
            operator,
            consumerName)
        .stream()
        .findFirst();
  }

  @Override
  public void deleteAll() {
    jdbcTemplate.update("DELETE FROM mrt_liveboard_backfill_state");
  }
}
