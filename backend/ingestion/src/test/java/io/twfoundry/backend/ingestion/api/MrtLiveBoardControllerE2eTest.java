package io.twfoundry.backend.ingestion.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.twfoundry.backend.ingestion.application.MrtLiveBoardService.MrtLiveBoardResponse;
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
}
