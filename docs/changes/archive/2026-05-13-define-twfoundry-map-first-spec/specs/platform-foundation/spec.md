## ADDED Requirements

### Requirement: Root Map-First Specification

TWFoundry SHALL maintain a language-agnostic root `SPEC.md` that defines the map-first ontology
product and system contract.

The root specification SHALL be the highest-level contract for source integration, ontology
objects, map projections, selected-object detail rendering, and observability boundaries.

#### Scenario: Future change touches product architecture

- **GIVEN** a future change affects source adapters, ontology objects, overlays, map rendering,
  object detail rendering, fallback policy, or diagnostics
- **WHEN** the change is proposed
- **THEN** the change is evaluated against root `SPEC.md`
- **AND** any intentional divergence is documented in the change design

### Requirement: Map-First Layer Boundaries

TWFoundry SHALL keep product policy, configuration, source integration, ontology, projection,
rendering, and observability as separate architectural boundaries.

Source-specific facts SHALL enter through source adapters, fallback fixtures, or normalized payloads
before reaching renderers.

Renderers SHALL consume generic map overlay or object detail contracts rather than source-specific
truth.

#### Scenario: New source is added

- **GIVEN** a new public-data source is introduced
- **WHEN** the source becomes visible in the dashboard
- **THEN** it is represented through source descriptor, normalization, ontology mapping, projection
  mapping, and freshness/completeness metadata
- **AND** frontend renderers do not branch directly on raw source payload shape

#### Scenario: New visual overlay is added

- **GIVEN** a new operational domain becomes visible on the map
- **WHEN** the overlay is implemented
- **THEN** its product identity is registered outside renderer-only code
- **AND** disabling the overlay hides projections without deleting ontology objects

### Requirement: Legacy Diorama Term Compatibility

TWFoundry SHALL treat `WorldViewPayload`, `DioramaChunk`, and `ChunkProjection` as legacy-compatible
implementation terms during the map-first migration.

New product UI SHALL NOT present voxel chunks, diorama alignment, or voxel terrain as the primary
dashboard model.

Voxel rendering SHALL remain scoped to selected-object detail unless a future root specification
revision explicitly changes that policy.

#### Scenario: Existing payload fields remain during migration

- **GIVEN** existing backend or frontend code still uses `WorldViewPayload`, `DioramaChunk`, or
  `ChunkProjection`
- **WHEN** a map-first feature consumes that data
- **THEN** the feature treats those fields as compatibility inputs
- **AND** the user-facing model remains map overlays plus selected ontology object detail
