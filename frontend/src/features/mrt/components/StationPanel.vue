<script setup lang="ts">
import type { LiveBoardRow, MrtStation } from "../types";

defineProps<{
  collapsed?: boolean;
  error?: string;
  isLoading?: boolean;
  station: MrtStation | undefined;
  liveBoards: LiveBoardRow[];
}>();

defineEmits<{
  "toggle-collapse": [];
}>();

function formatLineName(lineId: string): string {
  return `${lineId.charAt(0).toUpperCase()}${lineId.slice(1)} Line`;
}
</script>

<template>
  <aside class="panel" :data-collapsed="collapsed" aria-label="Station LiveBoard">
    <button
      v-if="collapsed"
      type="button"
      class="panel-rail-toggle"
      data-testid="expand-station-panel"
      aria-label="Expand Station Detail panel"
      aria-controls="station-panel-content"
      :aria-expanded="false"
      @click="$emit('toggle-collapse')"
    >
      <span aria-hidden="true">‹</span>
      <strong>Station Detail</strong>
    </button>

    <template v-else>
      <div id="station-panel-content">
        <div class="panel-head">
          <p class="eyebrow">Station Detail</p>
          <button
            type="button"
            class="collapse-button"
            data-testid="collapse-station-panel"
            aria-label="Collapse Station Detail panel"
            aria-controls="station-panel-content"
            :aria-expanded="true"
            @click="$emit('toggle-collapse')"
          >
            ›
          </button>
        </div>

    <template v-if="station">
      <h2>{{ station.name }}</h2>
      <div class="line-badges" aria-label="Station lines">
        <span
          v-for="lineId in station.lineIds"
          :key="lineId"
          class="line-badge"
          :data-line="lineId"
        >
          {{ formatLineName(lineId) }}
        </span>
      </div>
      <p class="station-meta">{{ station.id }} · LiveBoard active · mock data</p>

      <p class="section-heading">Upcoming Arrivals</p>
      <p v-if="isLoading" class="notice">Loading LiveBoard rows...</p>
      <p v-if="error" class="notice error">{{ error }}</p>

      <div class="liveboard-list" data-testid="liveboard-list">
        <article v-for="row in liveBoards" :key="row.id" class="liveboard-row">
          <span
            class="row-line"
            :data-line="row.lineId"
            aria-hidden="true"
          />
          <div>
            <h3>{{ row.destination }}</h3>
            <p class="direction">{{ formatLineName(row.lineId) }} · {{ row.direction }}</p>
          </div>
          <div class="arrival">
            <strong>{{ row.arrivalMinutes }}</strong>
            <span>min</span>
            <em class="status" :data-status="row.status">{{ row.status }}</em>
          </div>
        </article>
      </div>

      <p v-if="liveBoards.length === 0" class="empty">No arrivals in the mock feed.</p>
      <footer class="panel-footer">
        <span>Updated 30s ago</span>
        <button type="button">Refresh</button>
      </footer>
    </template>
    <template v-else>
      <h2>Select a station</h2>
      <p class="empty">
        Pick a station marker on the map to inspect mock LiveBoard arrivals.
      </p>
    </template>
      </div>
    </template>
  </aside>
</template>

<style scoped>
.panel {
  min-height: 100%;
  overflow: auto;
  border-left: 1px solid #ddd9ce;
  background: #fafaf7;
}

.panel[data-collapsed="true"] {
  overflow: hidden;
  background: #ffffff;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #eceae3;
  padding: 0 12px 0 18px;
}

.eyebrow {
  margin: 0;
  padding: 16px 0 6px;
  color: #9b9485;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.collapse-button,
.panel-rail-toggle {
  border: 1px solid #ddd9ce;
  border-radius: 7px;
  background: #fafaf7;
  color: #6b6557;
  cursor: pointer;
  font-weight: 800;
}

.collapse-button {
  display: grid;
  width: 26px;
  height: 26px;
  place-items: center;
  padding: 0;
}

.collapse-button:hover,
.panel-rail-toggle:hover {
  border-color: #6b6557;
  color: #26241e;
}

.panel-rail-toggle {
  display: grid;
  width: 100%;
  min-height: 100%;
  grid-template-rows: auto 1fr;
  justify-items: center;
  gap: 10px;
  border: 0;
  border-radius: 0;
  padding: 14px 0;
  background: transparent;
}

.panel-rail-toggle span {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 1px solid #ddd9ce;
  border-radius: 7px;
  background: #fafaf7;
  font-size: 1rem;
}

.panel-rail-toggle strong {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  color: #6b6557;
  font-size: 0.72rem;
  letter-spacing: 0;
  text-transform: uppercase;
}

h2 {
  margin: 0;
  padding: 10px 18px 0;
  color: #26241e;
  font-size: 1.45rem;
  line-height: 1.12;
}

.line-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 12px 18px 0;
}

.line-badge {
  border: 1px solid currentColor;
  border-radius: 7px;
  padding: 4px 8px;
  background: #ffffff;
  font-size: 0.72rem;
  font-weight: 800;
}

.line-badge[data-line="red"] {
  color: #d92d3a;
  background: #fbeaea;
}

.line-badge[data-line="blue"] {
  color: #2f6fd6;
  background: #eaf0fb;
}

.line-badge[data-line="green"] {
  color: #2f9e62;
  background: #eaf5ee;
}

.station-meta,
.empty {
  margin: 0;
  padding: 10px 18px 0;
  color: #6b6557;
  font-size: 0.8rem;
  line-height: 1.55;
}

.section-heading {
  margin: 24px 0 0;
  border-top: 1px solid #eceae3;
  border-bottom: 1px solid #eceae3;
  padding: 10px 18px;
  color: #9b9485;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

.notice {
  margin: 0;
  padding: 10px 18px 0;
  color: #6b6557;
  font-size: 0.78rem;
  line-height: 1.45;
}

.notice.error {
  color: #d92d3a;
}

.liveboard-list {
  display: grid;
  gap: 8px;
  padding: 12px 12px 0;
}

.liveboard-row {
  display: grid;
  grid-template-columns: 4px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  border: 1px solid #eceae3;
  border-radius: 8px;
  padding: 12px;
  background: #ffffff;
}

.row-line {
  width: 4px;
  height: 42px;
  border-radius: 999px;
  background: #d92d3a;
}

.row-line[data-line="blue"] {
  background: #2f6fd6;
}

.row-line[data-line="green"] {
  background: #2f9e62;
}

.direction {
  margin: 4px 0 0;
  color: #6b6557;
  font-size: 0.74rem;
}

h3 {
  margin: 0;
  color: #26241e;
  font-size: 0.92rem;
  line-height: 1.25;
}

.arrival {
  display: grid;
  min-width: 58px;
  justify-items: end;
  color: #26241e;
}

.arrival strong {
  font-size: 1.45rem;
  line-height: 1;
}

.arrival span {
  color: #9b9485;
  font-size: 0.64rem;
  font-weight: 700;
  text-transform: uppercase;
}

.status {
  margin-top: 5px;
  border-radius: 999px;
  padding: 3px 7px;
  background: #eaf5ee;
  color: #2f9e62;
  font-size: 0.62rem;
  font-style: normal;
  font-weight: 700;
  text-transform: uppercase;
}

.status[data-status="delayed"] {
  background: #fbeaea;
  color: #d92d3a;
}

.status[data-status="approaching"] {
  background: #fff3e6;
  color: #e07820;
}

.panel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  border-top: 1px solid #eceae3;
  padding: 12px 18px;
  color: #9b9485;
  font-size: 0.74rem;
}

.panel-footer button {
  border: 1px solid #ddd9ce;
  border-radius: 7px;
  padding: 6px 9px;
  background: #ffffff;
  color: #6b6557;
  cursor: pointer;
  font-size: 0.74rem;
  font-weight: 700;
}

@media (max-width: 840px) {
  .panel {
    min-height: auto;
    border-top: 1px solid #ddd9ce;
    border-left: 0;
  }
}
</style>
