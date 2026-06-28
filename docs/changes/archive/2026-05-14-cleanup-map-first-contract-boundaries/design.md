# Design

## Contract Boundary

This change treats old voxel/diorama terms as migration-era compatibility language.

The root contract is:

```text
source adapters
  -> normalized observations
  -> ontology objects
  -> map overlay projections
  -> selected-object detail renderers
```

Older payload fields may still exist, but they cannot be used as the main product model for future
decisions.

## Decision History

`docs/decision-history/2026-05-map-first-pivot.md` stores the old direction and pivot rationale.
That prevents repeated re-litigation while keeping the engineering context available.

## OpenSpec Strategy

The platform spec is not pruned aggressively. Instead, old requirements are modified so that:

- useful source-derived geometry and identity checks remain valid
- diorama/chunk names are marked compatibility-only
- fallback behavior remains map-first
- diagnostics remain operator/debug concerns

This keeps historical traceability without allowing old requirements to override `SPEC.md`.
