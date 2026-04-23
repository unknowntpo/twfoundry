## Implementation

- [x] Add a new `add-mrt-live-mode-timeline` change with proposal, design, tasks, and spec delta.
- [x] Add live timeline store state for mode, interval, and latest snapshot timestamp.
- [x] Add frontend auto-follow polling for selected stations in `tdx` mode.
- [x] Replace placeholder timeline values with live timestamp, relative freshness, mode, and interval controls.
- [x] Keep `previous` and `next` disabled and explicitly non-historical.
- [x] Make station panel freshness and timeline freshness share the same source of truth.
- [x] Update empty-state wording so it is source-neutral.

## Validation

- [x] Add store tests for default live mode and supported interval switching.
- [x] Add tests that store `updatedAt` from backend payloads.
- [x] Add a UI-level test for live mode controls and auto-follow timer behavior.
- [x] Keep full-stack e2e proving the frontend reads real backend live data.
- [x] Run `spectra validate add-mrt-live-mode-timeline`.
- [x] Run frontend unit tests and full-stack e2e.
