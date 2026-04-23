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
