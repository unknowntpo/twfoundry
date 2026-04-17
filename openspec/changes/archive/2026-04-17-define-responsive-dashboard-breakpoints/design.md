# Design: Responsive Dashboard Breakpoints

## Breakpoint Vocabulary

TWFoundry should use a small breakpoint system:

- **mobile**: `0px` to `639px`
- **tablet**: `640px` to `1023px`
- **desktop**: `1024px` and above

CSS custom properties can document these values, but media query conditions should use literal values because CSS custom properties are not portable inside media query expressions.

Recommended token documentation:

```css
--twf-breakpoint-mobile-max: 639px;
--twf-breakpoint-tablet-min: 640px;
--twf-breakpoint-tablet-max: 1023px;
--twf-breakpoint-desktop-min: 1024px;
```

Recommended media query usage:

```css
@media (max-width: 639px) {}
@media (min-width: 640px) and (max-width: 1023px) {}
@media (min-width: 1024px) {}
```

## Dashboard Behavior

### Desktop

At `1024px` and wider:

- Full topbar remains visible.
- Icon rail remains visible.
- Layers sidebar can be expanded or collapsed.
- Map remains the primary center surface.
- Station Detail panel can be expanded or collapsed.
- Timeline remains visible.

### Tablet

From `640px` through `1023px`:

- Map remains first priority.
- Layer controls should be simplified or collapsed by default.
- Station Detail may become a stacked or overlay-like panel if needed.
- Topbar actions may be reduced.
- Timeline may be hidden or compacted.

### Mobile

At `639px` and below:

- Dashboard becomes single-column and map-first.
- Icon rail and wide sidebars are hidden.
- Station Detail appears below the map or as a future drawer.
- Timeline is hidden.
- Text must not overflow horizontally.

## Implementation Direction

- Add breakpoint documentation tokens to `tokens.css`.
- Add a breakpoint section to the Design System page.
- Replace existing `840px` / `860px` media queries with the shared breakpoint threshold.
- Preserve current mobile behavior in the first pass; avoid building new drawers.
- Add or update Playwright assertions only if behavior changes.
