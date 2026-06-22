package io.twfoundry.backend.streams.bus;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;

class RouteGeometryTest {
  @Test
  void projectsPointToLineStringProgress() {
    List<RouteGeometry.Point> points = RouteGeometry.parseLineStringGeometry("LINESTRING (121.0 25.0, 121.1 25.0)");
    RouteGeometry.RouteShape shape = RouteGeometry.buildRouteShape("TPE1", 0, points);

    RouteGeometry.Projection projection = RouteGeometry.projectPointToRoute(
        new RouteGeometry.Point(121.05, 25.001),
        shape
    ).orElseThrow();

    assertEquals(0.5, projection.progressRatio(), 0.02);
    assertTrue(projection.distanceToRouteMeters() > 0);
  }
}
