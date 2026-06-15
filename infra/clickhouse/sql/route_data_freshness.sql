-- Which routes have weak telemetry quality?
-- Interview angle: data quality metrics before building product signals.
SELECT
  route_name,
  direction,
  count() AS reports,
  uniqExact(vehicle_id) AS vehicles,
  round(avg(completeness), 3) AS avg_completeness,
  quantileExact(0.95)(gps_update_lag_seconds) AS p95_gps_update_lag_seconds,
  countIf(freshness != 'fresh') AS non_fresh_reports,
  countIf(distance_to_route_meters > 120) AS off_route_reports,
  round(non_fresh_reports / reports, 4) AS non_fresh_rate,
  round(off_route_reports / reports, 4) AS off_route_rate
FROM twfoundry.bus_vehicle_observations
WHERE service_date = {service_date:Date}
GROUP BY route_name, direction
HAVING reports >= 20
ORDER BY non_fresh_rate DESC, off_route_rate DESC, p95_gps_update_lag_seconds DESC
LIMIT 50;
