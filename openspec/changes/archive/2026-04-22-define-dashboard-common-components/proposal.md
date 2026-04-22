# Change: Define Dashboard Common Components

## Why

TWFoundry already has design tokens, base components, responsive rules, and i18n guidance, but the Design System page still lacks a clear inventory of common dashboard primitives. Without that catalog, future dashboard work may invent one-off overlays, alerts, panel controls, and data rows without a shared definition.

## What Changes

- Add a common dashboard component inventory to the Design System page.
- Define first-pass rules for overlays and feedback primitives:
  - Dialog
  - Toast
  - Drawer / Sheet
- Document current dashboard fit by marking which components are already implemented, partially matched, or still gaps.
- Add visual examples for key dashboard overlay and feedback patterns on the Design System page.

## Out of Scope

- Shipping a production-ready dialog system for all workflows.
- Adding a full toast manager or overlay framework to the application runtime.
- Refactoring all existing dashboard interactions into new primitives in this change.
- Introducing a third-party component library to fill the catalog.

## Discussion Conclusion

**Decision**: Define the component catalog now in the Design System page, use lightweight visual examples for missing primitives, and treat runtime component extraction as follow-up work only where the product actually needs it.
