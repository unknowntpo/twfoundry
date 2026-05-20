package io.twfoundry.backend.ingestion.application.world;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class CuratedZhongshanStaticFeatureProviderTest {
  private final ZhongshanFixtureOsmCatalog osmCatalog = new ZhongshanFixtureOsmCatalog(new ObjectMapper());
  private final CuratedZhongshanStaticFeatureProvider provider = new CuratedZhongshanStaticFeatureProvider(osmCatalog);

  @Test
  void separatesBuildingFootprintsFromAreaAnchors() {
    assertTrue(provider.buildingFootprints().size() >= 6);
    assertTrue(provider.buildingFootprints().size() < osmCatalog.buildings().size());
    assertEquals(1, provider.stationAnchors().size());
    assertEquals(2, provider.areaAnchors().size());
    assertTrue(provider.sourceRefs().contains("curated:zhongshan-static-features"));
    assertTrue(provider.sourceRefs().contains("offline-osm-fixture:zhongshan-2026-05-02"));
    assertTrue(provider.sourceRefs().contains("tdx:mrt-station/R11-G14"));
    assertTrue(provider.sourceRefs().contains("fixture-osm:way/shin-kong-nanxi"));
    assertTrue(provider.sourceRefs().contains("fixture-osm:way/road-nanjing-west"));
    assertTrue(provider.sourceRefs().contains("fixture-osm:way/park-jiancheng"));

    StaticFeatureProvider.StationAnchor stationAnchor = provider.stationAnchors().get(0);
    assertEquals("station-anchor-R11-G14", stationAnchor.id());
    assertEquals("station-R11-G14", stationAnchor.objectId());
    assertEquals("tdx:mrt-station/R11-G14", stationAnchor.sourceRef());
    assertTrue(stationAnchor.aliases().contains("中山"));

    provider.buildingFootprints().forEach(building -> {
      assertTrue(building.footprintSource().startsWith("fixture-osm:way/"));
      assertTrue(building.objectId().startsWith("landmark-"));
      assertTrue(building.footprintLngLat().size() >= 5);
      assertEquals(building.footprintLngLat().get(0), building.footprintLngLat().get(building.footprintLngLat().size() - 1));
    });

    provider.areaAnchors().forEach(anchor -> {
      assertTrue(anchor.lng() > 121.0);
      assertTrue(anchor.lat() > 25.0);
    });
    assertTrue(provider.areaAnchors().stream().anyMatch(anchor ->
        "building-linsen-lane".equals(anchor.id())
            && "landmark-linsen-lane-shop".equals(anchor.objectId())
            && "restaurant".equals(anchor.urbanRole())));
    assertTrue(provider.areaAnchors().stream().anyMatch(anchor ->
        "building-chifeng-maker".equals(anchor.id())
            && "landmark-chifeng-maker-lane".equals(anchor.objectId())
            && "creative-shop".equals(anchor.urbanRole())));
  }

  @Test
  void catalogProvidesSourceDerivedRoadAndAreaGroundFeatures() {
    assertTrue(osmCatalog.roads().size() >= 5);
    assertTrue(osmCatalog.areas().size() >= 2);
    assertTrue(osmCatalog.roads().stream().allMatch(road ->
        road.sourceRef().startsWith("fixture-osm:way/")
            && road.widthMeters() > 0
            && road.pathLngLat().size() >= 2));
    ZhongshanFixtureOsmCatalog.OsmRoad chifeng = osmCatalog.roads().stream()
        .filter(road -> "road-chifeng".equals(road.id()))
        .findFirst()
        .orElseThrow();
    assertTrue(chifeng.pathLngLat().get(0).get(1) > chifeng.pathLngLat().get(chifeng.pathLngLat().size() - 1).get(1));
    assertTrue(osmCatalog.areas().stream().allMatch(area ->
        area.sourceRef().startsWith("fixture-osm:way/")
            && area.footprintLngLat().size() >= 4));
  }
}
