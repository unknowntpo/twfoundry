# Bus Anomaly Detection — 空窗 (service gap) & 群聚 (bunching)

Status: FIRST IMPLEMENTATION (2026-06-22). Core Flink speed-layer job lives in
`backend/streams/src/main/java/io/twfoundry/backend/streams/bus/`.

Scope: the speed-layer detection that consumes the existing 5-min polled bus
stream and emits `suspected_gap` / `suspected_bunching` alerts. Engine-agnostic
(Flink OR a lightweight stateful consumer) — the algorithm is the same.

## 1. Data shape (ground truth from code)

`services/bus-ingestion/src/index.js` writes ONE Kafka message per vehicle per
5-min slot to topic `normalized.tdx.bus_vehicle_position`:
- key: `slotKey|vehicle_id|route_uid|direction`
- value (`...bus_vehicle_position.v1`): slot_key, service_date, city,
  vehicle_id, route_uid, route_name, direction, longitude, latitude,
  speed_kph, azimuth_deg, gps_time, ...

A slot's ~1200 vehicles = ~1200 separate messages sharing one slot_key.
There is NO route_progress_ratio in Kafka — only raw GPS lat/lon. `progress`
is derived downstream and today only exists in ClickHouse bus_vehicle_observations.

## 2. Shared map-matching (cohesion decision)

Detection needs progress + nearest checkpoint via map-matching GPS onto route
geometry (Bus/Shape + Bus/StopOfRoute). This must live in exactly ONE place,
reused by both the batch (ClickHouse) and stream (detection) paths, or a
route/shape/tolerance change must be edited twice.

Decision: extract mapMatch(lat,lon,routeShape) -> {progress, nearestCheckpoint,
distanceToRouteM} as a single shared pure-function library imported by both
paths. Promote to a standalone enrichment stage (enriched.* topic) only if it
gets heavy. Flink must NOT hand-roll its own copy.

## 3. The two detections, as plain algorithms

### 3a. 空窗 — Service Gap (detecting ABSENCE)

last_seen[checkpoint] = last pass time; on each pass compare (t - last_seen) >= K.
on_arrival alone CANNOT detect ongoing absence (no event = nothing fires).
Three things are required:
1. on_tick / timer — runs every slot without an arrival, flags checkpoints where
   now - last_seen >= K ("had buses, then stopped").
2. Seed the roster — on_tick only scans checkpoints already in last_seen. A stop
   with no bus since startup (cold start / zero service) is invisible. At startup
   pre-seed last_seen with ALL expected checkpoints from route definition/schedule.
3. Operating gate — no alert when no service is expected (see §4).

### 3b. 群聚 — Bunching (too-close, with confirmation)

Per slot per (route,dir): sort vehicles by progress, flag adjacent pairs with
gap < EPS. Require the SAME pair to stay close for M consecutive slots (kills
GPS jitter); reset a pair's streak when it separates.

Both are O(events); per-checkpoint/per-pair state is independent → scales
horizontally (keyBy). Headway estimate: minutes ≈ progress_gap × full_route_minutes
(reuse existing ClickHouse constant 48 initially; per-route traversal time later).

## 4. Threshold K is NOT a constant — it comes from the schedule

TDX Bus/Schedule gives, per route+direction, two possible bases (see
frontend/functions/api/tdx/bus-delay-poc.js). A route uses ONE at a given time:
- frequency (定頻): Frequencys[]{StartTime, EndTime, MinHeadwayMins,
  MaxHeadwayMins}. K = MaxHeadwayMins × tolerance for the window containing now;
  varies by time of day. Signal = 候車超時.
- timetable (定時): Timetables[]{ServiceDay{Mon..Sun}, TripID,
  StopTimes[]{StopUID/StopID, StopSequence, ArrivalTime, DepartureTime}}.
  No headway; expected = next scheduled time at that stop; 空窗 = now >
  scheduledArrival + tolerance and still no bus. Signal = 誤點.

Basis resolution (matches code): use timetable if there are usable StopTimes for
today's weekday; else the active Frequencys window; else none (no alert).

Gates from the same data:
- ServiceDay → route not running today ⇒ no alert.
- Outside all frequency windows / before first or after last timetable trip ⇒ no alert.
- StopStatus (live, from EstimatedTimeOfArrival): 1 尚未發車, 3 末班已過,
  4 今日未營運 ⇒ "no bus" is expected ⇒ suppress (0 正常營運 is the only
  alert-eligible state).

So the per-checkpoint threshold is K(cp, t) — a schedule lookup — not a global
constant. Seed (§3a.2) and gate both read the same schedule.

## 5. Parameters

| Param | Meaning | Starting value | Source |
|---|---|---|---|
| checkpoint granularity | gap key resolution | progress bin 0.1 → stop-level later | choice |
| K(cp,t) | gap threshold | freq: MaxHeadwayMins×1.5; timetable: next scheduled + tolerance | Bus/Schedule |
| EPS | bunching closeness (progress) | 0.04 (~2 min) | tune |
| M | consecutive slots to confirm bunching | 2 (10 min) | tune |
| cooldown | per-key alert suppression | 10–15 min | tune |
| watermark lateness | out-of-order tolerance | 1 slot | tune |

## 6. Output

{ "type": "suspected_gap" | "suspected_bunching", "route_uid": "...", "dir": 0,
  "checkpoint": "...", "since": "...", "headway_min_est": 20,
  "schedule_basis": "frequency|timetable", "state": "ongoing|resolved",
  "detected_at": "...", "source": "speed-layer" }

Sink → Kafka `online.tdx.bus_route_signal` → R2/Pages live panel. Cross-reference with the free TDX
MQTT 官方通阻 alert lane (route/time overlap) to label 官方通阻 vs 官方事件未覆蓋.
MQTT is enrichment only — no vehicle positions, never feeds detection.

## 7. Open decisions

- checkpoint granularity: progress-bin vs stop-level (precision vs key count).
- map-match as shared library (§2) vs enrichment stage.
- engine: Flink selected for live operations signals; ClickHouse remains batch /
  historical analytics.
- This supersedes the older handoff note "Flink = archival; detection =
  ClickHouse." New direction: a speed layer (Flink or consumer) does live
  detection; ClickHouse/lake remains the accurate batch/historical layer
  (Lambda architecture).
