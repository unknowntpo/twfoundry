# Design: Frontend i18n Foundation

## Locale Model

TWFoundry should start with two frontend locales:

- `en-US`: default locale, preserves current UI expectations.
- `zh-TW`: Traditional Chinese product copy for Taiwan users.

Locale preference should be stored in `localStorage` under a stable key such as `twfoundry.locale`. If no valid preference exists, the app falls back to `en-US`.

## Library Choice

Use `vue-i18n` because this is a Vue 3 app and the project will likely need more than raw string lookup:

- component-level translation through `useI18n`
- future number/date formatting
- future lazy message loading
- predictable test APIs

Do not add a broad UI library for the locale switcher.

## Translation Scope

First pass should translate product chrome and documentation surfaces:

- dashboard title, topbar actions, service summary labels
- Layers panel labels
- Station Detail panel headings, empty states, loading/error copy, refresh
- compact dashboard panel controls
- timeline label
- Design System page headings and key guidance, including i18n guidance

Do not translate domain data yet:

- station names from MRT fixtures
- route names from MRT fixtures
- destination names from mock LiveBoard rows
- raw TDX values

These should be handled later through data localization or authoritative source fields.

## Design System Rule

Future user-facing product copy should live in locale messages when it is reusable or visible in primary UI. Component-local static labels are only acceptable for throwaway test fixtures or internal-only debug copy.

Traditional Chinese also needs explicit typography guidance. The shared frontend font stack should include CJK fallbacks such as `Noto Sans TC`, `PingFang TC`, and `Microsoft JhengHei`. Chinese UI should keep letter spacing at `0` and use a comfortable line-height for dense dashboard panels.

Responsive and map-first rules learned from the dashboard should remain discoverable in the Design System page, including the need to test mobile/tablet widths and avoid sidebars that squeeze the map.

## Testing Direction

- Unit test locale defaulting, validation, persistence, and switching.
- E2E test that the dashboard can switch to `zh-TW` and that the choice persists after reload.
- Keep existing English E2E assertions passing by default.
