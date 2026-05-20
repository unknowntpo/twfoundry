package io.twfoundry.backend.ingestion.application.world;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;

class StaticFeatureStyleResolverTest {
  private final StaticFeatureStyleResolver resolver = new StaticFeatureStyleResolver();

  @Test
  void resolvesLandmarkVisualDefaultsOutsideProvider() {
    StaticFeatureProvider.BuildingFootprint landmark =
        new StaticFeatureProvider.BuildingFootprint(
            "building-test-landmark",
            "landmark-test",
            "department-store",
            "測試百貨",
            "測試百貨",
            5,
            "fixture-osm:way/test-landmark",
            "landmark",
            List.of(
                List.of(121.0, 25.0),
                List.of(121.1, 25.0),
                List.of(121.1, 25.1),
                List.of(121.0, 25.0)));

    StaticFeatureStyleResolver.BuildingStyle landmarkStyle = resolver.buildingStyle(landmark);

    assertEquals(0.92, landmarkStyle.footprintScale());
    assertTrue(landmarkStyle.sign());

    StaticFeatureProvider.BuildingFootprint restaurant =
        new StaticFeatureProvider.BuildingFootprint(
            "building-test-restaurant",
            "landmark-test-restaurant",
            "lane-shop",
            "測試餐飲",
            "測試餐飲",
            3,
            "fixture-osm:way/test-restaurant",
            "restaurant",
            landmark.footprintLngLat());
    StaticFeatureStyleResolver.BuildingStyle restaurantStyle = resolver.buildingStyle(restaurant);

    assertEquals("#F8DDE7", restaurantStyle.color());
    assertEquals("#F8DDE7", restaurantStyle.accentColor());
    assertEquals("#FFB11B", restaurantStyle.signColor());
    assertEquals(false, restaurantStyle.sign());
  }
}
