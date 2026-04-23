# Design: Add MRT Persisted Timeline Replay

## Summary

This change turns the MRT timeline into a real replay surface backed by persisted liveboard snapshots.

The latest TDX fetch path remains the source of new data, but the backend now stores normalized snapshots so the frontend can drag through recent history and recompute train positions from the selected snapshot.

## Backend Model

The backend persists each normalized MRT liveboard fetch as one snapshot:

- `source`
- `operator`
- `updated_at`
- `rows_json`
- `row_count`

`rows_json` stores the normalized `LiveBoardRow[]` payload, not raw TDX rows. This keeps replay behavior aligned with the same schema already used by the frontend.

## Snapshot Write Path

- frontend live mode continues polling `GET /api/mrt/liveboard`
- backend fetches and normalizes TDX rows
- backend writes the normalized snapshot into local persistence
- backend returns the same latest snapshot response to the caller

The write must happen before the response is considered complete so the latest snapshot is immediately replayable.

## Timeline Read Path

The backend exposes a new timeline endpoint returning recent persisted snapshots:

- `GET /api/mrt/liveboard/timeline?operator=TRTC&limit=N`

Response shape:

- `source`
- `snapshots[]`
  - `updatedAt`
  - `rows[]`

Snapshots are returned oldest to newest so the frontend slider index maps naturally to timeline order.

## Frontend State Model

The MRT dashboard store owns two distinct concepts:

- `networkLiveBoards`
  - latest live rows from the newest backend fetch
- `timelineSnapshots`
  - replayable persisted snapshots

The currently rendered dashboard state must come from:

- `displayedSnapshot`
- `displayedLiveBoards`
- `displayedUpdatedAt`

When timeline mode is `live`, the displayed snapshot is the latest snapshot.

When the operator drags the timeline:

- timeline mode becomes `paused`
- the selected snapshot index becomes the source of truth
- sidebar rows, station panel rows, and inferred train markers all re-render from the selected snapshot

## Replay Semantics

- `live`
  - polling continues
  - latest snapshot is selected
- `paused`
  - polling stops
  - selected persisted snapshot remains visible
- `Now`
  - returns to `live`
  - jumps to the latest snapshot
- `previous` / `next`
  - move the selected snapshot backward or forward by one step
- slider drag
  - moves to the nearest persisted snapshot index

## Train Position Contract

Train positions are still inferred from liveboard rows and station geometry, but the input rows now come from `displayedLiveBoards` instead of the latest network-only payload.

That means dragging the timeline updates:

- train card list contents
- station panel arrivals
- inferred train marker coordinates
- selected train visibility and focus behavior

## Persistence Scope

This change only needs an operator replay window, not a warehouse model.

Allowed:

- embedded local persistence for backend snapshots
- recent snapshot replay for the dashboard

Not included:

- StarRocks
- analytical history queries
- retention strategy for large-scale archival storage

## Test Contract

The implementation must prove:

- backend timeline snapshots are persisted after liveboard fetch
- frontend can load persisted timeline snapshots
- dragging the timeline changes displayed rows
- dragging the timeline changes inferred train positions
