package io.twfoundry.backend.ingestion.application.world;

final class StaticFeatureStyleResolver {
  BuildingStyle buildingStyle(StaticFeatureProvider.BuildingFootprint source) {
    String color = colorFor(source.kind(), source.urbanRole(), source.id());
    return new BuildingStyle(
        color,
        accentFor(color, source.urbanRole()),
        signColorFor(source.kind(), source.urbanRole()),
        shouldShowSign(source.urbanRole()),
        0.92);
  }

  AnchorStyle anchorStyle(StaticFeatureProvider.AreaAnchor source) {
    return new AnchorStyle(
        colorFor(source.kind(), source.urbanRole(), source.id()),
        signColorFor(source.kind(), source.urbanRole()));
  }

  AnchorStyle stationAnchorStyle(StaticFeatureProvider.StationAnchor source) {
    return new AnchorStyle(
        colorFor(source.kind(), "transit", source.id()),
        signColorFor(source.kind(), "transit"));
  }

  private static String colorFor(String kind, String urbanRole, String id) {
    if ("station-anchor".equals(kind)) return "#E16B8C";
    if ("department-store".equals(kind)) return "#F596AA";
    if ("bookstore-mall".equals(kind)) return "#FFD2DC";
    if ("market".equals(urbanRole)) return "#F7E6B8";
    if ("restaurant".equals(urbanRole)) return "#F8DDE7";
    if ("creative-shop".equals(urbanRole)) return "#FFD2DC";
    if ("green-corner".equals(urbanRole)) return "#DDECCF";
    String[] palette = {"#FFD2DC", "#F8DDE7", "#BFE8F4", "#DDECCF", "#F7E6B8", "#D9C8F2"};
    return palette[Math.floorMod(id.hashCode(), palette.length)];
  }

  private static String accentFor(String color, String urbanRole) {
    if ("green-corner".equals(urbanRole)) return "#B5CAA0";
    if ("market".equals(urbanRole)) return "#FFB11B";
    return color;
  }

  private static String signColorFor(String kind, String urbanRole) {
    if ("department-store".equals(kind) || "market".equals(urbanRole)) return "#FFB11B";
    if ("bookstore-mall".equals(kind)) return "#81C7D4";
    if ("restaurant".equals(urbanRole)) return "#FFB11B";
    if ("green-corner".equals(urbanRole)) return "#B5CAA0";
    return "#E16B8C";
  }

  private static boolean shouldShowSign(String urbanRole) {
    return "landmark".equals(urbanRole) || "market".equals(urbanRole);
  }

  record BuildingStyle(String color, String accentColor, String signColor, boolean sign, double footprintScale) {}

  record AnchorStyle(String color, String signColor) {}
}
