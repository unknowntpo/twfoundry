<script setup lang="ts">
import BaseBadge from "@/shared/components/BaseBadge.vue";
import type { LiveBoardRow, MrtStation } from "../types";

defineProps<{
  collapsed?: boolean;
  error?: string;
  isLoading?: boolean;
  station: MrtStation | undefined;
  liveBoards: LiveBoardRow[];
}>();

defineEmits<{
  refresh: [];
  "toggle-collapse": [];
}>();

function formatLineName(lineId: string): string {
  return `${lineId.charAt(0).toUpperCase()}${lineId.slice(1)} Line`;
}

function routeTone(lineId: string): "red" | "blue" | "green" | "neutral" {
  if (lineId === "red" || lineId === "blue" || lineId === "green") {
    return lineId;
  }

  return "neutral";
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
      title="Expand Station Detail panel"
      @click="$emit('toggle-collapse')"
    >
      <span aria-hidden="true">‹</span>
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
            <BaseBadge
              v-for="lineId in station.lineIds"
              :key="lineId"
              class="line-badge"
              :tone="routeTone(lineId)"
            >
              {{ formatLineName(lineId) }}
            </BaseBadge>
          </div>
          <p class="station-meta">{{ station.id }} · LiveBoard active</p>

          <p class="section-heading">Upcoming Arrivals</p>
          <p v-if="isLoading" class="notice">Loading LiveBoard rows...</p>
          <p v-if="error" class="notice error">{{ error }}</p>

          <div class="liveboard-list" data-testid="liveboard-list">
            <article v-for="row in liveBoards" :key="row.id" class="liveboard-row">
              <span class="row-line" :data-line="row.lineId" aria-hidden="true" />
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
            <button type="button" :disabled="isLoading" @click="$emit('refresh')">Refresh</button>
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
  border-left: 1px solid var(--twf-color-border);
  background: var(--twf-color-surface);
}

.panel[data-collapsed="true"] {
  overflow: hidden;
  background: var(--twf-color-surface-raised);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--twf-color-border-soft);
  padding: 0 12px 0 18px;
}

.eyebrow {
  margin: 0;
  padding: 16px 0 6px;
  color: var(--twf-color-text-faint);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.collapse-button,
.panel-rail-toggle {
  border: 1px solid var(--twf-color-border);
  border-radius: var(--twf-radius-sm);
  background: var(--twf-color-surface);
  color: var(--twf-color-text-muted);
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
  border-color: var(--twf-color-text-muted);
  color: var(--twf-color-text);
}

.panel-rail-toggle {
  display: grid;
  width: 100%;
  min-height: 100%;
  align-content: start;
  justify-items: center;
  border: 0;
  border-radius: 0;
  padding: 10px 0;
  background: transparent;
}

.panel-rail-toggle span {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 1px solid var(--twf-color-border);
  border-radius: var(--twf-radius-sm);
  background: var(--twf-color-surface);
  font-size: 1rem;
}

h2 {
  margin: 0;
  padding: 10px 18px 0;
  color: var(--twf-color-text);
  font-size: 1.45rem;
  line-height: 1.12;
}

.line-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 12px 18px 0;
}

.station-meta,
.empty {
  margin: 0;
  padding: 10px 18px 0;
  color: var(--twf-color-text-muted);
  font-size: 0.8rem;
  line-height: 1.55;
}

.section-heading {
  margin: 24px 0 0;
  border-top: 1px solid var(--twf-color-border-soft);
  border-bottom: 1px solid var(--twf-color-border-soft);
  padding: 10px 18px;
  color: var(--twf-color-text-faint);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

.notice {
  margin: 0;
  padding: 10px 18px 0;
  color: var(--twf-color-text-muted);
  font-size: 0.78rem;
  line-height: 1.45;
}

.notice.error {
  color: var(--twf-color-route-red);
}

.liveboard-list {
  display: grid;
  gap: var(--twf-space-2);
  padding: 12px 12px 0;
}

.liveboard-row {
  display: grid;
  grid-template-columns: 4px minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--twf-space-3);
  border: 1px solid var(--twf-color-border-soft);
  border-radius: var(--twf-radius-md);
  padding: var(--twf-space-3);
  background: var(--twf-color-surface-raised);
}

.row-line {
  width: 4px;
  height: 42px;
  border-radius: 999px;
  background: var(--twf-color-route-red);
}

.row-line[data-line="blue"] {
  background: var(--twf-color-route-blue);
}

.row-line[data-line="green"] {
  background: var(--twf-color-route-green);
}

.direction {
  margin: 4px 0 0;
  color: var(--twf-color-text-muted);
  font-size: 0.74rem;
}

h3 {
  margin: 0;
  color: var(--twf-color-text);
  font-size: 0.92rem;
  line-height: 1.25;
}

.arrival {
  display: grid;
  min-width: 58px;
  justify-items: end;
  color: var(--twf-color-text);
}

.arrival strong {
  font-size: 1.45rem;
  line-height: 1;
}

.arrival span {
  color: var(--twf-color-text-faint);
  font-size: 0.64rem;
  font-weight: 700;
  text-transform: uppercase;
}

.status {
  margin-top: 5px;
  border-radius: 999px;
  padding: 3px 7px;
  background: var(--twf-color-route-green-soft);
  color: var(--twf-color-route-green);
  font-size: 0.62rem;
  font-style: normal;
  font-weight: 700;
  text-transform: uppercase;
}

.status[data-status="delayed"] {
  background: var(--twf-color-route-red-soft);
  color: var(--twf-color-route-red);
}

.status[data-status="approaching"] {
  background: var(--twf-color-status-warning-soft);
  color: var(--twf-color-status-warning);
}

.panel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  border-top: 1px solid var(--twf-color-border-soft);
  padding: 12px 18px;
  color: var(--twf-color-text-faint);
  font-size: 0.74rem;
}

.panel-footer button {
  border: 1px solid var(--twf-color-border);
  border-radius: var(--twf-radius-sm);
  padding: 6px 9px;
  background: var(--twf-color-surface-raised);
  color: var(--twf-color-text-muted);
  cursor: pointer;
  font-size: 0.74rem;
  font-weight: 700;
}

.panel-footer button:disabled {
  cursor: wait;
  opacity: 0.58;
}

@media (max-width: 1023px) {
  .panel[data-collapsed="true"] {
    display: none;
  }

  .panel {
    min-height: auto;
    border-top: 1px solid var(--twf-color-border);
    border-left: 0;
  }
}
</style>
