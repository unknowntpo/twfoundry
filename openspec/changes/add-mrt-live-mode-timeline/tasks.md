## Implementation

- [x] Persist normalized MRT liveboard snapshots in backend local storage.
- [x] Add backend MRT timeline history endpoint.
- [x] Load persisted timeline snapshots into the MRT dashboard store.
- [x] Make the dashboard render from the selected timeline snapshot instead of latest-only rows.
- [x] Make previous/next and slider drag change the selected snapshot.
- [x] Make inferred train positions update when replay snapshot changes.

## Validation

- [x] Add backend tests proving snapshots are persisted and queryable.
- [x] Add frontend store or component tests proving timeline drag changes displayed snapshot rows.
- [x] Add frontend tests proving inferred train positions change with snapshot replay.
- [x] Run `spectra validate add-mrt-live-mode-timeline`.
- [x] Run targeted backend and frontend tests.
