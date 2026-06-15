CREATE DATABASE IF NOT EXISTS twfoundry;

CREATE TABLE IF NOT EXISTS twfoundry.bus_vehicle_observations
(
  service_date Date,
  slot_start DateTime64(3, 'Asia/Taipei'),
  slot_label LowCardinality(String),
  captured_at DateTime64(3, 'Asia/Taipei'),

  vehicle_id String,
  route_uid LowCardinality(String),
  route_name LowCardinality(String),
  direction Int8,

  longitude Float64,
  latitude Float64,
  speed_kph Nullable(Float64),
  azimuth_deg Nullable(Float64),
  gps_time Nullable(DateTime64(3, 'Asia/Taipei')),
  update_time Nullable(DateTime64(3, 'Asia/Taipei')),
  gps_update_lag_seconds Nullable(Int32),

  freshness LowCardinality(String),
  completeness Float32,

  route_progress_ratio Nullable(Float64),
  route_progress_meters Nullable(Float64),
  route_length_meters Nullable(Float64),
  distance_to_route_meters Nullable(Float64),
  nearest_stop_name Nullable(String),
  between_stops_label Nullable(String),

  source_file String,
  imported_at DateTime64(3, 'Asia/Taipei') DEFAULT now64(3)
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(service_date)
ORDER BY (service_date, route_name, direction, slot_start, vehicle_id);
