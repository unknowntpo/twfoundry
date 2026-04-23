package io.twfoundry.backend.ingestion.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.twfoundry.backend.ingestion.application.MrtLiveBoardTimelineRepository;
import io.twfoundry.backend.ingestion.application.MrtLiveBoardService.MrtLiveBoardResponse;
import io.twfoundry.backend.ingestion.application.MrtLiveBoardService.MrtLiveBoardTimelineResponse;
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
  @Autowired private MrtLiveBoardTimelineRepository timelineRepository;

  @BeforeEach
  void clearTimeline() {
    timelineRepository.deleteAll();
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
}
