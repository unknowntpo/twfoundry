package io.twfoundry.backend.streams.bus;

import static io.twfoundry.backend.streams.bus.RouteGeometry.Point;
import static io.twfoundry.backend.streams.bus.RouteGeometry.RouteShape;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.io.Serializable;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public final class RouteGeometryIndex implements Serializable {
  private final Map<String, RouteShape> byRouteDirection;

  public RouteGeometryIndex(Map<String, RouteShape> byRouteDirection) {
    this.byRouteDirection = Map.copyOf(byRouteDirection);
  }

  public static RouteGeometryIndex empty() {
    return new RouteGeometryIndex(Map.of());
  }

  public static RouteGeometryIndex loadFromRouteContextDirectory(Path directory) throws IOException {
    ObjectMapper mapper = new ObjectMapper();
    Map<String, RouteShape> routes = new HashMap<>();
    if (!Files.isDirectory(directory)) return new RouteGeometryIndex(routes);

    try (var stream = Files.list(directory)) {
      Iterator<Path> files = stream
          .filter(path -> path.getFileName().toString().endsWith(".json"))
          .filter(path -> !path.getFileName().toString().equals("manifest.json"))
          .iterator();
      while (files.hasNext()) {
        JsonNode root = mapper.readTree(files.next().toFile());
        for (JsonNode shape : root.path("shapes")) {
          String routeUid = shape.path("RouteUID").asText("");
          int direction = shape.path("Direction").asInt(-1);
          List<Point> points = RouteGeometry.parseLineStringGeometry(shape.path("Geometry").asText(""));
          if (routeUid.isBlank() || direction < 0 || points.size() < 2) continue;
          RouteShape routeShape = RouteGeometry.buildRouteShape(routeUid, direction, points);
          routes.put(key(routeUid, direction), routeShape);
        }
      }
    }
    return new RouteGeometryIndex(routes);
  }

  public Optional<EnrichedBusVehicleObservation> enrich(NormalizedBusVehiclePosition position, double maxDistanceMeters) {
    if (!position.hasRequiredPosition()) return Optional.empty();
    RouteShape shape = byRouteDirection.get(key(position.routeUid(), position.direction()));
    if (shape == null) return Optional.empty();

    return RouteGeometry.projectPointToRoute(new Point(position.longitude(), position.latitude()), shape)
        .filter(projection -> projection.distanceToRouteMeters() <= maxDistanceMeters)
        .map(projection -> new EnrichedBusVehicleObservation(
            position.slotKey(),
            position.serviceDate(),
            position.routeUid(),
            position.routeName(),
            position.direction(),
            position.vehicleId(),
            position.longitude(),
            position.latitude(),
            projection.progressRatio(),
            projection.distanceToRouteMeters(),
            position.speedKph(),
            position.gpsTime(),
            position.updateTime()
        ));
  }

  private static String key(String routeUid, int direction) {
    return routeUid + "|" + direction;
  }
}
