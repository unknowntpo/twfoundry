# Design: Make Dashboard Sidebars Foldable

## Overview

The dashboard should support three primary desktop layout states:

- Both sidebars expanded: current default monitoring layout.
- Left sidebar collapsed: map gets more horizontal room while station details remain visible.
- Right sidebar collapsed: map gets more horizontal room while layer controls remain visible.

Both panels may be collapsed at the same time for a map-first view.

## Interaction

- Add a compact toggle affordance to each sidebar header or edge.
- Toggle controls expose `aria-expanded` and an accessible label.
- Collapsing a sidebar keeps a narrow rail or reachable control so the panel can be restored.
- Collapsing the right Station Detail panel does not clear `selectedStationId`.
- Collapsing the left Layers panel does not change visible MRT route filters.

## Layout Behavior

- The dashboard grid should use state-driven CSS classes or data attributes to change column widths.
- The Google map container must fill the available center area after each layout state change.
- Google Maps should be notified of container resizing after expand/collapse if needed.
- Mobile behavior may keep the existing stacked/overlay direction unless the implementation can add a small, safe mobile collapse state.

## Test Direction

- Unit or component tests should cover toggle state changes and preservation of station/layer state.
- Existing mock-map Playwright smoke tests should keep passing.
- Add a focused E2E assertion if the collapse behavior is stable enough without relying on Google Maps tiles.
