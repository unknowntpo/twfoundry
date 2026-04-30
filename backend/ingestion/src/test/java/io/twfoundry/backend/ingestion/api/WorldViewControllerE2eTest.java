package io.twfoundry.backend.ingestion.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.HashSet;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("e2e")
class WorldViewControllerE2eTest {
  @Autowired private TestRestTemplate restTemplate;

  @Test
  void returnsCompleteWorldViewPayload() {
    ResponseEntity<JsonNode> response = restTemplate.getForEntity("/api/world/view", JsonNode.class);

    assertEquals(200, response.getStatusCode().value());
    JsonNode body = response.getBody();
    assertNotNull(body);
    assertEquals("world-view.v1", body.path("schemaVersion").asText());
    assertEquals("zhongshan-station", body.path("request").path("focusId").asText());
    assertEquals("complete", body.path("completeness").path("status").asText());
    assertTrue(body.path("chunks").size() >= 1);
    assertTrue(body.path("objects").size() >= 8);
    assertTrue(body.path("projections").size() >= 7);
    assertTrue(body.path("renderModules").size() >= 6);
    assertEquals("live", body.path("freshness").path("mode").asText());
    assertTrue(body.path("freshness").path("maxSourceLagSeconds").asInt() > 0);
    assertTrue(body.path("freshness").path("sources").size() >= 3);
  }

  @Test
  void returnsZhongshanMobilityObjectsInOneFocusChunk() {
    ResponseEntity<JsonNode> response =
        restTemplate.getForEntity("/api/world/view?overlays=bus,ubike", JsonNode.class);

    JsonNode body = response.getBody();
    assertNotNull(body);

    int busObjectCount = 0;
    int bikeObjectCount = 0;
    for (JsonNode object : body.path("objects")) {
      if ("bus-stop-nanxi".equals(object.path("id").asText())) busObjectCount++;
      if ("ubike-zhongshan".equals(object.path("id").asText())) bikeObjectCount++;
    }

    int mobilityProjectionCount = 0;
    Set<String> chunkIds = new HashSet<>();
    for (JsonNode projection : body.path("projections")) {
      if ("bus".equals(projection.path("overlay").asText()) || "ubike".equals(projection.path("overlay").asText())) {
        mobilityProjectionCount++;
        chunkIds.add(projection.path("chunkId").asText());
      }
    }

    assertEquals(1, busObjectCount);
    assertEquals(1, bikeObjectCount);
    assertEquals(2, mobilityProjectionCount);
    assertEquals(Set.of("chunk-zhongshan-station"), chunkIds);
  }

  @Test
  void reportsPartialPayloadForUnsupportedOverlay() {
    ResponseEntity<JsonNode> response =
        restTemplate.getForEntity("/api/world/view?overlays=mrt,unknown", JsonNode.class);

    JsonNode body = response.getBody();
    assertNotNull(body);
    assertEquals("partial", body.path("completeness").path("status").asText());
    assertEquals("unknown", body.path("completeness").path("missingOverlays").get(0).asText());
  }

  @Test
  void includesDebugGeoOnlyWhenRequested() {
    ResponseEntity<JsonNode> response =
        restTemplate.getForEntity("/api/world/view?debugGeo=true", JsonNode.class);

    JsonNode body = response.getBody();
    assertNotNull(body);
    assertTrue(body.path("diagnostics").path("debugGeo").asBoolean());
    assertTrue(body.path("diagnostics").path("geoFeatures").size() >= 3);
  }

  @Test
  void returnsObjectDetailByCanonicalId() {
    ResponseEntity<JsonNode> response =
        restTemplate.getForEntity("/api/world/objects/train-R22", JsonNode.class);

    assertEquals(200, response.getStatusCode().value());
    assertEquals("train-R22", response.getBody().path("id").asText());
    assertEquals("Train", response.getBody().path("type").asText());
  }
}
