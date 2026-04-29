# Design

## Design System Page

The Design System page is a Vue route that previews the new TWFoundry visual language:

- bright Sakura-season voxel RPG palette
- solid, legible voxel world surfaces
- selective crystal/translucent effects only inside the voxel scene
- reusable Vue components that behave like local shadcn-style wrappers
- Three.js preview canvases for each render module

## Render Module Model

Backend overlays should not force the frontend to hardcode display components like `TrainVoxel`. The frontend should resolve rendering from a data-driven renderer registry.

```ts
type OverlayDefinition = {
  id: string;
  name: string;
  domain: "mobility" | "weather" | "air" | "incident" | "terrain" | string;
  source: string;
  geometryType: "point" | "line" | "polygon" | "grid" | "volume";
  objectTypes: string[];
  visualRole: "vehicle" | "route" | "station" | "sensor" | "event" | "field" | "zone";
  styleToken: string;
  timeMode: "live" | "historical" | "static";
  interactions: Array<"hover" | "select" | "focus" | "timeline" | "toggle">;
};

type VoxelEntityRef = {
  overlayId: string;
  objectId?: string;
  observationIds: string[];
  rendererType: string;
};
```

Resolution rule:

```ts
renderer = registry.resolve({
  geometryType,
  visualRole,
  objectType,
  styleToken,
});
```

This means:

- object type tells what the data means
- visual role tells how it behaves visually
- geometry type tells how it projects into space
- style token tells color/material
- time mode tells how it changes on timeline/live playback

## Current Renderer Classes

| Renderer | Input | Purpose |
| --- | --- | --- |
| `MovingObjectRenderer` | point + vehicle | Trains, buses, rescue vehicles, or future moving operational assets. |
| `RouteRenderer` | line + route | MRT routes, road corridors, service paths, or evacuation paths. |
| `StationNodeRenderer` | point + station | Stations and stops with muted but line-aware colors. |
| `SensorTowerRenderer` | point + sensor | AQMS, rain gauges, roadside sensors, and other observation sources. |
| `FieldVolumeRenderer` | grid/volume + field | Rainfall, PM2.5, heat, crowding, or risk volumes. |
| `IncidentPulseRenderer` | point/polygon + event | Incident areas, alerts, closures, and active disruptions. |
| `ZoneChunkRenderer` | polygon/grid + zone | Visible map chunks, terrain classifications, and administrative zones. |

## Ontology Relationship

Multiple data points may map to one ontology object. An ontology object may also produce multiple voxel entities when the view needs different visual channels.

Example:

- `Train T1005` is one ontology object.
- Live position, headway, speed, next stop, and carriage load are separate observations.
- The world may render it as a moving train voxel plus a hover affordance plus an inspector focus target.
- Turning off the `Taipei Metro` overlay removes all entities and hover details derived from that overlay.

## Component Architecture

Use local Vue wrappers in the spirit of shadcn:

- primitives expose semantic variants instead of arbitrary CSS classes
- domain components compose primitives and renderer modules
- tokens stay semantic; raw hex values do not become the public API
- Three.js scene builders are plain modules that can be tested independently from page layout

