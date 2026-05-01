## 1. Spectra Planning

- [x] 1.1 Create `define-backend-overlay-pipeline` change.
- [x] 1.2 Document proposal, design, tasks, and platform-foundation spec delta.

## 2. Backend Contracts

- [x] 2.1 Add versioned backend topic helpers for raw, replay, observation, overlay, and audit topics.
- [x] 2.2 Add overlay feature and archive partition contracts.
- [x] 2.3 Add fact observation, resolved fact, conflict, source mode, and resolution action contracts.

## 3. Resolution Policy

- [x] 3.1 Implement deterministic fact resolution for authority, revision, confidence, and data conflicts.
- [x] 3.2 Cover historical correction superseding lower-authority live data.
- [x] 3.3 Cover equal-authority data conflicts.

## 4. Verification

- [x] 4.1 Add unit tests for topic taxonomy.
- [x] 4.2 Add unit tests for raw archive partitioning.
- [x] 4.3 Add unit tests for fact resolver behavior.
- [x] 4.4 Run backend tests.
- [x] 4.5 Run `spectra validate define-backend-overlay-pipeline`.
