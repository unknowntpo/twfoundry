# Bus Route Service Signal Detection Plan

Status: planned. Route progress exists in the demo inspector, but route-level service signal
inference is not implemented.

This plan used to be framed as delay detection. The product direction is now more conservative:
first diagnose route-level service spacing problems, then consider delay only after schedule, ETA, or
historical baseline evidence is strong enough.

## Current Data Flow

The current operations dashboard already has the minimum data foundation:

1. `frontend/scripts/fetch-tdx-taipei-bus-snapshot.mjs`
   captures TDX bus vehicle positions into 5 minute archive slots.
2. `frontend/scripts/fetch-tdx-taipei-bus-history.mjs`
   can build a full historical service-day archive.
3. `frontend/src/operationsWorkflowData.js`
   normalizes rows into `VehicleObservation`.
4. `frontend/src/OperationsExplorer.vue`
   renders map points, timeline playback, freshness, route filtering, and selected-vehicle detail.

The demo now has selected-vehicle route progress in the inspector. It projects a bus GPS point onto
audited route geometry and shows progress percentage, nearest stop, next stop, off-route distance,
and geometry quality.

There is still no route-level service signal layer.

## Target Architecture

Add a derived signal layer between normalized observations and UI rendering:

```text
TDX archive snapshots
  -> VehicleObservation normalization
  -> DailyVehicleTrace
  -> RouteProgress / route grouping
  -> DerivedSignals
  -> Timeline + map overlays + inspector evidence
```

## Signal Scope

V1 should avoid claiming measured delay. Use route-level labels:

- `headway_gap`
- `bunching_risk`
- `coverage_gap`
- `data_missing`

Product labels should be user-facing:

- `車班間距分布`
- `大空窗`
- `車輛群聚`
- `資料不足`

Only promote a signal to `delay` after route geometry, stop sequence, ETA, schedule, or a historical
baseline is available.

These signals should describe the route and time window. They must not imply individual vehicle
fault, driver fault, or exact passenger waiting time.

## Minimum Inputs

Already available:

- service date
- 5 minute sample time
- vehicle id / plate number
- route id / route name
- direction
- latitude / longitude
- speed
- GPS time / update time

Needed for stronger inference:

- route geometry (available for cached Taipei routes)
- stop sequence (available for cached Taipei routes)
- stop locations (available for cached Taipei routes)
- route geometry quality audit (implemented as local manifest)
- ETA or timetable
- historical baseline per route / direction / time window

## First Implementation Boundary

Do not put signal computation directly in `OperationsExplorer.vue`.

Create a separate module, likely:

- `frontend/src/busDelaySignals.js`
- `frontend/tests/busDelaySignals.test.mjs`

The UI should consume derived results as data, not compute them in template/component code.

## Open Design Decision

Resolved V1 decision: route-level first.

The primary unit of signal ownership is:

```text
service date + time window + route + direction
```

Selected vehicle detail can provide evidence, but it is not the primary owner of a service-quality
signal.

## Initial Metric Definitions

### Headway Distribution

Product label: `車班間距分布`.

Definition:

- Sort vehicles by route progress for the same route, direction, and time slot.
- Estimate the spacing between consecutive vehicles.
- Compare spacing against a baseline when available: schedule headway, TDX frequency table, or
  historical same-time baseline.

Purpose:

- Show whether service is evenly distributed.
- Help managers find time windows where planned frequency and observed spacing diverge.

### Service Gap

Product label: `大空窗`.

Definition:

- A route/time window where the spacing between consecutive vehicles is much larger than expected.
- Initial threshold: `observed headway >= 2x baseline headway` when a baseline exists.
- Without a baseline, use a clearly labeled prototype threshold.

Purpose:

- Surface likely under-service, missed dispatch, or unstable spacing.
- Avoid claiming why the gap happened.

### Bunching Risk

Product label: `車輛群聚`.

Definition:

- Two or more vehicles on the same route and direction are much closer than expected.
- Initial threshold: `observed headway <= 0.5x baseline headway` when a baseline exists.
- Without a baseline, use a clearly labeled prototype threshold based on small time distance or
  route-progress distance.

Purpose:

- Surface unstable headway control, especially when a long gap is followed by multiple close
  vehicles.
- Keep the signal route-level; do not frame it as one bus being late.

## Geometry Quality Gate

Delay inference must not assume every route shape matches its stops and GPS
points equally well.

Before computing route progress signals, the pipeline should read the route
quality audit from the route-context cache:

- `good` routes can produce delay-like signals.
- `usable` routes can show visual progress, but signals should be downgraded.
- `bad` routes should be excluded from delay inference.

This keeps the system scalable: we avoid per-route manual tuning and make route
reliability an explicit data quality field.

## Demo Feature Inventory

The current demo behavior is tracked in:

- `docs/operations-dashboard-feature-inventory.md`

That inventory separates product-contract behavior from experiments so the
formal backend rewrite can preserve useful workflow decisions without carrying
over every prototype implementation detail.

## Experimental Visual Encoding

Route progress encoding on the map is implemented as an experimental toggle, not a delay signal.

Current behavior:

- early route progress: cooler or smaller point
- middle route progress: normal vehicle point
- late route progress: brighter point with a short halo
- applies only to current same-route vehicles after a route is selected

This should only be tested as an overview aid for selected routes. It must not
imply that a vehicle is delayed, ahead, crowded, or problematic. Delay requires a
baseline, timetable, ETA, or another named comparison source.
