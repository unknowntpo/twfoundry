# platform-foundation Spec

## ADDED Requirements

### Requirement: Responsive Dashboard Breakpoints

TWFoundry SHALL define shared frontend breakpoint rules for dashboard and design system responsive behavior.

#### Scenario: Developer reviews responsive design rules

- **GIVEN** the frontend Design System page exists
- **WHEN** a developer reviews responsive guidance
- **THEN** the page documents mobile, tablet, and desktop breakpoint thresholds and their intended dashboard behavior

#### Scenario: Dashboard reaches desktop width

- **GIVEN** the viewport is at least 1024px wide
- **WHEN** the MRT dashboard renders
- **THEN** the full map-first desktop layout can show topbar, icon rail, layer controls, map, station detail, and timeline

#### Scenario: Dashboard reaches mobile width

- **GIVEN** the viewport is 639px wide or narrower
- **WHEN** the MRT dashboard renders
- **THEN** the layout uses a single-column map-first mode without wide sidebars, icon rail, or timeline

#### Scenario: Breakpoints remain consistent

- **GIVEN** dashboard and design system components need responsive CSS
- **WHEN** media queries are added or updated
- **THEN** they use the shared mobile, tablet, and desktop thresholds instead of component-specific ad hoc values such as 840px or 860px
