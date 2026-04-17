# platform-foundation Spec

## ADDED Requirements

### Requirement: TWFoundry Design System

TWFoundry SHALL define a light-mode design system for the frontend dashboard that documents reusable visual tokens, typography, spacing, component patterns, and usage rules.

#### Scenario: Developer reviews frontend visual foundations

- **GIVEN** the frontend dashboard exists
- **WHEN** a developer opens the Design System page
- **THEN** the page documents TWFoundry design principles, color tokens, typography roles, spacing scale, and reusable component patterns

#### Scenario: Dashboard uses transit-aware visual tokens

- **GIVEN** MRT route and LiveBoard UI elements are displayed
- **WHEN** route, status, panel, and text styling are applied
- **THEN** the UI uses named design tokens and semantic MRT route colors instead of unrelated stock-market or decorative styling

#### Scenario: Design system preserves product context

- **GIVEN** the design system is inspired by an external light-mode study
- **WHEN** examples are added to TWFoundry
- **THEN** examples use Taiwan transit, MRT, map, LiveBoard, and data operating system concepts rather than finance dashboard concepts

#### Scenario: Design system prevents UI drift

- **GIVEN** future dashboard UI changes are planned
- **WHEN** a developer needs color, spacing, typography, card, badge, table, or control guidance
- **THEN** the Design System page provides explicit usage rules and examples that can be reused by product surfaces

#### Scenario: First-pass library decision is reviewed

- **GIVEN** TWFoundry is implemented with Vue 3 and scoped CSS
- **WHEN** a developer reviews UI library choices for the first design system pass
- **THEN** the design system documents the trade-offs for local Vue components, shadcn/ui, shadcn-vue, Ant Design Vue, and headless primitives, and selects local Vue components plus CSS tokens for the first pass
