<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import {
  buildDemoMetrics,
  type DemoTab,
  initialLayers,
  type MapFeature,
  mapFeatures,
  ontologyTypes,
  type ScenarioId,
  scenarios,
  type TimelineMode,
} from "../data";
import AppTopbar from "./AppTopbar.vue";
import InspectorPanel from "./InspectorPanel.vue";
import LayerSidebar from "./LayerSidebar.vue";
import OntologyView from "./OntologyView.vue";
import OperationalMap from "./OperationalMap.vue";
import TimelineDock from "./TimelineDock.vue";

const layers = ref(initialLayers.map((layer) => ({ ...layer })));
const activeLayerId = ref<string | null>("metro");
const activeTab = ref<DemoTab>("map");
const scenarioId = ref<ScenarioId>("rush");
const selectedFeature = ref<MapFeature | null>(mapFeatures[0] ?? null);
const playing = ref(false);
const currentMinute = ref(parseScenarioMinute("18:05"));
const timelineMode = ref<TimelineMode>("24h");
const playbackSpeed = ref(60);
const activeOntologyType = ref("Train");
const leftSidebarWidth = ref(380);
const rightSidebarWidth = ref(450);
let playbackTimer: number | undefined;

const scenario = computed(
  () => scenarios.find((item) => item.id === scenarioId.value) ?? scenarios[0],
);
const visibleLayers = computed(() => layers.value.filter((layer) => layer.visible));
const visibleLayerIds = computed(() => visibleLayers.value.map((layer) => layer.id));
const metrics = computed(() => buildDemoMetrics(scenario.value.id, currentMinute.value));
const shellStyle = computed(() => ({
  "--demo-left-sidebar-width": `${leftSidebarWidth.value}px`,
  "--demo-right-sidebar-width": `${rightSidebarWidth.value}px`,
}));

function toggleLayer(id: string): void {
  layers.value = layers.value.map((layer) =>
    layer.id === id ? { ...layer, visible: !layer.visible } : layer,
  );
}

function showAllLayers(): void {
  layers.value = layers.value.map((layer) => ({ ...layer, visible: true }));
}

function selectScenario(id: ScenarioId): void {
  scenarioId.value = id;
  currentMinute.value = parseScenarioMinute(
    scenarios.find((item) => item.id === id)?.time ?? scenario.value.time,
  );
}

function openMapFromOntology(typeId: string): void {
  activeOntologyType.value = typeId;
  activeTab.value = "map";
  selectedFeature.value =
    mapFeatures.find((feature) => feature.kind.toLowerCase() === typeId.toLowerCase()) ??
    selectedFeature.value;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseScenarioMinute(time: string): number {
  const [hour = "0", minute = "0"] = time.split(":");
  return Number(hour) * 60 + Number(minute);
}

function setTimelineMode(mode: TimelineMode): void {
  timelineMode.value = mode;
  if (mode === "now") {
    const now = new Date();
    currentMinute.value = now.getHours() * 60 + now.getMinutes();
    playing.value = false;
    return;
  }

  if (mode === "live") {
    currentMinute.value = Math.max(0, currentMinute.value - 60);
  }
}

function setPlaybackSpeed(speed: number): void {
  playbackSpeed.value = speed;
}

function scrubTimeline(minute: number): void {
  currentMinute.value = clamp(Math.round(minute), 0, 1439);
}

function syncPlaybackTimer(): void {
  if (playbackTimer !== undefined) {
    window.clearInterval(playbackTimer);
    playbackTimer = undefined;
  }

  if (!playing.value) {
    return;
  }

  playbackTimer = window.setInterval(() => {
    currentMinute.value = (currentMinute.value + Math.max(1, playbackSpeed.value / 6)) % 1440;
  }, 250);
}

watch([playing, playbackSpeed], syncPlaybackTimer);

onBeforeUnmount(() => {
  if (playbackTimer !== undefined) {
    window.clearInterval(playbackTimer);
  }
});

function startSidebarResize(side: "left" | "right", event: PointerEvent): void {
  const target = event.currentTarget;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const workspace = target.closest(".workspace");
  if (!(workspace instanceof HTMLElement)) {
    return;
  }

  target.setPointerCapture(event.pointerId);
  target.dataset.dragging = "true";

  const onPointerMove = (moveEvent: PointerEvent): void => {
    const workspaceRect = workspace.getBoundingClientRect();
    if (side === "left") {
      leftSidebarWidth.value = clamp(moveEvent.clientX - workspaceRect.left, 300, 520);
      return;
    }

    rightSidebarWidth.value = clamp(workspaceRect.right - moveEvent.clientX, 340, 620);
  };

  const stopResize = (upEvent: PointerEvent): void => {
    target.releasePointerCapture(upEvent.pointerId);
    target.removeEventListener("pointermove", onPointerMove);
    target.removeEventListener("pointerup", stopResize);
    target.removeEventListener("pointercancel", stopResize);
    delete target.dataset.dragging;
  };

  target.addEventListener("pointermove", onPointerMove);
  target.addEventListener("pointerup", stopResize);
  target.addEventListener("pointercancel", stopResize);
}
</script>

<template>
  <div class="demo-shell" :style="shellStyle">
    <AppTopbar v-model:active-tab="activeTab" online-label="TDX online" />

    <div class="workspace">
      <template v-if="activeTab === 'map'">
        <LayerSidebar
          :layers="layers"
          :scenarios="scenarios"
          :active-layer-id="activeLayerId"
          :scenario-id="scenario.id"
          :layer-readouts="metrics.layerReadouts"
          @toggle-layer="toggleLayer"
          @select-layer="activeLayerId = $event"
          @show-all-layers="showAllLayers"
          @select-scenario="selectScenario"
        />

        <div
          class="sidebar-resizer left-resizer"
          role="separator"
          aria-label="Resize layer sidebar"
          aria-orientation="vertical"
          tabindex="0"
          @pointerdown="startSidebarResize('left', $event)"
        />

        <OperationalMap
          :visible-layer-ids="visibleLayerIds"
          :selected-feature-id="selectedFeature?.id ?? null"
          :scenario="scenario"
          :current-minute="currentMinute"
          :features="mapFeatures"
          @select-feature="selectedFeature = $event"
        />

        <div
          class="sidebar-resizer right-resizer"
          role="separator"
          aria-label="Resize inspector sidebar"
          aria-orientation="vertical"
          tabindex="0"
          @pointerdown="startSidebarResize('right', $event)"
        />

        <InspectorPanel
          :selected-feature="selectedFeature"
          :scenario="scenario"
          :metrics="metrics"
          :visible-layer-count="visibleLayers.length"
          :layer-count="layers.length"
        />
      </template>

      <OntologyView
        v-else
        :types="ontologyTypes"
        :active-type-id="activeOntologyType"
        @select-type="activeOntologyType = $event"
        @open-map="openMapFromOntology"
      />
    </div>

    <TimelineDock
      :scenario="scenario"
      :scenarios="scenarios"
      :playing="playing"
      :current-minute="currentMinute"
      :timeline-mode="timelineMode"
      :playback-speed="playbackSpeed"
      @toggle-playing="playing = !playing"
      @select-scenario="selectScenario"
      @set-mode="setTimelineMode"
      @set-speed="setPlaybackSpeed"
      @scrub="scrubTimeline"
    />
  </div>
</template>

<style scoped>
.demo-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  --demo-left-sidebar-width: 380px;
  --demo-right-sidebar-width: 450px;
  background: var(--twf-color-canvas);
  color: var(--twf-color-text);
}

.workspace {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.sidebar-resizer {
  position: relative;
  z-index: 5;
  flex: 0 0 8px;
  margin: 0 -4px;
  cursor: col-resize;
  touch-action: none;
}

.sidebar-resizer::before {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 3px;
  width: 1px;
  background: transparent;
  content: "";
}

.sidebar-resizer:hover::before,
.sidebar-resizer:focus-visible::before,
.sidebar-resizer[data-dragging="true"]::before {
  background: var(--twf-color-accent-warm);
}

.sidebar-resizer:focus-visible {
  outline: none;
}

@media (max-width: 760px) {
  .workspace {
    flex-direction: column;
  }

  .sidebar-resizer {
    display: none;
  }
}
</style>
