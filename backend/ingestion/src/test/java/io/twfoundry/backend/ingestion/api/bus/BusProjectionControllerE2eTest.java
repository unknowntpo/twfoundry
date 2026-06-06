package io.twfoundry.backend.ingestion.api.bus;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("e2e")
class BusProjectionControllerE2eTest {
  @Autowired private TestRestTemplate restTemplate;

  @Test
  void returnsLatestBusVehicleProjectionFromLocalArchive() {
    ResponseEntity<JsonNode> response =
        restTemplate.getForEntity("/api/projections/bus_vehicles", JsonNode.class);

    assertEquals(200, response.getStatusCode().value());
    JsonNode body = response.getBody();
    assertNotNull(body);
    assertEquals("bus_vehicles", body.path("layerId").asText());
    assertEquals("vehicle_position_projection", body.path("projectionType").asText());
    assertFalse(body.path("capturedAt").asText().isBlank());
    assertEquals("23:55", body.path("timelineSlot").asText());
    assertTrue(body.path("features").size() > 0);
    assertEquals(body.path("features").size(), body.path("summary").path("vehicleCount").asInt());
    assertTrue(body.path("summary").path("routeCount").asInt() > 0);

    JsonNode firstFeature = body.path("features").get(0);
    assertFalse(firstFeature.path("id").asText().isBlank());
    assertTrue(firstFeature.path("longitude").isNumber());
    assertTrue(firstFeature.path("latitude").isNumber());
    assertFalse(firstFeature.path("vehicleId").asText().isBlank());
    assertFalse(firstFeature.path("routeName").asText().isBlank());
    assertTrue(firstFeature.path("speedKph").isNumber());
    assertTrue(firstFeature.path("azimuthDeg").isNumber());
  }

  @Test
  void returnsBusVehicleProjectionTimeline() {
    ResponseEntity<JsonNode> response =
        restTemplate.getForEntity("/api/projections/bus_vehicles/timeline", JsonNode.class);

    assertEquals(200, response.getStatusCode().value());
    JsonNode body = response.getBody();
    assertNotNull(body);
    assertEquals("bus_vehicles", body.path("layerId").asText());
    assertEquals("vehicle_position_projection", body.path("projectionType").asText());
    assertEquals("TDX", body.path("source").path("provider").asText());
    assertTrue(body.path("snapshots").size() > 100);
    assertEquals("00:00", body.path("snapshots").get(0).path("timeLabel").asText());
    assertFalse(body.path("latestSlotKey").asText().isBlank());
  }

  @Test
  void returnsRequestedTimelineSlot() {
    ResponseEntity<JsonNode> response =
        restTemplate.getForEntity("/api/projections/bus_vehicles?slot=09-55", JsonNode.class);

    assertEquals(200, response.getStatusCode().value());
    assertEquals("09:55", response.getBody().path("timelineSlot").asText());
    assertEquals(205, response.getBody().path("summary").path("vehicleCount").asInt());
    assertEquals(18, response.getBody().path("summary").path("routeCount").asInt());
  }

  @Test
  void rejectsUnknownTimelineSlot() {
    ResponseEntity<JsonNode> response =
        restTemplate.getForEntity("/api/projections/bus_vehicles?slot=missing", JsonNode.class);

    assertEquals(404, response.getStatusCode().value());
  }
}
