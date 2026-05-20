# Tasks

- [x] Add `maplibre-gl` and a small MapLibre wrapper component.
- [x] Use OpenFreeMap style URL as the initial open/free tile source.
- [x] Keep the map base as a dedicated overlay/config, not as a domain data source.
- [x] Define a Sakura voxel-friendly MapLibre style override.
- [x] Add sample Taipei MRT route/station GeoJSON fixtures.
- [x] Render MRT route and station layers above the base map.
- [x] Define `OntologyProjection` data shape with geometry + state.
- [x] Adapt station/train voxel renderers to consume projected coordinates.
- [x] Sync map pan/zoom/bearing/pitch with voxel overlay in Phase A via shared fixed Taipei view config; exact continuous sync is deferred to MapLibre custom layer.
- [x] Add fallback UI for tile/style load failure.
- [x] Add Playwright screenshots for `/` and `/design-system`.
- [x] Decide when to graduate from separate Three overlay to MapLibre custom layer.
