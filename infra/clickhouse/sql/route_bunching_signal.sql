-- Which route snapshots show large gaps between adjacent vehicles on the same route?
-- Interview angle: derive an operations signal from GPS observations + route progress.
WITH ordered AS (
  SELECT
    slot_start,
    route_uid,
    route_name,
    direction,
    vehicle_id AS trailing_vehicle_id,
    route_progress_ratio AS trailing_progress,
    leadInFrame(vehicle_id) OVER route_window AS leading_vehicle_id,
    leadInFrame(route_progress_ratio) OVER route_window AS leading_progress
  FROM twfoundry.bus_vehicle_observations
  WHERE service_date = {service_date:Date}
    AND route_progress_ratio IS NOT NULL
    AND distance_to_route_meters <= 120
  WINDOW route_window AS (
    PARTITION BY slot_start, route_uid, direction
    ORDER BY route_progress_ratio
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  )
)
SELECT
  slot_start,
  route_name,
  direction,
  trailing_vehicle_id,
  leading_vehicle_id,
  round(trailing_progress, 4) AS trailing_progress,
  round(leading_progress, 4) AS leading_progress,
  round(leading_progress - trailing_progress, 4) AS progress_gap_ratio,
  round((leading_progress - trailing_progress) * 48, 1) AS estimated_headway_minutes
FROM ordered
WHERE leading_vehicle_id != ''
  AND leading_progress > trailing_progress
  AND estimated_headway_minutes >= 14
ORDER BY estimated_headway_minutes DESC
LIMIT 100;
