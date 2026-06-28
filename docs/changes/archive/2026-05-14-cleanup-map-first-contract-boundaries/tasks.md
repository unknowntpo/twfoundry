## 1. Decision History

- [x] Create `docs/decision-history/`.
- [x] Record the 2026-05 map-first pivot and old decision boundaries.
- [x] Link `SPEC.md` and `Design.md` to the pivot note.

## 2. Contract Cleanup

- [x] Reframe `Design.md` so active product language is map-first.
- [x] Move old voxel-first design material under a legacy appendix.
- [x] Clarify that old decisions cannot override `SPEC.md`.
- [x] Modify platform requirements so old diorama/chunk terms are compatibility-only.

## 3. Verification

- [x] Park superseded `payload-driven-diorama-chunks`.
- [x] Run `spectra validate --all`.
- [x] Run `git diff --check`.
- [x] Scan docs/specs for old terms outside legacy/compatibility context.
