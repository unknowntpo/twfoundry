# Tasks

- [ ] Define `WorldViewPayload` contract and sample payload fixtures.
- [ ] Define `GeoJSONGeometry`, ISO replay time, partial payload, diagnostics, and multi-chunk scene transform semantics.
- [ ] Add Java backend DTOs for `WorldFocus`, `DioramaChunk`, `OntologyObject`, `ChunkProjection`, `Freshness`, and API errors.
- [ ] Add a mock Java `WorldViewController` endpoint for `GET /api/world/view`.
- [ ] Add a mock `GeoReferenceProvider` and `DioramaChunkService`.
- [ ] Add a mock `OntologyObjectService` with MRT train/station/route and one cross-chunk rain cell.
- [ ] Add `ChunkProjectionService` logic that emits multiple projections for one cross-chunk object.
- [ ] Add backend tests proving one canonical object can produce projections in multiple chunks.
- [ ] Add contract fixture tests validating complete, partial, multi-chunk, and debugGeo payload shapes.
- [ ] Add frontend `WorldViewPayload` client and local fixture fallback.
- [ ] Adapt frontend diorama renderer to consume chunks/objects/projections instead of assembling the world directly from local mock arrays.
- [ ] Add frontend tests for projection click -> ontology object identity.
- [ ] Add `/design-system` examples for payload-driven render modules.
- [ ] Add Playwright screenshots for live world view and cross-chunk event selection.
