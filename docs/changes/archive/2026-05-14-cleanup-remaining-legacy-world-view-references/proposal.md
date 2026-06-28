# Change: Cleanup Remaining Legacy World View References

## Why

After the first contract cleanup, a few platform requirements still mention chunk-first or
`WorldViewPayload`-first behavior without clearly marking it as compatibility language.

## What Changes

- Reframe ontology identity around projection boundaries rather than chunk boundaries.
- Reframe backend spatial computation around map-first projections and compatibility local geometry.
- Reframe geospatial provider replacement around source adapters and map-first contracts.
- Reframe freshness/replay metadata as view metadata that may still be carried by legacy payloads.

## Non-Goals

- Do not change runtime code.
- Do not rename Java or frontend compatibility types.
- Do not remove archived trace comments.
