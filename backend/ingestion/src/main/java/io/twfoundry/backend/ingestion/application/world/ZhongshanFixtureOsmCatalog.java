package io.twfoundry.backend.ingestion.application.world;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
final class ZhongshanFixtureOsmCatalog {
  private static final String RESOURCE_PATH = "world/zhongshan-osm-fixture.json";
  private static final double MERCATOR_RADIUS_METERS = 6378137.0;
  private static final double ORIGIN_LNG = 121.5206;
  private static final double ORIGIN_LAT = 25.0527;
  private static final double SCENE_UNITS_PER_METER = 0.02;
  private static final LocalPoint MERCATOR_ORIGIN = mercatorPoint(ORIGIN_LNG, ORIGIN_LAT);

  private final FixturePayload payload;

  ZhongshanFixtureOsmCatalog(ObjectMapper objectMapper) {
    this.payload = loadPayload(objectMapper);
  }

  List<OsmBuilding> buildings() {
    return payload.buildings();
  }

  List<StationAnchor> stationAnchors() {
    return payload.stationAnchors();
  }

  List<OsmBuilding> roadClearBuildings() {
    return payload.buildings().stream()
        .filter(this::clearsRoadCorridors)
        .toList();
  }

  List<OsmPoi> pois() {
    return payload.pois();
  }

  List<OsmRoad> roads() {
    return payload.roads();
  }

  List<OsmArea> areas() {
    return payload.areas();
  }

  List<String> sourceRefs() {
    return payload.sourceRefs();
  }

  private FixturePayload loadPayload(ObjectMapper objectMapper) {
    try (InputStream input = getClass().getClassLoader().getResourceAsStream(RESOURCE_PATH)) {
      if (input == null) {
        throw new IllegalStateException("Missing Zhongshan OSM fixture resource: " + RESOURCE_PATH);
      }
      return normalize(objectMapper.readValue(input, FixturePayload.class));
    } catch (IOException exception) {
      throw new IllegalStateException("Unable to load Zhongshan OSM fixture resource: " + RESOURCE_PATH, exception);
    }
  }

  private static FixturePayload normalize(FixturePayload source) {
    FixturePayload payload = new FixturePayload(
        safeList(source.sourceRefs()),
        safeList(source.stationAnchors()),
        safeList(source.buildings()),
        safeList(source.pois()),
        safeList(source.roads()),
        safeList(source.areas()));
    validate(payload);
    return payload;
  }

  private static void validate(FixturePayload payload) {
    require(!payload.sourceRefs().isEmpty(), "sourceRefs must not be empty");
    payload.stationAnchors().forEach(station -> {
      validateCommon(station.id(), station.tags(), station.sourceRef(), "stationAnchor");
      require(station.objectId() != null && !station.objectId().isBlank(), "stationAnchor " + station.id() + " must contain objectId");
      require(station.lng() != 0 && station.lat() != 0, "stationAnchor " + station.id() + " must contain lng/lat");
    });
    payload.buildings().forEach(building -> {
      validateCommon(building.id(), building.tags(), building.sourceRef(), "building");
      validateRing(building.id(), building.footprintLngLat(), "building footprintLngLat");
    });
    payload.pois().forEach(poi -> {
      validateCommon(poi.id(), poi.tags(), poi.sourceRef(), "poi");
      require(poi.lng() != 0 && poi.lat() != 0, "poi " + poi.id() + " must contain lng/lat");
    });
    payload.roads().forEach(road -> {
      validateCommon(road.id(), road.tags(), road.sourceRef(), "road");
      require(road.widthMeters() > 0, "road " + road.id() + " must contain positive widthMeters");
      validatePath(road.id(), road.pathLngLat(), "road pathLngLat");
    });
    payload.areas().forEach(area -> {
      validateCommon(area.id(), area.tags(), area.sourceRef(), "area");
      validateRing(area.id(), area.footprintLngLat(), "area footprintLngLat");
    });
  }

  private static void validateCommon(String id, Map<String, String> tags, String sourceRef, String kind) {
    require(id != null && !id.isBlank(), kind + " must contain id");
    require(tags != null, kind + " " + id + " must contain tags");
    require(sourceRef != null && !sourceRef.isBlank(), kind + " " + id + " must contain sourceRef");
  }

  private static void validatePath(String id, List<List<Double>> path, String field) {
    require(path != null && path.size() >= 2, id + " " + field + " must contain at least two points");
    path.forEach(point -> validateLngLatPoint(id, point, field));
  }

  private static void validateRing(String id, List<List<Double>> ring, String field) {
    require(ring != null && ring.size() >= 4, id + " " + field + " must contain at least four points");
    ring.forEach(point -> validateLngLatPoint(id, point, field));
    require(ring.get(0).equals(ring.get(ring.size() - 1)), id + " " + field + " must be closed");
  }

  private static void validateLngLatPoint(String id, List<Double> point, String field) {
    require(point != null && point.size() >= 2, id + " " + field + " point must contain lng/lat");
    require(point.get(0) != null && point.get(1) != null, id + " " + field + " point must not contain null lng/lat");
  }

  private static void require(boolean condition, String message) {
    if (!condition) {
      throw new IllegalStateException("Invalid Zhongshan OSM fixture: " + message);
    }
  }

  private boolean clearsRoadCorridors(OsmBuilding building) {
    List<LocalPoint> ring = building.footprintLngLat().stream()
        .map(point -> localPoint(point.get(0), point.get(1)))
        .toList();
    return payload.roads().stream().allMatch(road -> {
      List<LocalPoint> path = road.pathLngLat().stream()
          .map(point -> localPoint(point.get(0), point.get(1)))
          .toList();
      double clearance = Math.max(0.24, road.widthMeters() * SCENE_UNITS_PER_METER * 1.15) / 2.0 + 0.03;
      for (int i = 0; i < path.size() - 1; i++) {
        if (pointInPolygon(path.get(i), ring) || pointInPolygon(path.get(i + 1), ring)) {
          return false;
        }
        for (int edgeIndex = 0; edgeIndex < ring.size() - 1; edgeIndex++) {
          if (segmentDistance(path.get(i), path.get(i + 1), ring.get(edgeIndex), ring.get(edgeIndex + 1)) < clearance) {
            return false;
          }
        }
      }
      return true;
    });
  }

  private static double segmentDistance(LocalPoint a, LocalPoint b, LocalPoint c, LocalPoint d) {
    if (segmentsIntersect(a, b, c, d)) {
      return 0.0;
    }
    return Math.min(
        Math.min(pointSegmentDistance(a, c, d), pointSegmentDistance(b, c, d)),
        Math.min(pointSegmentDistance(c, a, b), pointSegmentDistance(d, a, b)));
  }

  private static boolean segmentsIntersect(LocalPoint a, LocalPoint b, LocalPoint c, LocalPoint d) {
    double o1 = orientation(a, b, c);
    double o2 = orientation(a, b, d);
    double o3 = orientation(c, d, a);
    double o4 = orientation(c, d, b);
    if (o1 * o2 < 0 && o3 * o4 < 0) {
      return true;
    }
    return Math.abs(o1) < 0.000001 && onSegment(a, c, b)
        || Math.abs(o2) < 0.000001 && onSegment(a, d, b)
        || Math.abs(o3) < 0.000001 && onSegment(c, a, d)
        || Math.abs(o4) < 0.000001 && onSegment(c, b, d);
  }

  private static double orientation(LocalPoint a, LocalPoint b, LocalPoint c) {
    return (b.z() - a.z()) * (c.x() - b.x()) - (b.x() - a.x()) * (c.z() - b.z());
  }

  private static boolean onSegment(LocalPoint a, LocalPoint b, LocalPoint c) {
    return b.x() <= Math.max(a.x(), c.x()) + 0.000001
        && b.x() + 0.000001 >= Math.min(a.x(), c.x())
        && b.z() <= Math.max(a.z(), c.z()) + 0.000001
        && b.z() + 0.000001 >= Math.min(a.z(), c.z());
  }

  private static boolean pointInPolygon(LocalPoint point, List<LocalPoint> ring) {
    boolean inside = false;
    for (int i = 0, j = ring.size() - 1; i < ring.size(); j = i, i++) {
      LocalPoint pi = ring.get(i);
      LocalPoint pj = ring.get(j);
      double denominator = pj.z() - pi.z();
      if (Math.abs(denominator) < 0.000001) continue;
      boolean intersects = (pi.z() > point.z()) != (pj.z() > point.z())
          && point.x() < (pj.x() - pi.x()) * (point.z() - pi.z()) / denominator + pi.x();
      if (intersects) inside = !inside;
    }
    return inside;
  }

  private static double pointSegmentDistance(LocalPoint point, LocalPoint start, LocalPoint end) {
    double vx = end.x() - start.x();
    double vz = end.z() - start.z();
    double wx = point.x() - start.x();
    double wz = point.z() - start.z();
    double lengthSquared = vx * vx + vz * vz;
    if (lengthSquared <= 0.000001) {
      return Math.hypot(point.x() - start.x(), point.z() - start.z());
    }
    double t = Math.max(0.0, Math.min(1.0, (wx * vx + wz * vz) / lengthSquared));
    return Math.hypot(point.x() - (start.x() + t * vx), point.z() - (start.z() + t * vz));
  }

  private static LocalPoint localPoint(double lng, double lat) {
    LocalPoint mercator = mercatorPoint(lng, lat);
    return new LocalPoint(
        (mercator.x() - MERCATOR_ORIGIN.x()) * SCENE_UNITS_PER_METER,
        -(mercator.z() - MERCATOR_ORIGIN.z()) * SCENE_UNITS_PER_METER);
  }

  private static LocalPoint mercatorPoint(double lng, double lat) {
    return new LocalPoint(
        MERCATOR_RADIUS_METERS * Math.toRadians(lng),
        MERCATOR_RADIUS_METERS * Math.log(Math.tan(Math.PI / 4.0 + Math.toRadians(lat) / 2.0)));
  }

  private static <T> List<T> safeList(List<T> values) {
    return values == null ? List.of() : List.copyOf(values);
  }

  record FixturePayload(
      List<String> sourceRefs,
      List<StationAnchor> stationAnchors,
      List<OsmBuilding> buildings,
      List<OsmPoi> pois,
      List<OsmRoad> roads,
      List<OsmArea> areas) {}

  record StationAnchor(String id, String objectId, Map<String, String> tags, double lng, double lat, String sourceRef, List<String> aliases) {}

  record OsmBuilding(String id, Map<String, String> tags, List<List<Double>> footprintLngLat, String sourceRef) {}

  record OsmPoi(String id, Map<String, String> tags, double lng, double lat, String sourceRef) {}

  record OsmRoad(String id, Map<String, String> tags, double widthMeters, List<List<Double>> pathLngLat, String sourceRef) {}

  record OsmArea(String id, Map<String, String> tags, List<List<Double>> footprintLngLat, String sourceRef) {}

  private record LocalPoint(double x, double z) {}
}
