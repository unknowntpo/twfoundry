# platform-foundation Spec

## ADDED Requirements

### Requirement: Dashboard Uses TWFoundry Design System

TWFoundry SHALL apply the documented frontend design system to the MRT dashboard without changing the dashboard's functional behavior.

#### Scenario: Dashboard uses shared visual tokens

- **GIVEN** TWFoundry design tokens exist
- **WHEN** the MRT dashboard renders shell, sidebars, station panels, LiveBoard rows, route controls, and map overlay affordances
- **THEN** matching colors, borders, spacing, text roles, and surfaces use TWFoundry design tokens instead of one-off values

#### Scenario: Dashboard preserves map-first behavior

- **GIVEN** the design system is applied to dashboard components
- **WHEN** a user opens the MRT dashboard
- **THEN** the map remains the primary visual surface and existing station selection, layer toggle, foldable sidebar, mock map, Google Maps, and TDX opt-in behavior remain unchanged

#### Scenario: Dashboard avoids premature UI kit adoption

- **GIVEN** the design system can be implemented with local Vue components and CSS tokens
- **WHEN** dashboard components are refactored
- **THEN** the implementation does not add Ant Design Vue, shadcn-vue, shadcn React, or other UI kit dependencies
