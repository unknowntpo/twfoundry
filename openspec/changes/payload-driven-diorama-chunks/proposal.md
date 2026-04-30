## Why

The current payload-driven renderer consumes `WorldViewPayload.projections` for operational overlays, but the base diorama terrain, static city forms, station anchors, and semantic zones are still produced by hard-coded frontend builders.

This keeps the visible world partly disconnected from backend compute. It also makes future map focus changes harder because a new backend chunk can add projections, while the local world surface remains fixed to the old Taipei mock.

## What Changes

- Render diorama base geometry from `WorldViewPayload.chunks`.
- Convert `terrain`, `staticFeatures`, and `semanticZones` into reusable frontend render modules.
- Keep `projections` as domain overlay entities that sit on top of chunk-local base geometry.
- Preserve object identity rules: static anchors and overlay projections must resolve back to canonical ontology objects when one exists.
- Remove or quarantine old hard-coded terrain/city builders so they cannot leak into the formal cockpit.

## Non-Goals

- No MapLibre custom layer integration in this change.
- No backend tile provider ingestion changes.
- No redesign of the Sakura Voxel visual language.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `platform-foundation`: frontend diorama base rendering must come from backend chunk payloads, not static frontend mock geometry.

## Impact

- `frontend/src/voxelWorld.js`
- new or existing chunk/base render module files under `frontend/src/`
- `frontend/tests/`
- possible additive backend fixture data in `WorldViewService`
