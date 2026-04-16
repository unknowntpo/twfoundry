<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed } from "vue";
import { useMrtDashboardStore } from "@/app/stores/mrt-dashboard";
import { mrtLines, mrtStations } from "../data/mrt-fixtures";
import LayerControl from "./LayerControl.vue";
import MrtMap from "./MrtMap.vue";
import StationPanel from "./StationPanel.vue";

const store = useMrtDashboardStore();
const { selectedStation, selectedLiveBoards, visibleLineIds } = storeToRefs(store);

const visibleLines = computed(() =>
  mrtLines.filter((line) => visibleLineIds.value.includes(line.id)),
);

const activeTrainCount = computed(() => mrtLines.length * 12 + mrtStations.length);
</script>

<template>
  <main class="dashboard-shell">
    <header class="topbar">
      <div class="brand">
        <span class="logo-mark" aria-hidden="true">
          <svg viewBox="0 0 14 14" fill="none">
            <path
              d="M2 12L7 2l5 10"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M3.8 8.5h6.4"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linecap="round"
            />
          </svg>
        </span>
        <strong>TWFoundry</strong>
      </div>
      <span class="topbar-separator" aria-hidden="true" />
      <h1>MRT LiveBoard Monitor</h1>

      <div class="line-stats" aria-label="MRT service summary">
        <span v-for="line in mrtLines" :key="line.id" class="line-stat">
          <span class="stat-dot" :style="{ '--line-color': line.color }" aria-hidden="true" />
          {{ line.stationIds.length * 6 }} trains
        </span>
        <span>{{ activeTrainCount }} active · Mock</span>
      </div>

      <div class="topbar-actions" aria-label="Map view actions">
        <button type="button">Capture</button>
        <button type="button" class="primary">3D Altitude</button>
        <button type="button">Info</button>
      </div>
    </header>

    <div class="workspace">
      <nav class="icon-rail" aria-label="Dashboard sections">
        <button type="button" class="rail-button active" aria-label="MRT dashboard">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M1.5 7L8 1.5 14.5 7v8h-13V7z" />
          </svg>
        </button>
        <button type="button" class="rail-button" aria-label="Stations">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="8" cy="6" r="3.5" />
            <path d="M8 9.5V14" />
          </svg>
        </button>
        <button type="button" class="rail-button" aria-label="Tables">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="2" y="3" width="12" height="10" rx="1.5" />
            <path d="M2 7h12M6 3v10" />
          </svg>
        </button>
      </nav>

      <aside class="layer-sidebar" aria-label="Map layers">
        <div class="sidebar-head">
          <h2>Layers</h2>
          <span>All Off</span>
        </div>

        <div class="layer-group">
          <p class="group-label">Moving</p>
          <article class="layer-card active">
            <span class="layer-icon">M</span>
            <strong>捷運 MRT</strong>
            <span class="layer-count">{{ activeTrainCount }}</span>
          </article>
          <div class="layer-settings">
            <div><span>Train</span><strong>ON</strong></div>
            <div><span>Track</span><strong>3D</strong></div>
            <div><span>Rail Z</span><strong>+58m</strong></div>
            <div><span>Glow</span><strong>0.7</strong></div>
          </div>
        </div>

        <div class="layer-group">
          <p class="group-label">Route</p>
          <LayerControl :lines="mrtLines" />
        </div>
      </aside>

      <section class="map-region" aria-label="MRT map dashboard">
        <MrtMap :lines="visibleLines" :stations="mrtStations" />
      </section>

      <StationPanel
        class="station-panel"
        :station="selectedStation"
        :live-boards="selectedLiveBoards"
      />
    </div>

    <footer class="timeline" aria-label="Playback timeline">
      <div class="timeline-buttons">
        <button type="button" aria-label="Previous">‹</button>
        <button type="button" aria-label="Pause">Ⅱ</button>
        <button type="button" aria-label="Next">›</button>
      </div>
      <span>4/16 (Thu)</span>
      <button type="button" class="now-button">Now</button>
      <span>1d</span>
      <span>60x</span>
      <strong>10:43</strong>
      <div class="timeline-track" aria-hidden="true">
        <span />
      </div>
      <small>Mock map provider · MRT fixture feed</small>
    </footer>
  </main>
</template>

<style scoped>
.dashboard-shell {
  --bg: #f2efe8;
  --surface: #fafaf7;
  --white: #ffffff;
  --border: #ddd9ce;
  --border-soft: #eceae3;
  --text: #26241e;
  --text-muted: #6b6557;
  --text-faint: #9b9485;

  display: flex;
  flex-direction: column;
  min-height: 100vh;
  overflow: hidden;
  background: var(--bg);
  color: var(--text);
}

.topbar {
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  border-bottom: 1px solid var(--border);
  padding: 0 16px;
  background: var(--white);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.logo-mark {
  display: grid;
  width: 26px;
  height: 26px;
  place-items: center;
  border-radius: 7px;
  background: var(--text);
  color: var(--white);
}

.logo-mark svg {
  width: 14px;
  height: 14px;
}

.topbar-separator {
  width: 1px;
  height: 18px;
  background: var(--border);
}

h1 {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.82rem;
  font-weight: 600;
}

.line-stats {
  display: flex;
  align-items: center;
  gap: 0;
  margin-left: 14px;
  color: var(--text-faint);
  font-size: 0.72rem;
}

.line-stat,
.line-stats > span:last-child {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border-left: 1px solid var(--border-soft);
  padding: 0 10px;
}

.stat-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--line-color);
}

.topbar-actions {
  display: flex;
  gap: 7px;
  margin-left: auto;
}

.topbar-actions button,
.timeline button {
  min-height: 30px;
  border: 1px solid var(--border);
  border-radius: 7px;
  padding: 0 12px;
  background: var(--surface);
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 600;
}

.topbar-actions .primary,
.timeline .now-button {
  border-color: var(--text);
  background: var(--text);
  color: var(--white);
}

.workspace {
  display: grid;
  flex: 1;
  min-height: 0;
  grid-template-columns: 44px 228px minmax(0, 1fr) minmax(320px, 360px);
}

.icon-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  border-right: 1px solid var(--border);
  padding: 10px 0;
  background: var(--white);
}

.rail-button {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text-faint);
  cursor: pointer;
}

.rail-button.active,
.rail-button:hover {
  background: var(--bg);
  color: var(--text);
}

.rail-button svg {
  width: 16px;
  height: 16px;
}

.layer-sidebar {
  min-width: 0;
  border-right: 1px solid var(--border);
  background: var(--surface);
}

.sidebar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 52px;
  border-bottom: 1px solid var(--border);
  padding: 0 14px;
}

.sidebar-head h2 {
  margin: 0;
  font-size: 0.9rem;
}

.sidebar-head span,
.group-label {
  color: var(--text-faint);
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
}

.layer-group {
  display: grid;
  gap: 8px;
  padding: 14px;
}

.group-label {
  margin: 0;
}

.layer-card {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  border-radius: 8px;
  padding: 7px 8px;
  color: var(--text-muted);
}

.layer-card.active {
  background: var(--bg);
  color: var(--text);
}

.layer-icon {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border: 1px solid var(--border);
  border-radius: 7px;
  font-size: 0.72rem;
  font-weight: 800;
}

.layer-count {
  color: #d92d3a;
  font-size: 0.72rem;
  font-weight: 800;
}

.layer-settings {
  display: grid;
  gap: 8px;
  border-left: 1px solid var(--border);
  margin-left: 18px;
  padding-left: 12px;
}

.layer-settings div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--text-muted);
  font-size: 0.72rem;
}

.layer-settings strong {
  color: var(--text);
  font-size: 0.72rem;
}

.map-region {
  min-width: 0;
  background: #dedad0;
}

.station-panel {
  min-width: 0;
}

.timeline {
  display: grid;
  grid-template-columns: auto auto auto auto auto auto minmax(180px, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-height: 52px;
  border-top: 1px solid var(--border);
  padding: 0 14px;
  background: var(--white);
  color: var(--text-muted);
  font-size: 0.75rem;
}

.timeline-buttons {
  display: flex;
  gap: 4px;
}

.timeline-buttons button {
  width: 28px;
  padding: 0;
}

.timeline-track {
  height: 4px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--border-soft);
}

.timeline-track span {
  display: block;
  width: 45%;
  height: 100%;
  border-radius: inherit;
  background: #2f6fd6;
}

.timeline small {
  color: var(--text-faint);
}

@media (max-width: 840px) {
  .workspace {
    grid-template-columns: 1fr;
  }

  .topbar {
    flex-wrap: wrap;
    padding: 10px 12px;
  }

  .line-stats,
  .topbar-actions,
  .icon-rail,
  .layer-sidebar,
  .timeline {
    display: none;
  }
}
</style>
