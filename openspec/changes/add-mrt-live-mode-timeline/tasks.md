## Implementation

- [ ] Persist normalized MRT liveboard snapshots in backend local storage.
- [ ] Add backend MRT timeline history endpoint.
- [ ] Load persisted timeline snapshots into the MRT dashboard store.
- [ ] Make the dashboard render from the selected timeline snapshot instead of latest-only rows.
- [ ] Make previous/next and slider drag change the selected snapshot.
- [ ] Make inferred train positions update when replay snapshot changes.

## Validation

- [ ] Add backend tests proving snapshots are persisted and queryable.
- [ ] Add frontend store or component tests proving timeline drag changes displayed snapshot rows.
- [ ] Add frontend tests proving inferred train positions change with snapshot replay.
- [ ] Run `spectra validate add-mrt-live-mode-timeline`.
- [ ] Run targeted backend and frontend tests.
