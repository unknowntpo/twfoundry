# Design: Dashboard Common Components

## Inventory Direction

The Design System page should list the recurring primitives expected in a map-first operations dashboard:

- actions: button, icon button, segmented control
- feedback: badge, inline alert, toast, loading state, empty state
- overlays: dialog, drawer / sheet, tooltip
- data display: liveboard row, stat chip, table row
- map chrome: map control, timeline control

The inventory should not only name components. It should also state whether TWFoundry currently:

- **implemented** the component as a real or near-real primitive
- **partial** where the pattern exists in product UI but is not yet normalized
- **gap** where the Design System should define it before product usage grows

## Overlay Rules

### Dialog

- Use for blocking, high-confirmation actions.
- Keep content narrow and decision-focused.
- Do not use as a substitute for persistent station detail.

### Toast

- Use for non-blocking success, warning, or transient failure notices.
- Keep copy short and auto-dismiss by default.
- Avoid stacking many toasts over the map.

### Drawer / Sheet

- Use for compact tablet/mobile panels and secondary detail.
- Prefer this over squeezing desktop sidebars into narrow widths.
- Treat the dashboard's compact panel behavior as the first reference pattern.

## Current Product Fit

The current MRT dashboard already maps well to:

- button
- badge
- card
- panel
- section label
- liveboard row
- map control
- timeline control

It only partially maps to:

- icon button
- segmented control
- inline alert
- empty state
- loading state

It still lacks a normalized definition for:

- dialog
- toast
- drawer / sheet
- tooltip
- dropdown menu
- input / search field

## Implementation Direction

- Add a documented component inventory section to the Design System page.
- Add a current-fit assessment section with explicit status badges.
- Add visual example cards for dialog, toast, and drawer / sheet.
- Keep implementation lightweight: Design System documentation first, production runtime extraction later.
