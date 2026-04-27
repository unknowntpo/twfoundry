# TWFoundry

TWFoundry is a Taiwan data operating system project focused on integrating public transportation and civil IoT data into an operational dashboard.

The first implementation slice is an MRT-only frontend demo:

- Vue 3 dashboard
- MRT mock/static data
- MapLibre GL with a configurable OpenFreeMap basemap for local/demo maps
- Mock map provider for tests
- Unit and integration tests before broader E2E coverage

See `openspec/changes/bootstrap-twfoundry-platform/` for the current Spectra change.

Development workflow notes:

- [Git worktree layout](docs/git-worktree-layout.md)
- [Redpanda local dev](docs/redpanda-local-dev.md)
- [StarRocks local dev](docs/starrocks-local-dev.md)
