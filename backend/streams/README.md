# Backend Streams

## Bus Route Sentinel

`bus-route-sentinel` is the Flink speed-layer job for live bus operations signals.

Boundary:

- **Flink** owns live / online signals: `suspected_gap`, `suspected_bunching`.
- **ClickHouse** owns batch / historical analytics and dashboard exports.
- The poller only produces normalized vehicle positions; it does not decide route health.

Flow:

```text
normalized.tdx.bus_vehicle_position
  -> map-match with route context
  -> key by route_uid + direction
  -> BusRouteSentinelProcessor
  -> online.tdx.bus_route_signal
```

Processor function logic:

1. Keep one keyed state buffer per `(route_uid, direction)`.
2. For each 5-minute `slot_key`, map-match each vehicle GPS point onto its route shape.
3. Drop observations without route geometry or farther than `BUS_SENTINEL_MAX_DISTANCE_TO_ROUTE_METERS`.
4. Sort vehicles by `progressRatio`.
5. Compare adjacent vehicles:
   - `progress_gap_ratio * BUS_SENTINEL_ROUTE_MINUTES >= BUS_SENTINEL_SERVICE_GAP_MINUTES`
     emits `suspected_gap`.
   - `progress_gap_ratio <= BUS_SENTINEL_BUNCHING_PROGRESS_GAP_RATIO`
     increments the adjacent-pair streak.
   - A pair emits `suspected_bunching` only after
     `BUS_SENTINEL_BUNCHING_CONFIRMATION_SLOTS` consecutive slots.
6. Emit JSON signals to Kafka topic `online.tdx.bus_route_signal`.

Build:

```bash
./gradlew :backend:streams:test
./gradlew :backend:streams:flinkJar
```

Run locally with a Flink CLI or a Flink-compatible runner:

```bash
KAFKA_BROKERS=localhost:9092 \
BUS_ROUTE_CONTEXT_DIR=frontend/public/data/tdx-bus/route-context \
BUS_SENTINEL_CHECKPOINT_DIR=file:///tmp/twfoundry-bus-route-sentinel-checkpoints \
flink run backend/streams/build/libs/streams-0.1.0-SNAPSHOT-flink.jar
```

State:

- In the current Kubernetes rollout, Flink checkpoints are stored on the
  `bus-route-sentinel-checkpoints` PVC at `/flink-checkpoints`.
- R2 is used for frontend-readable live projections written by
  `bus-route-signal-publisher`, not for this embedded Flink job's internal
  keyed state.
- If this moves to a managed Flink cluster, use R2 through an S3-compatible
  checkpoint/savepoint backend and keep it separate from dashboard projection
  keys.

Important env vars:

| Variable | Default |
|---|---|
| `KAFKA_BROKERS` | `localhost:9092` |
| `BUS_SENTINEL_INPUT_TOPIC` | `normalized.tdx.bus_vehicle_position` |
| `BUS_SENTINEL_OUTPUT_TOPIC` | `online.tdx.bus_route_signal` |
| `BUS_SENTINEL_GROUP_ID` | `bus-route-sentinel` |
| `BUS_ROUTE_CONTEXT_DIR` | `frontend/public/data/tdx-bus/route-context` |
| `BUS_SENTINEL_SERVICE_GAP_MINUTES` | `14` |
| `BUS_SENTINEL_BUNCHING_PROGRESS_GAP_RATIO` | `0.04` |
| `BUS_SENTINEL_BUNCHING_CONFIRMATION_SLOTS` | `2` |
| `BUS_SENTINEL_CHECKPOINT_INTERVAL_MS` | `60000` |
| `BUS_SENTINEL_CHECKPOINT_DIR` | `file:///flink-checkpoints/bus-route-sentinel` |
