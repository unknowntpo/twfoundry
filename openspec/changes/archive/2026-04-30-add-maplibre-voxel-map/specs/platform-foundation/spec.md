# platform-foundation Spec Delta

## ADDED Requirements

### Requirement: MapLibre Geospatial Backbone

TWFoundry SHALL use MapLibre as the frontend geospatial backbone for real map position, viewport, zoom, bearing, pitch, source loading, and feature querying.

TWFoundry SHALL treat the actual map as a geospatial base overlay/configuration, not as a domain data source such as TDX, PM2.5, Weather, or Incident.

#### Scenario: Actual Taipei map is displayed

- **GIVEN** the frontend map-backed cockpit is opened
- **WHEN** the map initializes successfully
- **THEN** the user sees a real Taipei map styled with TWFoundry's Sakura voxel-friendly visual direction

#### Scenario: Open free tile source is used for prototype

- **GIVEN** the first MapLibre-backed frontend implementation is configured
- **WHEN** the map style is loaded
- **THEN** the default tile/style source uses OpenFreeMap unless explicitly overridden by configuration

#### Scenario: Map base does not pollute domain sources

- **GIVEN** the map base overlay is enabled
- **WHEN** TDX, PM2.5, Weather, or Incident overlays are toggled
- **THEN** those domain sources remain independently controlled and are not coupled to the map tile provider

#### Scenario: MRT overlay aligns with map

- **GIVEN** MRT route and station geometry is available as GeoJSON or normalized ontology projections
- **WHEN** the Taipei Metro overlay is enabled
- **THEN** MRT route lines and station anchors appear above the actual map at their geographic positions

### Requirement: Ontology-Driven Voxel Projection

TWFoundry SHALL render voxel entities from ontology projections rather than raw source API rows.

#### Scenario: Backend row becomes visible object

- **GIVEN** a backend LiveBoard row references a station and line
- **WHEN** frontend projection resolves it into an ontology object with geometry and state
- **THEN** the corresponding train or station render module can display it on the MapLibre-backed world

### Requirement: Overlay Visibility Controls Both Map and Voxel Layers

TWFoundry SHALL keep overlay toggles as domain-level controls over both MapLibre style layers and Three.js voxel entities.

#### Scenario: Taipei Metro overlay is disabled

- **GIVEN** the Taipei Metro overlay is visible
- **WHEN** the user disables the overlay
- **THEN** MRT route lines, station anchors, and train voxel entities are hidden without deleting ontology object state

### Requirement: Map Failure Fallback

TWFoundry SHALL handle MapLibre style or tile loading failure without a blank screen.

#### Scenario: Map tile provider is unavailable

- **GIVEN** the MapLibre style or tiles fail to load
- **WHEN** the cockpit renders
- **THEN** the user sees a fallback voxel diorama state and a visible map-source status message
