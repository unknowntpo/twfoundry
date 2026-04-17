# Design: TWFoundry Design System

## Source Study

The provided `anthropic_inspired_stock_dashboard.jsx` includes two useful parts:

- A dashboard page using mock stock rows, metric cards, chart panels, tables, and watchlist cards.
- A design system page explaining color, type, spacing, components, and usage rules.

The reusable concept is not the stock domain. The reusable concept is the systemization:

- Named color tokens with purpose, not just hex values.
- Type roles such as display, heading, body, and meta.
- A small spacing scale.
- Repeated component grammar for cards, pills, badges, panels, tables, and chart containers.
- Written principles explaining why the UI feels calm and readable.

## TWFoundry Visual Direction

TWFoundry should use an Anthropic-inspired light mode direction without copying product identity:

- **Canvas**: warm off-white page background, avoiding stark white and cold gray.
- **Surface**: slightly lifted warm panels for controls, sidebars, and detail sections.
- **Ink**: dark neutral text for strong readability.
- **Muted ink**: warm gray-brown secondary text for labels and metadata.
- **Line**: low-contrast borders and dividers.
- **Transit accents**: MRT red, blue, and green remain semantic route colors.
- **System accent**: one restrained warm accent may be used for focused UI states, but route colors take precedence in transit contexts.

## Token Candidates

Initial token names should be product-oriented and stable:

- `color.canvas`
- `color.surface`
- `color.surfaceRaised`
- `color.border`
- `color.borderSoft`
- `color.text`
- `color.textMuted`
- `color.textFaint`
- `color.accentWarm`
- `color.routeRed`
- `color.routeBlue`
- `color.routeGreen`

Typography roles:

- `type.display`: large dashboard numbers and page titles.
- `type.heading`: panel and section headings.
- `type.body`: normal UI copy.
- `type.meta`: labels, status text, and compact dashboard chrome.

Spacing roles:

- `space.1`: 4px micro alignment.
- `space.2`: 8px compact clusters.
- `space.3`: 12px small controls.
- `space.4`: 16px default component gap.
- `space.6`: 24px card/panel padding.
- `space.10`: 40px major section rhythm.

## Design System Page

The frontend should add a page that documents the system in product language:

- Principles: calm, transit-aware, data-dense, readable.
- Color tokens with swatches and usage notes.
- Typography scale with examples.
- Spacing scale with examples.
- Component patterns:
  - dashboard shell
  - card/panel
  - pill/button
  - status badge
  - route chip
  - table/list row
  - map/control chrome
- A “do / avoid” section to prevent visual drift.

## Dashboard Fit

The current MRT dashboard should remain the primary product surface. The design system should support it by making future changes more consistent:

- Route controls should use route semantic colors, not decorative gradients.
- Station detail and LiveBoard rows should use reusable panel/list patterns.
- Collapsed controls should remain compact, readable by assistive technology, and avoid vertical label text.
- Map remains visually dominant; design system surfaces should not make the map feel embedded inside a decorative card.

## Implementation Direction

The first implementation should be small:

- Add token definitions in CSS custom properties or a dedicated frontend token module.
- Add a Design System route/page.
- Update navigation so the page is reachable without disrupting the MRT dashboard.
- Use mock examples tied to TWFoundry transit/data concepts.
- Add tests that confirm the route renders and key token/component sections exist.
