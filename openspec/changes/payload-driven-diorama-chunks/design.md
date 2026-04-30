## Context

`WorldViewPayload` already carries `chunks`, `objects`, and `projections`.

Current frontend behavior:

- `projections` drive MRT, rain, PM2.5, and incident overlay entities.
- `chunks` contribute summary counts, but not the rendered base world.
- Terrain, city blocks, old map diagnostics, and some station-like anchors still come from frontend-only builders.

The target architecture is:

```text
backend compute
  -> WorldViewPayload.chunks
     -> terrain cells
     -> static feature projections
     -> semantic zones
  -> WorldViewPayload.projections
     -> overlay/domain entities

frontend
  -> map reference LOD
  -> chunk base renderer
  -> projection renderer
  -> object selection / inspector
```

## Goals / Non-Goals

**Goals:**

- Make each visible diorama chunk a backend-computed render input.
- Render chunk base geometry before overlay projections.
- Keep overlay toggles scoped to operational domains, not implementation-only chunk debug layers.
- Allow future focus changes to replace the world by replacing the payload.
- Use real map tiles as a zoomed-out reference LOD, then switch to voxel chunk rendering when the user zooms in.

**Non-Goals:**

- Do not introduce live MapLibre custom layers yet.
- Do not compute chunk data in the browser from raw map tiles.
- Do not change backend public MRT APIs.

## Decisions

- Add a chunk renderer separate from the projection renderer.
- Treat MapLibre/OpenFreeMap as a reference surface, not as the final world surface.
- Switch between `map-reference` and `voxel-diorama` LOD by camera distance until backend focus/zoom contracts are introduced.
- Treat `terrain` as base surface voxels.
- Treat `staticFeatures` as stable physical anchors such as station markers, bridges, route support pillars, or landmark blocks.
- Treat `semanticZones` as low-opacity contextual volumes or tinted terrain regions.
- Register `staticFeatures.ontologyObjectId` as selectable only when it points to a canonical object in `payload.objects`.
- Keep diagnostic tile/chunk visuals available only in Design System or debug mode.

## Risks / Trade-offs

- Rendering every terrain cell as an individual mesh can become expensive; use merged geometry or instancing when payload size grows.
- Chunk seams need deterministic local transforms, otherwise neighboring chunks will visually drift.
- If semantic zones are too opaque they will recreate the old glass overlay problem; default opacity should stay subtle.
- The temporary camera-distance LOD threshold is a frontend heuristic. Later backend world focus should provide explicit LOD and chunk window metadata.
