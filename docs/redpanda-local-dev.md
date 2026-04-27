# Redpanda Local Dev

TWFoundry uses Redpanda/Kafka as the Phase 1 event backbone direction. This local compose file is for contract and topic-shape development only.

## Start

```bash
docker compose -f infra/redpanda/docker-compose.yml up -d
```

Kafka API:

```text
localhost:19092
```

Admin API:

```text
http://localhost:9644
```

## Create Phase 1 Topics

```bash
docker compose -f infra/redpanda/docker-compose.yml exec redpanda \
  rpk topic create \
  raw.tdx.mrt_liveboard \
  normalized.mrt.liveboard \
  state.mrt.liveboard_current \
  dlq.tdx.mrt_liveboard
```

List topics:

```bash
docker compose -f infra/redpanda/docker-compose.yml exec redpanda rpk topic list
```

## Stop

```bash
docker compose -f infra/redpanda/docker-compose.yml down
```

Remove local broker data:

```bash
docker compose -f infra/redpanda/docker-compose.yml down -v
```

## Scope

Use this for local schema, topic, and connector contract work. It is not a production topology.
