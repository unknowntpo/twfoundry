# Tasks

- [x] Define `WorldViewPayload` contract and sample payload fixtures.
- [x] Define `GeoJSONGeometry`, ISO replay time, partial payload, diagnostics, and multi-chunk scene transform semantics.
- [x] Add Java backend DTOs for `WorldFocus`, `DioramaChunk`, `OntologyObject`, `ChunkProjection`, `Freshness`, and API errors.
- [x] Add a mock Java `WorldViewController` endpoint for `GET /api/world/view`.
- [x] Add a mock `GeoReferenceProvider` and `DioramaChunkService`.
- [x] Add a mock `OntologyObjectService` with MRT train/station/route and one cross-chunk rain cell.
- [x] Add `ChunkProjectionService` logic that emits multiple projections for one cross-chunk object.
- [x] Add backend tests proving one canonical object can produce projections in multiple chunks.
- [x] Add contract fixture tests validating complete, partial, multi-chunk, and debugGeo payload shapes.
- [x] Add frontend `WorldViewPayload` client and local fixture fallback.
- [x] Adapt frontend diorama renderer to consume chunks/objects/projections instead of assembling the world directly from local mock arrays.
- [x] Add frontend tests for projection click -> ontology object identity.
- [x] Add `/design-system` examples for payload-driven render modules.
- [x] Add Playwright screenshots for live world view and cross-chunk event selection.
