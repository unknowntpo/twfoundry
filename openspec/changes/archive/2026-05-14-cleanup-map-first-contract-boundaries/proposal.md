# Change: Cleanup Map-First Contract Boundaries

## Why

TWFoundry now has a root `SPEC.md` that defines map-first ontology as the product/system contract.
However, platform requirements still contain older voxel-first language that can be misread as active
product direction.

The goal is to keep useful historical and compatibility requirements while preventing old
diorama/chunk decisions from governing new work.

## What Changes

- Clarify fallback behavior as map-first rather than voxel-diorama-first.
- Reframe `WorldViewPayload`, `DioramaChunk`, and `ChunkProjection` requirements as legacy
  compatibility contracts.
- Keep source-derived geometry, object identity, freshness, and diagnostics requirements.
- Keep debug geo data diagnostic-only and out of the primary product UI.
- Record the pivot in `docs/decision-history/2026-05-map-first-pivot.md`.

## Non-Goals

- Do not rename backend Java records or frontend modules.
- Do not delete voxel renderer code.
- Do not change API routes or wire payloads.
- Do not rewrite runtime behavior.

## Impact

- `SPEC.md`
- `Design.md`
- `docs/decision-history/2026-05-map-first-pivot.md`
- `openspec/specs/platform-foundation/spec.md`
