# Change: Add MRT Live Mode Timeline

## Why

The MRT dashboard already reads real TDX LiveBoard data, but the current timeline area is still a placeholder. It does not describe real historical capability, and it does not provide an operator-friendly live-follow mode for monitoring the latest feed.

Phase 1 should first make live monitoring complete before introducing persisted history, replay, or StarRocks-backed timeline queries.

## What Changes

- Add a frontend MRT live mode with `live` and `paused` states.
- Add auto-follow polling controls for `5s`, `20s`, `30s`, and `1m`.
- Show the latest live snapshot timestamp and relative freshness in the timeline.
- Reuse the existing backend `/api/mrt/liveboard` endpoint and its `updatedAt` field.
- Make station panel freshness and timeline freshness share the same source of truth.
- Make train selection UI treat the train code as the primary identifier in the live sidebar.
- Make map-to-sidebar interaction return focus to the selected train card when a train marker is clicked.

## Out of Scope

- StarRocks-backed timeline reads.
- Historical snapshot persistence.
- Replay, drag-to-replay, or previous/next navigation over history.
- New backend timeline APIs.

## Discussion Conclusion

**Decision**: Ship MRT live mode first as a frontend-driven polling feature.

**Backend dependency**: Keep using the existing latest-live fetch path. Do not couple this change to StarRocks or history storage.

**Follow-up**: Historical playback will be handled in a separate change after storage and query contracts are defined.
