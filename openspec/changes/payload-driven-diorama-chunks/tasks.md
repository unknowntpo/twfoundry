## 1. Chunk Base Renderer

- [ ] 1.1 Add reusable renderer for `DioramaChunk.terrain`.
- [ ] 1.2 Add reusable renderer for `DioramaChunk.staticFeatures`.
- [ ] 1.3 Add reusable renderer for `DioramaChunk.semanticZones`.
- [ ] 1.4 Compose chunk base layer before projection overlays.
- [x] 1.5 Add temporary camera-distance LOD switch between map reference and voxel diorama.

## 2. Interaction And Identity

- [ ] 2.1 Register selectable static features only when they resolve to canonical ontology objects.
- [ ] 2.2 Ensure focus/selection works across static features and projections.
- [ ] 2.3 Keep debug chunk/tile controls out of domain overlay controls.

## 3. Cleanup And Verification

- [ ] 3.1 Remove formal cockpit dependency on old hard-coded terrain/city builders.
- [ ] 3.2 Add tests for payload chunk rendering and object identity.
- [ ] 3.3 Capture screenshots for default world and selected static anchor.
- [ ] 3.4 Run frontend tests, backend ingestion tests, frontend build, and `spectra validate --all`.
