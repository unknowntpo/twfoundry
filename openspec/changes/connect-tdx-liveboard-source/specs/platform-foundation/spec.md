# platform-foundation Spec

## ADDED Requirements

### Requirement: Opt-In TDX LiveBoard Source

TWFoundry SHALL provide an opt-in TDX Taipei MRT LiveBoard source for the MRT dashboard while preserving mock LiveBoard data as the default.

#### Scenario: Dashboard uses mock by default

- **GIVEN** no live data source is configured
- **WHEN** the MRT dashboard runs
- **THEN** LiveBoard rows come from the existing mock fixtures

#### Scenario: Dashboard uses TDX through local proxy

- **GIVEN** `VITE_MRT_LIVEBOARD_SOURCE=tdx` and a running local TDX proxy
- **WHEN** a user selects an MRT station
- **THEN** the dashboard requests normalized LiveBoard rows from the proxy without exposing TDX credentials to browser code

### Requirement: TDX Proxy Safety

TWFoundry SHALL keep TDX client credentials server-side and SHALL rate-limit outbound TDX LiveBoard API calls to no more than 5 calls per second.

#### Scenario: Proxy calls TDX

- **GIVEN** `TDX_CLIENT_ID` and `TDX_CLIENT_SECRET` are configured for the proxy process
- **WHEN** the proxy calls TDX
- **THEN** it uses Client Credentials token exchange, caches the access token, applies the configured API rate limit, and returns safe JSON responses
