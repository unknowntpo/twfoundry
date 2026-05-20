# Change: Define TWFoundry Map-First Specification

## Why

TWFoundry has moved from a voxel-first diorama direction to a map-first ontology dashboard, but the
project still has several competing sources of truth: `Design.md`, archived OpenSpec changes,
backend payload names, frontend renderers, and fixture copy.

This creates architectural drift. New work can accidentally treat voxel chunks, map alignment, or
source-specific fixture details as product-level concepts.

## What Changes

- Add a language-agnostic root `SPEC.md` for TWFoundry.
- Define map-first ontology as the stable product and system contract.
- Separate source integration, ontology, projections, rendering, and observability.
- Mark `WorldViewPayload`, `DioramaChunk`, and `ChunkProjection` as legacy-compatible terms during
  migration rather than primary product language.
- Add platform-foundation requirements that future changes must follow the root spec.

## Non-Goals

- Do not rename backend payload classes in this change.
- Do not delete existing voxel render modules.
- Do not rewrite the full `Design.md` yet.
- Do not replace current OpenSpec requirements wholesale.

## Impact

- Establishes `SPEC.md` as the top-level contract for future TWFoundry changes.
- Gives future changes a stable decision boundary before code-level refactors.
- Reduces ambiguity between map-first product behavior and legacy voxel/diorama implementation
  terms.
