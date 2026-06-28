## 1. Product Direction

- [x] 1.1 Add OpenSpec change for map-first ontology overlays.
- [x] 1.2 Supersede the voxel-diorama-as-primary-stage assumption.
- [x] 1.3 Update long-form product design docs to make voxel art a detail renderer.

## 2. Frontend Shell

- [x] 2.1 Render an interactive MapLibre map as the primary stage.
- [x] 2.2 Keep the existing hidden texture/catalog path as a temporary compatibility bridge.
- [x] 2.3 Move voxel presentation into the selected ontology object panel.
- [x] 2.4 Replace primary UI copy that references voxel/chunk world concepts.

## 3. Overlay Architecture

- [x] 3.1 Introduce a first-class overlay registry module.
- [x] 3.2 Move MRT route/station layer definitions behind overlay renderers.
- [x] 3.3 Add overlay controls for moving, station, route, environment, incident, and analytics categories.
- [x] 3.4 Add tests for overlay registry defaults and disable behavior.

## 4. Verification

- [x] 4.1 Run frontend tests and build.
- [x] 4.2 Run `spectra validate --all`.
- [x] 4.3 Apply TWFoundry extensibility judge.
