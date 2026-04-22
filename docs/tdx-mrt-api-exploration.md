# TDX MRT API Exploration

Date: 2026-04-22
Branch: `codex/explore-tdx-mrt-api`

## What exists in this repo

- The browser app does not call TDX directly.
- The frontend calls a local proxy at `GET /api/mrt/liveboard`.
- The proxy exchanges `TDX_CLIENT_ID` and `TDX_CLIENT_SECRET` for a bearer token.
- The proxy then calls the TDX Metro LiveBoard endpoint and normalizes the response into `LiveBoardRow[]`.

Relevant files:

- `frontend/src/features/mrt/api/tdx-liveboard.ts`
- `frontend/src/features/mrt/tdx/proxy-core.ts`
- `frontend/src/features/mrt/tdx/normalize.ts`
- `frontend/scripts/tdx-proxy.ts`
- `frontend/src/shared/config/env.ts`

## Environment contract

The active local env file is `frontend/.env`.

Expected keys:

- `VITE_MRT_LIVEBOARD_SOURCE`
- `VITE_TDX_PROXY_URL`
- `TDX_CLIENT_ID`
- `TDX_CLIENT_SECRET`
- `TDX_AUTH_URL`
- `TDX_API_BASE_URL`
- `TDX_RATE_LIMIT_PER_SECOND`

Recommended local values:

- `VITE_MRT_LIVEBOARD_SOURCE=tdx`
- `VITE_TDX_PROXY_URL=http://localhost:5174`
- `TDX_RATE_LIMIT_PER_SECOND=5`

## Request flow

1. UI selects a station in `mrt-dashboard` store.
2. Store calls `fetchTdxLiveBoardRows(stationId, appConfig.tdxProxyUrl)`.
3. Frontend requests `GET http://localhost:5174/api/mrt/liveboard?operator=TRTC&stationId=<station>`.
4. Proxy fetches an access token from the TDX OpenID token endpoint using `grant_type=client_credentials`.
5. Proxy calls `GET {TDX_API_BASE_URL}/Rail/Metro/LiveBoard/TRTC?$format=JSON`.
6. If `stationId` is present, proxy adds a filter for `StationID` or `StationUID`.
7. Proxy normalizes TDX payload fields like `EstimateTime`, `StopStatus`, `LineID`, `Direction`, and destination names.
8. Frontend renders the normalized rows.

## Why the proxy is necessary

- The TDX client secret must stay server-side.
- The proxy centralizes token caching.
- The proxy enforces the account limit with `TDX_RATE_LIMIT_PER_SECOND`.
- The proxy hides upstream payload differences from the Vue app.

## Current rate-limit behavior

- The proxy converts `TDX_RATE_LIMIT_PER_SECOND=5` into a minimum interval of `200ms` between upstream TDX API calls.
- Token requests are cached until shortly before expiry, so repeated UI refreshes should not request a token every time.

## TDX-specific expectations

- Auth endpoint default:
  `https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token`
- API base default:
  `https://tdx.transportdata.tw/api/basic/v2`
- LiveBoard path used by this repo:
  `/Rail/Metro/LiveBoard/TRTC`

## Live integration finding

- TDX auth is working with the configured client credentials.
- The live `LiveBoard/TRTC` endpoint rejects filters on `StationUID`.
- The repo proxy should filter by `StationID` only.
- The proxy must preserve the `/api/basic/v2` base path when constructing the upstream URL.
- A request using `StationID eq 'BL18'` matches the live API contract.

## Live API evidence

These checks were executed against the real TDX service on 2026-04-22 using the locally configured credentials from `frontend/.env`.

- Token exchange to the TDX OpenID endpoint returned `200`.
- `GET /api/basic/v2/Rail/Metro/LiveBoard/TRTC?$top=1&$format=JSON` returned a real JSON array.
- `GET /api/basic/v2/Rail/Metro/LiveBoard/TRTC?$filter=StationUID eq 'TRTC-BL18'` returned `400`.
- `GET /api/basic/v2/Rail/Metro/LiveBoard/TRTC?$filter=StationID eq 'BL18'` returned `200`.
- The local proxy returned normalized JSON successfully for `stationId=BL18`.

## Example upstream TDX payload

This is a real sampled payload shape observed from the live `TRTC LiveBoard` API:

```json
[
  {
    "LineNO": "BL",
    "LineID": "BL",
    "LineName": {
      "Zh_tw": "板南線",
      "En": "Bannan Line"
    },
    "StationID": "BL15",
    "StationName": {
      "Zh_tw": "忠孝復興",
      "En": "Zhongxiao Fuxing"
    },
    "TripHeadSign": "往南港展覽館",
    "DestinationStaionID": "BL23",
    "DestinationStationID": "BL23",
    "DestinationStationName": {
      "Zh_tw": "南港展覽館",
      "En": "Taipei Nangang Exhibition Center"
    },
    "ServiceStatus": 0,
    "EstimateTime": 0,
    "SrcUpdateTime": "2026-04-22T13:08:38+08:00",
    "UpdateTime": "2026-04-22T13:09:02+08:00"
  }
]
```

Observed payload notes:

- The endpoint returns an array.
- `EstimateTime` is in seconds.
- The payload uses `StationID` for filtering.
- The payload includes both `DestinationStaionID` and `DestinationStationID`; the first spelling appears to be a TDX typo.
- Name fields are localized objects with `Zh_tw` and `En`.

## Example normalized proxy payload

This is the shape returned by the local proxy after normalization:

```json
{
  "rows": [
    {
      "id": "tdx-BL18-BL05",
      "stationId": "BL18",
      "lineId": "blue",
      "direction": "Scheduled",
      "destination": "Far Eastern Hospital",
      "arrivalMinutes": 0,
      "status": "approaching"
    }
  ],
  "source": "tdx",
  "updatedAt": "2026-04-22T05:12:06.126Z"
}
```

## Local usage

From `frontend/`:

```bash
bun run tdx:proxy
```

In another shell:

```bash
bun run dev
```

Then open the app with:

- `VITE_MRT_LIVEBOARD_SOURCE=tdx`
- proxy running on `http://localhost:5174`

## Focus areas if we extend this

- Add endpoint coverage for station lists, line metadata, and route geometry instead of only LiveBoard.
- Add retry and clearer upstream error mapping for TDX outages or quota errors.
- Add tests for real TDX payload variants if we capture fixtures from the live API.
