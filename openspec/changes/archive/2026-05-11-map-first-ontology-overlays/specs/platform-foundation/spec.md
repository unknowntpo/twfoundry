## ADDED Requirements

### Requirement: Map-First Ontology Dashboard

TWFoundry SHALL use an interactive map as the primary dashboard surface.

The map surface SHALL render operational information through product overlays rather than through primary voxel terrain, chunk, or diorama concepts.

#### Scenario: Operator opens the dashboard

- **GIVEN** the frontend shell is loaded
- **WHEN** the default dashboard renders
- **THEN** the primary stage is an interactive MapLibre map
- **AND** domain information is controlled through overlay visibility
- **AND** voxel art is not required to understand the map state

#### Scenario: Operator selects an ontology object

- **GIVEN** an ontology object is selected from a map marker, line, area, or object list
- **WHEN** the object inspector renders
- **THEN** the inspector shows stable object properties and relationships
- **AND** any voxel rendering is scoped to selected-object detail
- **AND** the voxel renderer is selected by generic object type, kind, capability, or render module rather than by a specific place name

#### Scenario: Overlay model remains extensible

- **GIVEN** a new operational domain is added
- **WHEN** the domain is exposed on the map
- **THEN** it is registered as a product overlay with visibility, data dependency, timeline awareness, and renderer metadata
- **AND** the user can disable the overlay without editing unrelated renderer code
