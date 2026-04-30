## MODIFIED Requirements

### Requirement: Backend-Computed Diorama World View Payload

TWFoundry SHALL expose a backend-computed `WorldViewPayload` for diorama rendering.

The `WorldViewPayload` SHALL include `schemaVersion`, `request`, `focus`, `chunks`, `objects`, `projections`, `renderModules`, `freshness`, and `completeness`.

The frontend SHALL render the operational diorama from `WorldViewPayload` rather than computing the complete world from raw source rows.

#### Scenario: Frontend renders chunk base from payload chunks

- **GIVEN** a `WorldViewPayload` with `chunks[].terrain`, `chunks[].staticFeatures`, and `chunks[].semanticZones`
- **WHEN** the frontend builds the diorama scene
- **THEN** it renders base terrain, stable anchors, and semantic zones from those chunk fields
- **AND** it does not use the legacy hard-coded terrain or city builders as formal cockpit geometry

#### Scenario: Frontend renders overlay projections on top of chunk base

- **GIVEN** a `WorldViewPayload` with chunk base data and `projections`
- **WHEN** the frontend builds the diorama scene
- **THEN** projection render modules are placed in chunk-local coordinates over the rendered chunk base
- **AND** domain overlay toggles hide and disable interaction for projection objects owned by that overlay

#### Scenario: Zoomed-out map reference does not mix with voxel chunk entities

- **GIVEN** the user zooms out beyond the diorama detail threshold
- **WHEN** the frontend enters `map-reference` LOD
- **THEN** real map tiles may be shown as a reference surface
- **AND** voxel chunk entities are hidden so they do not appear detached from the map surface

#### Scenario: Zoomed-in view restores the voxel diorama

- **GIVEN** the user zooms into the operational focus area
- **WHEN** the frontend enters `voxel-diorama` LOD
- **THEN** the real map reference is hidden
- **AND** the Sakura Voxel chunk world, domain overlays, and ontology interactions are visible
