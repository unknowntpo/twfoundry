# Design Notes: MapLibre-backed Voxel Map

## Phase A Decision

Phase A keeps MapLibre and Three.js as separate render surfaces:

```text
MapLibre actual map
  -> OpenFreeMap bright style
  -> Sakura paint/tint override
  -> MRT GeoJSON route/station reference layers

Three.js overlay
  -> ontology projections
  -> voxel trains / stations / weather / PM2.5 / incidents
```

The shared contract is `OntologyProjection`, not raw API rows and not renderer-specific meshes.

## View Synchronization Boundary

Phase A uses a shared fixed Taipei view configuration:

- center
- zoom
- pitch
- bearing
- Taipei bounds for geographic-to-voxel projection

Freeform continuous pan/zoom/bearing/pitch synchronization is intentionally not implemented in the separate-canvas version because it would create false precision. Exact camera synchronization should be done in Phase B by moving voxel entities into a MapLibre custom layer that uses MapLibre's WebGL context and camera matrix.

## Graduation Criteria For MapLibre Custom Layer

Move to a MapLibre custom layer when all of these are true:

- MRT route/station/train projections are stable.
- Ontology object selection and timeline state remain the source of truth.
- The team needs precise pan/zoom/bearing/pitch synchronization.
- Picking behavior across map features and voxel entities is specified.
- GL state cleanup and performance budget are tested.

Until then, the separate Three overlay is the correct Phase A implementation because it lets the product validate the Sakura voxel operational UX without coupling every interaction to MapLibre internals.
