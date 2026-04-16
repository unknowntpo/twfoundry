# Design: Define Backend Platform Contracts

## Overview

This change continues Phase 1 after the frontend-first MRT dashboard bootstrap. It defines the minimum backend and data-platform contracts needed before implementing ingestion services, Kafka Streams processors, StarRocks schemas, or Spring Boot APIs.

## Deferred From Bootstrap

The following items are intentionally moved out of `bootstrap-twfoundry-platform`:

- Current-state storage direction beyond the high-level StarRocks choice.
- Backend module skeletons for ingestion, streams, and API.
- Local Kafka and StarRocks infrastructure notes or compose files.
- Raw topic message envelope details.
- Curated Kafka Streams topic naming and ownership.
- StarRocks Primary Key Table schemas for current-state tables.

## Contract Direction

Backend work should preserve the existing frontend contract until a real API contract is accepted. New backend modules should start minimal and should not force the MRT dashboard away from mock/static data until a source integration change explicitly requests it.

The next design pass should define:

- Envelope fields common to raw records.
- Source-specific raw topic names and ownership.
- Curated topic naming conventions.
- Latest-state table keys and update semantics.
- API resource boundaries that can replace the current mock fixture contract later.

## Validation

This change is complete when the backend contracts are documented, local development entrypoints are described, and small verification checks exist for any generated skeletons.
