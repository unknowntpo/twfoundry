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
    assertEquals("EPSG:3857 Web Mercator", body.path("coordinateSystem").path("projection").asText());
    assertTrue(body.path("coordinateSystem").path("sceneUnitsPerMeter").asDouble() > 0);
    assertTrue(body.path("chunks").get(0).path("sourceRefs").toString().contains("curated:zhongshan-static-features"));

    JsonNode station = findById(body.path("objects"), "station-R11-G14");
    assertEquals("TDX MRT LiveBoard", station.path("properties").path("liveSource").asText());
    assertTrue(station.path("properties").path("liveBoardRows").size() >= 2);

    JsonNode staticFeatures = body.path("chunks").get(0).path("staticFeatures");
    JsonNode groundFeatures = body.path("chunks").get(0).path("groundFeatures");
    assertEquals(0, body.path("chunks").get(0).path("terrain").size());
    assertTrue(countByKind(groundFeatures, "road-corridor") >= 5);
    assertTrue(findById(groundFeatures, "road-nanjing-west").path("visualState").path("width").asDouble() > 0);
    assertEquals("fixture-osm:way/road-nanjing-west", findById(groundFeatures, "road-nanjing-west").path("sourceRef").asText());
    assertEquals("LineString", findById(groundFeatures, "road-nanjing-west").path("geometry").path("type").asText());
    assertEquals("LineString", findById(groundFeatures, "road-nanjing-west").path("sourceGeometry").path("type").asText());
    assertEquals(
        findById(groundFeatures, "road-nanjing-west").path("geometry").path("coordinates").size(),
        findById(groundFeatures, "road-nanjing-west").path("sourceGeometry").path("coordinates").size());
    assertTrue(
        findById(groundFeatures, "road-chifeng").path("sourceGeometry").path("coordinates").get(0).get(1).asDouble()
            > findById(groundFeatures, "road-chifeng").path("sourceGeometry").path("coordinates").get(3).get(1).asDouble());
    assertEquals("Polygon", findById(groundFeatures, "park-jiancheng").path("geometry").path("type").asText());
    assertEquals("Polygon", findById(groundFeatures, "park-jiancheng").path("sourceGeometry").path("type").asText());
    assertEquals(
        findById(groundFeatures, "park-jiancheng").path("geometry").path("coordinates").get(0).size(),
        findById(groundFeatures, "park-jiancheng").path("sourceGeometry").path("coordinates").get(0).size());
    assertTrue(findById(groundFeatures, "park-jiancheng").path("sourceRef").asText().startsWith("fixture-osm:way/"));
    assertEquals("中山站", findById(staticFeatures, "station-anchor-R11-G14").path("visualState").path("shortLabel").asText());
    assertEquals("新光三越", findById(staticFeatures, "building-shin-kong-nanxi").path("visualState").path("shortLabel").asText());
    assertTrue(findById(staticFeatures, "station-anchor-R11-G14").path("visualState").path("footprintScale").asDouble() > 0);
    assertTrue(findById(staticFeatures, "building-shin-kong-nanxi").path("visualState").path("footprintScale").asDouble() > 0);
    assertEquals("Polygon", findById(staticFeatures, "building-shin-kong-nanxi").path("geometry").path("type").asText());
    assertEquals("Polygon", findById(staticFeatures, "building-shin-kong-nanxi").path("sourceGeometry").path("type").asText());
    assertEquals("fixture-osm:way/shin-kong-nanxi", findById(staticFeatures, "building-shin-kong-nanxi").path("visualState").path("footprintSource").asText());
    assertEquals("fixture-osm:way/shin-kong-nanxi", findById(staticFeatures, "building-shin-kong-nanxi").path("footprintSource").asText());
    assertEquals("landmark", findById(staticFeatures, "building-shin-kong-nanxi").path("visualState").path("urbanRole").asText());
    JsonNode unnamedBuilding = findById(staticFeatures, "building-north-residential-01");
    assertTrue(unnamedBuilding.path("visualState").path("label").isMissingNode());
    assertTrue(unnamedBuilding.path("visualState").path("shortLabel").isMissingNode());
    assertEquals(false, unnamedBuilding.path("visualState").path("sign").asBoolean());
    assertTrue(countByGeometryType(staticFeatures, "Polygon") >= 6);
    assertEquals(0, countByKind(staticFeatures, "context-building"));
    assertStaticFeatureSourceGeometryRoundTrips(
        body, findById(staticFeatures, "building-chifeng-maker"));
    assertStaticFeatureSourceGeometryRoundTrips(
        body, findById(staticFeatures, "building-linsen-lane"));
    assertGroundFeatureGeoPathRoundTrips(body, findById(groundFeatures, "road-chifeng"));
    assertGroundFeatureGeoFootprintRoundTrips(body, findById(groundFeatures, "park-jiancheng"));
  }

  @Test
  void rejectsUnsupportedFocusInsteadOfReturningMixedPayload() {
    ResponseEntity<JsonNode> response =
        restTemplate.getForEntity("/api/world/view?focusId=taipei-main-station", JsonNode.class);

    assertEquals(404, response.getStatusCode().value());
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
    assertObjectReferenceIntegrity(body);
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

  private JsonNode findById(JsonNode nodes, String id) {
    for (JsonNode node : nodes) {
      if (id.equals(node.path("id").asText())) return node;
    }
    throw new AssertionError("Missing node id: " + id);
  }

  private int countByKind(JsonNode nodes, String kind) {
    int count = 0;
    for (JsonNode node : nodes) {
      if (kind.equals(node.path("kind").asText())) count++;
    }
    return count;
  }

  private int countByGeometryType(JsonNode nodes, String type) {
    int count = 0;
    for (JsonNode node : nodes) {
      if (type.equals(node.path("geometry").path("type").asText())) count++;
    }
    return count;
  }

  private void assertObjectReferenceIntegrity(JsonNode body) {
    Set<String> objectIds = new HashSet<>();
    for (JsonNode object : body.path("objects")) {
      objectIds.add(object.path("id").asText());
    }
    for (JsonNode chunk : body.path("chunks")) {
      for (JsonNode feature : chunk.path("staticFeatures")) {
        String objectId = feature.path("ontologyObjectId").asText("");
        if (!objectId.isBlank()) {
          assertTrue(objectIds.contains(objectId), "Missing object for static feature reference: " + objectId);
        }
      }
    }
    for (JsonNode projection : body.path("projections")) {
      String objectId = projection.path("objectId").asText("");
      if (!objectId.isBlank()) {
        assertTrue(objectIds.contains(objectId), "Missing object for projection reference: " + objectId);
      }
    }
  }

  private void assertStaticFeatureSourceGeometryRoundTrips(JsonNode body, JsonNode feature) {
    assertTrue(feature.path("visualState").path("geoAnchor").isMissingNode());
    JsonNode sourceGeometry = feature.path("sourceGeometry");
    if ("Point".equals(feature.path("geometry").path("type").asText())) {
      assertEquals("Point", sourceGeometry.path("type").asText());
      assertLocalPointRoundTripsToLngLat(
          body, feature.path("geometry").path("coordinates"), sourceGeometry.path("coordinates"));
      return;
    }
    assertEquals("Polygon", sourceGeometry.path("type").asText());
    JsonNode localRing = feature.path("geometry").path("coordinates").get(0);
    JsonNode sourceRing = sourceGeometry.path("coordinates").get(0);
    assertEquals(localRing.size(), sourceRing.size());
    for (int i = 0; i < localRing.size(); i++) {
      assertLocalPointRoundTripsToLngLat(body, localRing.get(i), sourceRing.get(i));
    }
  }

  private void assertGroundFeatureGeoPathRoundTrips(JsonNode body, JsonNode feature) {
    JsonNode coordinates = feature.path("geometry").path("coordinates");
    JsonNode geoPath = feature.path("sourceGeometry").path("coordinates");
    assertEquals(coordinates.size(), geoPath.size());
    for (int i = 0; i < coordinates.size(); i++) {
      assertLocalPointRoundTripsToLngLat(body, coordinates.get(i), geoPath.get(i));
    }
  }

  private void assertGroundFeatureGeoFootprintRoundTrips(JsonNode body, JsonNode feature) {
    JsonNode ring = feature.path("geometry").path("coordinates").get(0);
    JsonNode geoFootprint = feature.path("sourceGeometry").path("coordinates").get(0);
    assertEquals(ring.size(), geoFootprint.size());
    for (int i = 0; i < ring.size(); i++) {
      assertLocalPointRoundTripsToLngLat(body, ring.get(i), geoFootprint.get(i));
    }
  }

  private void assertLocalPointRoundTripsToLngLat(JsonNode body, JsonNode coordinate, JsonNode expectedLngLat) {
    JsonNode coordinateSystem = body.path("coordinateSystem");
    double radiusMeters = 6378137.0;
    double originLng = coordinateSystem.path("originLng").asDouble();
    double originLat = coordinateSystem.path("originLat").asDouble();
    double sceneUnitsPerMeter = coordinateSystem.path("sceneUnitsPerMeter").asDouble();
    double originX = radiusMeters * Math.toRadians(originLng);
    double originY =
        radiusMeters
            * Math.log(Math.tan(Math.PI / 4.0 + Math.toRadians(originLat) / 2.0));

    double mercatorX = coordinate.get(0).asDouble() / sceneUnitsPerMeter + originX;
    double mercatorY = -coordinate.get(2).asDouble() / sceneUnitsPerMeter + originY;
    double lng = Math.toDegrees(mercatorX / radiusMeters);
    double lat = Math.toDegrees(2.0 * Math.atan(Math.exp(mercatorY / radiusMeters)) - Math.PI / 2.0);

    assertEquals(expectedLngLat.get(0).asDouble(), lng, 0.00002);
    assertEquals(expectedLngLat.get(1).asDouble(), lat, 0.00002);
  }

}
