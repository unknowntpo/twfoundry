## ADDED Requirements

### Requirement: Voxel Design System Page

TWFoundry SHALL provide a Vue-based Design System page that documents the Sakura Voxel visual language and previews reusable voxel render modules.

#### Scenario: Developer reviews voxel render modules

- **GIVEN** the frontend application is running
- **WHEN** a developer opens the Design System route
- **THEN** the page shows Three.js previews for the current render module classes, including moving objects, routes, stations, sensors, field volumes, incidents, and zones

### Requirement: Data-Driven Overlay Renderer Registry

TWFoundry SHALL model overlay rendering through a registry that resolves render modules from overlay metadata rather than hardcoding each backend overlay to a bespoke component.

#### Scenario: Backend adds a new overlay

- **GIVEN** a new overlay definition includes geometry type, visual role, object types, style token, time mode, and interaction capabilities
- **WHEN** the frontend receives the overlay definition
- **THEN** the frontend can select a compatible render module from the registry without adding overlay-specific branching for the new overlay name

### Requirement: Overlay Object Relationship

TWFoundry SHALL allow multiple observations or data points to relate to one ontology object, and SHALL allow one ontology object to project into one or more voxel entities for display.

#### Scenario: User disables a domain overlay

- **GIVEN** a visible voxel entity was created from an overlay and linked to an ontology object
- **WHEN** the user disables that overlay
- **THEN** the voxel entity, hover details, and overlay-specific object affordances disappear from the operational view

