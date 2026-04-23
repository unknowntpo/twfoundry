# Design: Add MRT Live Mode Timeline

## Summary

This change turns the MRT timeline from a static placeholder into a real live-monitoring control surface.

It does **not** introduce historical replay. The timeline is limited to the latest snapshot and auto-follow behavior.

## Live Timeline Semantics

- `timelineMode = live | paused`
- `live`
  - auto-follow polling is enabled
  - `Now` keeps or returns the dashboard to live-follow mode
- `paused`
  - auto-follow polling is stopped
  - current selected station and latest snapshot remain visible
  - this mode does **not** imply replay or history browsing
- `previous` and `next`
  - remain disabled in this change
  - must not claim historical navigation capability

## Polling Model

- source of truth: existing `GET /api/mrt/liveboard`
- polling starts only when:
  - liveboard source is `tdx`
  - a station is selected
  - `timelineMode = live`
- supported intervals:
  - `5s`
  - `20s`
  - `30s`
  - `1m`
- default interval: `30s`
- default mode: `live`

## UI Contract

The timeline must show:

- latest snapshot timestamp
- relative freshness
- current live or paused state
- selected polling interval
- feed source label

The station panel must use the same freshness label source as the timeline.

Empty-state copy must be source-neutral and must not imply the data is mock-only.

## Train Selection Interaction Contract

For the MRT live sidebar and estimated train markers:

- the primary train label in the sidebar must be the train code, not the destination station
- destination and direction remain secondary metadata
- hover state for estimated train markers must show only the train code
- clicking a train marker on the map must keep `selectedTrainId` as the source of truth
- when `selectedTrainId` changes from a map click, the sidebar must:
  - expand the owning line group if needed
  - scroll the selected train card into view
  - move keyboard focus to the selected train card

This keeps train selection centered on the moving vehicle instead of the currently observed station row.

## Store Contract

The MRT dashboard store owns the live timeline state:

- `liveBoardUpdatedAt`
- `timelineMode`
- `liveRefreshIntervalMs`
- `setTimelineMode(mode)`
- `setLiveRefreshIntervalMs(intervalMs)`

The page component owns the timer lifecycle:

- create polling timer when live-follow is active
- stop polling timer when paused or when no station is selected
- refresh relative freshness on a clock tick so the UI stays current

## Why History Is Deferred

This change does not add historical navigation because the current backend only exposes the latest live query path.

Current backend state:

- real TDX fetch path exists
- no persisted snapshot store is wired into frontend queries
- no StarRocks-backed history query is exposed to the timeline
- no timeline cursor or replay API exists

Because of that, enabling `previous / next` would falsely imply historical capability that does not yet exist.

## Non-Goals

- persisted snapshots
- StarRocks reads
- backend timeline API
- drag-to-replay
- previous/next historical navigation
