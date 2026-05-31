<script setup>
import { computed, ref, watchEffect } from 'vue';
import { SUPPORTED_LOCALES, locale, setLocale, t } from './i18n.js';
import {
  breakpointRules,
  colorFamilies,
  contractSections,
  contractTokens,
  freshnessRules,
  implementationRules,
  mapGrammar,
  sourceRows,
} from './minimumDesignSystemContract.js';

const selectedState = ref('selected');

const stateOptions = [
  { key: 'selected', labelKey: 'ds.preview.state.selected' },
  { key: 'empty', labelKey: 'ds.preview.state.empty' },
  { key: 'stale', labelKey: 'ds.preview.state.stale' },
  { key: 'live', labelKey: 'ds.preview.state.live' },
];

const previewVehicles = computed(() => (selectedState.value === 'empty'
  ? []
  : [
    { id: 'bus-a', x: 23, y: 62, stale: selectedState.value === 'stale' },
    { id: 'bus-b', x: 42, y: 48, selected: selectedState.value === 'selected' },
    { id: 'bus-c', x: 61, y: 36 },
    { id: 'bus-d', x: 78, y: 54 },
    { id: 'bus-e', x: 54, y: 69 },
  ]));

watchEffect(() => {
  document.title = t('ds.documentTitle');
});

function scrollToSection(sectionId) {
  document.getElementById(sectionId)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}
</script>

<template>
  <main class="minimum-design-system" :style="Object.fromEntries(contractTokens.map((token) => [token.varName, token.value]))">
    <header class="contract-topbar">
      <a class="brand" href="/">
        <span class="brand-mark" aria-hidden="true"></span>
        <span>
          <strong>TWFoundry</strong>
          <small>{{ t('app.subtitle') }}</small>
        </span>
      </a>
      <nav class="contract-nav" :aria-label="t('ds.nav')">
        <button type="button" @click="scrollToSection('tokens')">{{ t('ds.nav.tokens') }}</button>
        <button type="button" @click="scrollToSection('grammar')">{{ t('ds.nav.grammar') }}</button>
        <button type="button" @click="scrollToSection('breakpoints')">{{ t('ds.nav.breakpoints') }}</button>
        <button type="button" @click="scrollToSection('sources')">{{ t('ds.nav.sources') }}</button>
        <button type="button" @click="scrollToSection('rules')">{{ t('ds.nav.rules') }}</button>
      </nav>
      <div class="locale-switch" :aria-label="t('app.language')">
        <button
          v-for="option in SUPPORTED_LOCALES"
          :key="option.code"
          type="button"
          class="locale-btn"
          :class="{ active: locale === option.code }"
          :aria-pressed="locale === option.code"
          @click="setLocale(option.code)"
        >
          {{ option.label }}
        </button>
      </div>
    </header>

    <section class="hero">
      <div>
        <p class="eyebrow">{{ t('ds.kicker') }}</p>
        <h1>{{ t('ds.hero.title') }}</h1>
        <p class="lead">{{ t('ds.hero.copy') }}</p>
      </div>
      <aside class="status-card">
        <strong>{{ t('ds.status.title') }}</strong>
        <span>{{ t('ds.status.scope') }}</span>
        <span>{{ t('ds.status.source') }}</span>
        <span>{{ t('ds.status.decision') }}</span>
      </aside>
    </section>

    <section class="panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">{{ t('ds.pattern.kicker') }}</p>
          <h2>{{ t('ds.pattern.title') }}</h2>
        </div>
        <span class="chip">{{ t('ds.pattern.badge') }}</span>
      </div>
      <div class="section-grid thirds">
        <article v-for="section in contractSections" :key="section.key" class="card">
          <h3>{{ t(section.titleKey) }}</h3>
          <p>{{ t(section.copyKey) }}</p>
        </article>
      </div>
    </section>

    <section id="tokens" class="panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">{{ t('ds.tokens.kicker') }}</p>
          <h2>{{ t('ds.tokens.title') }}</h2>
        </div>
        <span class="chip">frontend/src/minimumDesignSystemContract.js</span>
      </div>
      <div class="color-system">
        <article v-for="family in colorFamilies" :key="family.key" class="color-family">
          <div class="color-family-copy">
            <p class="eyebrow">{{ t(family.titleKey) }}</p>
            <span>{{ t(family.copyKey) }}</span>
          </div>
          <div class="weight-strip">
            <div v-for="swatch in family.swatches" :key="swatch.weight" class="weight-cell">
              <span class="weight-swatch" :style="{ background: swatch.value }"></span>
              <strong>{{ swatch.weight }}</strong>
              <small>{{ t(swatch.useKey) }}</small>
            </div>
          </div>
        </article>
      </div>
      <div class="token-grid">
        <article v-for="token in contractTokens" :key="token.key" class="token-card">
          <span class="swatch" :style="{ background: `var(${token.varName})` }"></span>
          <strong>{{ token.varName }}</strong>
          <code>{{ token.value }}</code>
          <p>{{ t(token.messageKey) }}</p>
        </article>
      </div>
    </section>

    <section id="grammar" class="panel split">
      <div class="preview-stage">
        <div class="preview-toolbar">
          <span>{{ t('ds.preview.title') }}</span>
          <div class="segmented">
            <button
              v-for="option in stateOptions"
              :key="option.key"
              type="button"
              :class="{ active: selectedState === option.key }"
              @click="selectedState = option.key"
            >
              {{ t(option.labelKey) }}
            </button>
          </div>
        </div>
        <div class="mock-map" :class="`state-${selectedState}`">
          <span class="road highway"></span>
          <span class="road arterial one"></span>
          <span class="road arterial two"></span>
          <span class="road local a"></span>
          <span class="road local b"></span>
          <span class="building b1"></span>
          <span class="building b2"></span>
          <span class="building b3"></span>
          <span class="poi-diamond transit mock-poi one"></span>
          <span class="poi-diamond general mock-poi two"></span>
          <span
            v-for="vehicle in previewVehicles"
            :key="vehicle.id"
            class="vehicle-dot mock-vehicle"
            :class="{ stale: vehicle.stale, selected: vehicle.selected }"
            :style="{ left: `${vehicle.x}%`, top: `${vehicle.y}%` }"
          ></span>
          <span v-if="selectedState === 'empty'" class="empty-state">{{ t('ds.preview.empty') }}</span>
        </div>
      </div>
      <div class="grammar-list">
        <p class="eyebrow">{{ t('ds.grammar.kicker') }}</p>
        <h2>{{ t('ds.grammar.title') }}</h2>
        <article v-for="item in mapGrammar" :key="item.key" class="grammar-row">
          <span :class="item.className"></span>
          <div>
            <strong>{{ t(item.titleKey) }}</strong>
            <p>{{ t(item.copyKey) }}</p>
          </div>
        </article>
        <div class="freshness-policy">
          <p class="eyebrow">{{ t('ds.freshness.kicker') }}</p>
          <h3>{{ t('ds.freshness.title') }}</h3>
          <p>{{ t('ds.freshness.copy') }}</p>
          <ul>
            <li v-for="rule in freshnessRules" :key="rule">{{ t(rule) }}</li>
          </ul>
        </div>
      </div>
    </section>

    <section id="breakpoints" class="panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">{{ t('ds.breakpoints.kicker') }}</p>
          <h2>{{ t('ds.breakpoints.title') }}</h2>
        </div>
        <span class="chip">{{ t('ds.breakpoints.badge') }}</span>
      </div>
      <div class="breakpoint-grid">
        <article v-for="breakpoint in breakpointRules" :key="breakpoint.key" class="breakpoint-card">
          <div class="breakpoint-card-head">
            <strong>{{ t(breakpoint.titleKey) }}</strong>
            <code>{{ breakpoint.range }}</code>
          </div>
          <ul>
            <li v-for="rule in breakpoint.rules" :key="rule">{{ t(rule) }}</li>
          </ul>
        </article>
      </div>
    </section>

    <section id="sources" class="panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">{{ t('ds.sources.kicker') }}</p>
          <h2>{{ t('ds.sources.title') }}</h2>
        </div>
        <span class="chip">{{ t('ds.sources.badge') }}</span>
      </div>
      <div class="source-table" role="table" :aria-label="t('ds.sources.title')">
        <div class="source-row source-head" role="row">
          <span>{{ t('drawer.source') }}</span>
          <span>{{ t('drawer.status') }}</span>
          <span>{{ t('drawer.cadence') }}</span>
          <span>{{ t('ds.sources.detail') }}</span>
        </div>
        <div v-for="source in sourceRows" :key="source.key" class="source-row" role="row">
          <strong>{{ t(source.titleKey) }}</strong>
          <span class="chip compact">{{ t(`ds.source.status.${source.status}`) }}</span>
          <code>{{ source.cadence }}</code>
          <span>{{ t(source.detailKey) }}</span>
        </div>
      </div>
    </section>

    <section id="rules" class="panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">{{ t('ds.rules.kicker') }}</p>
          <h2>{{ t('ds.rules.title') }}</h2>
        </div>
        <a class="chip link-chip" href="/">{{ t('ds.rules.back') }}</a>
      </div>
      <ol class="rule-list">
        <li v-for="rule in implementationRules" :key="rule">{{ t(rule) }}</li>
      </ol>
    </section>
  </main>
</template>

<style scoped>
.minimum-design-system {
  height: 100%;
  min-height: 100%;
  overflow: auto;
  color: var(--fg);
  background:
    radial-gradient(circle at 18% 12%, color-mix(in oklch, var(--vehicle) 14%, transparent), transparent 30rem),
    radial-gradient(circle at 80% 4%, color-mix(in oklch, var(--selected) 10%, transparent), transparent 28rem),
    linear-gradient(180deg, #050811 0%, #08101a 52%, #050811 100%);
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, "Noto Sans TC", "PingFang TC", system-ui, sans-serif;
  letter-spacing: 0;
}

.minimum-design-system * {
  box-sizing: border-box;
}

.minimum-design-system h1,
.minimum-design-system h2,
.minimum-design-system h3,
.minimum-design-system p {
  margin: 0;
}

.contract-topbar,
.hero,
.panel {
  width: min(1240px, calc(100% - 32px));
  margin-inline: auto;
}

.contract-topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: grid;
  grid-template-columns: max-content 1fr max-content;
  align-items: center;
  gap: 18px;
  min-height: 58px;
  padding-inline: 0;
  border-bottom: 1px solid color-mix(in oklch, var(--border) 64%, transparent);
  background: color-mix(in oklch, var(--bg) 88%, black);
  backdrop-filter: blur(18px);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--fg);
  text-decoration: none;
}

.brand-mark {
  width: 28px;
  height: 28px;
  border: 1px solid color-mix(in oklch, var(--vehicle) 72%, transparent);
  border-radius: 6px;
  background:
    linear-gradient(90deg, transparent 48%, color-mix(in oklch, var(--vehicle) 58%, transparent) 49% 51%, transparent 52%),
    linear-gradient(0deg, transparent 48%, color-mix(in oklch, var(--vehicle) 58%, transparent) 49% 51%, transparent 52%),
    color-mix(in oklch, var(--surface) 78%, black);
}

.brand strong {
  display: block;
  color: color-mix(in oklch, var(--selected) 18%, var(--fg));
  font-size: 15px;
}

.brand small {
  display: block;
  color: var(--muted);
  font: 12px/1.1 "Berkeley Mono", "JetBrains Mono", ui-monospace, Menlo, monospace;
}

.contract-nav {
  display: flex;
  gap: 8px;
  justify-content: center;
  min-width: 0;
}

.contract-nav button,
.chip {
  min-height: 28px;
  display: inline-grid;
  place-items: center;
  padding: 0 10px;
  border: 1px solid color-mix(in oklch, var(--border) 60%, transparent);
  border-radius: 999px;
  background: color-mix(in oklch, var(--surface) 48%, transparent);
  color: color-mix(in oklch, var(--fg) 78%, var(--muted));
  font: 12px/1 "Berkeley Mono", "JetBrains Mono", ui-monospace, Menlo, monospace;
  text-decoration: none;
  white-space: nowrap;
}

.contract-nav button {
  cursor: pointer;
}

.locale-switch,
.segmented {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  border: 1px solid color-mix(in oklch, var(--border) 58%, transparent);
  border-radius: 8px;
  background: color-mix(in oklch, var(--surface) 42%, transparent);
}

.locale-btn,
.segmented button {
  height: 28px;
  min-width: 42px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  font: 650 12px/1 system-ui;
  cursor: pointer;
}

.locale-btn.active,
.segmented button.active {
  background: color-mix(in oklch, var(--vehicle) 20%, var(--surface));
  color: color-mix(in oklch, var(--vehicle) 20%, white);
}

.hero {
  display: grid;
  grid-template-columns: 1fr minmax(280px, 420px);
  gap: 32px;
  align-items: start;
  padding: 38px 0 22px;
}

.eyebrow {
  color: var(--muted);
  font: 700 12px/1.2 "Berkeley Mono", "JetBrains Mono", ui-monospace, Menlo, monospace;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  max-width: 900px;
  margin-top: 8px;
  font-size: clamp(36px, 5.4vw, 64px);
  line-height: 1;
}

h2 {
  font-size: 22px;
  line-height: 1.16;
}

h3 {
  font-size: 16px;
}

.lead {
  max-width: 820px;
  margin-top: 16px;
  color: color-mix(in oklch, var(--fg) 72%, var(--muted));
  font-size: 17px;
  line-height: 1.68;
}

.status-card,
.panel,
.card,
.token-card,
.grammar-row {
  border: 1px solid color-mix(in oklch, var(--border) 62%, transparent);
  background: color-mix(in oklch, var(--surface) 58%, transparent);
}

.status-card {
  border-radius: 10px;
  padding: 16px;
}

.status-card strong,
.status-card span {
  display: block;
}

.status-card span {
  margin-top: 6px;
  color: var(--muted);
  font: 12px/1.5 "Berkeley Mono", "JetBrains Mono", ui-monospace, Menlo, monospace;
}

.panel {
  margin-top: 16px;
  border-radius: 10px;
  overflow: hidden;
  scroll-margin-top: 76px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.36);
}

.panel-head,
.preview-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 16px;
  padding: 18px;
  border-bottom: 1px solid color-mix(in oklch, var(--border) 54%, transparent);
  background: color-mix(in oklch, var(--surface) 52%, black);
}

.section-grid,
.token-grid {
  display: grid;
  gap: 12px;
  padding: 16px;
}

.color-system {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 16px 16px 0;
}

.color-family {
  display: grid;
  grid-template-columns: minmax(150px, 0.62fr) minmax(0, 1fr);
  gap: 14px;
  align-items: stretch;
  border: 1px solid color-mix(in oklch, var(--border) 62%, transparent);
  border-radius: 8px;
  background: color-mix(in oklch, var(--surface) 46%, transparent);
  padding: 14px;
}

.color-family-copy span {
  display: block;
  margin-top: 8px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}

.weight-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.weight-cell {
  min-width: 0;
  border: 1px solid color-mix(in oklch, var(--border) 46%, transparent);
  border-radius: 7px;
  background: color-mix(in oklch, var(--bg) 48%, transparent);
  padding: 8px;
}

.weight-swatch {
  display: block;
  width: 100%;
  height: 34px;
  border: 1px solid color-mix(in oklch, var(--fg) 16%, transparent);
  border-radius: 6px;
}

.weight-cell strong {
  display: block;
  margin-top: 7px;
  font: 700 13px/1 "Berkeley Mono", "JetBrains Mono", ui-monospace, Menlo, monospace;
}

.weight-cell small {
  display: block;
  margin-top: 5px;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.3;
}

.breakpoint-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  padding: 16px;
}

.breakpoint-card {
  border: 1px solid color-mix(in oklch, var(--border) 62%, transparent);
  border-radius: 8px;
  background: color-mix(in oklch, var(--surface) 46%, transparent);
  padding: 14px;
}

.breakpoint-card-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding-bottom: 12px;
  border-bottom: 1px solid color-mix(in oklch, var(--border) 46%, transparent);
}

.breakpoint-card-head strong {
  font-size: 16px;
}

.breakpoint-card-head code {
  color: color-mix(in oklch, var(--vehicle) 40%, white);
  font-family: "Berkeley Mono", "JetBrains Mono", ui-monospace, Menlo, monospace;
  white-space: nowrap;
}

.breakpoint-card ul {
  display: grid;
  gap: 10px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}

.breakpoint-card li {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.48;
}

.thirds {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.card,
.token-card {
  border-radius: 8px;
  padding: 15px;
}

.card p,
.token-card p,
.grammar-row p {
  margin-top: 8px;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.56;
}

.token-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.token-card {
  display: grid;
  grid-template-columns: 42px 1fr;
  gap: 6px 12px;
  align-items: center;
}

.token-card code,
.source-row code {
  color: color-mix(in oklch, var(--fg) 74%, var(--muted));
  font-family: "Berkeley Mono", "JetBrains Mono", ui-monospace, Menlo, monospace;
}

.swatch {
  grid-row: span 3;
  width: 42px;
  height: 42px;
  border: 1px solid color-mix(in oklch, var(--fg) 20%, transparent);
  border-radius: 9px;
}

.split {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(320px, 0.75fr);
}

.preview-stage {
  min-width: 0;
}

.preview-toolbar {
  align-items: center;
}

.preview-toolbar > span {
  color: var(--fg);
  font-weight: 700;
}

.mock-map {
  position: relative;
  height: 430px;
  overflow: hidden;
  background:
    radial-gradient(circle at 74% 24%, rgba(25, 81, 91, 0.28), transparent 13rem),
    linear-gradient(180deg, #07101a, #030811);
}

.road,
.building,
.mock-vehicle,
.mock-poi {
  position: absolute;
}

.road {
  border-radius: 999px;
  background: color-mix(in oklch, #c8d8f1 74%, transparent);
  box-shadow: 0 0 12px rgba(194, 215, 246, 0.2);
}

.highway {
  left: -10%;
  top: 48%;
  width: 120%;
  height: 10px;
  transform: rotate(-13deg);
}

.arterial.one {
  left: 22%;
  top: -8%;
  width: 10px;
  height: 116%;
  transform: rotate(16deg);
}

.arterial.two {
  left: 4%;
  top: 66%;
  width: 104%;
  height: 7px;
  transform: rotate(11deg);
  opacity: 0.7;
}

.local {
  height: 4px;
  opacity: 0.48;
}

.local.a {
  left: 14%;
  top: 35%;
  width: 42%;
  transform: rotate(4deg);
}

.local.b {
  left: 52%;
  top: 28%;
  width: 36%;
  transform: rotate(31deg);
}

.building {
  width: 118px;
  height: 58px;
  background: color-mix(in oklch, var(--poi) 18%, var(--surface));
  opacity: 0.42;
}

.b1 {
  left: 9%;
  top: 14%;
}

.b2 {
  right: 13%;
  top: 58%;
  transform: rotate(10deg);
}

.b3 {
  left: 52%;
  top: 12%;
  width: 150px;
}

.vehicle-dot {
  width: 13px;
  height: 13px;
  border: 1px solid color-mix(in oklch, var(--vehicle) 44%, white);
  border-radius: 999px;
  background: color-mix(in oklch, var(--vehicle) 80%, transparent);
  box-shadow: 0 0 14px color-mix(in oklch, var(--vehicle) 46%, transparent);
}

.mock-vehicle {
  transform: translate(-50%, -50%);
}

.vehicle-dot.stale {
  opacity: 0.32;
}

.vehicle-dot.selected::before {
  position: absolute;
  inset: -13px;
  content: "";
  border: 3px solid var(--selected);
  border-radius: 999px;
  box-shadow: 0 0 18px color-mix(in oklch, var(--selected) 45%, transparent);
}

.selected-dot {
  position: relative;
  width: 15px;
  height: 15px;
  border-radius: 999px;
  background: var(--selected);
  box-shadow: 0 0 16px color-mix(in oklch, var(--selected) 54%, transparent);
}

.selected-dot::before {
  position: absolute;
  inset: -12px;
  content: "";
  border: 3px solid var(--selected);
  border-radius: inherit;
}

.poi-diamond {
  width: 13px;
  height: 13px;
  transform: rotate(45deg);
  background: var(--poi);
  border: 1px solid color-mix(in oklch, var(--poi) 50%, white);
}

.poi-diamond.general {
  background: var(--warn);
  border-color: color-mix(in oklch, var(--warn) 50%, white);
}

.mock-poi.one {
  left: 70%;
  top: 28%;
}

.mock-poi.two {
  left: 28%;
  top: 78%;
}

.empty-state {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  color: var(--muted);
}

.grammar-list {
  padding: 18px;
  border-left: 1px solid color-mix(in oklch, var(--border) 54%, transparent);
}

.grammar-list h2 {
  margin-top: 6px;
  margin-bottom: 16px;
}

.grammar-row {
  display: grid;
  grid-template-columns: 38px 1fr;
  gap: 12px;
  align-items: center;
  padding: 14px;
  border-radius: 8px;
  margin-top: 10px;
}

.freshness-policy {
  margin-top: 14px;
  border-top: 1px solid color-mix(in oklch, var(--border) 48%, transparent);
  padding-top: 14px;
}

.freshness-policy h3 {
  margin-top: 6px;
}

.freshness-policy p:not(.eyebrow),
.freshness-policy li {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}

.freshness-policy p:not(.eyebrow) {
  margin-top: 8px;
}

.freshness-policy ul {
  display: grid;
  gap: 8px;
  margin: 12px 0 0;
  padding-left: 18px;
}

.source-table {
  padding: 16px;
}

.source-row {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) 120px 110px minmax(260px, 1.8fr);
  gap: 14px;
  align-items: center;
  min-height: 48px;
  border-top: 1px solid color-mix(in oklch, var(--border) 48%, transparent);
  color: color-mix(in oklch, var(--fg) 82%, var(--muted));
}

.source-row:first-child {
  border-top: 0;
}

.source-head {
  min-height: 32px;
  color: var(--muted);
  font: 700 12px/1.2 "Berkeley Mono", "JetBrains Mono", ui-monospace, Menlo, monospace;
  text-transform: uppercase;
}

.compact {
  width: max-content;
  min-height: 24px;
}

.rule-list {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 18px 18px 18px 42px;
  color: color-mix(in oklch, var(--fg) 82%, var(--muted));
  line-height: 1.62;
}

.link-chip {
  color: color-mix(in oklch, var(--vehicle) 36%, white);
}

@media (max-width: 920px) {
  .contract-topbar,
  .hero,
  .split,
  .source-row {
    grid-template-columns: 1fr;
  }

  .contract-topbar {
    position: sticky;
    padding-block: 12px;
  }

  .contract-nav {
    justify-content: start;
    overflow-x: auto;
  }

  .thirds,
  .color-system,
  .breakpoint-grid,
  .token-grid {
    grid-template-columns: 1fr;
  }

  .color-family {
    grid-template-columns: 1fr;
  }

  .grammar-list {
    border-left: 0;
    border-top: 1px solid color-mix(in oklch, var(--border) 54%, transparent);
  }
}

@media (min-width: 921px) and (max-width: 1180px) {
  .breakpoint-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
