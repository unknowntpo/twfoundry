package io.twfoundry.backend.ingestion.application.world;

import java.util.List;
import java.util.Locale;
import java.util.Map;

final class OsmStaticFeatureAdapter {
  List<StaticFeatureProvider.BuildingFootprint> buildingFootprints(List<ZhongshanFixtureOsmCatalog.OsmBuilding> buildings) {
    return buildings.stream()
        .filter(building -> building.footprintLngLat().size() >= 4)
        .map(this::buildingFootprint)
        .toList();
  }

  List<StaticFeatureProvider.AreaAnchor> areaAnchors(List<ZhongshanFixtureOsmCatalog.OsmPoi> pois) {
    return pois.stream()
        .filter(poi -> poi.lng() != 0 && poi.lat() != 0)
        .map(this::areaAnchor)
        .toList();
  }

  private StaticFeatureProvider.BuildingFootprint buildingFootprint(ZhongshanFixtureOsmCatalog.OsmBuilding building) {
    String name = displayName(building.tags());
    String kind = kindFromTags(building.tags());
    return new StaticFeatureProvider.BuildingFootprint(
        featureId(building.tags(), "building-" + normalizeId(building.id())),
        objectId(building.tags(), "landmark-" + normalizeId(building.id())),
        kind,
        shortLabel(building.tags(), name),
        name,
        floorsFromTags(building.tags()),
        building.sourceRef(),
        urbanRoleFromTags(building.tags(), kind),
        closeRing(building.footprintLngLat()));
  }

  private StaticFeatureProvider.AreaAnchor areaAnchor(ZhongshanFixtureOsmCatalog.OsmPoi poi) {
    String name = displayName(poi.tags());
    return new StaticFeatureProvider.AreaAnchor(
        featureId(poi.tags(), "area-" + normalizeId(poi.id())),
        objectId(poi.tags(), "landmark-" + normalizeId(poi.id())),
        kindFromTags(poi.tags()),
        shortLabel(poi.tags(), name),
        name,
        poi.lng(),
        poi.lat(),
        poi.sourceRef(),
        urbanRoleFromTags(poi.tags(), kindFromTags(poi.tags())));
  }

  private static List<List<Double>> closeRing(List<List<Double>> ring) {
    if (ring.isEmpty()) return ring;
    List<Double> first = ring.get(0);
    List<Double> last = ring.get(ring.size() - 1);
    if (first.equals(last)) return ring;
    java.util.ArrayList<List<Double>> closed = new java.util.ArrayList<>(ring);
    closed.add(first);
    return List.copyOf(closed);
  }

  private static String displayName(Map<String, String> tags) {
    String name = tags.getOrDefault("name:zh", tags.get("name"));
    if (name == null || name.isBlank()) return null;
    return name;
  }

  private static String shortLabel(Map<String, String> tags, String name) {
    String shortName = tags.getOrDefault("short_name:zh", tags.get("short_name"));
    if (shortName != null && !shortName.isBlank()) return shortName;
    if (name == null || name.isBlank()) return null;
    if (name.length() <= 6) return name;
    return name.substring(0, 6);
  }

  private static int floorsFromTags(Map<String, String> tags) {
    String levels = tags.get("building:levels");
    if (levels == null || levels.isBlank()) return 3;
    try {
      return Math.max(1, Math.min(12, Integer.parseInt(levels)));
    } catch (NumberFormatException ignored) {
      return 3;
    }
  }

  private static String kindFromTags(Map<String, String> tags) {
    String shop = tags.getOrDefault("shop", "").toLowerCase(Locale.ROOT);
    String amenity = tags.getOrDefault("amenity", "").toLowerCase(Locale.ROOT);
    if ("department_store".equals(shop) || "mall".equals(shop)) return "department-store";
    if ("books".equals(shop) || "library".equals(amenity)) return "bookstore-mall";
    return "lane-shop";
  }

  private static String urbanRoleFromTags(Map<String, String> tags, String kind) {
    String amenity = tags.getOrDefault("amenity", "").toLowerCase(Locale.ROOT);
    String shop = tags.getOrDefault("shop", "").toLowerCase(Locale.ROOT);
    if ("marketplace".equals(amenity) || "marketplace".equals(shop)) return "market";
    if ("restaurant".equals(amenity) || "cafe".equals(amenity) || "food".equals(shop)) return "restaurant";
    if ("department-store".equals(kind) || "bookstore-mall".equals(kind)) return "landmark";
    if (!shop.isBlank()) return "creative-shop";
    return "residential";
  }

  private static String normalizeId(String value) {
    return value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
  }

  private static String featureId(Map<String, String> tags, String fallback) {
    return tags.getOrDefault("twfoundry:feature_id", fallback);
  }

  private static String objectId(Map<String, String> tags, String fallback) {
    return tags.getOrDefault("twfoundry:object_id", fallback);
  }

}
