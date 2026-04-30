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
import io.twfoundry.backend.ingestion.application.world.WorldView.SourceFreshness;
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
  private static final List<String> DEFAULT_OVERLAYS = List.of("mrt", "bus", "ubike", "rain", "pm25", "incident");
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
            blankToDefault(focusId, "zhongshan-station"),
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
            "Zhongshan Station / Nanjing West Road",
            new GeoBounds(121.5165, 25.0492, 121.5248, 25.0558),
            "zhongshan-station-v1"),
        chunks,
        filterObjects(objects, activeOverlays),
        projections,
        renderModules(),
        freshness(request, now),
        completeness,
        debugGeo ? new Diagnostics(true, geoFeatures, List.of("tdx:mrt-liveboard", "cwa:rainfall-mock", "epa:aqms-mock")) : null);
  }

  private Freshness freshness(Request request, Instant now) {
    List<SourceFreshness> sources =
        List.of(
            new SourceFreshness("tdx:mrt-liveboard", "live", now.minusSeconds(12).toString(), 12),
            new SourceFreshness("tdx:bus-eta-mock", "live", now.minusSeconds(18).toString(), 18),
            new SourceFreshness("tdx:bike-availability-mock", "live", now.minusSeconds(22).toString(), 22),
            new SourceFreshness("cwa:rainfall-mock", "live", now.minusSeconds(36).toString(), 36),
            new SourceFreshness("epa:aqms-mock", "live", now.minusSeconds(58).toString(), 58));
    int maxLag = sources.stream().mapToInt(SourceFreshness::lagSeconds).max().orElse(0);
    return new Freshness("live".equals(request.time()) ? "live" : "replay", now.toString(), maxLag, sources);
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
            "chunk-zhongshan-station",
            "Zhongshan Station / Nanjing West Road",
            new LocalPoint(0, 0, 0),
            24,
            new LocalTransform(new LocalPoint(0, 0, 0), 1, 0),
            new LocalBounds(-9, -7, 9, 7),
            zhongshanTerrain(),
            List.of(
                stationAnchor("station-anchor-R11-G14", "station-R11-G14", 0, 0, "#E16B8C"),
                building("building-shin-kong-nanxi", "landmark-shin-kong-nanxi", "department-store", -2.8, -2.2, 5, 1.6, 1.3, "#F596AA", "#FFB11B", true),
                building("building-eslite-nanxi", "landmark-eslite-nanxi", "bookstore-mall", 2.4, -2.0, 4, 1.45, 1.1, "#FFD2DC", "#81C7D4", true),
                building("building-linsen-lane", null, "lane-shop", 4.2, 2.6, 3, 1.1, 1.2, "#F8DDE7", "#B5CAA0", false),
                building("building-chifeng-maker", null, "lane-shop", -4.4, 2.8, 2, 1.0, 1.0, "#F3E5DA", "#E16B8C", false)),
            List.of(
                zone("zone-nanxi-shopping", "shopping-corridor", -5, -3.5, 10, 3.2, "#F596AA"),
                zone("zone-chifeng-lanes", "creative-lanes", -6, 1.2, 6, 4.2, "#FFB11B"),
                zone("zone-linsen-bus", "bus-corridor", 1.2, 0.8, 6.5, 2.6, "#5DAC81")),
            List.of("openfreemap:zhongshan-station-focus", "tdx:mrt-static", "tdx:bus-mock", "tdx:bike-mock")));
  }

  private List<TerrainCell> zhongshanTerrain() {
    List<TerrainCell> cells = new ArrayList<>();
    for (int x = -8; x <= 8; x++) {
      for (int z = -6; z <= 6; z++) {
        String kind = "shopping";
        int height = 1;
        String color = "#FFD2DC";
        if (z == 0 || x == 0) {
          kind = "street";
          height = 1;
          color = "#E7D6C6";
        } else if (x < -3 && z > 1) {
          kind = "alley";
          height = 1;
          color = "#F3E5DA";
        } else if (x > 3 && z > 1) {
          kind = "plaza";
          height = 1;
          color = "#FFF7FA";
        } else if (Math.abs(x) < 3 && z < -2) {
          kind = "landmark";
          height = 2;
          color = "#F596AA";
        }
        cells.add(new TerrainCell("zhongshan-cell-" + x + "-" + z, x, z, height, kind, color));
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

  private StaticFeatureProjection building(
      String id,
      String objectId,
      String kind,
      double x,
      double z,
      int floors,
      double width,
      double depth,
      String color,
      String signColor,
      boolean sign) {
    return new StaticFeatureProjection(
        id,
        "geo-" + id,
        objectId,
        kind,
        point(x, 0, z),
        Map.of(
            "floors", floors,
            "width", width,
            "depth", depth,
            "color", color,
            "accentColor", color,
            "signColor", signColor,
            "sign", sign));
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
            lineString(List.of(List.of(121.5201, 25.0560), List.of(121.5206, 25.0527), List.of(121.5210, 25.0494))),
            Map.of("lineId", "red", "name", "Tamsui-Xinyi")),
        new GeoFeature(
            "geo-station-R11-G14",
            "tdx:mrt-static",
            "mrt-station",
            pointGeo(121.5206, 25.0527),
            Map.of("stationId", "R11/G14", "name", "Zhongshan")),
        new GeoFeature(
            "geo-bus-stop-nanxi",
            "tdx:bus-stop-mock",
            "bus-stop",
            pointGeo(121.5190, 25.0528),
            Map.of("stopName", "MRT Zhongshan Station", "route", "304", "etaMinutes", 3)),
        new GeoFeature(
            "geo-ubike-zhongshan",
            "tdx:bike-station-mock",
            "bike-station",
            pointGeo(121.5212, 25.0524),
            Map.of("stationName", "YouBike MRT Zhongshan Station", "availableBikes", 11, "availableDocks", 9)),
        new GeoFeature(
            "geo-landmark-shin-kong-nanxi",
            "osm:mock",
            "landmark",
            pointGeo(121.5200, 25.0520),
            Map.of("name", "Shin Kong Mitsukoshi Nanxi", "kind", "department-store")),
        new GeoFeature(
            "geo-rain-R042",
            "cwa:rainfall-mock",
            "rainfall-cell",
            polygon(List.of(List.of(121.5168, 25.0555), List.of(121.5245, 25.0554), List.of(121.5242, 25.0500), List.of(121.5174, 25.0497), List.of(121.5168, 25.0555))),
            Map.of("intensityMmHr", 38, "confidence", 0.82)),
        new GeoFeature(
            "geo-incident-I237",
            "ops:incident-mock",
            "incident",
            pointGeo(121.5229, 25.0536),
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
            "station-R11-G14",
            "Station",
            "Zhongshan",
            "tdx",
            "normal",
            "台北捷運中山站 R11/G14，作為南西商圈 diorama anchor.",
            "mrt",
            Map.of("stationId", "R11/G14", "lineId", "red-green", "area", "Nanjing West Road"),
            List.of(new Relationship("belongs_to", "route-R", "Route", "Tamsui-Xinyi")),
            featureById.get("geo-station-R11-G14")),
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
                new Relationship("next_stop", "station-R11-G14", "Station", "Zhongshan"),
                new Relationship("near", "rain-R042", "RainfallCell", "Rain Cell R-042")),
            null),
        object(
            "bus-stop-nanxi",
            "BusStop",
            "MRT Zhongshan Station Bus Stop",
            "tdx",
            "live",
            "南京西路與中山北路周邊公車站牌，顯示候車與到站預估。",
            "bus",
            Map.of("stopName", "捷運中山站", "route", "304", "etaMinutes", 3, "waiting", 4),
            List.of(
                new Relationship("near", "station-R11-G14", "Station", "Zhongshan"),
                new Relationship("served_by", "bus-arrival-304", "BusArrival", "304 · 3 min")),
            featureById.get("geo-bus-stop-nanxi")),
        object(
            "ubike-zhongshan",
            "BikeStation",
            "YouBike MRT Zhongshan Station",
            "tdx",
            "live",
            "捷運中山站周邊 YouBike 站點，用 dock 與可借車數呈現。",
            "ubike",
            Map.of("stationName", "捷運中山站", "availableBikes", 11, "availableDocks", 9, "capacity", 20),
            List.of(new Relationship("near", "station-R11-G14", "Station", "Zhongshan")),
            featureById.get("geo-ubike-zhongshan")),
        object(
            "landmark-shin-kong-nanxi",
            "Landmark",
            "Shin Kong Mitsukoshi Nanxi",
            "osm",
            "reference",
            "中山南西商圈百貨地標，作為 voxel chunk 的方向錨點。",
            "mrt",
            Map.of("kind", "department-store", "district", "Nanxi shopping corridor"),
            List.of(new Relationship("near", "station-R11-G14", "Station", "Zhongshan")),
            featureById.get("geo-landmark-shin-kong-nanxi")),
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
                new Relationship("affects", "bus-stop-nanxi", "BusStop", "MRT Zhongshan Station Bus Stop"),
                new Relationship("covers", "chunk-zhongshan-station", "DioramaChunk", "Zhongshan Station / Nanjing West Road")),
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
            List.of(new Relationship("near", "station-R11-G14", "Station", "Zhongshan")),
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
                new Relationship("near", "station-R11-G14", "Station", "Zhongshan"),
                new Relationship("affects", "bus-stop-nanxi", "BusStop", "MRT Zhongshan Station Bus Stop"),
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
              "chunk-zhongshan-station",
              "mrt",
              "voxel.mrt.train",
              line(List.of(List.of(-1.1, 1.1, -2.8), List.of(-0.2, 1.1, -0.4))),
              Map.of("lineColor", "#E16B8C", "direction", "southbound", "cars", 3),
              "Train R22 · ETA 2m"));
      projections.add(
          projection(
              "proj-route-R-zhongshan",
              "route-R",
              "chunk-zhongshan-station",
              "mrt",
              "voxel.mrt.route",
              line(List.of(List.of(-1.4, 0.45, -6.0), List.of(-0.6, 0.45, -2.5), List.of(0.0, 0.45, 0.0), List.of(0.6, 0.45, 5.6))),
              Map.of("lineColor", "#E16B8C", "thickness", 0.12),
              "Tamsui-Xinyi"));
      projections.add(
          projection(
              "proj-route-G-zhongshan",
              "route-R",
              "chunk-zhongshan-station",
              "mrt",
              "voxel.mrt.route",
              line(List.of(List.of(-7.0, 0.42, 0.4), List.of(-2.2, 0.42, 0.1), List.of(0.0, 0.42, 0.0), List.of(6.6, 0.42, -0.3))),
              Map.of("lineColor", "#5DAC81", "thickness", 0.1),
              "Songshan-Xindian through Zhongshan"));
    }
    if (overlays.contains("bus")) {
      projections.add(
          projection(
              "proj-bus-stop-nanxi",
              "bus-stop-nanxi",
              "chunk-zhongshan-station",
              "bus",
              "voxel.bus.stop",
              point(3.2, 0.45, 1.3),
              Map.of("color", "#5DAC81", "waiting", 4, "etaMinutes", 3),
              "Bus 304 · 3 min · 4 waiting"));
    }
    if (overlays.contains("ubike")) {
      projections.add(
          projection(
              "proj-ubike-zhongshan",
              "ubike-zhongshan",
              "chunk-zhongshan-station",
              "ubike",
              "voxel.ubike.dock",
              point(2.4, 0.45, -1.8),
              Map.of("color", "#FFB11B", "docks", 10, "availableBikes", 6),
              "YouBike · 11 bikes / 9 docks"));
    }
    if (overlays.contains("rain")) {
      projections.add(
          projection(
              "proj-rain-R042-zhongshan",
              "rain-R042",
              "chunk-zhongshan-station",
              "rain",
              "voxel.weather.rainCell",
              volume(-4.5, -4.2, 8.5, 6.2),
              Map.of("color", "#81C7D4", "opacity", 0.10, "intensityMmHr", 18),
              "Rain Cell R-042 · 38 mm/h"));
    }
    if (overlays.contains("pm25")) {
      projections.add(
          projection(
              "proj-aq-A07-zhongshan",
              "aq-A07",
              "chunk-zhongshan-station",
              "pm25",
              "voxel.air.haze",
              point(-5.5, 1.2, 3.8),
              Map.of("color", "#FFB11B", "opacity", 0.34, "pm25", 31),
              "AQMS A-07 · PM2.5 31"));
    }
    if (overlays.contains("incident")) {
      projections.add(
          projection(
              "proj-incident-I237-zhongshan",
              "incident-I237",
              "chunk-zhongshan-station",
              "incident",
              "voxel.ops.incidentPulse",
              point(5.2, 0.9, 2.6),
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
        new RenderModuleDescriptor("voxel.bus.stop", "entity", List.of("select", "hover"), Map.of("waiting", true)),
        new RenderModuleDescriptor("voxel.ubike.dock", "entity", List.of("select", "hover"), Map.of("dockCount", true)),
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
