# platform-foundation Spec

## ADDED Requirements

### Requirement: Frontend i18n Foundation

TWFoundry SHALL provide a frontend internationalization foundation for user-facing product copy in the Vue application.

#### Scenario: App starts with default locale

- **GIVEN** no valid locale preference exists
- **WHEN** the frontend app starts
- **THEN** the UI uses `en-US` copy by default

#### Scenario: User switches locale

- **GIVEN** the dashboard is open
- **WHEN** the user selects `zh-TW`
- **THEN** primary dashboard chrome, panel headings, controls, and documentation navigation use Traditional Chinese copy
- **AND** the selected locale is persisted for future page loads

#### Scenario: Domain data remains source-owned

- **GIVEN** MRT station names, route names, mock arrivals, or TDX rows are displayed
- **WHEN** locale changes
- **THEN** source-owned transit data is not rewritten through product-copy dictionaries

#### Scenario: Design system documents i18n guidance

- **GIVEN** a developer reviews the Design System page
- **WHEN** they look for copy rules
- **THEN** the page explains where user-facing product copy should live and which domain data is out of scope for first-pass translation

#### Scenario: Design system documents Traditional Chinese typography

- **GIVEN** the frontend supports `zh-TW`
- **WHEN** a developer reviews typography guidance
- **THEN** the Design System page documents Traditional Chinese font fallbacks, no negative letter spacing, and readable line-height expectations
