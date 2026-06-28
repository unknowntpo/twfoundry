# Design: Apply Design System to MRT Dashboard

## Approach

This change should not redesign the dashboard from scratch. The map-first MRT monitor is already useful. The work is to reduce style duplication and align existing components with the design system vocabulary.

## Target Areas

- `MrtDashboard.vue`
  - Replace local color variables with `--twf-*` tokens where values match.
  - Use shared button and label patterns for topbar actions where practical.
  - Keep the dashboard shell custom because it owns the map-first layout.
- `StationPanel.vue`
  - Use tokens for panel, text, borders, status badges, and LiveBoard rows.
  - Consider `BaseBadge` for route labels and status chips if the markup remains clear.
- `LayerControl.vue`
  - Use route color tokens and shared border/surface tokens.
  - Preserve current layer toggle behavior and accessible `aria-pressed`.
- `MrtMap.vue`
  - Keep map provider behavior unchanged.
  - Use tokens only for overlay markers and error affordances.

## Constraints

- Map remains the visual center; do not put it inside a decorative card.
- Do not introduce new UI library dependencies.
- Do not change data contracts, fixture shape, store behavior, or TDX proxy behavior.
- Keep mobile behavior at least as stable as current behavior.
- Preserve E2E tests and add focused assertions only where useful.

## Verification

- Existing Vitest tests continue passing.
- Existing Playwright E2E tests continue passing.
- Visual smoke test verifies dashboard and Design System page still render.
- `spectra validate apply-design-system-to-mrt-dashboard` passes.
