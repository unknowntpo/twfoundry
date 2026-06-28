# Shared Bus Detection Rules — one source of truth across speed + batch

Status: FIRST IMPLEMENTATION (2026-06-28, UNK-37). Supersedes the duplicated magic
numbers in `BusRouteSentinelProcessor` (Flink, Java) and
`publish-clickhouse-bus-analytics.mjs` (ClickHouse SQL).

## Problem

The speed layer (Flink) and the batch layer (ClickHouse SQL) each implemented the SAME
bus anomaly detection (service-gap + bunching + map-matching), so the parameters were
duplicated literally in two languages and drifted:

| Concept | Flink (Java) | Batch (SQL) |
|---|---|---|
| gap / headway threshold | `DEFAULT_SERVICE_GAP_MINUTES = 14.0` | `--min-headway-minutes` default `14` |
| route traversal minutes | `DEFAULT_ROUTE_MINUTES = 48.0` | `... * 48` hardcoded in SQL |
| bunching closeness EPS | `DEFAULT_BUNCHING_PROGRESS_GAP_RATIO = 0.04` | (batch reports per-slot candidates) |
| bunching confirmation slots | `DEFAULT_BUNCHING_CONFIRMATION_SLOTS = 2` | (speed-layer only) |
| map-match distance gate | `DEFAULT_MAX_DISTANCE_TO_ROUTE_METERS = 120.0` | `distance_to_route_meters <= 120` (twice) |

Same number, edited in two unrelated files → the two engines answered differently for the
same moment. This is exactly the "hardcoded domain truth is a design defect" case from
`AGENTS.md`: the rule MUST flow through a shared contract, not be baked separately.

## Approaches considered

1. **Shared compiled library imported by both engines.** Rejected: the engines are
   different languages (Java vs JS-that-templates-SQL). A cross-language library means a
   build artifact (e.g. a published npm + a published jar generated from one IDL) — heavy
   for five scalar parameters, and the SQL still can't *call* a Java function; it can only
   be templated with a value.
2. **Generate one file from the other** (e.g. emit Java constants from the JS, or vice
   versa). Rejected: introduces a build-order dependency and a generator to maintain;
   still two representations that can skew between regenerations.
3. **One declarative rule spec (CHOSEN).** A single language-neutral JSON file holds the
   parameter values. The Flink job reads it as classpath config; the publish script reads
   it and templates the values into its SQL string. The numbers physically exist in one
   place, so they cannot drift. A contract test on each side asserts its engine resolves
   the contract values.

Rationale: the drift is over **values**, not **algorithm code** — the algorithms already
live in their respective engines and are not the thing that skews. The smallest fix that
makes drift impossible is to single-source the *values*. JSON is readable by the JVM
(Jackson, already a dependency) and by Node/Bun (`JSON.parse`) with zero new tooling.

## The contract

`contracts/bus-detection-rules.v1.json` (repo root) — schema
`twfoundry.contracts.bus_detection_rules.v1`:

```json
{
  "parameters": {
    "routeMinutes": 48.0,
    "serviceGapMinutes": 14.0,
    "bunchingProgressGapRatio": 0.04,
    "bunchingConfirmationSlots": 2,
    "maxDistanceToRouteMeters": 120.0
  }
}
```

Parameter meanings are documented inline in the file (`parameterDocs`) and trace back to
`anomaly-detection-algorithm.md` (K(cp,t), EPS, M, the map-match gate).

## How each engine consumes it

- **Flink (speed layer).** `BusDetectionRules` loads the JSON from the classpath
  (`contracts/bus-detection-rules.v1.json`). `BusRouteSentinelProcessor.DEFAULT_*` and
  `BusRouteSentinelJob.DEFAULT_MAX_DISTANCE_TO_ROUTE_METERS` now delegate to
  `BusDetectionRules.DEFAULTS.*` — no inline literals. `backend/streams/build.gradle.kts`
  copies the repo-root `contracts/` dir into both main and test resources, so the job ships
  the same bytes the tests assert against. Env-var overrides (`BUS_SENTINEL_*`) still work
  per-deploy; the contract supplies the defaults.
- **Batch (ClickHouse SQL).** `frontend/scripts/lib/busDetectionRules.mjs` loads the same
  JSON. `publish-clickhouse-bus-analytics.mjs` derives `minHeadwayMinutes` (default),
  `routeMinutes`, and `maxDistanceToRouteMeters` from it and templates them into the
  bunching/freshness SQL — no inline `14` / `48` / `120`. CLI flags still override per-run.
  The resolved params are echoed into `bunching.json` (`detectionRules`) for provenance.

## The drift gate (tests)

- Java: `BusDetectionRulesContractTest` — the contract loads from the classpath, the
  `DEFAULT_*` constants equal the contract, and the loaded values equal the raw file.
- Batch: `frontend/tests/busDetectionRulesContract.test.mjs` — the loader resolves the same
  values, mirrored against the identical expected snapshot the Java test uses.

To change a parameter you edit ONE file and update the two tiny test snapshots in the same
commit. A skew between engines now fails one of the two builds.

## Out of scope (deliberately)

- Per-route traversal time (`routeMinutes` per route) — still a single shared constant; the
  contract is the place to grow it to a map later without re-introducing duplication.
- The batch layer does not yet implement the `bunchingConfirmationSlots` streak (it reports
  per-slot candidates). The parameter is in the contract so when batch gains the streak it
  reads the same `M` the speed layer uses.
