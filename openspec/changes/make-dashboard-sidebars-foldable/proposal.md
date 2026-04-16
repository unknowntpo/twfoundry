# Change: Make Dashboard Sidebars Foldable

## Why

The Google Maps view is now useful enough that the fixed left Layers sidebar and right Station Detail panel can consume too much horizontal space, especially during map inspection or demos. Users need a quick way to focus on the map without losing the current layer and station context.

## What Changes

- Add collapsible behavior for the left Layers sidebar and right Station Detail panel.
- Keep the current expanded desktop layout as the default.
- Preserve station selection, visible route toggles, LiveBoard loading/error state, and refresh behavior while panels are collapsed.
- Let the map resize into freed space when either panel is collapsed or expanded.
- Add accessible toggle controls with clear expanded/collapsed state.

## Out of Scope

- Changing MRT data contracts, TDX proxy behavior, or map provider configuration.
- Reworking the dashboard visual direction beyond the minimum layout states needed for folding.
- Adding persistent user preferences unless the implementation can do so without broadening scope.

## Discussion Conclusion

**Decision**: Treat foldable sidebars as a focused frontend UX change. It should be implemented independently from TDX and backend platform work.
