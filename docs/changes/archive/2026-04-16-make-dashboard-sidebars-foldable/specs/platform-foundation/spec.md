# platform-foundation Spec

## ADDED Requirements

### Requirement: Foldable Dashboard Sidebars

TWFoundry SHALL allow the MRT dashboard's Layers sidebar and Station Detail panel to be collapsed and expanded independently while preserving the current dashboard state.

#### Scenario: User collapses the Layers sidebar

- **GIVEN** the MRT dashboard is open with one or more visible MRT route filters
- **WHEN** the user collapses the Layers sidebar
- **THEN** the map expands into the freed space and the existing route visibility selections remain unchanged

#### Scenario: User collapses the Station Detail panel

- **GIVEN** an MRT station is selected and its LiveBoard panel is visible
- **WHEN** the user collapses the Station Detail panel
- **THEN** the map expands into the freed space and the selected station and LiveBoard state remain available when the panel is expanded again

#### Scenario: User operates collapse controls with assistive technology

- **GIVEN** the dashboard sidebars can be collapsed
- **WHEN** a user focuses a sidebar collapse control
- **THEN** the control communicates which panel it affects and whether that panel is expanded or collapsed
