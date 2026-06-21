# bus-lake-archiver

**Phase 1: Dev archiver skeleton**

Consumes `normalized.tdx.bus_vehicle_position` from Kafka and writes upserted observations to local lake storage as JSONL.

## What this does

- **Consumes**: Kafka topic `normalized.tdx.bus_vehicle_position`
- **Merge key**: `(slot_key, vehicle_id, route_uid, direction)` — dedups failover/backfill repeats
- **Writes**: `data/lake/bus/vehicle_observations/` as JSONL batches (daily partition by `service_date`)
- **Adds**: `archived_at` timestamp (UTC) when row written

## Architecture

```
normalized.tdx.bus_vehicle_position
        │
        ▼
  bus-lake-archiver (Node.js dev)
        │
        ▼
  In-memory upsert table (by merge key)
        │
        ▼
  data/lake/bus/vehicle_observations/
    YYYY-MM-DD.jsonl    (batch dumps every checkpoint)
```

## Running

### Install

```bash
npm install
```

### Start consumer

```bash
KAFKA_BROKERS=localhost:9092 npm start
```

Environment variables:
- `KAFKA_BROKERS`: Kafka bootstrap addresses (default: `localhost:9092`)
- `KAFKA_GROUP_ID`: Consumer group (default: `bus-lake-archiver`)
- `KAFKA_TOPIC`: Topic to consume (default: `normalized.tdx.bus_vehicle_position`)
- `LAKE_PATH`: Local lake root directory (default: `../../data/lake`)
- `CHECKPOINT_INTERVAL_MS`: Checkpoint (dump to JSONL) interval (default: `60000` = 60s)
- `START_FROM_BEGINNING`: If `true`, start from offset 0 (default: `false`, use committed offsets)

### Example

```bash
export KAFKA_BROKERS=localhost:9092
export CHECKPOINT_INTERVAL_MS=30000
npm start
```

## Testing

### Run all tests

```bash
npm test
```

### Run merge/dedup tests only

```bash
npm run test:merge
```

## API (for future integration)

```javascript
import { Archiver } from './src/index.js';

const archiver = new Archiver({
  kafkaBrokers: ['localhost:9092'],
  kafkaGroupId: 'bus-lake-archiver',
  kafkaTopic: 'normalized.tdx.bus_vehicle_position',
  lakePath: '../../data/lake',
  checkpointIntervalMs: 60000,
});

await archiver.start();
// ... run for a while ...
await archiver.stop();
```

## Merge Logic

Rows are upserted by **merge key** `(slot_key, vehicle_id, route_uid, direction)`:

- **Duplicate in-slot**: Same merge key → keep **latest by `update_time`**
- **If `update_time` equal**: Keep **latest by `ingested_at`** (ingest recency)
- **After upsert**: Batched dump to `YYYY-MM-DD.jsonl` every checkpoint interval

Example: If two messages arrive for the same vehicle in same slot:
- Message 1: `vehicle_id=550-U5, slot_key=2026-06-17T10:05+08:00, update_time=10:04:49, ingested_at=02:05:10.1Z`
- Message 2: `vehicle_id=550-U5, slot_key=2026-06-17T10:05+08:00, update_time=10:04:55, ingested_at=02:05:12.3Z`

Result: Merge key → Message 2 (later `update_time`), overwrites Message 1.

## Data Layout

```
data/lake/bus/vehicle_observations/
  2026-06-17.jsonl          ← service_date partition
  2026-06-18.jsonl
  ...
```

Each JSONL is a batch dump of all rows for that `service_date` at checkpoint time.

**Note**: Current implementation re-writes full JSONL per checkpoint. For large data, consider Parquet + incremental append or columnar batch format.

## Stubbed for Production (Flink + Iceberg)

### Not in Phase 1

- **Iceberg table**: Currently just JSONL; prod uses HadoopCatalog → Parquet on R2
- **Iceberg merge semantics**: Dev uses in-memory table; prod uses Flink Iceberg SQL or Flink `IcebergSink` + equality deletes
- **R2 upload**: Currently local `data/lake/`; prod writes to `s3://twfoundry-lake/bus/vehicle_observations/`
- **HadoopCatalog**: No catalog registration; prod adds Iceberg metadata layer
- **Parallelism**: Single-threaded; prod scales with Flink parallelism
- **Checkpoint strategy**: 60s interval with naive full dump; prod uses Iceberg snapshots and manifest commits
- **DLQ**: Not implemented; prod sends parse failures to `dlq.tdx.bus_vehicle_position`

### Upgrade Path

When moving to Flink + Iceberg HadoopCatalog:

1. Replace in-memory merge table with Flink `IcebergSink` (equality-delete upsert)
2. Switch lake path from local `data/lake/` to S3 `s3://twfoundry-lake/` via HadoopCatalog
3. Add Iceberg metadata (snapshots, manifests) management
4. Parallelism: scale to ≤ 6 Flink slots (matching Kafka partition count)
5. Checkpoint interval stays 60s
6. Consumer group still `bus-lake-archiver`; committed offsets now managed by Flink

See `docs/architecture/bus-lake-archiver-v1.md` for full Flink job specification.

## Debugging

### Check consumed message count

```bash
tail -f data/lake/bus/vehicle_observations/YYYY-MM-DD.jsonl | wc -l
```

### Inspect a row

```bash
head -1 data/lake/bus/vehicle_observations/YYYY-MM-DD.jsonl | jq .
```

### Monitor merge key collisions

Archiver logs merge key counts on each checkpoint.

## References

- `docs/architecture/bus-lake-archiver-v1.md` — Flink spec, HadoopCatalog, upgrade paths
- `docs/architecture/normalized-bus-vehicle-position-v1.md` — message contract, merge key, fields
- `infra/kafka/` — local Kafka setup
- `services/bus-ingestion/` — produces normalized topic
