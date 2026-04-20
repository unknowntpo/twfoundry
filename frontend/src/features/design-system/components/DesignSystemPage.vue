<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import BaseBadge from "@/shared/components/BaseBadge.vue";
import BaseButton from "@/shared/components/BaseButton.vue";
import BaseCard from "@/shared/components/BaseCard.vue";
import BasePanel from "@/shared/components/BasePanel.vue";
import BaseSectionLabel from "@/shared/components/BaseSectionLabel.vue";
import LocaleSwitcher from "@/shared/components/LocaleSwitcher.vue";

const { t } = useI18n();

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

const breakpointTokens = computed(() => [
  ["Mobile", "0-639px", "Single-column map-first layout; hide wide rails and timeline."],
  ["Tablet", "640-1023px", "Map-first compact layout; reveal panels through compact controls."],
  ["Desktop", "1024px+", "Full monitoring layout with topbar, rails, panels, map, and timeline."],
]);

const libraryTradeoffs = computed(() => [
  [
    "Local Vue components",
    t("designSystem.tradeoffs.firstPass"),
    "Best fit for our map-first dashboard and custom light-mode identity.",
  ],
  ["shadcn/ui", "Concept only", "React-oriented; borrow vocabulary, not dependency."],
  ["shadcn-vue", "Defer", "Useful later for richer primitives if we need them."],
  ["Ant Design Vue", "Defer", "Strong enterprise style and heavier surface than we need now."],
  ["Reka UI", "Later candidate", "Good for accessible headless primitives without visual lock-in."],
]);

const commonComponents = computed(
  () =>
    [
      ["actions", "button", "implemented"],
      ["actions", "iconButton", "partial"],
      ["actions", "segmentedControl", "partial"],
      ["feedback", "badge", "implemented"],
      ["feedback", "inlineAlert", "partial"],
      ["feedback", "emptyState", "partial"],
      ["feedback", "loadingState", "partial"],
      ["feedback", "toast", "gap"],
      ["overlays", "dialog", "gap"],
      ["overlays", "drawer", "gap"],
      ["overlays", "tooltip", "gap"],
      ["data", "liveboard", "implemented"],
      ["data", "statChip", "partial"],
      ["map", "timeline", "partial"],
      ["map", "mapControl", "implemented"],
    ] as const,
);

const statusSummary = computed(() => ({
  implemented: commonComponents.value.filter(([, , status]) => status === "implemented").length,
  partial: commonComponents.value.filter(([, , status]) => status === "partial").length,
  gap: commonComponents.value.filter(([, , status]) => status === "gap").length,
}));

const componentGroups = computed(() => {
  const order = ["actions", "feedback", "overlays", "data", "map"] as const;
  return order.map((category) => ({
    category,
    items: commonComponents.value.filter(([itemCategory]) => itemCategory === category),
  }));
});

function componentStatusTone(status: string): "green" | "blue" | "warm" {
  if (status === "implemented") {
    return "green";
  }

  if (status === "partial") {
    return "blue";
  }

  return "warm";
}
</script>

<template>
  <main class="design-system-page">
    <header class="hero">
      <div class="hero-nav">
        <RouterLink class="back-link" to="/">{{ t("designSystem.back") }}</RouterLink>
        <LocaleSwitcher />
      </div>
      <BaseSectionLabel>{{ t("designSystem.label") }}</BaseSectionLabel>
      <h1>{{ t("designSystem.title") }}</h1>
      <p>{{ t("designSystem.intro") }}</p>
      <div class="hero-actions">
        <BaseButton variant="primary">{{ t("designSystem.actions.primary") }}</BaseButton>
        <BaseButton>{{ t("designSystem.actions.secondary") }}</BaseButton>
        <BaseBadge tone="warm">{{ t("designSystem.actions.direction") }}</BaseBadge>
      </div>
    </header>

    <section class="principles" :aria-label="t('designSystem.principles.aria')">
      <BaseCard>
        <BaseSectionLabel>{{ t("designSystem.principles.label") }}</BaseSectionLabel>
        <h2>{{ t("designSystem.principles.warmTitle") }}</h2>
        <p>{{ t("designSystem.principles.warmBody") }}</p>
      </BaseCard>
      <BaseCard>
        <BaseSectionLabel>{{ t("designSystem.principles.label") }}</BaseSectionLabel>
        <h2>{{ t("designSystem.principles.semanticTitle") }}</h2>
        <p>{{ t("designSystem.principles.semanticBody") }}</p>
      </BaseCard>
      <BaseCard>
        <BaseSectionLabel>{{ t("designSystem.principles.label") }}</BaseSectionLabel>
        <h2>{{ t("designSystem.principles.mapTitle") }}</h2>
        <p>{{ t("designSystem.principles.mapBody") }}</p>
      </BaseCard>
    </section>

    <section class="section-grid" aria-labelledby="color-title">
      <div>
        <BaseSectionLabel>{{ t("designSystem.colors.label") }}</BaseSectionLabel>
        <h2 id="color-title">{{ t("designSystem.colors.title") }}</h2>
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
        <BaseSectionLabel>{{ t("designSystem.typography.label") }}</BaseSectionLabel>
        <h2 id="type-title">{{ t("designSystem.typography.title") }}</h2>
      </div>
      <div class="docs-stack">
        <BaseCard>
          <div class="type-sample display">{{ t("designSystem.typography.display") }}</div>
          <div class="type-sample heading">{{ t("designSystem.typography.heading") }}</div>
          <div class="type-sample body">{{ t("designSystem.typography.body") }}</div>
          <div class="type-sample meta">{{ t("designSystem.typography.meta") }}</div>
        </BaseCard>
        <BaseCard>
          <BaseSectionLabel>{{ t("designSystem.typography.cjkLabel") }}</BaseSectionLabel>
          <h3>{{ t("designSystem.typography.cjkTitle") }}</h3>
          <p>{{ t("designSystem.typography.cjkBody") }}</p>
          <div class="type-sample cjk">{{ t("designSystem.typography.cjkSample") }}</div>
          <code>--twf-font-family-cjk</code>
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
        <BaseSectionLabel>{{ t("designSystem.components.label") }}</BaseSectionLabel>
        <h2 id="components-title">{{ t("designSystem.components.title") }}</h2>
      </div>
      <div class="component-grid">
        <BaseCard>
          <BaseSectionLabel>{{ t("designSystem.components.buttons") }}</BaseSectionLabel>
          <div class="component-row">
            <BaseButton variant="primary">{{ t("designSystem.components.refresh") }}</BaseButton>
            <BaseButton>{{ t("designSystem.components.openLayers") }}</BaseButton>
            <BaseBadge tone="blue">{{ t("designSystem.components.blueLine") }}</BaseBadge>
            <BaseBadge tone="green">{{ t("designSystem.components.onTime") }}</BaseBadge>
          </div>
        </BaseCard>
        <BaseCard>
          <BaseSectionLabel>{{ t("designSystem.components.liveBoardRow") }}</BaseSectionLabel>
          <div class="liveboard-example">
            <span class="route-line" aria-hidden="true" />
            <div>
              <h3>{{ t("designSystem.components.destination") }}</h3>
              <p>{{ t("designSystem.components.direction") }}</p>
            </div>
            <strong>{{ t("designSystem.components.arrival") }}</strong>
          </div>
        </BaseCard>
      </div>
    </section>

    <section class="section-grid" aria-labelledby="common-components-title">
      <div>
        <BaseSectionLabel>{{ t("designSystem.commonComponents.label") }}</BaseSectionLabel>
        <h2 id="common-components-title">{{ t("designSystem.commonComponents.title") }}</h2>
      </div>
      <div class="docs-stack">
        <BaseCard data-testid="common-component-inventory">
          <BaseSectionLabel>{{ t("designSystem.commonComponents.inventory") }}</BaseSectionLabel>
          <div class="summary-badges">
            <BaseBadge tone="green">
              {{ t("designSystem.commonComponents.statusImplemented") }} · {{ statusSummary.implemented }}
            </BaseBadge>
            <BaseBadge tone="blue">
              {{ t("designSystem.commonComponents.statusPartial") }} · {{ statusSummary.partial }}
            </BaseBadge>
            <BaseBadge tone="warm">
              {{ t("designSystem.commonComponents.statusGap") }} · {{ statusSummary.gap }}
            </BaseBadge>
          </div>
          <div class="inventory-groups">
            <details
              v-for="({ category, items }, index) in componentGroups"
              :key="category"
              class="inventory-group"
              :open="index === 0"
            >
              <summary class="inventory-summary">
                <div>
                  <strong>{{ t(`designSystem.commonComponents.categories.${category}`) }}</strong>
                  <p>{{ items.length }} components</p>
                </div>
                <span>{{ index === 0 ? "−" : "+" }}</span>
              </summary>

              <div class="inventory-list">
                <article
                  v-for="[, itemKey, status] in items"
                  :key="itemKey"
                  class="inventory-row"
                >
                  <div>
                    <strong>{{ t(`designSystem.commonComponents.items.${itemKey}.0`) }}</strong>
                    <p>{{ t(`designSystem.commonComponents.items.${itemKey}.1`) }}</p>
                  </div>
                  <div class="inventory-preview">
                    <div class="preview-surface" :data-component="itemKey">
                      <BaseButton
                        v-if="itemKey === 'button'"
                        size="sm"
                        variant="primary"
                      >
                        Run
                      </BaseButton>
                      <button
                        v-else-if="itemKey === 'iconButton'"
                        type="button"
                        class="mini-icon-button"
                        aria-label="Preview icon button"
                      >
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                          <path d="M3 8h10M8 3v10" />
                        </svg>
                      </button>
                      <div v-else-if="itemKey === 'segmentedControl'" class="mini-segmented">
                        <span class="active">Map</span>
                        <span>Detail</span>
                      </div>
                      <BaseBadge v-else-if="itemKey === 'badge'" tone="green">On time</BaseBadge>
                      <div v-else-if="itemKey === 'inlineAlert'" class="mini-alert">
                        Feed unavailable
                      </div>
                      <div v-else-if="itemKey === 'emptyState'" class="mini-empty">
                        <strong>No rows</strong>
                        <span>Select a station</span>
                      </div>
                      <div v-else-if="itemKey === 'loadingState'" class="mini-loading">
                        <span />
                        <span />
                      </div>
                      <div v-else-if="itemKey === 'toast'" class="mini-toast">
                        Synced
                      </div>
                      <div v-else-if="itemKey === 'dialog'" class="mini-dialog">
                        <strong>Confirm</strong>
                        <div class="mini-dialog-actions">
                          <span />
                          <span class="primary" />
                        </div>
                      </div>
                      <div v-else-if="itemKey === 'drawer'" class="mini-drawer">
                        <span class="handle" />
                        <strong>Sheet</strong>
                      </div>
                      <div v-else-if="itemKey === 'tooltip'" class="mini-tooltip">
                        Layers
                      </div>
                      <div v-else-if="itemKey === 'liveboard'" class="mini-liveboard">
                        <span class="route" />
                        <strong>2 min</strong>
                      </div>
                      <div v-else-if="itemKey === 'statChip'" class="mini-stat-chip">
                        18 trains
                      </div>
                      <div v-else-if="itemKey === 'timeline'" class="mini-timeline">
                        <span class="track" />
                      </div>
                      <div v-else-if="itemKey === 'mapControl'" class="mini-map-control">
                        <span>3D</span>
                      </div>
                    </div>
                    <div class="inventory-meta">
                      <span>{{ t(`designSystem.commonComponents.categories.${category}`) }}</span>
                      <BaseBadge :tone="componentStatusTone(status)">
                        {{
                          t(
                            `designSystem.commonComponents.status${status.charAt(0).toUpperCase()}${status.slice(1)}`,
                          )
                        }}
                      </BaseBadge>
                    </div>
                  </div>
                </article>
              </div>
            </details>
          </div>
        </BaseCard>

        <BaseCard data-testid="overlay-patterns">
          <BaseSectionLabel>{{ t("designSystem.commonComponents.overlayLabel") }}</BaseSectionLabel>
          <h3>{{ t("designSystem.commonComponents.overlayTitle") }}</h3>
          <div class="overlay-grid">
            <BasePanel class="overlay-preview dialog-preview">
              <BaseSectionLabel>{{ t("designSystem.commonComponents.dialogTitle") }}</BaseSectionLabel>
              <div class="dialog-box">
                <strong>{{ t("designSystem.commonComponents.previewDialogTitle") }}</strong>
                <p>{{ t("designSystem.commonComponents.previewDialogBody") }}</p>
                <div class="component-row compact-row">
                  <BaseButton>{{ t("designSystem.commonComponents.previewDialogCancel") }}</BaseButton>
                  <BaseButton variant="primary">
                    {{ t("designSystem.commonComponents.previewDialogConfirm") }}
                  </BaseButton>
                </div>
              </div>
              <p>{{ t("designSystem.commonComponents.dialogBody") }}</p>
            </BasePanel>

            <BasePanel class="overlay-preview toast-preview">
              <BaseSectionLabel>{{ t("designSystem.commonComponents.toastTitle") }}</BaseSectionLabel>
              <div class="toast-box">
                <strong>{{ t("designSystem.commonComponents.previewToastTitle") }}</strong>
                <p>{{ t("designSystem.commonComponents.previewToastBody") }}</p>
              </div>
              <p>{{ t("designSystem.commonComponents.toastBody") }}</p>
            </BasePanel>

            <BasePanel class="overlay-preview drawer-preview">
              <BaseSectionLabel>{{ t("designSystem.commonComponents.drawerTitle") }}</BaseSectionLabel>
              <div class="drawer-shell">
                <div class="drawer-handle" aria-hidden="true" />
                <strong>{{ t("designSystem.commonComponents.previewDrawerTitle") }}</strong>
                <p>{{ t("designSystem.commonComponents.previewDrawerBody") }}</p>
              </div>
              <p>{{ t("designSystem.commonComponents.drawerBody") }}</p>
            </BasePanel>
          </div>
        </BaseCard>
      </div>
    </section>

    <section class="section-grid" aria-labelledby="breakpoint-title">
      <div>
        <BaseSectionLabel>{{ t("designSystem.breakpoints.label") }}</BaseSectionLabel>
        <h2 id="breakpoint-title">{{ t("designSystem.breakpoints.title") }}</h2>
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
        <BaseSectionLabel>{{ t("designSystem.tradeoffs.label") }}</BaseSectionLabel>
        <h2 id="tradeoff-title">{{ t("designSystem.tradeoffs.title") }}</h2>
      </div>
      <BaseCard>
        <div class="tradeoff-table" data-testid="library-tradeoffs">
          <div v-for="[option, decision, reason] in libraryTradeoffs" :key="option" class="tradeoff-row">
            <strong>{{ option }}</strong>
            <BaseBadge :tone="decision === t('designSystem.tradeoffs.firstPass') ? 'warm' : 'neutral'">{{ decision }}</BaseBadge>
            <span>{{ reason }}</span>
          </div>
        </div>
      </BaseCard>
    </section>

    <section class="section-grid" aria-labelledby="i18n-title">
      <div>
        <BaseSectionLabel>{{ t("designSystem.i18n.label") }}</BaseSectionLabel>
        <h2 id="i18n-title">{{ t("designSystem.i18n.title") }}</h2>
      </div>
      <BaseCard>
        <p>{{ t("designSystem.i18n.body") }}</p>
        <div class="component-grid compact">
          <BasePanel>
            <h3>{{ t("designSystem.rules.do") }}</h3>
            <ul>
              <li>{{ t("designSystem.i18n.doOne") }}</li>
              <li>{{ t("designSystem.i18n.doTwo") }}</li>
            </ul>
          </BasePanel>
          <BasePanel>
            <h3>{{ t("designSystem.rules.avoid") }}</h3>
            <ul>
              <li>{{ t("designSystem.i18n.avoidOne") }}</li>
              <li>{{ t("designSystem.i18n.avoidTwo") }}</li>
            </ul>
          </BasePanel>
        </div>
      </BaseCard>
    </section>

    <section class="section-grid" aria-labelledby="rules-title">
      <div>
        <BaseSectionLabel>{{ t("designSystem.rules.label") }}</BaseSectionLabel>
        <h2 id="rules-title">{{ t("designSystem.rules.title") }}</h2>
      </div>
      <div class="component-grid">
        <BasePanel>
          <h3>{{ t("designSystem.rules.do") }}</h3>
          <ul>
            <li>{{ t("designSystem.rules.doRoute") }}</li>
            <li>{{ t("designSystem.rules.doSurface") }}</li>
            <li>{{ t("designSystem.rules.doMap") }}</li>
          </ul>
        </BasePanel>
        <BasePanel>
          <h3>{{ t("designSystem.rules.avoid") }}</h3>
          <ul>
            <li>{{ t("designSystem.rules.avoidFinance") }}</li>
            <li>{{ t("designSystem.rules.avoidDependency") }}</li>
            <li>{{ t("designSystem.rules.avoidGradient") }}</li>
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

.inventory-groups {
  display: grid;
  gap: var(--twf-space-3);
}

.inventory-group {
  border: 1px solid var(--twf-color-border-soft);
  border-radius: var(--twf-radius-lg);
  background: var(--twf-color-surface-raised);
}

.inventory-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--twf-space-3);
  padding: var(--twf-space-4);
  cursor: pointer;
  list-style: none;
}

.inventory-summary::-webkit-details-marker {
  display: none;
}

.inventory-summary p {
  margin-top: 4px;
  color: var(--twf-color-text-faint);
  font-size: 0.78rem;
}

.inventory-group[open] .inventory-summary {
  border-bottom: 1px solid var(--twf-color-border-soft);
}

.inventory-list {
  display: grid;
  gap: 0;
  padding: 0 var(--twf-space-4) var(--twf-space-4);
}

.summary-badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--twf-space-2);
  margin-bottom: var(--twf-space-4);
}

.inventory-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 240px;
  gap: var(--twf-space-3);
  align-items: start;
  border-bottom: 1px solid var(--twf-color-border-soft);
  padding: var(--twf-space-4) 0;
}

.inventory-row:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.inventory-preview {
  display: grid;
  gap: var(--twf-space-2);
}

.inventory-meta {
  display: grid;
  justify-items: end;
  gap: var(--twf-space-2);
  color: var(--twf-color-text-faint);
  font-size: 0.74rem;
}

.preview-surface {
  display: grid;
  min-height: 78px;
  align-content: center;
  justify-items: center;
  gap: var(--twf-space-2);
  border: 1px solid var(--twf-color-border-soft);
  border-radius: var(--twf-radius-md);
  padding: var(--twf-space-3);
  background: color-mix(in srgb, var(--twf-color-surface) 96%, transparent);
}

.mini-icon-button {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid var(--twf-color-border);
  border-radius: var(--twf-radius-sm);
  background: var(--twf-color-surface-raised);
  color: var(--twf-color-text-muted);
}

.mini-icon-button svg {
  width: 15px;
  height: 15px;
}

.mini-segmented {
  display: inline-grid;
  grid-template-columns: repeat(2, auto);
  gap: 4px;
  border: 1px solid var(--twf-color-border);
  border-radius: 999px;
  padding: 4px;
  background: var(--twf-color-surface);
}

.mini-segmented span {
  border-radius: 999px;
  padding: 6px 10px;
  color: var(--twf-color-text-faint);
  font-size: 0.72rem;
  font-weight: 700;
}

.mini-segmented .active {
  background: var(--twf-color-text);
  color: var(--twf-color-surface-raised);
}

.mini-alert,
.mini-toast,
.mini-tooltip,
.mini-stat-chip,
.mini-map-control {
  border-radius: var(--twf-radius-sm);
  padding: 8px 10px;
  font-size: 0.74rem;
  font-weight: 700;
}

.mini-alert {
  border: 1px solid color-mix(in srgb, var(--twf-color-route-red) 28%, transparent);
  background: var(--twf-color-route-red-soft);
  color: var(--twf-color-route-red);
}

.mini-empty {
  display: grid;
  justify-items: center;
  gap: 4px;
}

.mini-empty strong {
  font-size: 0.84rem;
}

.mini-empty span {
  color: var(--twf-color-text-faint);
  font-size: 0.72rem;
}

.mini-loading {
  display: grid;
  gap: 8px;
  width: 100%;
}

.mini-loading span {
  display: block;
  height: 10px;
  border-radius: 999px;
  background: var(--twf-color-border-soft);
}

.mini-loading span:first-child {
  width: 100%;
}

.mini-loading span:last-child {
  width: 70%;
}

.mini-toast {
  border-left: 4px solid var(--twf-color-route-blue);
  background: var(--twf-color-route-blue-soft);
  color: var(--twf-color-route-blue);
}

.mini-dialog {
  display: grid;
  gap: 10px;
  width: 100%;
  border: 1px solid var(--twf-color-border);
  border-radius: var(--twf-radius-md);
  padding: 10px;
  background: var(--twf-color-surface-raised);
  box-shadow: var(--twf-shadow-panel);
}

.mini-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

.mini-dialog-actions span {
  width: 34px;
  height: 10px;
  border-radius: 999px;
  background: var(--twf-color-border);
}

.mini-dialog-actions .primary {
  background: var(--twf-color-text);
}

.mini-drawer {
  display: grid;
  justify-items: center;
  gap: 10px;
  width: 100%;
  min-height: 70px;
  border: 1px solid var(--twf-color-border-soft);
  border-radius: var(--twf-radius-md);
  padding: 10px;
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--twf-color-route-blue-soft) 92%, transparent),
      var(--twf-color-surface-raised) 42%
    );
}

.mini-drawer .handle {
  width: 36px;
  height: 4px;
  border-radius: 999px;
  background: var(--twf-color-border);
}

.mini-tooltip {
  background: var(--twf-color-text);
  color: var(--twf-color-surface-raised);
}

.mini-liveboard {
  display: grid;
  grid-template-columns: 4px auto;
  gap: 10px;
  align-items: center;
  width: 100%;
  border: 1px solid var(--twf-color-border-soft);
  border-radius: var(--twf-radius-md);
  padding: 10px;
}

.mini-liveboard .route {
  width: 4px;
  height: 34px;
  border-radius: 999px;
  background: var(--twf-color-route-blue);
}

.mini-stat-chip {
  background: var(--twf-color-surface-raised);
  box-shadow: var(--twf-shadow-hairline);
}

.mini-timeline {
  width: 100%;
}

.mini-timeline .track {
  display: block;
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background:
    linear-gradient(
      90deg,
      var(--twf-color-route-blue) 0 58%,
      var(--twf-color-border-soft) 58% 100%
    );
}

.mini-map-control {
  border: 1px solid var(--twf-color-border);
  background: var(--twf-color-surface-raised);
  color: var(--twf-color-text);
}

.overlay-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--twf-space-3);
  margin-top: var(--twf-space-4);
}

.overlay-preview {
  display: grid;
  gap: var(--twf-space-3);
}

.dialog-preview,
.toast-preview,
.drawer-preview {
  min-height: 100%;
}

.dialog-box,
.toast-box,
.drawer-shell {
  border: 1px solid var(--twf-color-border-soft);
  border-radius: var(--twf-radius-lg);
  background: var(--twf-color-surface-raised);
}

.dialog-box {
  display: grid;
  gap: var(--twf-space-3);
  padding: var(--twf-space-4);
  box-shadow: var(--twf-shadow-panel);
}

.toast-box {
  display: grid;
  gap: var(--twf-space-1);
  padding: var(--twf-space-3) var(--twf-space-4);
  border-left: 4px solid var(--twf-color-route-blue);
  box-shadow: var(--twf-shadow-floating);
}

.drawer-shell {
  display: grid;
  gap: var(--twf-space-3);
  align-content: start;
  min-height: 200px;
  padding: var(--twf-space-4);
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--twf-color-route-blue-soft) 90%, transparent),
      var(--twf-color-surface-raised) 35%
    );
}

.drawer-handle {
  width: 48px;
  height: 5px;
  border-radius: 999px;
  margin: 0 auto;
  background: var(--twf-color-border);
}

.compact-row {
  margin-top: 0;
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

.cjk {
  font-family: var(--twf-font-family-cjk);
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1.55;
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
  .component-grid,
  .overlay-grid {
    grid-template-columns: 1fr;
  }

  .tradeoff-row,
  .breakpoint-list div,
  .inventory-row {
    grid-template-columns: 1fr;
  }

  .inventory-meta {
    justify-items: start;
  }
}
</style>
