# StarRocks Local Dev

目前 repo 原本沒有 StarRocks compose。這份文件提供一套最小本地啟動方案，目標只有兩件事：

- 快速把 StarRocks 跑起來
- 讓你能直接用 SQL peek database

## 1. 啟動

在 repo root 執行：

```bash
docker compose -f infra/starrocks/docker-compose.yml up -d
```

看狀態：

```bash
docker compose -f infra/starrocks/docker-compose.yml ps
```

看 logs：

```bash
docker compose -f infra/starrocks/docker-compose.yml logs -f starrocks-fe starrocks-be
```

## 2. 連線

### 用容器內 mysql client

```bash
docker compose -f infra/starrocks/docker-compose.yml exec starrocks-fe \
  mysql -h starrocks-fe -P 9030 -u root --prompt="StarRocks > "
```

### 用本機 mysql client

```bash
mysql -h 127.0.0.1 -P 9030 -u root
```

預設 root 沒密碼，本地開發直接 Enter 即可。

## 3. 常用 SQL

```sql
SHOW FRONTENDS;
SHOW BACKENDS;
SHOW DATABASES;
```

```sql
CREATE DATABASE IF NOT EXISTS twfoundry;
USE twfoundry;
SHOW TABLES;
```

## 4. 建第一張 MRT current-state table

可直接貼：

```sql
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
```

插兩筆測試資料：

```sql
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
```

查資料：

```sql
SELECT *
FROM mrt_station_liveboard_current
ORDER BY station_id, line_id, train_id;
```

看 schema：

```sql
DESC mrt_station_liveboard_current;
SHOW CREATE TABLE mrt_station_liveboard_current;
```

## 5. 一次套用 bootstrap SQL

repo 已提供：

- `infra/starrocks/sql/bootstrap.sql`

執行方式：

```bash
docker compose -f infra/starrocks/docker-compose.yml exec -T starrocks-fe \
  mysql -h starrocks-fe -P 9030 -u root < infra/starrocks/sql/bootstrap.sql
```

## 6. 關閉

```bash
docker compose -f infra/starrocks/docker-compose.yml down
```

如果連 volume 也要清掉：

```bash
docker compose -f infra/starrocks/docker-compose.yml down -v
```

## 7. 這份 compose 的定位

這是 `FE + BE` 本地開發方案，不是 production 拓撲。

現在先用它做：

- schema 討論
- SQL 驗證
- API / query path prototype
- local DB inspection

如果要走你前面討論的 `disk-light / S3-compatible` 路線，下一步再補：

- StarRocks shared-data
- MinIO
- Iceberg-compatible layout

參考官方文件：

- [StarRocks Quick Start](https://docs.starrocks.io/docs/quick_start/)
- [Deploy StarRocks with Docker](https://docs.starrocks.io/docs/quick_start/shared-nothing/)
- [Separate storage and compute](https://docs.starrocks.io/docs/quick_start/shared-data/)
