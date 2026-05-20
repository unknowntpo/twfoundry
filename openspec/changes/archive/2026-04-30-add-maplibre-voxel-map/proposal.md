# Change: Add MapLibre-backed Voxel Map

## Summary

Introduce actual MapLibre rendering as TWFoundry's geospatial backbone while preserving the Sakura voxel world as the operational overlay.

The goal is to show a real map first, then render MRT routes, stations, trains, weather, PM2.5, and incidents on top through ontology-driven render modules.

## Why

The current frontend proves the visual direction, but the world is still a mock diorama grid. To validate real Taipei operations, MRT overlays must align with real geographic coordinates and eventually with MapLibre tiles/chunks.

## Approach

Phase A:

- Add MapLibre GL JS to the frontend.
- Create a map-backed cockpit page/component.
- Use OpenFreeMap as the initial open/free tile and style provider.
- Treat the actual map as a geospatial base overlay, not as a domain data source.
- Use a Sakura / voxel-friendly map style.
- Render MRT routes and stations as GeoJSON layers.
- Keep voxel entities as a Three overlay synced with the map viewport.
- Keep TDX, PM2.5, Weather, and Incident source handling isolated from the map base overlay.

Phase B:

- Move voxel entities into a MapLibre custom style layer after Phase A proves the UX and coordinate model.
- Use the MapLibre WebGL context and camera matrix for alignment.
- Convert ontology object geometry to Mercator/local Three coordinates.
- Keep overlay visibility, timeline, and object selection as the source of truth.

## Non-Goals

- Do not load the whole Taiwan/world map as one Three.js mesh.
- Do not make MapLibre tile/chunk debug a normal user-facing overlay.
- Do not treat the map base overlay as a backend data source.
- Do not let render modules consume raw backend rows directly.
- Do not replace the Sakura voxel design system.

## Tile Source Direction

Use OpenFreeMap for the first implementation because it is open-source-friendly, has a public MapLibre style endpoint, and does not require an API key for prototyping.

Initial style target:

```text
https://tiles.openfreemap.org/styles/bright
```

The application must keep this configurable so the provider can later be replaced by self-hosted PMTiles / OpenMapTiles without changing ontology or overlay code.

## Risks

- Tile provider availability and network dependency.
- MapLibre custom layer GL state management.
- Picking and hover behavior across MapLibre layers and Three objects.
- Route geometry availability before backend has full static MRT coordinates.

## Rollout

1. Document architecture and contracts.
2. Add MapLibre dependency and minimal pastel basemap.
3. Add MRT GeoJSON source/layers.
4. Sync current voxel train/station renderers with map coordinates.
5. Move to custom layer after interaction and coordinate contracts are stable.
