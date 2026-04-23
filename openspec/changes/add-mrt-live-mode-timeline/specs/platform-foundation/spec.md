# platform-foundation Spec

## ADDED Requirements

### Requirement: MRT Live Mode

TWFoundry SHALL support a live-follow MRT mode for the selected station when the dashboard uses the TDX LiveBoard source.

#### Scenario: Live-follow refresh is active

- **GIVEN** the dashboard is configured to use the `tdx` liveboard source
- **AND** a station is selected
- **WHEN** the operator keeps the timeline in `live` mode
- **THEN** the frontend auto-refreshes the selected station liveboard from the existing backend liveboard endpoint
- **AND** the operator can choose among `5s`, `20s`, `30s`, and `1m` polling intervals

### Requirement: Live Timeline Status

TWFoundry SHALL show the latest live snapshot time and freshness for the MRT timeline.

#### Scenario: Latest snapshot metadata is visible

- **GIVEN** the selected station has received a liveboard response
- **WHEN** the MRT dashboard renders the timeline and station panel
- **THEN** both surfaces show freshness derived from the same latest snapshot timestamp
- **AND** the timeline does not display placeholder historical values as if they were real replay state

### Requirement: No Historical Implication Without History

TWFoundry SHALL avoid implying historical replay capability before a persisted history model exists.

#### Scenario: History is not yet implemented

- **GIVEN** the MRT timeline has no persisted historical snapshot source
- **WHEN** the operator views the timeline
- **THEN** previous/next controls remain non-historical
- **AND** the live mode can be paused without implying replay navigation

### Requirement: Train-Centric Live Selection

TWFoundry SHALL treat the train code as the primary identity for live train selection in the MRT dashboard.

#### Scenario: Sidebar and map stay centered on the selected train

- **GIVEN** the MRT dashboard renders train cards from the live feed
- **WHEN** the operator views the sidebar
- **THEN** each train card shows the train code as the primary label
- **AND** destination and direction remain secondary metadata
- **WHEN** the operator hovers an estimated train marker on the map
- **THEN** the hover tooltip shows only the train code
- **WHEN** the operator clicks an estimated train marker on the map
- **THEN** the matching sidebar line group is expanded if needed
- **AND** the matching train card is scrolled into view and focused
