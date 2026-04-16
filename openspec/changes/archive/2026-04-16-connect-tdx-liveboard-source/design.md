# Design: Connect TDX LiveBoard Source

## Overview

TDX access requires client credentials. The Vue app must not receive `TDX_CLIENT_SECRET`, so this change adds a local Bun proxy that owns token exchange and TDX API calls.

## Runtime Shape

```text
Vue dashboard -> local Bun TDX proxy -> TDX OAuth token endpoint
              -> local Bun TDX proxy -> TDX Rail/Metro LiveBoard API
```

Mock remains the default path:

```text
VITE_MRT_LIVEBOARD_SOURCE=mock
```

Live TDX mode is explicit:

```text
VITE_MRT_LIVEBOARD_SOURCE=tdx
VITE_TDX_PROXY_URL=http://localhost:5174
```

## Proxy Behavior

- Read `TDX_CLIENT_ID` and `TDX_CLIENT_SECRET` from the proxy process env or `frontend/.env`.
- Fetch OAuth tokens with Client Credentials and form-encoded fields.
- Cache the token until `expires_in - 60s`.
- Serialize outbound TDX LiveBoard API calls with a 5 calls/sec limit.
- Return normalized rows, `source: "tdx"`, and `updatedAt`.
- Return safe JSON errors without echoing secrets.

## Frontend Behavior

The Pinia store keeps station selection stable. In mock mode, rows are resolved synchronously from fixtures. In TDX mode, selecting a station starts an async proxy fetch, surfaces loading/error state, and keeps the dashboard usable if the proxy is unavailable.
