package io.twfoundry.backend.ingestion.application.world;

import java.util.List;
import java.util.LinkedHashSet;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
final class CuratedZhongshanStaticFeatureProvider implements StaticFeatureProvider {
  private final OsmStaticFeatureAdapter adapter = new OsmStaticFeatureAdapter();
  private final ZhongshanFixtureOsmCatalog osmCatalog;

  CuratedZhongshanStaticFeatureProvider(ZhongshanFixtureOsmCatalog osmCatalog) {
    this.osmCatalog = osmCatalog;
  }

  @Override
  public List<StationAnchor> stationAnchors() {
    return osmCatalog.stationAnchors().stream()
        .map(station -> new StationAnchor(
            station.id(),
            station.objectId(),
            "station-anchor",
            station.tags().getOrDefault("short_name:zh", station.tags().get("name:zh")),
            station.tags().getOrDefault("name:zh", station.tags().get("name")),
            station.lng(),
            station.lat(),
            station.sourceRef(),
            station.aliases()))
        .toList();
  }

  @Override
  public List<BuildingFootprint> buildingFootprints() {
    return adapter.buildingFootprints(osmCatalog.roadClearBuildings());
  }

  @Override
  public List<AreaAnchor> areaAnchors() {
    return adapter.areaAnchors(osmCatalog.pois());
  }

  @Override
  public List<String> sourceRefs() {
    Set<String> sourceRefs = new LinkedHashSet<>(osmCatalog.sourceRefs());
    osmCatalog.stationAnchors().stream().map(ZhongshanFixtureOsmCatalog.StationAnchor::sourceRef).forEach(sourceRefs::add);
    osmCatalog.buildings().stream().map(ZhongshanFixtureOsmCatalog.OsmBuilding::sourceRef).forEach(sourceRefs::add);
    osmCatalog.pois().stream().map(ZhongshanFixtureOsmCatalog.OsmPoi::sourceRef).forEach(sourceRefs::add);
    osmCatalog.roads().stream().map(ZhongshanFixtureOsmCatalog.OsmRoad::sourceRef).forEach(sourceRefs::add);
    osmCatalog.areas().stream().map(ZhongshanFixtureOsmCatalog.OsmArea::sourceRef).forEach(sourceRefs::add);
    return List.copyOf(sourceRefs);
  }
}
