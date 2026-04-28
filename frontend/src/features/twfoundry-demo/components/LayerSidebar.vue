<script setup lang="ts">
import type { Layer, Scenario, ScenarioId } from "../data";

defineProps<{
  layers: Layer[];
  scenarios: Scenario[];
  activeLayerId: string | null;
  scenarioId: ScenarioId;
  layerReadouts: Record<string, string>;
}>();

const emit = defineEmits<{
  toggleLayer: [id: string];
  selectLayer: [id: string];
  showAllLayers: [];
  selectScenario: [id: ScenarioId];
}>();
</script>

<template>
  <aside class="layer-sidebar">
    <section class="sidebar-head">
      <h1>TWFoundry</h1>
      <span>v0.1 alpha</span>
      <p>Operational view for Taiwan mobility, weather, and civic signals.</p>
    </section>

    <section class="control-group">
      <div class="group-label">Scenario</div>
      <button
        v-for="scenario in scenarios"
        :key="scenario.id"
        type="button"
        class="scenario-button"
        :class="{ active: scenarioId === scenario.id }"
        @click="emit('selectScenario', scenario.id)"
      >
        <span>{{ scenario.label }}</span>
        <small>{{ scenario.note }}</small>
      </button>
    </section>

    <section class="control-group overlays">
      <div class="group-row">
        <div class="group-label">Overlays {{ layers.filter((layer) => layer.visible).length }}/{{ layers.length }}</div>
        <button type="button" @click="emit('showAllLayers')">all on</button>
      </div>

      <button
        v-for="layer in layers"
        :key="layer.id"
        type="button"
        class="layer-row"
        :class="{ active: activeLayerId === layer.id }"
        :data-tone="layer.tone"
        @click="emit('selectLayer', layer.id)"
      >
        <span
          class="check"
          :class="{ checked: layer.visible }"
          role="checkbox"
          :aria-checked="layer.visible"
          tabindex="-1"
          @click.stop="emit('toggleLayer', layer.id)"
        />
        <span class="swatch" aria-hidden="true" />
        <span class="layer-copy">
          <strong>{{ layer.label }}</strong>
          <small>{{ layer.source }}</small>
        </span>
        <span v-if="layer.live" class="live">{{ layerReadouts[layer.id] ?? "live" }}</span>
      </button>
    </section>

    <section class="sources">
      <div class="group-label">Sources</div>
      <p>MOTC TDX, CWA, EPA AQMS. Static demo data, structured for frontend iteration.</p>
    </section>
  </aside>
</template>

<style scoped>
.layer-sidebar {
  display: flex;
  flex-direction: column;
  width: var(--demo-left-sidebar-width, clamp(330px, 22vw, 430px));
  min-width: 330px;
  border-right: 1px solid var(--twf-color-border);
  background: var(--twf-color-surface-raised);
  overflow: hidden;
}

.sidebar-head,
.control-group,
.sources {
  padding: 22px clamp(22px, 1.9vw, 34px);
  border-bottom: 1px solid var(--twf-color-border-soft);
}

.sidebar-head h1 {
  display: inline;
  margin: 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(1.45rem, 1.5vw, 1.8rem);
}

.sidebar-head span {
  margin-left: 8px;
  color: var(--twf-color-text-faint);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.82rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.sidebar-head p,
.sources p {
  margin: 5px 0 0;
  color: var(--twf-color-text-muted);
  font-size: clamp(0.86rem, 0.85vw, 1rem);
  line-height: 1.45;
}

.group-label {
  margin-bottom: 8px;
  color: var(--twf-color-text-faint);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: clamp(0.72rem, 0.72vw, 0.86rem);
  letter-spacing: 0.28em;
  text-transform: uppercase;
}

.group-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.group-row button {
  border: 0;
  background: transparent;
  color: var(--twf-color-text-faint);
  cursor: pointer;
  font-size: 0.72rem;
}

.scenario-button,
.layer-row {
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--twf-color-text);
  cursor: pointer;
  text-align: left;
}

.scenario-button {
  display: grid;
  gap: 2px;
  border-radius: var(--twf-radius-sm);
  padding: 8px 14px;
}

.scenario-button span {
  font-size: clamp(0.92rem, 0.9vw, 1.06rem);
}

.scenario-button.active {
  background: var(--twf-color-accent-warm-soft);
}

.scenario-button small,
.layer-copy small {
  color: var(--twf-color-text-faint);
  font-size: clamp(0.72rem, 0.72vw, 0.82rem);
}

.overlays {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.layer-row {
  display: grid;
  grid-template-columns: 20px 9px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  border-left: 2px solid transparent;
  padding: 11px 10px 11px 8px;
}

.layer-row.active {
  border-left-color: var(--twf-color-accent-warm);
  background: rgba(201, 123, 99, 0.1);
}

.check {
  width: 15px;
  height: 15px;
  border: 1px solid var(--twf-color-text-faint);
  border-radius: 3px;
  background: var(--twf-color-surface);
}

.check.checked {
  background: var(--twf-color-text);
  box-shadow: inset 0 0 0 3px var(--twf-color-surface);
}

.swatch {
  width: 7px;
  height: 7px;
  border-radius: 999px;
}

.layer-row[data-tone="red"] .swatch {
  background: var(--twf-color-route-red);
}

.layer-row[data-tone="blue"] .swatch {
  background: var(--twf-color-route-blue);
}

.layer-row[data-tone="green"] .swatch {
  background: var(--twf-color-route-green);
}

.layer-row[data-tone="orange"] .swatch {
  background: var(--twf-color-status-warning);
}

.layer-row[data-tone="brown"] .swatch {
  background: #8c6322;
}

.layer-copy {
  min-width: 0;
}

.layer-copy strong,
.layer-copy small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layer-copy strong {
  font-size: clamp(0.9rem, 0.9vw, 1.02rem);
}

.live {
  color: var(--twf-color-accent-warm);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.75rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

@media (max-width: 760px) {
  .layer-sidebar {
    width: 100%;
    max-height: 360px;
    border-right: 0;
    border-bottom: 1px solid var(--twf-color-border);
  }
}
</style>
