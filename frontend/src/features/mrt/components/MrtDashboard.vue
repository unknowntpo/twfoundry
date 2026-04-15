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
  mrtLines.filter((line) => visibleLineIds.value.includes(line.id))
);
</script>

<template>
  <main class="dashboard-shell">
    <section class="map-region" aria-label="MRT map dashboard">
      <div class="topbar">
        <div>
          <p class="eyebrow">TWFoundry</p>
          <h1>MRT LiveBoard Monitor</h1>
        </div>
        <LayerControl :lines="mrtLines" />
      </div>
      <MrtMap :lines="visibleLines" :stations="mrtStations" />
    </section>

    <StationPanel
      class="station-panel"
      :station="selectedStation"
      :live-boards="selectedLiveBoards"
    />
  </main>
</template>

<style scoped>
.dashboard-shell {
  display: grid;
  min-height: 100vh;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 380px);
  background: #edf1f3;
}

.map-region {
  position: relative;
  min-width: 0;
}

.topbar {
  position: absolute;
  z-index: 5;
  top: 18px;
  right: 18px;
  left: 18px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  pointer-events: none;
}

.topbar > * {
  pointer-events: auto;
}

.eyebrow {
  margin: 0 0 4px;
  color: #006b5f;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  color: #202124;
  font-size: 1.7rem;
  line-height: 1.1;
}

.station-panel {
  min-width: 0;
}

@media (max-width: 840px) {
  .dashboard-shell {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(520px, 64vh) auto;
  }

  .topbar {
    position: absolute;
    flex-direction: column;
  }
}
</style>
