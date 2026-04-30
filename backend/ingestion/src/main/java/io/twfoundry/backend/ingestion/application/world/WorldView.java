package io.twfoundry.backend.ingestion.application.world;

import java.util.List;
import java.util.Map;

public final class WorldView {
  private WorldView() {}

  public record Payload(
      String schemaVersion,
      Request request,
      WorldFocus focus,
      List<DioramaChunk> chunks,
      List<OntologyObject> objects,
      List<ChunkProjection> projections,
      List<RenderModuleDescriptor> renderModules,
      Freshness freshness,
      Completeness completeness,
      Diagnostics diagnostics) {}

  public record Request(
      String focusId, String lod, String time, List<String> overlays, boolean debugGeo) {}

  public record WorldFocus(String id, String label, GeoBounds geoBounds, String chunkSetId) {}

  public record GeoBounds(double west, double south, double east, double north) {}

  public record DioramaChunk(
      String id,
      String label,
      LocalPoint sceneOrigin,
      double cellSizeMeters,
      LocalTransform localToScene,
      LocalBounds localBounds,
      List<TerrainCell> terrain,
      List<StaticFeatureProjection> staticFeatures,
      List<SemanticZone> semanticZones,
      List<String> sourceRefs) {}

  public record LocalPoint(double x, double y, double z) {}

  public record LocalTransform(LocalPoint translate, double scale, double rotationDegrees) {}

  public record LocalBounds(double minX, double minZ, double maxX, double maxZ) {}

  public record TerrainCell(String id, int x, int z, int height, String kind, String color) {}

  public record StaticFeatureProjection(
      String id,
      String featureId,
      String ontologyObjectId,
      String kind,
      LocalGeometry geometry,
      Map<String, Object> visualState) {}

  public record SemanticZone(String id, String kind, LocalGeometry geometry, Map<String, Object> state) {}

  public record LocalGeometry(String type, Object coordinates) {}

  public record GeoFeature(
      String id, String source, String kind, GeoJSONGeometry geometry, Map<String, Object> properties) {}

  public record GeoJSONGeometry(String type, Object coordinates) {}

  public record OntologyObject(
      String id,
      String type,
      String name,
      String source,
      String status,
      String summary,
      Map<String, Object> properties,
      List<Relationship> relationships,
      GeoFeature geoFeature) {}

  public record Relationship(String type, String targetObjectId, String targetType, String label) {}

  public record ChunkProjection(
      String id,
      String objectId,
      String chunkId,
      String overlay,
      String renderModule,
      LocalGeometry geometry,
      Map<String, Object> visualState,
      Interaction interaction) {}

  public record Interaction(boolean selectable, String hoverLabel) {}

  public record RenderModuleDescriptor(
      String id, String kind, List<String> capabilities, Map<String, Object> defaults) {}

  public record Freshness(
      String mode, String generatedAt, int maxSourceLagSeconds, List<SourceFreshness> sources) {}

  public record SourceFreshness(String source, String status, String updatedAt, int lagSeconds) {}

  public record Completeness(String status, List<String> missingOverlays, List<String> warnings) {}

  public record Diagnostics(
      boolean debugGeo, List<GeoFeature> geoFeatures, List<String> sourceRefs) {}
}
