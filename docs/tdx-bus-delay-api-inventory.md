# TDX Bus Delay API Inventory

Date: 2026-06-10

Status: live API sampling verified for first candidate endpoints. Field-level join quality still needs
deeper payload inspection.

## Goal

Decide whether TWFoundry can move from:

```text
Possible service gap
```

to:

```text
Possible delay
```

That requires evidence beyond vehicle spacing. The minimum evidence should come from schedule, ETA, route stop order, or a credible historical baseline.

## Current Data We Already Use

Base URL:

```text
https://tdx.transportdata.tw/api/basic/v2
```

Already implemented in local scripts:

```text
GET /Bus/RealTimeByFrequency/City/Taipei/{RouteName}
GET /Bus/Shape/City/Taipei/{RouteName}
GET /Bus/StopOfRoute/City/Taipei/{RouteName}
```

Use today:

- `RealTimeByFrequency`: vehicle GPS observations.
- `Shape`: route geometry for map matching.
- `StopOfRoute`: ordered stops for route context.

## Candidate APIs For Delay Detection

These endpoints follow the same TDX bus API naming pattern as the APIs already used by this repo.
Live sampling on 2026-06-10 confirmed HTTP 200 responses for routes `1`, `2`, and `南京幹線`
with `$top=2`.

```text
GET /Bus/EstimatedTimeOfArrival/City/Taipei
GET /Bus/EstimatedTimeOfArrival/City/Taipei/{RouteName}
```

Expected use:

- stop-level ETA evidence.
- compare ETA against schedule or expected headway.
- join by route, direction, stop, and update time.

```text
GET /Bus/Schedule/City/Taipei
GET /Bus/Schedule/City/Taipei/{RouteName}
```

Expected use:

- planned service / dispatch schedule.
- detect whether a route should be operating.
- compare planned arrival/departure pattern against observed vehicles or ETA.

```text
GET /Bus/StopOfRoute/City/Taipei/{RouteName}
```

Expected use:

- route-specific stop order.
- required join context for ETA and schedule.
- already implemented as route context.

```text
GET /Bus/RealTimeNearStop/City/Taipei
GET /Bus/RealTimeNearStop/City/Taipei/{RouteName}
```

Expected use:

- bus state near stops.
- may help infer observed arrivals at stops.
- useful if ETA does not expose enough event history.

```text
GET /Bus/RealTimeByFrequency/City/Taipei/{RouteName}
```

Expected use:

- current vehicle positions.
- spacing/headway signals.
- not enough by itself to call a signal "delay".

## Signal Definitions

Use this wording until stronger evidence exists:

```text
Possible service gap
```

Meaning:

- a route appears to have a large gap between vehicles.
- based on route progress / vehicle spacing.
- not necessarily late against schedule.

Use this wording only after schedule or ETA validation:

```text
Possible delay
```

Minimum evidence:

- route + direction + stop can be joined across StopOfRoute and ETA or Schedule.
- expected arrival/departure can be computed.
- observed/ETA arrival is later than expected by a chosen threshold.

## Proposed V1 Acceptance Criteria

### API Availability

- TDX token request succeeds.
- `EstimatedTimeOfArrival` returns rows for sample routes:
  - `1`
  - `2`
  - `南京幹線`
  - at least one route currently shown by service-gap analytics.
- `StopOfRoute` returns ordered stops for the same routes.
- `Schedule` returns usable planned service data for the same routes, or is explicitly marked incomplete.

### Join Quality

- ETA rows can be joined to StopOfRoute by route, direction, and stop identity.
- Vehicle observations can be joined to route context by route UID/name and direction.
- Direction semantics are stable enough for user-facing labels.

### Product Signal

- If ETA + StopOfRoute are usable:
  - create stop-level `Possible delay` prototype.
- If Schedule is incomplete but ETA exists:
  - keep `Possible service gap`, and add stop-level ETA context.
- If ETA is incomplete:
  - keep vehicle-spacing `Possible service gap`.
  - do not call it delay.

### UI

- Primary panel shows operations signals first:
  - route
  - time
  - affected stop or route segment
  - estimated gap or delay minutes
  - evidence source
- Data quality metrics are secondary:
  - geometry mismatch rate
  - GPS lag
  - completeness

## Live Sampling Result

Live sampling completed on 2026-06-10 using:

```sh
cd frontend
bun run sample:tdx-bus-delay-apis --top 2
```

Result:

- `EstimatedTimeOfArrival`: HTTP 200 for sample routes.
  - First-row fields include `RouteUID`, `RouteName`, `Direction`, `StopUID`, `StopID`,
    `StopName`, `EstimateTime`, `StopStatus`, `SrcUpdateTime`, and `UpdateTime`.
- `Schedule`: HTTP 200 for sample routes.
  - Route `1` sample includes `Timetables`.
  - Route `2` sample includes `Frequencys`.
  - `南京幹線` sample includes both `Frequencys` and `Timetables`.
- `StopOfRoute`: HTTP 200 for sample routes.
  - First-row fields include `RouteUID`, `RouteName`, `Direction`, `Stops`, and
    `UpdateTime`.
- `RealTimeNearStop`: HTTP 200 for sample routes after adding request delay / 429 retry.
  - First-row fields include `RouteUID`, `RouteName`, `Direction`, `StopUID`, `StopID`,
    `StopSequence`, `PlateNumb`, `GPSTime`, `TripStartTime`, `A2EventType`, and
    `UpdateTime`.

Secret values were not printed or recorded.

## Verification Script Shape

Use the checked-in sampler:

```sh
cd frontend
bun run sample:tdx-bus-delay-apis --top 2
```

The sampler:

1. Reads `TDX_CLIENT_ID`, `TDX_CLIENT_SECRET`, `TDX_AUTH_URL`, and API base URL from env.
2. Requests an access token.
3. Fetches each endpoint with `$top` and `$format=JSON`.
4. Adds request delay and 429 retry for TDX rate limits.
5. Prints only:
   - endpoint path
   - HTTP status
   - row count
   - top-level field names
   - first row field names
6. Never prints token, client secret, or full auth headers.

## Recommended Next Action

Implement a normalized delay-evidence fixture/projection for one route first:

1. Fetch full `EstimatedTimeOfArrival`, `Schedule`, and `StopOfRoute` rows for route `1`.
2. Validate join keys: `RouteUID`, `Direction`, `StopUID` / `StopID`, and stop sequence.
3. If ETA joins cleanly to stops, prototype stop-level ETA context.
4. Only call it `Possible delay` after schedule timetable/frequency semantics are validated.
   Until then, keep the user-facing signal as `Possible service gap` with ETA evidence.

## Route 1 Evidence Projection Result

Generated on 2026-06-11 with:

```sh
cd frontend
bun run build:tdx-bus-reliability-evidence --route 1
```

Output:

```text
frontend/public/data/tdx-bus/reliability-evidence/route-1.json
frontend/public/data/tdx-bus/reliability-evidence/manifest.json
```

Important finding:

- TDX route path matching is broad for `1`; the builder must exact-filter `RouteName`.
- After exact route-name filtering:
  - ETA rows: 69
  - Schedule rows: 2
  - StopOfRoute rows: 4
  - ETA -> StopOfRoute join rate: 100%
  - Distinct ETA route names: `1`
- Direction 0 has ETA, StopOfRoute, and frequency schedule evidence.
- Direction 1 has ETA and StopOfRoute evidence, but schedule rows still need semantic validation.

Product decision:

- This is enough to add stop-level ETA context to `Possible service gap`.
- This is not enough to rename the signal to `Possible delay`.
- Next gate: validate `Schedule.Frequencys` / `Schedule.Timetables` direction semantics and compare against ETA or observed stop events.
