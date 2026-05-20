package io.twfoundry.backend.ingestion.application.world;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class OsmStaticFeatureAdapterTest {
  private final OsmStaticFeatureAdapter adapter = new OsmStaticFeatureAdapter();

  @Test
  void mapsOsmBuildingsIntoFootprintDrivenStaticFeatures() {
    List<StaticFeatureProvider.BuildingFootprint> buildings =
        adapter.buildingFootprints(List.of(
            new ZhongshanFixtureOsmCatalog.OsmBuilding(
                "osm-way-1",
                Map.of("name:zh", "新光三越南西店", "shop", "department_store", "building:levels", "8"),
                List.of(
                    List.of(121.5198, 25.0522),
                    List.of(121.5203, 25.0522),
                    List.of(121.5203, 25.0518),
                    List.of(121.5198, 25.0518)),
                "fixture-osm:way/1")));

    assertEquals(1, buildings.size());
    StaticFeatureProvider.BuildingFootprint building = buildings.get(0);
    assertEquals("building-osm-way-1", building.id());
    assertEquals("department-store", building.kind());
    assertEquals("新光三越南西", building.shortLabel());
    assertEquals(8, building.floors());
    assertEquals("fixture-osm:way/1", building.footprintSource());
    assertEquals(building.footprintLngLat().get(0), building.footprintLngLat().get(building.footprintLngLat().size() - 1));
  }

  @Test
  void mapsOsmPoisIntoAreaAnchorsOnly() {
    List<StaticFeatureProvider.AreaAnchor> anchors =
        adapter.areaAnchors(List.of(
            new ZhongshanFixtureOsmCatalog.OsmPoi(
                "osm-node-chifeng",
                Map.of(
                    "name:zh", "赤峰街",
                    "highway", "pedestrian",
                    "twfoundry:feature_id", "building-chifeng-maker",
                    "twfoundry:object_id", "landmark-chifeng-maker-lane"),
                121.5183,
                25.0516,
                "fixture-osm:node/chifeng")));

    assertEquals(1, anchors.size());
    StaticFeatureProvider.AreaAnchor anchor = anchors.get(0);
    assertEquals("building-chifeng-maker", anchor.id());
    assertEquals("landmark-chifeng-maker-lane", anchor.objectId());
    assertEquals("lane-shop", anchor.kind());
    assertEquals("赤峰街", anchor.shortLabel());
    assertTrue(anchor.lng() > 121.0);
    assertTrue(anchor.lat() > 25.0);
  }

  @Test
  void mapsMarketplaceTagsToMarketUrbanRole() {
    List<StaticFeatureProvider.BuildingFootprint> buildings =
        adapter.buildingFootprints(List.of(
            new ZhongshanFixtureOsmCatalog.OsmBuilding(
                "north-market-01",
                Map.of("name:zh", "寧夏夜市南口", "amenity", "marketplace", "shop", "food"),
                List.of(
                    List.of(121.5200, 25.0544),
                    List.of(121.5204, 25.0544),
                    List.of(121.5204, 25.0541),
                    List.of(121.5200, 25.0541)),
                "fixture-osm:way/north-market-01")));

    assertEquals("market", buildings.get(0).urbanRole());
  }

  @Test
  void unnamedOsmRecordsKeepIdentityButDoNotCreateDisplayLabels() {
    List<StaticFeatureProvider.BuildingFootprint> buildings =
        adapter.buildingFootprints(List.of(
            new ZhongshanFixtureOsmCatalog.OsmBuilding(
                "unnamed-building-01",
                Map.of("shop", "mall"),
                List.of(
                    List.of(121.5200, 25.0544),
                    List.of(121.5204, 25.0544),
                    List.of(121.5204, 25.0541),
                    List.of(121.5200, 25.0541)),
                "fixture-osm:way/unnamed-building-01")));

    assertEquals("building-unnamed-building-01", buildings.get(0).id());
    assertEquals("landmark-unnamed-building-01", buildings.get(0).objectId());
    assertNull(buildings.get(0).shortLabel());
    assertNull(buildings.get(0).label());

    List<StaticFeatureProvider.AreaAnchor> anchors =
        adapter.areaAnchors(List.of(
            new ZhongshanFixtureOsmCatalog.OsmPoi(
                "unnamed-poi-01",
                Map.of("shop", "books"),
                121.5183,
                25.0516,
                "fixture-osm:node/unnamed-poi-01")));

    assertEquals("area-unnamed-poi-01", anchors.get(0).id());
    assertEquals("landmark-unnamed-poi-01", anchors.get(0).objectId());
    assertNull(anchors.get(0).shortLabel());
    assertNull(anchors.get(0).label());
  }

}
