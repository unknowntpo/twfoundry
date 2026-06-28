# Serving-layer watermark merge — one serving exit (DESIGN, not yet implemented)

Status: DESIGN (2026-06-28, UNK-37 Part 2). Part 1 (shared detection rules) is
implemented; see `shared-detection-rules.md`. This note specifies moving the
speed/batch merge authority from the browser to the edge.

## Why

Today the **frontend** decides the Lambda merge itself. `buildBusOversightModel` in
`frontend/src/busOversightData.js` (`mergeSpeed` / `watermarkDate` logic) stitches batch
events up to the batch service date and speed-layer events after it, computing the
watermark client-side from whatever payloads the browser happened to fetch. Problems:

- The merge rule (what is the watermark, when is batch contiguous, what is provisional)
  lives in client code; any other consumer re-implements it and drifts.
- The browser must fetch BOTH batch and live datasets and choose — more requests, and the
  authority for "exact vs approximate" is on the least-trusted tier.

The same one-source-of-truth principle as Part 1: the *merge rule* should have one home.

## Target design

The batch pipeline publishes a **watermark** = the latest finalized slot it has produced,
to R2/KV. A single Pages Function becomes the only serving exit:

```
GET /api/bus-oversight/timeline?route=...&t=<slot>

  watermark = read latest finalized slot (R2/KV, written by batch)
  if t <= watermark  -> serve BATCH (exact, ClickHouse-published JSON)
  else               -> serve SPEED (approximate, Flink online signals)
  response carries: { watermark, slot, layer: "batch"|"speed", provisional }
```

The frontend calls ONLY this endpoint and renders what it returns. It stops choosing
live-vs-batch; `mergeSpeed`/`watermarkDate` move server-side into the function. The
client keeps rendering `provisional` styling from the flag the API returns, not from a
locally recomputed watermark.

## Components

- **Watermark writer (batch).** The rolling batch publish step writes
  `data/analytics/bus/watermark.json` (or KV key) = `{ watermark: "<latest finalized
  slot>", serviceDate, publishedAt }`. This is the authoritative seam. It belongs next to
  the existing `manifest.json` the publish script already writes.
- **Router (Pages Function).** New function under `frontend/functions/api/bus-oversight/`
  that reads the watermark, routes per-slot, and returns a normalized timeline payload
  with `{ watermark, layer, provisional }`. Reuses the existing batch JSON
  (`/data/analytics/bus/*.json`) and the online signals
  (`/data/online/bus-route-signals/latest.json`) as upstreams — no new storage.
- **Frontend.** `buildBusOversightModel` is reduced to rendering the server payload; the
  `mergeSpeed`/`watermarkDate`/contiguity logic is deleted from the client and asserted in
  a function-level test instead.

## Contract alignment with Part 1

The watermark router compares severities across the seam, so batch and speed must already
agree on the detection rule — which Part 1 now guarantees via
`contracts/bus-detection-rules.v1.json`. The speed payload already echoes `headway_min_est`
on the same scale as the batch `estimated_headway_minutes` because both derive from the
shared `routeMinutes`. Part 2 is therefore safe to build on top of Part 1: the merge can
read continuously across the seam without re-normalizing.

## Why deferred

Part 1 removes the actual correctness bug (drifting thresholds). Part 2 is an
architectural relocation of an existing, working client-side merge — valuable but not
correctness-critical, and it touches edge serving + a new published artifact. It is
documented here and left for a follow-up so Part 1 ships clean and verifiable.
