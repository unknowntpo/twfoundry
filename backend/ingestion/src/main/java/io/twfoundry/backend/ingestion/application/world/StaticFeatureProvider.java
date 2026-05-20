package io.twfoundry.backend.ingestion.application.world;

import java.util.List;

interface StaticFeatureProvider {
  List<StationAnchor> stationAnchors();

  List<BuildingFootprint> buildingFootprints();

  List<AreaAnchor> areaAnchors();

  List<String> sourceRefs();

  record BuildingFootprint(
      String id,
      String objectId,
      String kind,
      String shortLabel,
      String label,
      int floors,
      String footprintSource,
      String urbanRole,
      List<List<Double>> footprintLngLat) {}

  record StationAnchor(
      String id,
      String objectId,
      String kind,
      String shortLabel,
      String label,
      double lng,
      double lat,
      String sourceRef,
      List<String> aliases) {}

  record AreaAnchor(
      String id,
      String objectId,
      String kind,
      String shortLabel,
      String label,
      double lng,
      double lat,
      String sourceRef,
      String urbanRole) {}
}
