package io.twfoundry.backend.ingestion.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.twfoundry.backend.ingestion.application.MrtLiveBoardTimelineStore;
import io.twfoundry.backend.ingestion.application.MrtLiveBoardService.LiveBoardEntry;
import io.twfoundry.backend.ingestion.application.MrtLiveBoardService.LocalizedText;
import io.twfoundry.backend.ingestion.application.MrtLiveBoardService.MrtLiveBoardResponse;
import io.twfoundry.backend.ingestion.application.MrtLiveBoardService.MrtLiveBoardTimelineResponse;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("e2e")
class MrtLiveBoardControllerE2eTest {
  @Autowired private TestRestTemplate restTemplate;
  @Autowired private MrtLiveBoardTimelineStore timelineStore;

  @BeforeEach
  void clearTimeline() {
    timelineStore.deleteAll();
  }

  @Test
  void returnsNormalizedLiveBoardRowsFromBackendEndpoint() {
    ResponseEntity<MrtLiveBoardResponse> response =
        restTemplate.getForEntity(
            "/api/mrt/liveboard?operator=TRTC&stationId=BL18", MrtLiveBoardResponse.class);

    assertEquals(200, response.getStatusCode().value());
    assertEquals("tdx", response.getBody().source());
    assertFalse(response.getBody().rows().isEmpty());
    assertEquals("BL18", response.getBody().rows().getFirst().stationId());
    assertFalse(response.getBody().rows().getFirst().destination().isBlank());
    assertTrue(
        response.getBody().rows().stream()
            .anyMatch(
                row ->
                    row.destinationName() != null
                        && ((row.destinationName().Zh_tw() != null
                                && !row.destinationName().Zh_tw().isBlank())
                            || (row.destinationName().En() != null
                                && !row.destinationName().En().isBlank()))));
  }

  @Test
  void returnsNetworkWideRowsWhenStationFilterIsMissing() {
    ResponseEntity<MrtLiveBoardResponse> response =
        restTemplate.getForEntity("/api/mrt/liveboard?operator=TRTC", MrtLiveBoardResponse.class);

    assertEquals(200, response.getStatusCode().value());
    assertEquals("tdx", response.getBody().source());
    assertTrue(response.getBody().rows().size() >= 3);
  }

  @Test
  void persistsSnapshotsAndServesTimelineReplay() {
    ResponseEntity<MrtLiveBoardResponse> liveResponse =
        restTemplate.getForEntity("/api/mrt/liveboard?operator=TRTC", MrtLiveBoardResponse.class);

    assertEquals(200, liveResponse.getStatusCode().value());
    assertFalse(liveResponse.getBody().rows().isEmpty());

    ResponseEntity<MrtLiveBoardTimelineResponse> timelineResponse =
        restTemplate.getForEntity(
            "/api/mrt/liveboard/timeline?operator=TRTC&limit=10", MrtLiveBoardTimelineResponse.class);

    assertEquals(200, timelineResponse.getStatusCode().value());
    assertEquals("tdx", timelineResponse.getBody().source());
    assertFalse(timelineResponse.getBody().snapshots().isEmpty());
    assertFalse(timelineResponse.getBody().snapshots().getLast().rows().isEmpty());
  }

  @Test
  void upsertsOverlappingSnapshotsBySourceOperatorAndTimestamp() {
    Instant snapshotAt = Instant.parse("2026-04-23T10:00:00Z");

    timelineStore.saveSnapshot("tdx", "TRTC", snapshotAt, List.of(sampleRow("train-a", 3)));
    timelineStore.saveSnapshot("tdx", "TRTC", snapshotAt, List.of(sampleRow("train-b", 1)));

    List<?> snapshots = timelineStore.findRecentSnapshots("TRTC", 10);

    assertEquals(1, snapshots.size());
    MrtLiveBoardTimelineResponse timelineResponse =
        restTemplate.getForEntity(
                "/api/mrt/liveboard/timeline?operator=TRTC&limit=10",
                MrtLiveBoardTimelineResponse.class)
            .getBody();
    assertEquals(1, timelineResponse.snapshots().size());
    assertEquals(snapshotAt.toString(), timelineResponse.snapshots().getFirst().updatedAt());
    assertEquals("train-b", timelineResponse.snapshots().getFirst().rows().getFirst().id());
    assertEquals(1, timelineResponse.snapshots().getFirst().rows().getFirst().arrivalMinutes());
  }

  private LiveBoardEntry sampleRow(String id, int arrivalMinutes) {
    return new LiveBoardEntry(
        id,
        "train-code-" + id,
        "BL18",
        new LocalizedText("台北車站", "Taipei Main Station"),
        "blue",
        new LocalizedText("板南線", "Bannan Line"),
        "Outbound",
        "BL23",
        new LocalizedText("南港展覽館", "Taipei Nangang Exhibition Center"),
        arrivalMinutes,
        "on-time");
  }
}
