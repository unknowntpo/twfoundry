# Change: Connect TDX LiveBoard Source

## Why

The MRT dashboard currently uses mock LiveBoard rows. The next safe step is an opt-in TDX Taipei MRT LiveBoard source that keeps credentials server-side and preserves mock data as the default for CI and local smoke tests.

## What Changes

- Add local proxy configuration for TDX client credentials, token exchange, token caching, and a 5 calls/sec outbound API limit.
- Add a Bun proxy endpoint for MRT LiveBoard rows.
- Add a frontend LiveBoard source switch so Vue can use mock rows by default or TDX rows when explicitly enabled.
- Normalize TDX LiveBoard rows into the existing `LiveBoardRow` UI shape without changing the mock fixture contract.

## Out of Scope

- YouBike or Civil IoT integration.
- Kafka, StarRocks, or Spring Boot backend runtime implementation.
- Committing TDX credentials.
- Making TDX the default data source.

## Discussion Conclusion

**Decision**: Add an opt-in local Bun TDX proxy. Browser code calls the proxy only when `VITE_MRT_LIVEBOARD_SOURCE=tdx`; TDX client ID and secret stay outside Vite-prefixed env.
