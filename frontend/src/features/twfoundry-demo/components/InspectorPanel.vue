<script setup lang="ts">
import type { DemoMetrics, MapFeature, Scenario } from "../data";
import MetricRow from "./MetricRow.vue";

defineProps<{
  selectedFeature: MapFeature | null;
  scenario: Scenario;
  metrics: DemoMetrics;
  visibleLayerCount: number;
  layerCount: number;
}>();
</script>

<template>
  <aside class="inspector-panel">
    <header>
      <span>Inspector</span>
      <h2>
        {{ selectedFeature?.kind === "train" ? `${selectedFeature.label} · Tamsui-Xinyi` : selectedFeature ? selectedFeature.label : "Cursor readout" }}
      </h2>
    </header>

    <section v-if="selectedFeature" class="panel-section">
      <div v-if="selectedFeature.kind === 'train'" class="train-card">
        <div class="line-title">
          <span />
          <strong>Tamsui-Xinyi</strong>
        </div>
        <MetricRow label="Train ID" :value="selectedFeature.label" />
        <MetricRow label="Direction" value="→ Tamsui" />
        <MetricRow label="Carriages" value="6 cars" />
        <MetricRow label="Headway" :value="`${metrics.headwaySec}s`" />
        <MetricRow label="Next stop" value="Yuanshan" accent />
        <MetricRow label="ETA" :value="`${metrics.etaMinutes.toFixed(1)} min`" accent />
        <MetricRow label="Platform load" :value="`${metrics.platformLoadPct}%`" accent />
      </div>

      <template v-else>
        <div class="section-label">Selected object</div>
        <p>{{ selectedFeature.detail }}</p>
        <MetricRow label="Object type" :value="selectedFeature.kind" />
        <MetricRow label="Source" :value="selectedFeature.source" />
        <MetricRow label="Scenario" :value="scenario.label" />
      </template>

      <section v-if="selectedFeature.kind === 'train'" class="route-section">
        <div class="section-label">Route · Upcoming</div>
        <div class="route-list">
          <div
            v-for="stop in metrics.routeEtas"
            :key="stop.station"
            class="route-stop"
          >
            <i />
            <span>{{ stop.station }}</span>
            <strong>{{ stop.etaMinutes.toFixed(1) }}m</strong>
          </div>
        </div>
      </section>

      <button type="button">Open in ontology →</button>
    </section>

    <section v-else class="panel-section">
      <div class="section-label">Under cursor</div>
      <p>Move through the map to inspect rainfall, transit assets, incidents, and nearest sensors.</p>
    </section>

    <section class="panel-section">
      <div class="section-label">System status</div>
      <MetricRow label="Active overlays" :value="`${visibleLayerCount}/${layerCount}`" />
      <MetricRow label="Active trains" :value="metrics.activeTrains" />
      <MetricRow label="Open incidents" :value="metrics.openIncidents" accent />
      <MetricRow label="Rainfall" :value="`${metrics.rainfallMmHr.toFixed(1)} mm/hr`" accent />
      <MetricRow label="Freeway mean" :value="`${metrics.freewayKph} kph`" />
      <MetricRow label="AQMS stations" :value="metrics.aqmsStations" />
      <MetricRow label="PM2.5" :value="metrics.pm25" />
      <MetricRow label="Active events" :value="metrics.activeEventCount" />
      <MetricRow label="Update cadence" :value="`${metrics.updateCadenceSec}s live`" />
    </section>

    <section class="panel-section legend">
      <div class="section-label">Legend</div>
      <span><i class="red" /> Metro</span>
      <span><i class="blue" /> Rainfall</span>
      <span><i class="green" /> Highway</span>
      <span><i class="orange" /> Sensor</span>
    </section>
  </aside>
</template>

<style scoped>
.inspector-panel {
  width: var(--demo-right-sidebar-width, clamp(390px, 26vw, 520px));
  min-width: 390px;
  border-left: 1px solid var(--twf-color-border);
  background: var(--twf-color-surface-raised);
  overflow-y: auto;
}

header,
.panel-section {
  border-bottom: 1px solid var(--twf-color-border-soft);
  padding: 20px clamp(20px, 1.6vw, 28px);
}

header span,
.section-label {
  color: var(--twf-color-text-faint);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: clamp(0.68rem, 0.68vw, 0.8rem);
  letter-spacing: 0.24em;
  text-transform: uppercase;
}

h2 {
  margin: 4px 0 0;
  font-size: clamp(1.35rem, 1.35vw, 1.65rem);
  font-family: Georgia, "Times New Roman", serif;
  font-weight: 700;
}

p {
  margin: 8px 0 12px;
  color: var(--twf-color-text-muted);
  font-size: clamp(0.86rem, 0.85vw, 1rem);
  line-height: 1.45;
}

button {
  width: 100%;
  margin-top: 12px;
  border: 1px solid var(--twf-color-text);
  border-radius: var(--twf-radius-sm);
  background: var(--twf-color-surface);
  padding: 12px 10px;
  color: var(--twf-color-text);
  cursor: pointer;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.86rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
}

.train-card {
  border: 1px solid var(--twf-color-border);
  border-radius: 3px;
  background: var(--twf-color-surface);
  padding: 12px;
}

.line-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.line-title span {
  width: 16px;
  height: 16px;
  border: 3px solid var(--twf-color-route-red);
  border-radius: 999px;
  background: var(--twf-color-surface-raised);
  box-shadow: 0 0 0 1px var(--twf-color-text-faint);
}

.line-title strong {
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(1.1rem, 1.05vw, 1.28rem);
}

.route-section {
  margin-top: 16px;
}

.route-list {
  position: relative;
  margin-top: 10px;
  padding-left: 18px;
}

.route-list::before {
  position: absolute;
  top: 11px;
  bottom: 11px;
  left: 6px;
  width: 2px;
  background: rgba(217, 45, 58, 0.42);
  content: "";
}

.route-stop {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  border-bottom: 1px dotted var(--twf-color-border);
  padding: 8px 0;
}

.route-stop i {
  position: absolute;
  top: 10px;
  left: -18px;
  width: 14px;
  height: 14px;
  border: 3px solid var(--twf-color-route-red);
  border-radius: 999px;
  background: var(--twf-color-surface-raised);
}

.route-stop span {
  color: var(--twf-color-text);
  font-weight: 600;
}

.route-stop strong {
  color: var(--twf-color-text-muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.route-stop:first-child strong {
  color: var(--twf-color-accent-warm);
}

.legend {
  display: grid;
  gap: 8px;
}

.legend span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--twf-color-text-muted);
  font-size: 0.8rem;
}

.legend i {
  width: 20px;
  height: 4px;
  border-radius: 999px;
}

.red {
  background: var(--twf-color-route-red);
}

.blue {
  background: var(--twf-color-route-blue);
}

.green {
  background: var(--twf-color-route-green);
}

.orange {
  background: var(--twf-color-status-warning);
}

@media (max-width: 1080px) {
  .inspector-panel {
    display: none;
  }
}
</style>
