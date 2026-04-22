# platform-foundation Spec

## ADDED Requirements

### Requirement: Dashboard Common Components

TWFoundry SHALL document a common component catalog for the map-first dashboard in the Design System page.

#### Scenario: Developer reviews dashboard component inventory

- **GIVEN** the Design System page exists
- **WHEN** a developer reviews dashboard primitives
- **THEN** the page lists common dashboard components and groups them by action, feedback, overlay, data display, and map chrome

#### Scenario: Developer reviews overlay guidance

- **GIVEN** future dashboard interactions may need overlays
- **WHEN** a developer reviews the Design System page
- **THEN** the page defines intended use for Dialog, Toast, and Drawer / Sheet

#### Scenario: Developer checks current product fit

- **GIVEN** the MRT dashboard already ships some primitives
- **WHEN** the Design System page is reviewed
- **THEN** the page marks which common components are already implemented, partially matched, or still missing
