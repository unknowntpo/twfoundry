<script setup lang="ts">
import type { LiveBoardRow, MrtStation } from "../types";

defineProps<{
  station: MrtStation | undefined;
  liveBoards: LiveBoardRow[];
}>();
</script>

<template>
  <aside class="panel" aria-label="Station LiveBoard">
    <p class="eyebrow">Station</p>
    <template v-if="station">
      <h2>{{ station.name }}</h2>
      <p class="station-meta">{{ station.id }} · {{ station.lineIds.join(" / ") }}</p>

      <div class="liveboard-list" data-testid="liveboard-list">
        <article v-for="row in liveBoards" :key="row.id" class="liveboard-row">
          <div>
            <p class="direction">{{ row.direction }}</p>
            <h3>{{ row.destination }}</h3>
          </div>
          <div class="arrival">
            <strong>{{ row.arrivalMinutes }}</strong>
            <span>min</span>
          </div>
          <span class="status" :data-status="row.status">{{ row.status }}</span>
        </article>
      </div>

      <p v-if="liveBoards.length === 0" class="empty">No arrivals in the mock feed.</p>
    </template>
    <template v-else>
      <h2>Select a station</h2>
      <p class="empty">
        Pick a station on the map to inspect mock LiveBoard arrivals.
      </p>
    </template>
  </aside>
</template>

<style scoped>
.panel {
  min-height: 100vh;
  border-left: 1px solid rgba(32, 33, 36, 0.12);
  padding: 28px;
  background: #ffffff;
}

.eyebrow {
  margin: 0 0 6px;
  color: #006b5f;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

h2 {
  margin: 0;
  color: #202124;
  font-size: 1.8rem;
  line-height: 1.1;
}

.station-meta,
.empty {
  color: #5f6368;
  line-height: 1.55;
}

.liveboard-list {
  display: grid;
  gap: 12px;
  margin-top: 24px;
}

.liveboard-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  border: 1px solid rgba(32, 33, 36, 0.12);
  border-radius: 8px;
  padding: 14px;
}

.direction {
  margin: 0 0 4px;
  color: #5f6368;
  font-size: 0.86rem;
}

h3 {
  margin: 0;
  color: #202124;
  font-size: 1rem;
  line-height: 1.25;
}

.arrival {
  display: flex;
  align-items: baseline;
  gap: 3px;
  color: #202124;
}

.arrival strong {
  font-size: 1.8rem;
}

.status {
  grid-column: 1 / -1;
  width: fit-content;
  border-radius: 999px;
  padding: 4px 8px;
  background: #e8f3ef;
  color: #006b5f;
  font-size: 0.78rem;
  font-weight: 700;
}

.status[data-status="delayed"] {
  background: #fbe9e7;
  color: #b3261e;
}

.status[data-status="approaching"] {
  background: #fff4d8;
  color: #805600;
}

@media (max-width: 840px) {
  .panel {
    min-height: auto;
    border-top: 1px solid rgba(32, 33, 36, 0.12);
    border-left: 0;
  }
}
</style>
