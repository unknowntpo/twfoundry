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
