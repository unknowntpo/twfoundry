package io.twfoundry.backend.streams.bus;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

public final class RouteGeometry {
  private RouteGeometry() {}

  public static final double EARTH_RADIUS_METERS = 6_371_008.8;

  public record Point(double longitude, double latitude) implements Serializable {}

  public record Projection(
      double longitude,
      double latitude,
      double progressMeters,
      double progressRatio,
      double distanceToRouteMeters
  ) implements Serializable {}

  public record RouteShape(String routeUid, int direction, List<Point> points, double totalMeters) implements Serializable {
    public RouteShape {
      points = List.copyOf(points);
    }
  }

  public static List<Point> parseLineStringGeometry(String geometry) {
    String value = String.valueOf(geometry == null ? "" : geometry).trim();
    if (!value.regionMatches(true, 0, "LINESTRING", 0, "LINESTRING".length())) {
      return List.of();
    }
    int start = value.indexOf('(');
    int end = value.lastIndexOf(')');
    if (start < 0 || end <= start) return List.of();

    List<Point> points = new ArrayList<>();
    for (String pair : value.substring(start + 1, end).split(",")) {
      String[] parts = pair.trim().split("\\s+");
      if (parts.length < 2) continue;
      double longitude = parseDouble(parts[0]);
      double latitude = parseDouble(parts[1]);
      if (Double.isFinite(longitude) && Double.isFinite(latitude)) {
        points.add(new Point(longitude, latitude));
      }
    }
    return points;
  }

  public static RouteShape buildRouteShape(String routeUid, int direction, List<Point> points) {
    double totalMeters = 0.0;
    for (int index = 1; index < points.size(); index += 1) {
      totalMeters += haversineMeters(points.get(index - 1), points.get(index));
    }
    return new RouteShape(routeUid, direction, points, totalMeters);
  }

  public static Optional<Projection> projectPointToRoute(Point point, RouteShape shape) {
    if (shape.points().size() < 2 || shape.totalMeters() <= 0) return Optional.empty();

    Projection best = null;
    double startMeters = 0.0;
    for (int index = 1; index < shape.points().size(); index += 1) {
      Point from = shape.points().get(index - 1);
      Point to = shape.points().get(index);
      double segmentMeters = haversineMeters(from, to);
      SegmentProjection projected = projectPointToSegment(point, from, to);
      double progressMeters = startMeters + projected.t() * segmentMeters;
      Projection candidate = new Projection(
          projected.point().longitude(),
          projected.point().latitude(),
          progressMeters,
          progressMeters / shape.totalMeters(),
          projected.distanceMeters()
      );
      if (best == null || candidate.distanceToRouteMeters() < best.distanceToRouteMeters()) {
        best = candidate;
      }
      startMeters += segmentMeters;
    }
    return Optional.ofNullable(best);
  }

  private record LocalPoint(double x, double y) {}

  private record SegmentProjection(double t, Point point, double distanceMeters) {}

  private static SegmentProjection projectPointToSegment(Point point, Point from, Point to) {
    double originLat = point.latitude();
    LocalPoint localPoint = lngLatToLocalMeters(point, point, originLat);
    LocalPoint localFrom = lngLatToLocalMeters(from, point, originLat);
    LocalPoint localTo = lngLatToLocalMeters(to, point, originLat);
    double dx = localTo.x() - localFrom.x();
    double dy = localTo.y() - localFrom.y();
    double lengthSquared = dx * dx + dy * dy;
    double t = lengthSquared == 0.0
        ? 0.0
        : clamp(((localPoint.x() - localFrom.x()) * dx + (localPoint.y() - localFrom.y()) * dy) / lengthSquared, 0.0, 1.0);
    LocalPoint projectedLocal = new LocalPoint(localFrom.x() + dx * t, localFrom.y() + dy * t);
    Point projected = localMetersToLngLat(projectedLocal, point, originLat);
    return new SegmentProjection(
        t,
        projected,
        Math.hypot(localPoint.x() - projectedLocal.x(), localPoint.y() - projectedLocal.y())
    );
  }

  private static LocalPoint lngLatToLocalMeters(Point point, Point origin, double originLat) {
    double latScale = Math.PI / 180.0 * EARTH_RADIUS_METERS;
    double lonScale = latScale * Math.cos(Math.toRadians(originLat));
    return new LocalPoint(
        (point.longitude() - origin.longitude()) * lonScale,
        (point.latitude() - origin.latitude()) * latScale
    );
  }

  private static Point localMetersToLngLat(LocalPoint point, Point origin, double originLat) {
    double latScale = Math.PI / 180.0 * EARTH_RADIUS_METERS;
    double lonScale = latScale * Math.cos(Math.toRadians(originLat));
    return new Point(
        origin.longitude() + point.x() / lonScale,
        origin.latitude() + point.y() / latScale
    );
  }

  private static double haversineMeters(Point left, Point right) {
    double lat1 = Math.toRadians(left.latitude());
    double lat2 = Math.toRadians(right.latitude());
    double deltaLat = Math.toRadians(right.latitude() - left.latitude());
    double deltaLon = Math.toRadians(right.longitude() - left.longitude());
    double a = Math.sin(deltaLat / 2.0) * Math.sin(deltaLat / 2.0)
        + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2.0) * Math.sin(deltaLon / 2.0);
    return 2.0 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
  }

  private static double parseDouble(String value) {
    try {
      return Double.parseDouble(value);
    } catch (NumberFormatException ignored) {
      return Double.NaN;
    }
  }

  private static double clamp(double value, double min, double max) {
    return Math.min(max, Math.max(min, value));
  }
}
