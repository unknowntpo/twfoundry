# Kafka Infrastructure — Bus Pipeline Phase 1

**Last updated:** 2026-06-18  
**Status:** Phase 1 implementation

## Overview

This directory contains the Kafka infrastructure for TWFoundry's bus pipeline. Kafka serves as the streaming handoff between ingestion service and the data lake (Iceberg on R2).

### Architecture References
- **Kafka Topics & Durability:** `docs/architecture/kafka-topics-bus-v1.md`
- **Technical Decisions:** `docs/architecture/technical-decisions-log.md`

## Quick Start

### 1. Start Kafka (Single-Broker Dev)

```bash
cd infra/kafka
docker compose up -d
```

**Kafka is ready** when you see logs like:
```
kafka-1  | [KafkaServer id=1] started (kafka.server.KafkaServer)
```

Verify with:
```bash
docker compose logs -f kafka-1
```

### 2. Create Bus Topics

**Prerequisites:**
- Node.js (v18+) and npm
- Kafka must be running (see step 1)

**Install dependencies** (one time):
```bash
cd infra/kafka
npm install kafkajs
```

**Create topics with default dev settings** (RF=1):
```bash
node scripts/create-bus-topics.mjs
```

**Or with 3-broker prod-like settings** (RF=3):
```bash
REPLICATION_FACTOR=3 node scripts/create-bus-topics.mjs
```

**Expected output:**
```
✓ Created topic: normalized.tdx.bus_vehicle_position
  - Partitions: 6
  - Replication Factor: 1
  - Min ISR: 1
  - Retention: 604800000ms

✓ Created topic: dlq.tdx.bus_vehicle_position
  - Partitions: 3
  - Replication Factor: 1
  - Min ISR: 1
  - Retention: 2592000000ms
```

### 3. Verify Topics

```bash
docker compose exec kafka-1 \
  kafka-topics \
  --bootstrap-server localhost:9092 \
  --list

# Describe a topic
docker compose exec kafka-1 \
  kafka-topics \
  --bootstrap-server localhost:9092 \
  --describe \
  --topic normalized.tdx.bus_vehicle_position
```

### 4. Produce Test Messages (Optional)

```bash
docker compose exec kafka-1 kafka-console-producer \
  --broker-list localhost:9092 \
  --topic normalized.tdx.bus_vehicle_position \
  --property "parse.key=true" \
  --property "key.separator=|"
```

Then type (each line is a message):
```
slot:2026-06-18T10:05+08:00|vehicle:1001|route:123|forward|{"vehicle_id":"1001","slot_key":"2026-06-18T10:05+08:00","latitude":25.0453,"longitude":121.5627}
```

Press `Ctrl+D` to exit.

### 5. Consume Test Messages (Optional)

```bash
docker compose exec kafka-1 kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic normalized.tdx.bus_vehicle_position \
  --from-beginning
```

## Configuration Profiles

### Dev (Current Default)
- **Brokers:** 1
- **Replication Factor:** 1
- **Min ISR:** 1
- **Use case:** Local development, testing

**Activation:** Already active in `docker-compose.yml`

### Prod-Like (Optional 3-Broker)
- **Brokers:** 3
- **Replication Factor:** 3
- **Min ISR:** 2
- **Use case:** Homelab staging, production-like testing

**To enable:**

1. Uncomment `kafka-2` and `kafka-3` services in `docker-compose.yml`
2. Update `kafka-1` environment variable `KAFKA_CONTROLLER_QUORUM_VOTERS`:
   ```yaml
   KAFKA_CONTROLLER_QUORUM_VOTERS: '1@kafka-1:29093,2@kafka-2:29093,3@kafka-3:29093'
   ```
3. Uncomment volumes for `kafka-data-2` and `kafka-data-3`
4. Restart Kafka:
   ```bash
   docker compose down
   docker compose up -d
   ```
5. Create topics with RF=3:
   ```bash
   REPLICATION_FACTOR=3 node scripts/create-bus-topics.mjs
   ```

## Topic Specifications

### `normalized.tdx.bus_vehicle_position`

**Purpose:** Main data stream for bus vehicle positions (normalized from TDX API)

| Config | Dev | Prod-Like | Note |
|--------|-----|-----------|------|
| Partitions | 6 | 6 | Supports Flink parallelism 3–6 |
| Replication Factor | 1 | 3 | Single-broker vs. 3-broker |
| Min ISR | 1 | 2 | Minimum in-sync replicas |
| Cleanup Policy | delete | delete | Not compacted in Phase 1 |
| Retention | 7 days | 7 days | `retention.ms=604800000` |
| Compression | lz4 | lz4 | Optional; enables on write |

**Message Key:** `{slot_key}|{vehicle_id}|{route_uid}|{direction}`  
Example: `2026-06-18T10:05+08:00|vehicle:1001|route:123|forward`

**Message Value:** JSON (Avro schema TBD)  
See `docs/architecture/normalized-bus-vehicle-position-v1.md` for field definitions.

### `dlq.tdx.bus_vehicle_position`

**Purpose:** Dead-letter queue for poison messages (deserialization failures, missing required fields)

| Config | Dev | Prod-Like |
|--------|-----|-----------|
| Partitions | 3 | 3 |
| Replication Factor | 1 | 3 |
| Min ISR | 1 | 2 |
| Retention | 30 days | 30 days |

## Producer Settings

Ingestion service must use:

```properties
acks=all
enable.idempotence=true
```

Why:
- `acks=all` + `min.insync.replicas=2` ensures leader doesn't return OK until data is replicated; guards against leader crash during replication.
- `enable.idempotence=true` prevents duplicates across retries (same sequence number = skip).

## Consumer Groups (Defined in Phase 1 Architecture)

| Group | Job | Phase |
|-------|-----|-------|
| `bus-lake-archiver` | Flink → Iceberg on R2 | 1 |
| `bus-route-sentinel` | Flink → online topics | 2 |

## Local Development Homelab Access

If running from another machine on your homelab network:

1. **Get Kafka broker IP:**
   ```bash
   docker network inspect twfoundry_twfoundry | grep -A5 kafka-1
   ```

2. **Update `docker-compose.yml` advertised listeners** to expose the IP (e.g., `192.168.1.x`):
   ```yaml
   KAFKA_ADVERTISED_LISTENERS: 'PLAINTEXT://192.168.1.x:9092'
   ```

3. **Connect from remote client:**
   ```
   kafkacat -b 192.168.1.x:9092 -L
   ```

## Troubleshooting

### Kafka won't start

**Symptom:** Container exits or logs show `ERROR`

**Fix:**
```bash
# Check logs
docker compose logs kafka-1

# Clean start
docker compose down
docker volume rm kafka-data-1  # ⚠ Deletes data
docker compose up -d
```

### Topic creation fails

**Symptom:** "Cannot find broker"

**Check Kafka is ready:**
```bash
docker compose exec kafka-1 kafka-broker-api-versions \
  --bootstrap-server localhost:9092
```

**Wait a few seconds and retry:**
```bash
sleep 5
node scripts/create-bus-topics.mjs
```

### Cannot connect from remote machine

**Check network mode in `docker-compose.yml`:**
- Current: `driver: bridge` (localhost-only by default)
- To expose: Use host network or update advertised listeners (see "Homelab Access" above)

### Topic exists but shows 0 partitions

**Cause:** Metadata sync delay

**Fix:** Wait 10s and re-check:
```bash
sleep 10
docker compose exec kafka-1 kafka-topics \
  --bootstrap-server localhost:9092 \
  --describe \
  --topic normalized.tdx.bus_vehicle_position
```

## Next Steps

1. **Verify topics are created and healthy** (see "Verify Topics" in Quick Start)
2. **Phase 2:** Implement ingestion service (reads TDX API, produces to `normalized.tdx.bus_vehicle_position`)
3. **Phase 3:** Implement bus-lake-archiver (Flink reads Kafka, writes to Iceberg)
4. **Phase 4:** Implement Airflow reconciliation DAG

## Files

- `docker-compose.yml` — Single-broker dev (with 3-broker comments)
- `scripts/create-bus-topics.mjs` — Idempotent topic creation
- `README.md` — This file

## References

- **Kafka Topics Spec:** `docs/architecture/kafka-topics-bus-v1.md`
- **Technical Decisions:** `docs/architecture/technical-decisions-log.md`
- **Normalized Message Contract:** `docs/architecture/normalized-bus-vehicle-position-v1.md`
- **Ingestion Service Design:** `docs/architecture/ingestion-service-v1.md`
- **Lake Archiver Design:** `docs/architecture/bus-lake-archiver-v1.md`
- **Airflow Reconciliation DAG:** `docs/architecture/airflow-reconciliation-bus-v1.md`
