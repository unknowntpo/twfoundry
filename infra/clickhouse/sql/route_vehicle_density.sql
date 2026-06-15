-- Which routes are heavily supplied at each time bucket?
-- Interview angle: OLAP grouping over time + route dimensions.
SELECT
  toStartOfInterval(slot_start, INTERVAL 15 MINUTE) AS bucket_start,
  route_name,
  direction,
  uniqExact(vehicle_id) AS active_vehicles,
  round(avg(speed_kph), 1) AS avg_speed_kph,
  countIf(speed_kph = 0) AS stopped_reports
FROM twfoundry.bus_vehicle_observations
WHERE service_date = {service_date:Date}
GROUP BY bucket_start, route_name, direction
HAVING active_vehicles >= 3
ORDER BY bucket_start ASC, active_vehicles DESC
LIMIT 200;
