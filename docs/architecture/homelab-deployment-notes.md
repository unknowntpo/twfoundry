# Homelab Deployment Notes

**Last updated:** 2026-06-18

## Overview

TWFoundry Phase 1 bus data pipeline runs on homelab Kubernetes infrastructure located at `~/repo/unknowntpo/infra`.

## Infrastructure Paths

- **Infra repo:** `~/repo/unknowntpo/infra`
- **Primary K8s cluster:** `20-saas-k0s` and `30-saas-platform` (Morefine hardware)
- **NOT target:** `10-benchmark-swarm` — reserved for benchmarking, not for active services
- **Local dev:** `infra/kafka` docker-compose for offline development and testing

## Kubernetes Namespace

All bus pipeline services deploy to namespace: **`twfoundry-data`**

Namespace deployment pattern:
- Deferred (not generated in Phase 1, applied post-planning)
- K8s manifests live in `infra/kubernetes/` or alongside service directories
- See related architecture docs for component details

## Service References

Key pipeline components documented in architecture:

- **`bus-lake-archiver-v1.md`** — Flink job: Kafka → Iceberg on R2, HadoopCatalog, at-least-once + upsert, 60s checkpoint
- **`bus-pipeline-e2e-milestones.md`** — End-to-end deployment milestones M1–M8, current status M2 in progress

## Local Development Setup

For offline testing and Kafka topic exploration:

```sh
cd ~/repo/unknowntpo/infra/kafka
docker-compose up -d
```

This brings up:
- Kafka broker(s)
- Zookeeper (or KRaft if using modern compose)
- Basic tooling for topic inspection

See `infra/kafka/README.md` and `infra/kafka/docker-compose.yml` for details.

## Deployment Workflow

Phase 1 K8s manifests are deferred pending finalized architecture agreements.

Typical steps (manual until CI/CD automation):

1. Update SPEC contracts (`docs/architecture/*.md`)
2. Review manifests in `infra/kubernetes/` or service `/k8s/` subdirs
3. Apply to `twfoundry-data` namespace on `20-saas-k0s` or `30-saas-platform`
4. Verify Kafka consumer logs and R2 manifest/Iceberg output

## Notes

- Homelab is ephemeral; prioritize state in R2 (Iceberg, manifests, checkpoints)
- Local Kafka can be spun up/down without losing cluster state
- Phase 1 avoids introducing a dedicated lock service; lock state also lives in R2 (`bus/ingestion/poller-lock.json`)
