<script setup lang="ts">
import BaseBadge from "@/shared/components/BaseBadge.vue";
import BaseButton from "@/shared/components/BaseButton.vue";
import BaseCard from "@/shared/components/BaseCard.vue";
import BasePanel from "@/shared/components/BasePanel.vue";
import BaseSectionLabel from "@/shared/components/BaseSectionLabel.vue";

const colorTokens = [
  ["Canvas", "--twf-color-canvas", "#F7F3EE", "Warm page background."],
  ["Surface", "--twf-color-surface", "#FBF8F3", "Panels, sidebars, and cards."],
  ["Ink", "--twf-color-text", "#1F1B17", "Primary readable text."],
  ["Muted ink", "--twf-color-text-muted", "#6C635B", "Metadata and secondary copy."],
  ["Line", "--twf-color-border", "#E6DED2", "Soft borders and dividers."],
  ["Warm accent", "--twf-color-accent-warm", "#C97B63", "Focused non-route emphasis."],
  ["Route red", "--twf-color-route-red", "#D92D3A", "MRT route semantics."],
  ["Route blue", "--twf-color-route-blue", "#2F6FD6", "MRT route semantics."],
  ["Route green", "--twf-color-route-green", "#2F9E62", "MRT route semantics."],
];

const spacingTokens = [
  ["4px", "Micro alignment"],
  ["8px", "Compact clusters"],
  ["12px", "Small controls"],
  ["16px", "Default component gap"],
  ["24px", "Card and panel padding"],
  ["40px", "Major section rhythm"],
];

const breakpointTokens = [
  ["Mobile", "0-639px", "Single-column map-first layout; hide wide rails and timeline."],
  ["Tablet", "640-1023px", "Map remains primary; simplify side panels before adding drawers."],
  ["Desktop", "1024px+", "Full monitoring layout with topbar, rails, panels, map, and timeline."],
];

const libraryTradeoffs = [
  [
    "Local Vue components",
    "First pass",
    "Best fit for our map-first dashboard and custom light-mode identity.",
  ],
  ["shadcn/ui", "Concept only", "React-oriented; borrow vocabulary, not dependency."],
  ["shadcn-vue", "Defer", "Useful later for richer primitives if we need them."],
  ["Ant Design Vue", "Defer", "Strong enterprise style and heavier surface than we need now."],
  ["Reka UI", "Later candidate", "Good for accessible headless primitives without visual lock-in."],
];
</script>

<template>
  <main class="design-system-page">
    <header class="hero">
      <RouterLink class="back-link" to="/">MRT dashboard</RouterLink>
      <BaseSectionLabel>TWFoundry Design System</BaseSectionLabel>
      <h1>Calm, transit-aware, data-dense light mode.</h1>
      <p>
        This page turns the Anthropic-inspired study into TWFoundry rules: warm
        surfaces, soft borders, semantic MRT route colors, and reusable Vue
        components.
      </p>
      <div class="hero-actions">
        <BaseButton variant="primary">Primary action</BaseButton>
        <BaseButton>Secondary action</BaseButton>
        <BaseBadge tone="warm">Anthropic light direction</BaseBadge>
      </div>
    </header>

    <section class="principles" aria-label="Design principles">
      <BaseCard>
        <BaseSectionLabel>Principle</BaseSectionLabel>
        <h2>Warm before clinical</h2>
        <p>Use off-white canvas and quiet surfaces instead of cold admin-console gray.</p>
      </BaseCard>
      <BaseCard>
        <BaseSectionLabel>Principle</BaseSectionLabel>
        <h2>Semantic before decorative</h2>
        <p>Red, blue, and green belong to MRT route meaning, not random ornament.</p>
      </BaseCard>
      <BaseCard>
        <BaseSectionLabel>Principle</BaseSectionLabel>
        <h2>Map first</h2>
        <p>Panels support the map. They should not make the map feel embedded in a card.</p>
      </BaseCard>
    </section>

    <section class="section-grid" aria-labelledby="color-title">
      <div>
        <BaseSectionLabel>Color system</BaseSectionLabel>
        <h2 id="color-title">Named tokens with product intent</h2>
      </div>
      <div class="token-grid" data-testid="design-token-grid">
        <BasePanel v-for="[name, token, hex, usage] in colorTokens" :key="token">
          <div class="swatch-row">
            <span class="swatch" :style="{ backgroundColor: hex }" aria-hidden="true" />
            <div>
              <h3>{{ name }}</h3>
              <code>{{ token }}</code>
            </div>
          </div>
          <p>{{ usage }}</p>
        </BasePanel>
      </div>
    </section>

    <section class="section-grid" aria-labelledby="type-title">
      <div>
        <BaseSectionLabel>Typography and spacing</BaseSectionLabel>
        <h2 id="type-title">Readable hierarchy without sharp jumps</h2>
      </div>
      <div class="docs-stack">
        <BaseCard>
          <div class="type-sample display">Display: MRT system overview</div>
          <div class="type-sample heading">Heading: Station detail</div>
          <div class="type-sample body">
            Body: LiveBoard rows and map controls should be readable at dense dashboard scale.
          </div>
          <div class="type-sample meta">Meta: route, source, status, timestamp</div>
        </BaseCard>
        <BaseCard>
          <div class="spacing-list">
            <div v-for="[size, usage] in spacingTokens" :key="size">
              <strong>{{ size }}</strong>
              <span>{{ usage }}</span>
            </div>
          </div>
        </BaseCard>
      </div>
    </section>

    <section class="section-grid" aria-labelledby="components-title">
      <div>
        <BaseSectionLabel>Component grammar</BaseSectionLabel>
        <h2 id="components-title">Small Vue components first</h2>
      </div>
      <div class="component-grid">
        <BaseCard>
          <BaseSectionLabel>Buttons and badges</BaseSectionLabel>
          <div class="component-row">
            <BaseButton variant="primary">Refresh LiveBoard</BaseButton>
            <BaseButton>Open layers</BaseButton>
            <BaseBadge tone="blue">Blue Line</BaseBadge>
            <BaseBadge tone="green">On time</BaseBadge>
          </div>
        </BaseCard>
        <BaseCard>
          <BaseSectionLabel>LiveBoard row</BaseSectionLabel>
          <div class="liveboard-example">
            <span class="route-line" aria-hidden="true" />
            <div>
              <h3>Dingpu</h3>
              <p>Blue Line · Westbound</p>
            </div>
            <strong>2 min</strong>
          </div>
        </BaseCard>
      </div>
    </section>

    <section class="section-grid" aria-labelledby="breakpoint-title">
      <div>
        <BaseSectionLabel>Responsive system</BaseSectionLabel>
        <h2 id="breakpoint-title">Breakpoints are product behavior</h2>
      </div>
      <BaseCard>
        <div class="breakpoint-list" data-testid="breakpoint-rules">
          <div v-for="[name, range, behavior] in breakpointTokens" :key="name">
            <strong>{{ name }}</strong>
            <code>{{ range }}</code>
            <span>{{ behavior }}</span>
          </div>
        </div>
      </BaseCard>
    </section>

    <section class="section-grid" aria-labelledby="tradeoff-title">
      <div>
        <BaseSectionLabel>Library decision</BaseSectionLabel>
        <h2 id="tradeoff-title">Trade-offs before dependencies</h2>
      </div>
      <BaseCard>
        <div class="tradeoff-table" data-testid="library-tradeoffs">
          <div v-for="[option, decision, reason] in libraryTradeoffs" :key="option" class="tradeoff-row">
            <strong>{{ option }}</strong>
            <BaseBadge :tone="decision === 'First pass' ? 'warm' : 'neutral'">{{ decision }}</BaseBadge>
            <span>{{ reason }}</span>
          </div>
        </div>
      </BaseCard>
    </section>

    <section class="section-grid" aria-labelledby="rules-title">
      <div>
        <BaseSectionLabel>Usage rules</BaseSectionLabel>
        <h2 id="rules-title">Do this, avoid that</h2>
      </div>
      <div class="component-grid">
        <BasePanel>
          <h3>Do</h3>
          <ul>
            <li>Use MRT colors only for route meaning.</li>
            <li>Use warm surfaces for dashboard chrome.</li>
            <li>Keep map content visually dominant.</li>
          </ul>
        </BasePanel>
        <BasePanel>
          <h3>Avoid</h3>
          <ul>
            <li>Do not copy finance dashboard examples into product copy.</li>
            <li>Do not introduce Ant Design or shadcn-vue in the first pass.</li>
            <li>Do not use heavy gradients or purple-blue dominant palettes.</li>
          </ul>
        </BasePanel>
      </div>
    </section>
  </main>
</template>

<style scoped>
.design-system-page {
  min-height: 100vh;
  padding: 32px clamp(18px, 4vw, 56px) 56px;
  background: var(--twf-color-canvas);
  color: var(--twf-color-text);
}

.hero,
.section-grid {
  max-width: 1180px;
  margin: 0 auto;
}

.hero {
  border: 1px solid var(--twf-color-border);
  border-radius: var(--twf-radius-xl);
  padding: clamp(24px, 5vw, 48px);
  background: var(--twf-color-surface);
}

.back-link {
  display: inline-flex;
  margin-bottom: 22px;
  color: var(--twf-color-text-muted);
  font-size: 0.82rem;
  font-weight: 700;
  text-decoration: none;
}

.back-link:hover {
  color: var(--twf-color-text);
}

h1,
h2,
h3,
p {
  margin: 0;
}

h1 {
  max-width: 780px;
  margin-top: 12px;
  font-size: clamp(2.25rem, 7vw, 4.5rem);
  font-weight: 600;
  letter-spacing: 0;
  line-height: 0.95;
}

.hero p {
  max-width: 680px;
  margin-top: 18px;
  color: var(--twf-color-text-muted);
  font-size: 1rem;
  line-height: 1.75;
}

.hero-actions,
.component-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--twf-space-2);
  margin-top: var(--twf-space-6);
}

.principles {
  display: grid;
  max-width: 1180px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--twf-space-4);
  margin: var(--twf-space-6) auto;
}

.principles h2,
.section-grid h2 {
  margin-top: 10px;
  font-size: 1.55rem;
  line-height: 1.15;
}

.principles p,
.section-grid p,
li {
  color: var(--twf-color-text-muted);
  line-height: 1.65;
}

.section-grid {
  display: grid;
  grid-template-columns: 0.42fr minmax(0, 1fr);
  gap: var(--twf-space-6);
  border-top: 1px solid var(--twf-color-border);
  padding-top: var(--twf-space-6);
  margin-top: var(--twf-space-6);
}

.token-grid,
.component-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--twf-space-3);
}

.docs-stack {
  display: grid;
  gap: var(--twf-space-3);
}

.swatch-row {
  display: flex;
  align-items: center;
  gap: var(--twf-space-3);
  margin-bottom: var(--twf-space-3);
}

.swatch {
  width: 48px;
  height: 48px;
  border: 1px solid var(--twf-color-border);
  border-radius: var(--twf-radius-lg);
}

code {
  color: var(--twf-color-text-faint);
  font-size: 0.78rem;
}

.type-sample + .type-sample {
  margin-top: var(--twf-space-3);
}

.display {
  font-size: 2.3rem;
  font-weight: 600;
  line-height: 1;
}

.heading {
  font-size: 1.25rem;
  font-weight: 700;
}

.body {
  color: var(--twf-color-text-muted);
  line-height: 1.65;
}

.meta {
  color: var(--twf-color-text-faint);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.spacing-list {
  display: grid;
  gap: var(--twf-space-3);
}

.spacing-list div,
.tradeoff-row,
.breakpoint-list div {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: var(--twf-space-3);
  align-items: center;
}

.liveboard-example {
  display: grid;
  grid-template-columns: 4px minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--twf-space-3);
  border: 1px solid var(--twf-color-border-soft);
  border-radius: var(--twf-radius-lg);
  padding: var(--twf-space-4);
  background: var(--twf-color-surface-raised);
}

.route-line {
  width: 4px;
  height: 46px;
  border-radius: 999px;
  background: var(--twf-color-route-blue);
}

.liveboard-example p {
  font-size: 0.82rem;
}

.tradeoff-table {
  display: grid;
  gap: var(--twf-space-3);
}

.breakpoint-list {
  display: grid;
  gap: var(--twf-space-3);
}

.breakpoint-list div {
  grid-template-columns: 100px 110px minmax(0, 1fr);
  border-bottom: 1px solid var(--twf-color-border-soft);
  padding-bottom: var(--twf-space-3);
}

.breakpoint-list div:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.tradeoff-row {
  grid-template-columns: 160px 110px minmax(0, 1fr);
  border-bottom: 1px solid var(--twf-color-border-soft);
  padding-bottom: var(--twf-space-3);
}

.tradeoff-row:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

ul {
  margin: var(--twf-space-3) 0 0;
  padding-left: 18px;
}

@media (max-width: 639px) {
  .principles,
  .section-grid,
  .token-grid,
  .component-grid {
    grid-template-columns: 1fr;
  }

  .tradeoff-row,
  .breakpoint-list div {
    grid-template-columns: 1fr;
  }
}
</style>
