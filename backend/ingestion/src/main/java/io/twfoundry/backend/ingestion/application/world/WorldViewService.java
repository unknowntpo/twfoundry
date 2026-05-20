package io.twfoundry.backend.ingestion.application.world;

import io.twfoundry.backend.ingestion.application.world.WorldView.ChunkProjection;
import io.twfoundry.backend.ingestion.application.world.WorldView.Completeness;
import io.twfoundry.backend.ingestion.application.world.WorldView.CoordinateSystem;
import io.twfoundry.backend.ingestion.application.world.WorldView.Diagnostics;
import io.twfoundry.backend.ingestion.application.world.WorldView.DioramaChunk;
import io.twfoundry.backend.ingestion.application.world.WorldView.Freshness;
import io.twfoundry.backend.ingestion.application.world.WorldView.GeoBounds;
import io.twfoundry.backend.ingestion.application.world.WorldView.GeoFeature;
import io.twfoundry.backend.ingestion.application.world.WorldView.GeoJSONGeometry;
import io.twfoundry.backend.ingestion.application.world.WorldView.GroundFeature;
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
  private static final GeoBounds ZHONGSHAN_GEO_BOUNDS = new GeoBounds(121.5165, 25.0492, 121.5248, 25.0558);
  private static final double MERCATOR_RADIUS_METERS = 6378137.0;
  private static final double ORIGIN_LNG = 121.5206;
  private static final double ORIGIN_LAT = 25.0527;
  private static final double SCENE_UNITS_PER_METER = 0.02;
  private static final MercatorPoint MERCATOR_ORIGIN = mercatorMeters(ORIGIN_LNG, ORIGIN_LAT);
  private static final LocalBounds ZHONGSHAN_LOCAL_BOUNDS = localBoundsFromGeoBounds(ZHONGSHAN_GEO_BOUNDS);
  private final StaticFeatureStyleResolver staticFeatureStyleResolver = new StaticFeatureStyleResolver();
  private final StaticFeatureProvider staticFeatureProvider;
  private final ZhongshanFixtureOsmCatalog osmCatalog;

  public WorldViewService(StaticFeatureProvider staticFeatureProvider, ZhongshanFixtureOsmCatalog osmCatalog) {
    this.staticFeatureProvider = staticFeatureProvider;
    this.osmCatalog = osmCatalog;
  }

  public Payload buildView(
      String focusId, String lod, String time, List<String> requestedOverlays, boolean debugGeo) {
    String effectiveFocusId = blankToDefault(focusId, "zhongshan-station");
    if (!"zhongshan-station".equals(effectiveFocusId)) {
      throw new IllegalArgumentException("Unsupported world view focus: " + effectiveFocusId);
    }
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
            effectiveFocusId,
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
            ZHONGSHAN_GEO_BOUNDS,
            "zhongshan-station-v1"),
        chunks,
        filterObjects(objects, activeOverlays, chunks, projections),
        projections,
        renderModules(),
        freshness(request, now),
        completeness,
        coordinateSystem(),
        debugGeo ? new Diagnostics(true, geoFeatures, List.of("tdx:mrt-liveboard", "cwa:rainfall-mock", "epa:aqms-mock")) : null);
  }

  private CoordinateSystem coordinateSystem() {
    return new CoordinateSystem(
        "zhongshan-web-mercator-local-v1",
        "EPSG:3857 Web Mercator",
        ORIGIN_LNG,
        ORIGIN_LAT,
        SCENE_UNITS_PER_METER,
        "east",
        "south");
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

  private List<OntologyObject> filterObjects(
      List<OntologyObject> objects,
      List<String> activeOverlays,
      List<DioramaChunk> chunks,
      List<ChunkProjection> projections) {
    Set<String> referencedObjectIds = new LinkedHashSet<>();
    chunks.stream()
        .flatMap(chunk -> chunk.staticFeatures().stream())
        .map(StaticFeatureProjection::ontologyObjectId)
        .filter(id -> id != null && !id.isBlank())
        .forEach(referencedObjectIds::add);
    projections.stream()
        .map(ChunkProjection::objectId)
        .filter(id -> id != null && !id.isBlank())
        .forEach(referencedObjectIds::add);

    return objects.stream()
        .filter(
            object ->
                referencedObjectIds.contains(object.id())
                    || activeOverlays.contains(String.valueOf(object.properties().get("overlay"))))
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
            ZHONGSHAN_LOCAL_BOUNDS,
            groundFeatures(),
            List.of(),
            staticFeatures(),
            List.of(
                zone("zone-nanxi-shopping", "shopping-corridor", -5, -3.5, 10, 3.2, "#F596AA"),
                zone("zone-chifeng-lanes", "creative-lanes", -6, 1.2, 6, 4.2, "#FFB11B"),
                zone("zone-linsen-bus", "bus-corridor", 1.2, 0.8, 6.5, 2.6, "#5DAC81")),
            chunkSourceRefs()));
  }

  private List<String> chunkSourceRefs() {
    Set<String> sourceRefs = new LinkedHashSet<>();
    sourceRefs.add("openfreemap:zhongshan-station-focus");
    sourceRefs.add("tdx:mrt-static");
    sourceRefs.add("tdx:bus-mock");
    sourceRefs.add("tdx:bike-mock");
    sourceRefs.add("openstreetmap:road-corridor-contract");
    sourceRefs.addAll(osmCatalog.sourceRefs());
    sourceRefs.addAll(staticFeatureProvider.sourceRefs());
    return List.copyOf(sourceRefs);
  }

  private List<GroundFeature> groundFeatures() {
    List<GroundFeature> features = new ArrayList<>();
    osmCatalog.roads().stream()
        .map(this::roadGroundFeature)
        .forEach(features::add);
    osmCatalog.areas().stream()
        .map(this::areaGroundFeature)
        .forEach(features::add);
    return List.copyOf(features);
  }

  private GroundFeature roadGroundFeature(ZhongshanFixtureOsmCatalog.OsmRoad source) {
    List<List<Double>> localPath = source.pathLngLat().stream()
        .map(point -> {
          LocalPoint localPoint = localPointFromLngLat(point.get(0), point.get(1), 0);
          return List.of(localPoint.x(), localPoint.y(), localPoint.z());
        })
        .toList();
    String name = source.tags().getOrDefault("name:zh", source.tags().get("name"));
    Map<String, Object> visualState = new LinkedHashMap<>();
    if (name != null && !name.isBlank()) {
      visualState.put("label", name);
    }
    visualState.put("widthMeters", source.widthMeters());
    visualState.put("width", source.widthMeters() * SCENE_UNITS_PER_METER);
    visualState.put("displayWidth", Math.max(0.24, source.widthMeters() * SCENE_UNITS_PER_METER * 1.15));
    visualState.put("color", "#DDE3EA");
    visualState.put("edgeColor", "#F8FBFF");
    visualState.put("centerLineColor", "#F596AA");
    return new GroundFeature(
        source.id(),
        "road-corridor",
        source.sourceRef(),
        new LocalGeometry("LineString", localPath),
        new GeoJSONGeometry("LineString", source.pathLngLat()),
        visualState);
  }

  private GroundFeature areaGroundFeature(ZhongshanFixtureOsmCatalog.OsmArea source) {
    List<List<Double>> localRing = source.footprintLngLat().stream()
        .map(point -> {
          LocalPoint localPoint = localPointFromLngLat(point.get(0), point.get(1), 0);
          return List.of(localPoint.x(), localPoint.y(), localPoint.z());
        })
        .toList();
    String name = source.tags().getOrDefault("name:zh", source.tags().get("name"));
    Map<String, Object> visualState = new LinkedHashMap<>();
    if (name != null && !name.isBlank()) {
      visualState.put("label", name);
    }
    visualState.put("color", "#DDECCF");
    visualState.put("edgeColor", "#B5CAA0");
    return new GroundFeature(
        source.id(),
        "green-space",
        source.sourceRef(),
        new LocalGeometry("Polygon", List.of(localRing)),
        new GeoJSONGeometry("Polygon", List.of(source.footprintLngLat())),
        visualState);
  }

  private List<StaticFeatureProjection> staticFeatures() {
    List<StaticFeatureProjection> features = new ArrayList<>();
    staticFeatureProvider.stationAnchors().stream()
        .map(this::stationAnchor)
        .forEach(features::add);
    staticFeatureProvider.buildingFootprints().stream()
        .map(this::building)
        .forEach(features::add);
    staticFeatureProvider.areaAnchors().stream()
        .map(this::areaAnchor)
        .forEach(features::add);
    return List.copyOf(features);
  }

  private StaticFeatureProjection stationAnchor(StaticFeatureProvider.StationAnchor source) {
    double lng = source.lng();
    double lat = source.lat();
    LocalPoint localPoint = localPointFromLngLat(lng, lat, 0.35);
    StaticFeatureStyleResolver.AnchorStyle style = staticFeatureStyleResolver.stationAnchorStyle(source);
    Map<String, Object> visualState = new LinkedHashMap<>();
    visualState.put("sourceRef", source.sourceRef());
    visualState.put("color", style.color());
    visualState.put("opacity", 0.68);
    visualState.put("size", "small");
    visualState.put("footprintScale", 0.48);
    visualState.put("shortLabel", source.shortLabel());
    visualState.put("label", source.label());
    visualState.put("aliases", source.aliases());
    return new StaticFeatureProjection(
        source.id(),
        "geo-" + source.objectId(),
        source.objectId(),
        source.kind(),
        null,
        point(localPoint.x(), localPoint.y(), localPoint.z()),
        new GeoJSONGeometry("Point", List.of(lng, lat)),
        visualState);
  }

  private StaticFeatureProjection building(
      StaticFeatureProvider.BuildingFootprint source) {
    List<List<Double>> footprintLngLat = source.footprintLngLat();
    List<List<Double>> localFootprint = footprintLngLat.stream()
        .map(point -> {
          LocalPoint localPoint = localPointFromLngLat(point.get(0), point.get(1), 0);
          return List.of(localPoint.x(), localPoint.y(), localPoint.z());
        })
        .toList();
    StaticFeatureStyleResolver.BuildingStyle style = staticFeatureStyleResolver.buildingStyle(source);
    Map<String, Object> visualState = new LinkedHashMap<>();
    visualState.put("floors", source.floors());
    visualState.put("footprintScale", style.footprintScale());
    visualState.put("footprintSource", source.footprintSource());
    visualState.put("urbanRole", source.urbanRole());
    visualState.put("color", style.color());
    visualState.put("accentColor", style.accentColor());
    visualState.put("signColor", style.signColor());
    if (source.shortLabel() != null && !source.shortLabel().isBlank()) {
      visualState.put("shortLabel", source.shortLabel());
    }
    if (source.label() != null && !source.label().isBlank()) {
      visualState.put("label", source.label());
    }
    visualState.put("sign", source.label() != null && !source.label().isBlank() && style.sign());
    return new StaticFeatureProjection(
        source.id(),
        "geo-" + source.id(),
        source.objectId(),
        source.kind(),
        source.footprintSource(),
        new LocalGeometry("Polygon", List.of(localFootprint)),
        new GeoJSONGeometry("Polygon", List.of(footprintLngLat)),
        visualState);
  }

  private StaticFeatureProjection areaAnchor(
      StaticFeatureProvider.AreaAnchor source) {
    double lng = source.lng();
    double lat = source.lat();
    StaticFeatureStyleResolver.AnchorStyle style = staticFeatureStyleResolver.anchorStyle(source);
    LocalPoint localPoint = localPointFromLngLat(lng, lat, 0);
    Map<String, Object> visualState = new LinkedHashMap<>();
    visualState.put("areaAnchor", true);
    visualState.put("sourceRef", source.sourceRef());
    visualState.put("width", 0.42);
    visualState.put("depth", 0.42);
    visualState.put("footprintScale", 1.0);
    visualState.put("urbanRole", source.urbanRole());
    visualState.put("color", style.color());
    visualState.put("accentColor", style.color());
    visualState.put("signColor", style.signColor());
    if (source.shortLabel() != null && !source.shortLabel().isBlank()) {
      visualState.put("shortLabel", source.shortLabel());
    }
    if (source.label() != null && !source.label().isBlank()) {
      visualState.put("label", source.label());
    }
    visualState.put("sign", false);
    return new StaticFeatureProjection(
        source.id(),
        "geo-" + source.id(),
        source.objectId(),
        source.kind(),
        null,
        point(localPoint.x(), localPoint.y(), localPoint.z()),
        new GeoJSONGeometry("Point", List.of(lng, lat)),
        visualState);
  }

  private LocalPoint localPointFromLngLat(double lng, double lat, double y) {
    MercatorPoint mercator = mercatorMeters(lng, lat);
    double x = (mercator.x() - MERCATOR_ORIGIN.x()) * SCENE_UNITS_PER_METER;
    double z = -(mercator.y() - MERCATOR_ORIGIN.y()) * SCENE_UNITS_PER_METER;
    return new LocalPoint(round3(x), y, round3(z));
  }

  private static LocalBounds localBoundsFromGeoBounds(GeoBounds bounds) {
    LocalPoint northwest = localPointFromLngLatStatic(bounds.west(), bounds.north(), 0);
    LocalPoint southeast = localPointFromLngLatStatic(bounds.east(), bounds.south(), 0);
    return new LocalBounds(
        round3Static(northwest.x()),
        round3Static(northwest.z()),
        round3Static(southeast.x()),
        round3Static(southeast.z()));
  }

  private static LocalPoint localPointFromLngLatStatic(double lng, double lat, double y) {
    MercatorPoint mercator = mercatorMeters(lng, lat);
    double x = (mercator.x() - MERCATOR_ORIGIN.x()) * SCENE_UNITS_PER_METER;
    double z = -(mercator.y() - MERCATOR_ORIGIN.y()) * SCENE_UNITS_PER_METER;
    return new LocalPoint(round3Static(x), y, round3Static(z));
  }

  private static MercatorPoint mercatorMeters(double lng, double lat) {
    double x = MERCATOR_RADIUS_METERS * Math.toRadians(lng);
    double y = MERCATOR_RADIUS_METERS * Math.log(Math.tan(Math.PI / 4.0 + Math.toRadians(lat) / 2.0));
    return new MercatorPoint(x, y);
  }

  private record MercatorPoint(double x, double y) {}

  private double round3(double value) {
    return round3Static(value);
  }

  private static double round3Static(double value) {
    return Math.round(value * 1000.0) / 1000.0;
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
            "geo-landmark-eslite-nanxi",
            "osm:mock",
            "landmark",
            pointGeo(121.5220, 25.0520),
            Map.of("name", "Eslite Spectrum Nanxi", "kind", "bookstore-mall")),
        new GeoFeature(
            "geo-landmark-linsen-lane-shop",
            "osm:mock",
            "landmark",
            pointGeo(121.5223, 25.0514),
            Map.of("name", "Linsen Lane Shops", "kind", "lane-shop")),
        new GeoFeature(
            "geo-landmark-chifeng-maker-lane",
            "osm:mock",
            "landmark",
            pointGeo(121.5183, 25.0516),
            Map.of("name", "Chifeng Street", "kind", "lane-shop")),
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
    List<OntologyObject> objects = new ArrayList<>(List.of(
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
            "台北捷運中山站 R11/G14，作為南西商圈的地圖情報焦點。",
            "mrt",
            Map.of(
                "stationId", "R11/G14",
                "lineId", "red-green",
                "area", "Nanjing West Road",
                "liveSource", "TDX MRT LiveBoard",
                "maxSourceLagSeconds", 12,
                "liveBoardRows",
                    List.of(
                        Map.of("line", "淡水信義線", "direction", "往淡水", "destination", "淡水", "etaMinutes", 2, "status", "approaching"),
                        Map.of("line", "松山新店線", "direction", "往新店", "destination", "新店", "etaMinutes", 4, "status", "boarding"))),
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
            "中山南西商圈百貨地標，作為地圖情報的方向錨點。",
            "mrt",
            Map.of("kind", "department-store", "district", "Nanxi shopping corridor"),
            List.of(new Relationship("near", "station-R11-G14", "Station", "Zhongshan")),
            featureById.get("geo-landmark-shin-kong-nanxi")),
        object(
            "landmark-eslite-nanxi",
            "Landmark",
            "Eslite Spectrum Nanxi",
            "osm",
            "reference",
            "誠品生活南西，作為南西商圈書店與商場型地標。",
            "mrt",
            Map.of("kind", "bookstore-mall", "district", "Nanxi shopping corridor"),
            List.of(new Relationship("near", "station-R11-G14", "Station", "Zhongshan")),
            featureById.get("geo-landmark-eslite-nanxi")),
        object(
            "landmark-linsen-lane-shop",
            "Landmark",
            "Linsen Lane Shops",
            "osm",
            "reference",
            "林森北路巷弄店家群，作為中山站東側地面生活圈錨點。",
            "mrt",
            Map.of("kind", "lane-shop", "district", "Zhongshan lane context"),
            List.of(new Relationship("near", "station-R11-G14", "Station", "Zhongshan")),
            featureById.get("geo-landmark-linsen-lane-shop")),
        object(
            "landmark-chifeng-maker-lane",
            "Landmark",
            "Chifeng Street",
            "osm",
            "reference",
            "赤峰街商圈，作為中山站西側低樓層巷弄地標。",
            "mrt",
            Map.of("kind", "lane-shop", "district", "Chifeng Street context"),
            List.of(new Relationship("near", "station-R11-G14", "Station", "Zhongshan")),
            featureById.get("geo-landmark-chifeng-maker-lane")),
        object(
            "rain-R042",
            "RainfallCell",
            "Rain Cell R-042",
            "cwa",
            "intense",
            "覆蓋中山站周邊地圖焦點範圍的短時強降雨。",
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
            featureById.get("geo-incident-I237"))));
    appendStaticFeatureObjects(objects);
    return List.copyOf(objects);
  }

  private void appendStaticFeatureObjects(List<OntologyObject> objects) {
    Set<String> seenIds = new LinkedHashSet<>();
    objects.stream().map(OntologyObject::id).forEach(seenIds::add);
    staticFeatureProvider.buildingFootprints().stream()
        .map(this::staticBuildingObject)
        .filter(object -> seenIds.add(object.id()))
        .forEach(objects::add);
    staticFeatureProvider.areaAnchors().stream()
        .map(this::staticAreaObject)
        .filter(object -> seenIds.add(object.id()))
        .forEach(objects::add);
  }

  private OntologyObject staticBuildingObject(StaticFeatureProvider.BuildingFootprint source) {
    String name = nonBlank(source.label(), source.shortLabel(), source.id());
    return object(
        source.objectId(),
        "MapDerivedPlace",
        name,
        "osm",
        "reference",
        "Static map feature promoted from the normalized map fixture for map context.",
        "tiles",
        Map.of(
            "kind", source.kind(),
            "urbanRole", source.urbanRole(),
            "sourceRef", source.footprintSource(),
            "footprintSource", source.footprintSource()),
        List.of(new Relationship("near", "station-R11-G14", "Station", "Zhongshan")),
        null);
  }

  private OntologyObject staticAreaObject(StaticFeatureProvider.AreaAnchor source) {
    String name = nonBlank(source.label(), source.shortLabel(), source.id());
    return object(
        source.objectId(),
        "MapDerivedPlace",
        name,
        "osm",
        "reference",
        "Static point-of-interest feature promoted from the normalized map fixture for map context.",
        "tiles",
        Map.of(
            "kind", source.kind(),
            "urbanRole", source.urbanRole(),
            "sourceRef", source.sourceRef()),
        List.of(new Relationship("near", "station-R11-G14", "Station", "Zhongshan")),
        null);
  }

  private String nonBlank(String... values) {
    for (String value : values) {
      if (value != null && !value.isBlank()) return value;
    }
    return "Map feature";
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
