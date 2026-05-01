---
name: twfoundry-extensibility-judge
description: "Judge TWFoundry implementation changes for hardcoding, mock leakage, data-source truth, renderer modularity, and future extensibility. Use after every implementation or review that touches frontend data, ontology objects, map/geospatial projection, overlays, voxel render modules, backend payloads, or UI copy derived from data."
---

# TWFoundry Extensibility Judge

Use this as a project-level judge after every implementation that touches data, overlays, ontology objects, geospatial projection, voxel renderers, payload schemas, or user-visible copy derived from data.

Core rule:

```txt
Do not hardcode domain truth in UI/rendering code.
UI should render data contracts; adapters should map sources into ontology/projection contracts.
Mock data must be clearly isolated and replaceable by real payloads.
```

## Required Review Output

End every relevant implementation with:

```txt
Extensibility Judge: PASS / WARN / FAIL
Score: N/100
Findings:
- ...
Required fixes:
- ...
```

If score is below 80, fix before final unless the user explicitly accepts the tradeoff.

## Scorecard

Start at 100. Deduct points for each issue.

### 1. Data Source Truth, 25 pts

- -15: UI claims real source such as OSM, TDX, CWA, EPA, MapLibre, or backend API when data is actually fixture/mock.
- -10: mock payload is mixed into production adapter path with no explicit fallback boundary.
- -8: generated copy implies certainty not present in source data.
- -5: source metadata, freshness, or confidence is missing when object is derived from external data.

Expected:

```txt
real source -> adapter -> normalized contract -> renderer
fallback fixture -> clearly named fallback/mock path
```

### 2. No Domain Hardcoding, 25 pts

- -20: renderer or UI directly hardcodes a specific place/business/object, e.g. "Zhongshan has Shin Kong".
- -15: behavior branches on object names or IDs instead of type/kind/renderModule/capabilities.
- -10: copy, labels, icons, colors, or geometry are tied to one location without a schema field explaining why.
- -8: tests only pass because of one specific fixture.

Allowed:

```txt
fixture data may include specific examples
renderers may branch on generic kind/renderModule
adapters may map source tags into generic kinds
```

### 3. Contract and Adapter Boundary, 20 pts

- -15: source-specific fields leak directly into Vue components or Three.js builders.
- -10: no typed/validated normalization layer for new payload shape.
- -8: renderer consumes raw API shape instead of ontology/projection contract.
- -5: missing tests for mapping from source feature to normalized object/projection.

Preferred pipeline:

```txt
SourceFeature
  -> GeoFeature / Observation
  -> OntologyObject
  -> WorldProjection
  -> RenderModule props
```

### 4. Renderer Modularity, 20 pts

- -15: a voxel/UI renderer is one-off and cannot render another object of same class.
- -10: renderer has fixed coordinates, fixed count, or fixed label when those should be props.
- -8: visual state is not parameterized by data, e.g. severity, level, capacity, status, freshness.
- -5: no design-system preview or component test for new render module class.

Expected:

```txt
renderModule id + generic props -> reusable builder
```

### 5. Extensibility and Operations, 10 pts

- -5: adding a new overlay requires editing unrelated UI/rendering code.
- -5: no graceful fallback for missing/partial source fields.
- -5: no observable status for freshness/loading/error.
- -5: implementation makes later backend-compute/front-end-render split harder.

## Hard Gates

Return FAIL regardless of score if any gate is hit:

- UI/rendering code invents real-world facts without a fixture or source boundary.
- Production path depends on a specific station, district, business, or route name.
- Mock data is labeled as live/real without explicit fallback/source metadata.
- New overlay cannot be disabled through the overlay model.
- A new object class has no generic renderModule or adapter story.

## Quick Fix Patterns

Replace:

```js
if (name.includes('Shin Kong')) createDepartmentStore()
```

With:

```js
const kind = classifyOsmFeature(feature.tags);
renderModule = registry.resolve(kind);
```

Replace:

```js
summary: '中山站旁有百貨地標'
```

With:

```js
summary: source === 'fallback'
  ? 'Fallback fixture landmark for testing department-store rendering.'
  : buildSummaryFromSource(feature)
```

Replace:

```js
createZhongshanBuilding(...)
```

With:

```js
createCommercialBuilding({ kind, levels, footprint, facade, signs })
```

## Final Check

Before final response, explicitly say whether the implementation:

- isolates mock/fallback data
- uses generic contracts
- keeps renderers reusable
- avoids name/location hardcoding
- leaves a path for real TDX/OSM/CWA/EPA/backend data
