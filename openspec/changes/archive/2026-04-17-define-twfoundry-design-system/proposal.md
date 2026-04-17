# Change: Define TWFoundry Design System

## Why

TWFoundry now has a functional MRT dashboard, but visual decisions are still scattered across component CSS and mockup references. Before the UI grows further, the project needs a small design system that can explain the visual language, constrain future dashboard work, and make the interface easier to evolve without one-off styling.

The provided `anthropic_inspired_stock_dashboard.jsx` demonstrates a useful direction: warm light-mode neutrals, editorial typography, calm data density, soft borders, restrained accent color, and a dedicated page explaining the design system. TWFoundry should adapt those design system concepts to its Taiwan transit/data operating system context rather than copying the stock dashboard domain.

## What Changes

- Define a TWFoundry design system direction inspired by Anthropic-style light mode:
  - warm off-white canvas and surfaces
  - soft neutral borders
  - dark neutral text
  - restrained accent usage
  - calm, data-dense dashboard composition
- Add a dedicated frontend Design System page that documents tokens, typography, spacing, component patterns, and usage rules.
- Keep the existing MRT dashboard functional contract intact while extracting reusable styling concepts.
- Use MRT/transit/data examples instead of stock-market examples.

## Out of Scope

- Replacing the current dashboard with a stock dashboard.
- Adding real stock data or finance domain behavior.
- Introducing a third-party component library only for visual polish.
- Reworking backend, TDX proxy, Kafka, or StarRocks behavior.
- Building dark mode in this change.

## Discussion Conclusion

**Decision**: Treat design system work as a frontend design foundation change. Start with explicit tokens and a documentation page, then apply the same vocabulary back to the MRT dashboard in small follow-up implementation steps.
