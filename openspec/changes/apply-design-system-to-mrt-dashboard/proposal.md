# Change: Apply Design System to MRT Dashboard

## Why

TWFoundry now has a documented design system page, CSS tokens, and small local Vue base components. The MRT dashboard still contains many local color, spacing, border, and component style decisions. Applying the design system back to the dashboard will reduce visual drift and make future UI work easier.

## What Changes

- Refactor the current MRT dashboard styles to use TWFoundry design tokens where low risk.
- Reuse local base components for simple buttons, badges, cards, panels, and labels where they fit without harming the map-first layout.
- Preserve existing dashboard behavior: Google Maps, mock map, layer toggles, station selection, foldable sidebars, LiveBoard loading/error state, and TDX opt-in mode.
- Keep changes incremental and visually close to the current UI.

## Out of Scope

- Large visual redesigns.
- Replacing Google Maps or changing TDX proxy behavior.
- Adding Ant Design Vue, shadcn-vue, shadcn React, or other UI kits.
- Rewriting the dashboard as a generic admin console.
- Changing backend/data-platform contracts.

## Discussion Conclusion

**Decision**: Apply the newly archived TWFoundry design system to the existing MRT dashboard in small refactors. Use local Vue components and CSS tokens first; defer external UI libraries.
