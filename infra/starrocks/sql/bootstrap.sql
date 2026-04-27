CREATE DATABASE IF NOT EXISTS twfoundry;
USE twfoundry;

CREATE TABLE IF NOT EXISTS mrt_station_liveboard_current (
  station_id VARCHAR(32) NOT NULL,
  line_id VARCHAR(32) NOT NULL,
  train_id VARCHAR(64) NOT NULL,
  destination VARCHAR(128) NOT NULL,
  direction VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL,
  arrival_minutes INT NOT NULL,
  observed_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
)
PRIMARY KEY (station_id, line_id, train_id)
DISTRIBUTED BY HASH(station_id) BUCKETS 4
PROPERTIES (
  "replication_num" = "1"
);

INSERT INTO mrt_station_liveboard_current (
  station_id,
  line_id,
  train_id,
  destination,
  direction,
  status,
  arrival_minutes,
  observed_at,
  updated_at
) VALUES
  ('BL15', 'blue', 'tdx-BL15-BL23', 'Taipei Nangang Exhibition Center', 'northbound', 'approaching', 1, NOW(), NOW()),
  ('R05', 'red', 'tdx-R05-R28', 'Tamsui', 'northbound', 'scheduled', 3, NOW(), NOW());

SELECT *
FROM mrt_station_liveboard_current
ORDER BY station_id, line_id, train_id;
