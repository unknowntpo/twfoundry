# Change: Add MRT Persisted Timeline Replay

## Why

The MRT dashboard already reads real TDX LiveBoard data, but the timeline still cannot replay persisted snapshots. That means the operator cannot drag through recent history to inspect how train positions changed over time.

This change upgrades the MRT timeline from live-only status display into a persisted replay surface backed by backend snapshot storage.

## What Changes

- Persist normalized MRT liveboard snapshots in the backend whenever the live feed is refreshed.
- Add a backend MRT timeline API that returns recent persisted snapshots for replay.
- Keep the existing frontend live mode with `live` and `paused` states.
- Make the timeline draggable over persisted snapshots.
- Make map train positions, sidebar rows, and station panel all derive from the selected timeline snapshot.
- Keep train selection UI treat the train code as the primary identifier in the live sidebar.
- Keep map-to-sidebar interaction return focus to the selected train card when a train marker is clicked.

## Out of Scope

- StarRocks-backed timeline reads.
- Long-term analytics or warehouse-oriented historical modeling.
- Cross-day retention policies beyond the recent operator replay window.

## Discussion Conclusion

**Decision**: Persist recent MRT snapshots and expose them through a backend replay API.

**Backend dependency**: Keep using the existing TDX latest-live fetch path as the ingestion source, but write normalized snapshots into a local persistence store before serving replay history.

**Replay contract**: When the operator drags the timeline, the currently displayed train rows and inferred train positions must update to the selected persisted snapshot instead of the latest live feed.
