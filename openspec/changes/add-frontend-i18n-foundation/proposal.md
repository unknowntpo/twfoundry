# Change: Add Frontend i18n Foundation

## Why

TWFoundry is a Taiwan transit/data operating system, so the frontend should be ready for bilingual product copy from day one. The current UI text is embedded directly in Vue components, which makes later translation work risky and inconsistent.

## What Changes

- Add a Vue i18n foundation with explicit `en-US` and `zh-TW` locale messages.
- Keep `en-US` as the default locale to preserve current screenshots and tests unless a user chooses another locale.
- Add a small locale switcher in dashboard chrome and persist the selected locale locally.
- Move core dashboard and Design System page product copy into locale dictionaries.
- Document i18n rules in the Design System page so future copy does not drift back into hardcoded component strings.
- Add tests for locale defaulting, locale persistence, and representative translated UI.

## Out of Scope

- Translating station names, route names, raw TDX payloads, or mock fixture data.
- Adding server-side locale negotiation.
- Adding route-based locale prefixes such as `/zh-TW/...`.
- Translating every future backend/admin spec before those surfaces exist.
- Replacing the local design system or adding a UI component library for the switcher.

## Discussion Conclusion

**Decision**: Add a small i18n foundation now, while keeping the current English UI as default. Treat Chinese copy as product UI copy in `zh-TW`, not as a separate design rewrite.
