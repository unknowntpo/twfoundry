# Multi-City Bus Onboarding Pipeline Draft

Status: draft. This is a working architecture note for expanding the current Taipei bus pipeline to other cities and counties.

## Goal

Add new city bus datasets without rebuilding the dashboard or manually tuning every route.

The core idea:

```text
city-specific ingestion
  -> common transit schema
  -> automatic geometry quality audit
  -> derived route progress / delay signals
  -> shared map and timeline UI
```

City differences should stay in config and ingestion. The UI and signal layer should consume normalized data.

## City Config

Each city starts with a small config object:

```js
{
  provider: "TDX",
  city: "Taipei",
  cityCode: "TPE",
  archiveIntervalMinutes: 5,
  endpoints: {
    routeList: "/Bus/Route/City/{city}",
    vehiclePosition: "/Bus/RealTimeByFrequency/City/{city}",
    historicalVehiclePosition: "/Historical/Bus/RealTimeByFrequency/City/{city}",
    routeShape: "/Bus/Shape/City/{city}/{routeName}",
    stopOfRoute: "/Bus/StopOfRoute/City/{city}/{routeName}",
    stopCatalog: "/Bus/Stop/City/{city}"
  }
}
```

The exact endpoint shape can evolve after implementation. The important part is that every city declares its source capabilities explicitly.

## Pipeline

Recommended first implementation flow:

```text
1. Discover routes
2. Fetch route context
3. Audit route geometry quality
4. Fetch vehicle positions
5. Normalize observations
6. Compute route progress
7. Derive signals
8. Publish manifests for UI
```

### 1. Discover Routes

Fetch the route catalog for the city.

Output:

```js
{
  city,
  routeName,
  routeUID,
  directions,
  operators,
  sourceUpdatedAt
}
```

Use this route list to avoid guessing route names from vehicle snapshots only.

### 2. Fetch Route Context

For each route:

- fetch route shape
- fetch stop-of-route
- optionally fetch stop catalog

Output path concept:

```text
data/tdx-bus/{cityCode}/route-context/{routeName}.json
data/tdx-bus/{cityCode}/route-context/manifest.json
```

Route context contains:

```js
{
  city,
  routeName,
  shapes,
  stopOfRoutes,
  stops,
  generatedAt
}
```

### 3. Audit Route Geometry Quality

Before computing delay signals, every `RouteName + Direction` must pass a quality audit.

For each direction:

```text
project all StopOfRoute stops onto Shape.Geometry
measure distance from raw stop point to matched route point
compute summary metrics
```

Metrics:

```js
{
  routeName,
  direction,
  stopsCount,
  medianDistanceToRouteMeters,
  p95DistanceToRouteMeters,
  maxDistanceToRouteMeters,
  badStopRatio,
  quality: "good" | "usable" | "bad"
}
```

Initial bands:

```text
good    p95 < 30m
usable  p95 < 80m
bad     p95 >= 80m or badStopRatio is high
```

Use:

- `good`: can compute route progress and delay signals.
- `usable`: can render context, but delay signals should be conservative.
- `bad`: do not use for delay inference.

This avoids manual tuning route by route.

### 4. Fetch Vehicle Positions

Fetch realtime snapshots or historical service-day data.

Output path concept:

```text
data/tdx-bus/{cityCode}/archive/{serviceDate}/{HH-mm}.json
data/tdx-bus/{cityCode}/archive/manifest.json
```

Archive interval should remain configurable, but 5 minutes is the current default.

### 5. Normalize Observations

All cities should normalize into one shared observation shape:

```js
{
  id,
  city,
  provider,
  route: {
    uid,
    name,
    direction
  },
  position: {
    longitude,
    latitude
  },
  speed,
  azimuth,
  gpsTime,
  updateTime,
  source,
  quality
}
```

The dashboard should not consume raw TDX fields directly.

### 6. Compute Route Progress

For observations with usable route context:

```js
{
  observationId,
  routeName,
  direction,
  progressMeters,
  progressRatio,
  distanceToRouteMeters,
  matchedPosition,
  nearestStop,
  betweenStops,
  geometryQuality
}
```

If geometry quality is `bad`, route progress can be skipped or flagged as low confidence.

### 7. Derive Signals

V1 signal candidates:

- possible delay
- bunching risk
- headway gap
- stopped too long
- data missing
- route geometry unreliable

Signals should include evidence, not only labels:

```js
{
  signalType,
  confidence,
  routeName,
  direction,
  serviceDate,
  timeWindow,
  evidence: {
    progressDeltaMeters,
    baselineSource,
    geometryQuality,
    sampleCount
  }
}
```

### 8. Publish UI Manifests

The frontend should load manifests instead of hardcoding city-specific paths.

Concept:

```js
{
  provider: "TDX",
  cities: [
    {
      city: "Taipei",
      cityCode: "TPE",
      archiveManifestUrl,
      routeContextManifestUrl,
      signalManifestUrl,
      supportedLayers: ["vehiclePosition", "routeProgress", "delaySignal"]
    }
  ]
}
```

## Implementation Boundary

Do not start by generalizing every transit mode.

Recommended order:

1. Bus multi-city pipeline.
2. Bus route geometry quality audit.
3. Bus route progress and delay signals.
4. Only then evaluate MRT, YouBike, or other modes.

Reason: bus delay depends heavily on route geometry, stop sequence, and noisy GPS. That logic should become reliable before it is abstracted.

## Open Questions

- Which city should be the first non-Taipei test case?
- Should archive storage be local JSON first, or move directly to backend object storage?
- Should route quality audit run on every fetch, or only when source `VersionID` changes?
- What confidence threshold is acceptable before showing delay signals to users?
- Should UI allow city switching in V1, or should each city be a separate route/page first?

## Current Recommendation

Implement the first backend/data pipeline with Taipei first, but shape the file layout and normalized schema so adding a second city is a config-driven extension.

Do not promise full multi-city support until the first city has:

- route catalog
- route context cache
- geometry quality audit
- vehicle archive
- route progress derivation
- basic signal output
