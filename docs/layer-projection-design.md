# Layer Projection Design

## Decision

TWFoundry operations UI should model the map as a registry of city-operation layers, not as a bus-only dashboard.

The current implementation still renders only the bus vehicle layer, but the UI and projection contract should be shaped so MRT, transit signals, weather, and air quality can be added without redesigning the mobile control surface.

## Layer Registry

Each layer is registered with:

- `id`: stable programmatic layer id.
- `labelKey` / `shortLabelKey`: UI labels.
- `descriptionKey`: layer summary.
- `status`: `active` or `planned`.
- `projectionType`: backend/frontend projection shape.
- `primaryFilter`: the first filter exposed by the layer.
- `timelineAware`: whether the layer participates in time playback.
- `sourceIds`: source datasets needed by the layer.

Current V1 registry:

| Layer id | Status | Projection | Primary filter | Source |
| --- | --- | --- | --- | --- |
| `bus_vehicles` | active | `vehicle_position_projection` | route | `tdx.bus.vehicle_positions` |
| `mrt_liveboard` | planned | `mrt_liveboard_projection` | line | `tdx.mrt.liveboard` |
| `transit_signals` | planned | `transit_signal_projection` | signal type | `twfoundry.transit.signals` |

## UI Rule

The mobile control is layer-first:

```text
Layer selector -> layer-specific primary filter
```

For bus:

```text
Bus vehicles -> Route
```

For future MRT:

```text
MRT LiveBoard -> Line or Station
```

This prevents the top mobile control from becoming hardcoded to bus routes.

## Projection Contract Shape

Each projection should return:

```json
{
  "layerId": "bus_vehicles",
  "projectionType": "vehicle_position_projection",
  "capturedAt": "2026-05-20T09:55:00+08:00",
  "timelineSlot": "09:55",
  "features": [],
  "summary": {},
  "filters": {}
}
```

Layer-specific details stay inside `features`, `summary`, and `filters`.

## Backend Implication

V1 backend can expose one endpoint per projection without Kafka:

```text
GET /api/projections/{layerId}?timeSlot=09:55
```

Kafka can be introduced later behind the projection writer:

```text
Raw data -> normalized events -> projection table/cache -> projection API
```

The UI should not depend on whether the projection was produced by cron, Kafka Streams, or a local fixture.

## Open Questions

- Should MRT projection start with station LiveBoard, estimated train positions, or both?
- Should transit signals be a standalone layer or an alert overlay available across all transit layers?
- Should timeline playback be global across layers or per-layer when source cadence differs?
