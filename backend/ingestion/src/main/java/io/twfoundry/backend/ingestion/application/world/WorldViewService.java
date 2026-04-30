package io.twfoundry.backend.ingestion.application.world;

import io.twfoundry.backend.ingestion.application.world.WorldView.ChunkProjection;
import io.twfoundry.backend.ingestion.application.world.WorldView.Completeness;
import io.twfoundry.backend.ingestion.application.world.WorldView.Diagnostics;
import io.twfoundry.backend.ingestion.application.world.WorldView.DioramaChunk;
import io.twfoundry.backend.ingestion.application.world.WorldView.Freshness;
import io.twfoundry.backend.ingestion.application.world.WorldView.GeoBounds;
import io.twfoundry.backend.ingestion.application.world.WorldView.GeoFeature;
import io.twfoundry.backend.ingestion.application.world.WorldView.GeoJSONGeometry;
import io.twfoundry.backend.ingestion.application.world.WorldView.Interaction;
import io.twfoundry.backend.ingestion.application.world.WorldView.LocalBounds;
import io.twfoundry.backend.ingestion.application.world.WorldView.LocalGeometry;
import io.twfoundry.backend.ingestion.application.world.WorldView.LocalPoint;
import io.twfoundry.backend.ingestion.application.world.WorldView.LocalTransform;
import io.twfoundry.backend.ingestion.application.world.WorldView.OntologyObject;
import io.twfoundry.backend.ingestion.application.world.WorldView.Payload;
import io.twfoundry.backend.ingestion.application.world.WorldView.Relationship;
import io.twfoundry.backend.ingestion.application.world.WorldView.RenderModuleDescriptor;
import io.twfoundry.backend.ingestion.application.world.WorldView.Request;
import io.twfoundry.backend.ingestion.application.world.WorldView.SemanticZone;
import io.twfoundry.backend.ingestion.application.world.WorldView.StaticFeatureProjection;
import io.twfoundry.backend.ingestion.application.world.WorldView.TerrainCell;
import io.twfoundry.backend.ingestion.application.world.WorldView.WorldFocus;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class WorldViewService {
  private static final String SCHEMA_VERSION = "world-view.v1";
  private static final List<String> DEFAULT_OVERLAYS = List.of("mrt", "rain", "pm25", "incident");
  private static final Set<String> SUPPORTED_OVERLAYS = new LinkedHashSet<>(DEFAULT_OVERLAYS);

  public Payload buildView(
      String focusId, String lod, String time, List<String> requestedOverlays, boolean debugGeo) {
    List<String> normalizedOverlays =
        requestedOverlays == null || requestedOverlays.isEmpty()
            ? DEFAULT_OVERLAYS
            : requestedOverlays.stream().filter(value -> value != null && !value.isBlank()).toList();
    List<String> activeOverlays =
        normalizedOverlays.stream().filter(SUPPORTED_OVERLAYS::contains).distinct().toList();
    List<String> missingOverlays =
        normalizedOverlays.stream().filter(value -> !SUPPORTED_OVERLAYS.contains(value)).distinct().toList();

    Request request =
        new Request(
            blankToDefault(focusId, "taipei-core"),
            blankToDefault(lod, "city"),
            blankToDefault(time, "live"),
            activeOverlays,
            debugGeo);
    List<GeoFeature> geoFeatures = geoFeatures();
    List<DioramaChunk> chunks = chunks();
    List<OntologyObject> objects = objects(geoFeatures);
    List<ChunkProjection> projections = projections(activeOverlays);
    Instant now = Instant.now();
    Completeness completeness =
        new Completeness(
            missingOverlays.isEmpty() ? "complete" : "partial",
            missingOverlays,
            missingOverlays.isEmpty()
                ? List.of()
                : List.of("Unsupported overlays were omitted from projections."));

    return new Payload(
        SCHEMA_VERSION,
        request,
        new WorldFocus(
            request.focusId(),
            "Taipei core diorama",
            new GeoBounds(121.4920, 25.0180, 121.5700, 25.0860),
            "taipei-core-v1"),
        chunks,
        filterObjects(objects, activeOverlays),
        projections,
        renderModules(),
        new Freshness("live".equals(request.time()) ? "live" : "replay", now.toString(), now.minusSeconds(12).toString(), 60),
        completeness,
        debugGeo ? new Diagnostics(true, geoFeatures, List.of("tdx:mrt-liveboard", "cwa:rainfall-mock", "epa:aqms-mock")) : null);
  }

  public OntologyObject findObject(String objectId) {
    return objects(geoFeatures()).stream()
        .filter(object -> object.id().equals(objectId))
        .findFirst()
        .orElseThrow(() -> new IllegalArgumentException("Unknown ontology object: " + objectId));
  }

  private List<OntologyObject> filterObjects(List<OntologyObject> objects, List<String> activeOverlays) {
    if (activeOverlays.isEmpty()) {
      return List.of();
    }
    return objects.stream()
        .filter(object -> activeOverlays.contains(String.valueOf(object.properties().get("overlay"))))
        .toList();
  }

  private List<DioramaChunk> chunks() {
    return List.of(
        new DioramaChunk(
            "chunk-taipei-core-west",
            "Taipei core west",
            new LocalPoint(-14, 0, 0),
            95,
            new LocalTransform(new LocalPoint(-14, 0, 0), 1, 0),
            new LocalBounds(-14, -12, 0, 12),
            terrain("west", "#F8DDE7"),
            List.of(
                stationAnchor("station-anchor-R10", "station-R10", -4, -2, "#E16B8C"),
                stationAnchor("station-anchor-BL12", "station-BL12", -7, 3, "#58B2DC")),
            List.of(zone("zone-downtown-west", "commercial", -10, -3, 8, 6, "#EFB1C5")),
            List.of("openfreemap:z14/x13624/y6194", "tdx:mrt-static")),
        new DioramaChunk(
            "chunk-taipei-core-east",
            "Taipei core east",
            new LocalPoint(0, 0, 0),
            95,
            new LocalTransform(new LocalPoint(0, 0, 0), 1, 0),
            new LocalBounds(0, -12, 14, 12),
            terrain("east", "#F4D7E2"),
            List.of(
                stationAnchor("station-anchor-R11", "station-R11", 2, -1, "#E16B8C"),
                stationAnchor("station-anchor-BL13", "station-BL13", 5, 3, "#58B2DC")),
            List.of(zone("zone-downtown-east", "residential", 1, -4, 9, 7, "#F7C7D5")),
            List.of("openfreemap:z14/x13625/y6194", "tdx:mrt-static")));
  }

  private List<TerrainCell> terrain(String prefix, String color) {
    List<TerrainCell> cells = new ArrayList<>();
    for (int x = 0; x < 4; x++) {
      for (int z = 0; z < 3; z++) {
        cells.add(new TerrainCell(prefix + "-cell-" + x + "-" + z, x, z, (x + z) % 3, "urban", color));
      }
    }
    return cells;
  }

  private StaticFeatureProjection stationAnchor(String id, String objectId, double x, double z, String color) {
    return new StaticFeatureProjection(
        id,
        "geo-" + objectId,
        objectId,
        "station-anchor",
        point(x, 0.35, z),
        Map.of("color", color, "opacity", 0.68, "size", "small"));
  }

  private SemanticZone zone(String id, String kind, double x, double z, double width, double depth, String color) {
    return new SemanticZone(
        id,
        kind,
        new LocalGeometry("Polygon", List.of(List.of(List.of(x, z), List.of(x + width, z), List.of(x + width, z + depth), List.of(x, z + depth), List.of(x, z)))),
        Map.of("color", color, "opacity", 0.26));
  }

  private List<GeoFeature> geoFeatures() {
    return List.of(
        new GeoFeature(
            "geo-route-red",
            "tdx:mrt-static",
            "mrt-route",
            lineString(List.of(List.of(121.516, 25.074), List.of(121.520, 25.061), List.of(121.525, 25.052))),
            Map.of("lineId", "red", "name", "Tamsui-Xinyi")),
        new GeoFeature(
            "geo-station-R10",
            "tdx:mrt-static",
            "mrt-station",
            pointGeo(121.520, 25.061),
            Map.of("stationId", "R10", "name", "Zhongshan")),
        new GeoFeature(
            "geo-station-BL12",
            "tdx:mrt-static",
            "mrt-station",
            pointGeo(121.516, 25.046),
            Map.of("stationId", "BL12", "name", "Taipei Main")),
        new GeoFeature(
            "geo-rain-R042",
            "cwa:rainfall-mock",
            "rainfall-cell",
            polygon(List.of(List.of(121.500, 25.074), List.of(121.538, 25.077), List.of(121.548, 25.050), List.of(121.507, 25.045), List.of(121.500, 25.074))),
            Map.of("intensityMmHr", 38, "confidence", 0.82)),
        new GeoFeature(
            "geo-incident-I237",
            "ops:incident-mock",
            "incident",
            pointGeo(121.531, 25.044),
            Map.of("severity", "medium", "kind", "road-work")));
  }

  private List<OntologyObject> objects(List<GeoFeature> geoFeatures) {
    Map<String, GeoFeature> featureById = new LinkedHashMap<>();
    geoFeatures.forEach(feature -> featureById.put(feature.id(), feature));
    return List.of(
        object(
            "route-R",
            "Route",
            "Tamsui-Xinyi",
            "tdx",
            "active",
            "淡水信義線 operational route object.",
            "mrt",
            Map.of("lineId", "red", "routeColor", "#E16B8C"),
            List.of(),
            featureById.get("geo-route-red")),
        object(
            "station-R10",
            "Station",
            "Zhongshan",
            "tdx",
            "normal",
            "台北捷運中山站，作為 diorama station anchor.",
            "mrt",
            Map.of("stationId", "R10", "lineId", "red"),
            List.of(new Relationship("belongs_to", "route-R", "Route", "Tamsui-Xinyi")),
            featureById.get("geo-station-R10")),
        object(
            "station-BL12",
            "Station",
            "Taipei Main",
            "tdx",
            "normal",
            "台北車站，板南線核心站點。",
            "mrt",
            Map.of("stationId", "BL12", "lineId", "blue"),
            List.of(new Relationship("near", "station-R10", "Station", "Zhongshan")),
            featureById.get("geo-station-BL12")),
        object(
            "train-R22",
            "Train",
            "Train R22",
            "tdx",
            "live",
            "淡水信義線列車，接近中山站。",
            "mrt",
            Map.of("route", "Tamsui-Xinyi", "nextStop", "Zhongshan", "etaMinutes", 2, "load", 0.67),
            List.of(
                new Relationship("belongs_to", "route-R", "Route", "Tamsui-Xinyi"),
                new Relationship("next_stop", "station-R10", "Station", "Zhongshan"),
                new Relationship("near", "rain-R042", "RainfallCell", "Rain Cell R-042")),
            null),
        object(
            "rain-R042",
            "RainfallCell",
            "Rain Cell R-042",
            "cwa",
            "intense",
            "跨越兩個 diorama chunk 的短時強降雨。",
            "rain",
            Map.of("intensityMmHr", 38, "confidence", 0.82, "trend", "rising"),
            List.of(
                new Relationship("affects", "train-R22", "Train", "Train R22"),
                new Relationship("covers", "chunk-taipei-core-west", "DioramaChunk", "Taipei core west"),
                new Relationship("covers", "chunk-taipei-core-east", "DioramaChunk", "Taipei core east")),
            featureById.get("geo-rain-R042")),
        object(
            "aq-A07",
            "Pm25Sensor",
            "AQMS A-07",
            "epa",
            "watch",
            "PM2.5 觀測點，用金色 haze module 呈現。",
            "pm25",
            Map.of("pm25", 31, "trend", "flat"),
            List.of(new Relationship("near", "station-BL12", "Station", "Taipei Main")),
            null),
        object(
            "incident-I237",
            "Incident",
            "Incident I-237",
            "ops",
            "open",
            "道路施工事件，與雨量和捷運 headway 形成跨 domain context.",
            "incident",
            Map.of("severity", "medium", "kind", "road-work", "radiusMeters", 600),
            List.of(
                new Relationship("near", "station-BL12", "Station", "Taipei Main"),
                new Relationship("coincident_with", "rain-R042", "RainfallCell", "Rain Cell R-042")),
            featureById.get("geo-incident-I237")));
  }

  private OntologyObject object(
      String id,
      String type,
      String name,
      String source,
      String status,
      String summary,
      String overlay,
      Map<String, Object> properties,
      List<Relationship> relationships,
      GeoFeature geoFeature) {
    Map<String, Object> merged = new LinkedHashMap<>();
    merged.put("overlay", overlay);
    merged.putAll(properties);
    return new OntologyObject(id, type, name, source, status, summary, merged, relationships, geoFeature);
  }

  private List<ChunkProjection> projections(List<String> overlays) {
    List<ChunkProjection> projections = new ArrayList<>();
    if (overlays.contains("mrt")) {
      projections.add(
          projection(
              "proj-train-R22-west",
              "train-R22",
              "chunk-taipei-core-west",
              "mrt",
              "voxel.mrt.train",
              line(List.of(List.of(-6.5, 0.7, -1.8), List.of(-4.5, 0.7, -1.2))),
              Map.of("lineColor", "#E16B8C", "direction", "southbound", "cars", 3),
              "Train R22 · ETA 2m"));
      projections.add(
          projection(
              "proj-route-R-west",
              "route-R",
              "chunk-taipei-core-west",
              "mrt",
              "voxel.mrt.route",
              line(List.of(List.of(-10.0, 0.25, -5.0), List.of(-6.0, 0.25, -2.0), List.of(-3.0, 0.25, 1.0))),
              Map.of("lineColor", "#E16B8C", "thickness", 0.12),
              "Tamsui-Xinyi"));
      projections.add(
          projection(
              "proj-route-R-east",
              "route-R",
              "chunk-taipei-core-east",
              "mrt",
              "voxel.mrt.route",
              line(List.of(List.of(0.0, 0.25, 1.0), List.of(4.0, 0.25, 1.8), List.of(9.0, 0.25, -2.0))),
              Map.of("lineColor", "#E16B8C", "thickness", 0.12),
              "Tamsui-Xinyi"));
    }
    if (overlays.contains("rain")) {
      projections.add(
          projection(
              "proj-rain-R042-west",
              "rain-R042",
              "chunk-taipei-core-west",
              "rain",
              "voxel.weather.rainCell",
              volume(-8, -5, 8, 9),
              Map.of("color", "#81C7D4", "opacity", 0.28, "intensityMmHr", 38),
              "Rain Cell R-042 · 38 mm/h"));
      projections.add(
          projection(
              "proj-rain-R042-east",
              "rain-R042",
              "chunk-taipei-core-east",
              "rain",
              "voxel.weather.rainCell",
              volume(0, -6, 10, 8),
              Map.of("color", "#81C7D4", "opacity", 0.22, "intensityMmHr", 38),
              "Rain Cell R-042 · east edge"));
    }
    if (overlays.contains("pm25")) {
      projections.add(
          projection(
              "proj-aq-A07-east",
              "aq-A07",
              "chunk-taipei-core-east",
              "pm25",
              "voxel.air.haze",
              point(5, 1.2, 5),
              Map.of("color", "#FFB11B", "opacity", 0.34, "pm25", 31),
              "AQMS A-07 · PM2.5 31"));
    }
    if (overlays.contains("incident")) {
      projections.add(
          projection(
              "proj-incident-I237-east",
              "incident-I237",
              "chunk-taipei-core-east",
              "incident",
              "voxel.ops.incidentPulse",
              point(4, 0.9, -2),
              Map.of("color", "#B481BB", "severity", "medium", "pulse", true),
              "Incident I-237 · road work"));
    }
    return projections;
  }

  private ChunkProjection projection(
      String id,
      String objectId,
      String chunkId,
      String overlay,
      String renderModule,
      LocalGeometry geometry,
      Map<String, Object> visualState,
      String hoverLabel) {
    return new ChunkProjection(
        id,
        objectId,
        chunkId,
        overlay,
        renderModule,
        geometry,
        visualState,
        new Interaction(true, hoverLabel));
  }

  private List<RenderModuleDescriptor> renderModules() {
    return List.of(
        new RenderModuleDescriptor("voxel.mrt.train", "entity", List.of("select", "hover", "animate"), Map.of("scale", 1.0)),
        new RenderModuleDescriptor("voxel.mrt.route", "line", List.of("hover"), Map.of("radius", 0.12)),
        new RenderModuleDescriptor("voxel.weather.rainCell", "volume", List.of("select", "hover", "pulse"), Map.of("opacity", 0.25)),
        new RenderModuleDescriptor("voxel.air.haze", "volume", List.of("hover", "pulse"), Map.of("opacity", 0.3)),
        new RenderModuleDescriptor("voxel.ops.incidentPulse", "marker", List.of("select", "hover", "pulse"), Map.of("pulse", true)));
  }

  private LocalGeometry point(double x, double y, double z) {
    return new LocalGeometry("Point", List.of(x, y, z));
  }

  private LocalGeometry line(List<List<Double>> coordinates) {
    return new LocalGeometry("LineString", coordinates);
  }

  private LocalGeometry volume(double x, double z, double width, double depth) {
    return new LocalGeometry(
        "Polygon",
        List.of(List.of(List.of(x, z), List.of(x + width, z), List.of(x + width, z + depth), List.of(x, z + depth), List.of(x, z))));
  }

  private GeoJSONGeometry pointGeo(double lng, double lat) {
    return new GeoJSONGeometry("Point", List.of(lng, lat));
  }

  private GeoJSONGeometry lineString(List<List<Double>> coordinates) {
    return new GeoJSONGeometry("LineString", coordinates);
  }

  private GeoJSONGeometry polygon(List<List<Double>> ring) {
    return new GeoJSONGeometry("Polygon", List.of(ring));
  }

  private String blankToDefault(String value, String defaultValue) {
    return value == null || value.isBlank() ? defaultValue : value;
  }
}
