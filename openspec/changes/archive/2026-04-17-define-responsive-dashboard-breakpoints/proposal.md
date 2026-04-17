# Change: Define Responsive Dashboard Breakpoints

## Why

TWFoundry's Design System page and MRT dashboard already contain responsive behavior, but the breakpoints are currently ad hoc (`840px` and `860px`). Responsive behavior is part of the design system, so the project should define shared breakpoint vocabulary before more dashboard surfaces are added.

## What Changes

- Define TWFoundry responsive breakpoint vocabulary:
  - mobile: up to 639px
  - tablet: 640px to 1023px
  - desktop: 1024px and above
- Document dashboard behavior for desktop, tablet, and mobile.
- Update the Design System page to explain breakpoint rules.
- Replace current ad hoc `840px` / `860px` media queries with the shared breakpoint thresholds.

## Out of Scope

- Building a full mobile drawer system.
- Redesigning the dashboard layout from scratch.
- Changing Google Maps, TDX proxy, or backend contracts.
- Adding a UI library for responsive primitives.

## Discussion Conclusion

**Decision**: Add responsive breakpoint rules as a design-system follow-up. First pass standardizes the vocabulary and current media query thresholds without broad layout redesign.
