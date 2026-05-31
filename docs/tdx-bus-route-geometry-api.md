# TDX Taipei Bus Route Geometry Notes

This note records the TDX bus APIs needed to turn raw bus GPS points into route-aware observations for ghost playback and delay signals.

## Goal

Current bus observations are GPS points. For delay and ghost comparison, the platform needs route-relative position:

```text
vehicle GPS
+ route shape
+ ordered stops
= route progress, nearest stop, between-stops context
```

The target derived shape is:

```js
{
  plateNumb,
  routeUID,
  routeName,
  direction,
  progressMeters,
  progressRatio,
  distanceToRouteMeters,
  matchedPosition,
  nearestStop,
  betweenStops
}
```

## API Groups

Base URL:

```text
https://tdx.transportdata.tw/api/basic/v2
```

Historical base URL:

```text
https://tdx.transportdata.tw/api/historical/v2
```

Authentication uses the existing TDX client credentials in `frontend/.env`. Scripts must not print credentials or tokens.

## Vehicle Positions

Realtime by route:

```text
GET /Bus/RealTimeByFrequency/City/Taipei/{RouteName}?$format=JSON
```

Historical by service day:

```text
GET /Historical/Bus/RealTimeByFrequency/City/Taipei?Dates=YYYY-MM-DD&$top=500000&$format=CSV
```

Important fields:

```text
PlateNumb
RouteUID
RouteID
RouteName
SubRouteUID
SubRouteID
Direction
BusPosition.PositionLon
BusPosition.PositionLat
Speed
Azimuth
GPSTime
SrcUpdateTime
UpdateTime
```

Use:

- `PlateNumb` identifies a physical bus within the sampled data.
- `RouteUID + Direction` is the main join key to route shape and stop sequence.
- `BusPosition` is the observed point that must be projected onto the route.
- `UpdateTime` is used for slot grouping and dedupe.

## Route Shape

Route-specific endpoint:

```text
GET /Bus/Shape/City/Taipei/{RouteName}?$format=JSON
```

Observed fields:

```text
RouteUID
RouteID
RouteName
SubRouteName
Direction
Geometry
EncodedPolyline
UpdateTime
VersionID
```

Use:

- `Geometry` is a WKT `LINESTRING (lon lat, lon lat, ...)`.
- `Direction` separates outbound/inbound geometry.
- `RouteUID + Direction` should match vehicle observations where possible.
- `EncodedPolyline` can be kept as a secondary source, but WKT is easier to parse first.

## Stop Of Route

Route-specific endpoint:

```text
GET /Bus/StopOfRoute/City/Taipei/{RouteName}?$format=JSON
```

Observed top-level fields:

```text
RouteUID
RouteID
RouteName
Operators
SubRouteUID
SubRouteID
SubRouteName
Direction
City
CityCode
Stops
UpdateTime
VersionID
```

Observed `Stops[]` fields:

```text
StopUID
StopID
StopName
StopBoarding
StopSequence
StopPosition.PositionLon
StopPosition.PositionLat
StationID
LocationCityCode
```

Use:

- `StopSequence` gives route-order semantics.
- `StopPosition` can be projected onto the route shape.
- Once stops have progress meters, a vehicle can be described as nearest stop or between two stops.

## Optional Stop Catalog

Endpoint:

```text
GET /Bus/Stop/City/Taipei?$format=JSON
```

Fields:

```text
StopUID
StopID
StopName
StopPosition
StopAddress
Bearing
StationID
City
LocationCityCode
```

Use this for global stop POI/context. It is not enough for delay by itself because it lacks route-specific order.

## Local Cache

Script:

```text
bun scripts/fetch-tdx-taipei-bus-route-context.mjs --routes 234,307
bun scripts/fetch-tdx-taipei-bus-route-context.mjs --from-archive --limit-routes 40
```

Package script:

```text
bun run fetch:tdx-bus-route-context
bun run audit:tdx-bus-route-quality
```

Output:

```text
frontend/public/data/tdx-bus/route-context/manifest.json
frontend/public/data/tdx-bus/route-context/{encodeURIComponent(RouteName)}.json
```

Each route context file contains:

```js
{
  schema: "twfoundry.tdx.citybus.route-context.v1",
  source,
  routeName,
  generatedAt,
  shapes,
  stopOfRoutes,
  shapeCount,
  stopOfRouteCount
}
```

Route quality audit output:

```text
frontend/public/data/tdx-bus/route-quality/manifest.json
```

The audit is local-only. It reads cached route context, projects every stop onto
the matching route shape, and stores one summary row per `RouteName + Direction`
or sub-route variant:

```js
{
  routeName,
  routeUID,
  subRouteUID,
  subRouteName,
  direction,
  quality: "good" | "usable" | "bad",
  stopsCount,
  projectedStopsCount,
  medianDistanceToRouteMeters,
  p95DistanceToRouteMeters,
  maxDistanceToRouteMeters,
  badStopRatio,
  worstStops
}
```

## Projection Algorithm

Implementation:

```text
frontend/src/busRouteGeometry.js
```

Steps:

1. Parse WKT `LINESTRING` into `[lon, lat]` points.
2. Build cumulative route length by segment.
3. Project GPS point to the nearest segment using a local meter plane.
4. Return:
   - matched point
   - distance to route in meters
   - progress meters
   - progress ratio
5. Project every `StopOfRoute.Stops[]` position to the same route.
6. Locate the vehicle between the previous and next stop by progress.

## Route Quality Audit

Do not manually tune every route. The data pipeline should run an automatic
quality audit for every `RouteName + Direction` before using route geometry for
delay signals.

For each route direction, project all `StopOfRoute.Stops[]` points onto the
matching `Shape.Geometry` and compute:

```text
stopsCount
medianDistanceToRouteMeters
p95DistanceToRouteMeters
maxDistanceToRouteMeters
badStopRatio = stops farther than 80m / stopsCount
```

Initial quality bands:

```text
good    p95 < 30m
usable  p95 < 80m
bad     p95 >= 80m or badStopRatio is high
```

Use:

- `good`: eligible for route progress and delay signal computation.
- `usable`: render route context, but keep delay signals conservative.
- `bad`: do not infer delay from route progress until geometry/source quality is fixed.

The audit output should be stored with the route context cache so downstream
pipeline stages can filter or downgrade unreliable routes without UI-specific
logic.

## Matching Is Not Exact

Reference:

```text
https://chiajung-yeh.github.io/TDX_Guide/transport-application.html
```

The TDX guide's bus route application notes are important for this project because route geometry, stop sequence, and vehicle GPS should not be treated as perfectly aligned truth.

Practical implications:

- `StopOfRoute.Stops[].StopPosition` may not sit exactly on the `Shape.Geometry` line.
- Vehicle GPS may be offset from the route because of GPS error, road width, elevated roads, tunnels, or map/source mismatch.
- A route name query can return related variants; the local route-context collector therefore applies exact `RouteName` filtering after the API response.
- Branch routes and subroutes can share similar names. V1 joins by `RouteUID + Direction`; stronger matching should also preserve and use `SubRouteUID` where the source provides it.
- Projection output is an inference, not raw truth. Always expose `distanceToRouteMeters` as confidence.

V1 confidence rule:

```text
0-25m: likely matched
25-80m: usable but suspicious
80m+: low confidence; do not use for delay assertions
```

This means route progress can support ghost visualization earlier than it can support hard delay claims.

## Delay / Ghost Usage

Current ghost:

```text
same RouteUID + same Direction + selected time ± 1 slot
```

Route-aware ghost should become:

```text
current vehicle progress at selected time
vs
multi-day baseline progress distribution at same route/direction/time window
```

This enables:

- "vehicle is behind normal route progress"
- "route has headway gap"
- "vehicle is between stop A and stop B"
- smoother animation along the route shape

## Known Caveats

- GPS can be off-road; keep `distanceToRouteMeters` as a confidence signal.
- Some routes have branch/subroute variants. V1 matches `RouteUID + Direction`; later use `SubRouteUID` when available.
- Stop progress is derived by projecting stops to the route geometry; it should not be treated as exact station mileage without confidence checks.
- Linear interpolation between GPS points is visually smooth but can cut across roads. Route-aware interpolation should interpolate along `progressMeters`.
- Historical API row limits matter. Current archive uses `$top=500000`, then groups into 5-minute slots.
- For delay detection, a single abnormal day is not a reliable baseline. Prefer multi-day baseline and keep source days visible in diagnostics.
