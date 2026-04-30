<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { supportedLiveRefreshIntervalsMs, useMrtDashboardStore } from "@/app/stores/mrt-dashboard";
import { type VoxelModuleKey, voxelModules } from "@/features/design-system/voxel/modules";
import VoxelPreview from "@/features/design-system/voxel/VoxelPreview.vue";
import { mrtLines, mrtStations } from "@/features/mrt/data/mrt-fixtures";
import { resolveMrtLineLabel } from "@/features/mrt/line-names";
import { resolveLocalizedText } from "@/features/mrt/localized-text";
import { inferTrainMarkers } from "@/features/mrt/map/inferred-trains";
import type { OverlayId } from "@/features/mrt/map/overlay-registry";
import type { LiveBoardEntry } from "@/features/mrt/types";
import BaseBadge from "@/shared/components/BaseBadge.vue";
import LocaleSwitcher from "@/shared/components/LocaleSwitcher.vue";
import { appConfig } from "@/shared/config/env";

const { locale, t } = useI18n();
const store = useMrtDashboardStore();
const {
  displayedLiveBoards,
  displayedUpdatedAt,
  liveBoardError,
  liveBoardLoading,
  liveRefreshIntervalMs,
  selectedTrainId,
  timelineCursorIndex,
  timelineMode,
  timelineSnapshots,
  visibleOverlayIds,
} = storeToRefs(store);

const selectedModule = ref<VoxelModuleKey>("moving-object");
const localPrototypeOverlays = ref(["rain", "air", "incidents"]);

const overlayGroups = [
  {
    key: "metro",
    source: "TDX LiveBoard",
    storeIds: ["mrt-routes", "mrt-stations", "mrt-estimated-trains"] satisfies OverlayId[],
  },
  { key: "rain", source: "prototype", storeIds: [] },
  { key: "air", source: "prototype", storeIds: [] },
  { key: "incidents", source: "prototype", storeIds: [] },
] as const;

const selectedModuleDetail = computed(
  () => voxelModules.find((module) => module.key === selectedModule.value) ?? voxelModules[0],
);
const trainMarkers = computed(() =>
  inferTrainMarkers(displayedLiveBoards.value, mrtStations, mrtLines),
);
const selectedTrain = computed(
  () =>
    displayedLiveBoards.value.find((row) => row.id === selectedTrainId.value) ??
    displayedLiveBoards.value[0],
);
const sourceLabel = computed(() =>
  appConfig.mrtLiveBoardSource === "tdx" ? "TDX API" : t("voxelCockpit.source.mock"),
);
const timelinePosition = computed(() =>
  timelineSnapshots.value.length > 0
    ? `${timelineCursorIndex.value + 1}/${timelineSnapshots.value.length}`
    : "0/0",
);
const timelineTrackFill = computed(() => {
  if (timelineSnapshots.value.length <= 1) {
    return "100%";
  }

  return `${Math.round((timelineCursorIndex.value / (timelineSnapshots.value.length - 1)) * 100)}%`;
});
const metricCards = computed(() => [
  {
    key: "trains",
    label: t("voxelCockpit.metrics.trains.label"),
    value: String(displayedLiveBoards.value.length),
  },
  {
    key: "stations",
    label: t("voxelCockpit.metrics.stations.label"),
    value: String(new Set(displayedLiveBoards.value.map((row) => row.stationId)).size),
  },
  {
    key: "timeline",
    label: t("voxelCockpit.metrics.timeline.label"),
    value: timelinePosition.value,
  },
  {
    key: "source",
    label: t("voxelCockpit.metrics.source.label"),
    value: sourceLabel.value,
  },
]);
const objectRelationships = computed(() => {
  const row = selectedTrain.value;
  if (!row) {
    return [];
  }

  return [
    [t("voxelCockpit.inspector.route"), lineLabel(row)],
    [t("voxelCockpit.inspector.station"), stationLabel(row)],
    [t("voxelCockpit.inspector.destination"), destinationLabel(row)],
    [
      t("voxelCockpit.inspector.eta"),
      t("voxelCockpit.inspector.minutes", { count: row.arrivalMinutes }),
    ],
  ];
});
let liveRefreshTimer: number | undefined;

function isOverlayActive(group: (typeof overlayGroups)[number]): boolean {
  if (group.storeIds.length > 0) {
    return group.storeIds.every((overlayId) => visibleOverlayIds.value.includes(overlayId));
  }

  return localPrototypeOverlays.value.includes(group.key);
}

function toggleOverlay(group: (typeof overlayGroups)[number]): void {
  if (group.storeIds.length === 0) {
    localPrototypeOverlays.value = localPrototypeOverlays.value.includes(group.key)
      ? localPrototypeOverlays.value.filter((item) => item !== group.key)
      : [...localPrototypeOverlays.value, group.key];
    return;
  }

  const shouldHide = isOverlayActive(group);
  group.storeIds.forEach((overlayId) => {
    const isVisible = visibleOverlayIds.value.includes(overlayId);
    if ((shouldHide && isVisible) || (!shouldHide && !isVisible)) {
      store.toggleOverlay(overlayId);
    }
  });
}

function lineLabel(row: LiveBoardEntry): string {
  return resolveMrtLineLabel(t, locale.value, row.lineId, row.lineName);
}

function stationLabel(row: LiveBoardEntry): string {
  return resolveLocalizedText(locale.value, row.stationName, row.stationId) ?? row.stationId;
}

function destinationLabel(row: LiveBoardEntry): string {
  return (
    resolveLocalizedText(locale.value, row.destinationName, row.destination) ?? row.destination
  );
}

function selectTrain(row: LiveBoardEntry): void {
  selectedModule.value = "moving-object";
  store.selectTrain(row.id);
}

function selectTrainMarker(markerId: string): void {
  const row = displayedLiveBoards.value.find((item) => item.id === markerId);
  if (row) {
    selectTrain(row);
  }
}

function trainMarkerStyle(marker: (typeof trainMarkers.value)[number]): Record<string, string> {
  const station = mrtStations.find((item) => item.id === marker.stationId);
  const line = mrtLines.find((item) => item.id === marker.lineId);
  const lineIndex = mrtLines.findIndex((item) => item.id === marker.lineId);
  const stationIndex = station ? Math.max(0, station.lineIds.indexOf(marker.lineId)) : 0;
  return {
    "--line-color": line?.color ?? "#4f93df",
    "--marker-left": `${18 + ((lineIndex + stationIndex * 2 + marker.arrivalMinutes) % 7) * 9}%`,
    "--marker-top": `${26 + ((lineIndex * 11 + marker.arrivalMinutes * 3) % 5) * 10}%`,
  };
}

function toggleTimelineMode(): void {
  if (timelineMode.value === "live") {
    store.setTimelineMode("paused");
    return;
  }

  store.setTimelineMode("live");
  store.goToLatestTimeline();
  void store.refreshLiveBoards();
}

function setRefreshInterval(intervalMs: number): void {
  store.setLiveRefreshIntervalMs(intervalMs);
  if (timelineMode.value === "live") {
    void store.refreshLiveBoards();
  }
}

function syncLiveRefreshTimer(): void {
  if (liveRefreshTimer !== undefined) {
    window.clearInterval(liveRefreshTimer);
    liveRefreshTimer = undefined;
  }

  if (appConfig.mrtLiveBoardSource !== "tdx" || timelineMode.value !== "live") {
    return;
  }

  liveRefreshTimer = window.setInterval(() => {
    void store.refreshLiveBoards();
  }, liveRefreshIntervalMs.value);
}

onMounted(() => {
  void store.loadTimelineSnapshots();
  void store.refreshLiveBoards();
  syncLiveRefreshTimer();
});

onBeforeUnmount(() => {
  if (liveRefreshTimer !== undefined) {
    window.clearInterval(liveRefreshTimer);
  }
});

watch([timelineMode, liveRefreshIntervalMs], syncLiveRefreshTimer);
</script>

<template>
  <main class="voxel-cockpit">
    <header class="topbar">
      <RouterLink class="brand" to="/">
        <span aria-hidden="true">TW</span>
        <strong>{{ t("voxelCockpit.brand") }}</strong>
      </RouterLink>

      <div class="status-strip" aria-label="Operational status">
        <BaseBadge :tone="liveBoardError ? 'red' : 'green'">
          {{ liveBoardError ? t("voxelCockpit.status.error") : t("voxelCockpit.status.live") }}
        </BaseBadge>
        <BaseBadge tone="blue">{{ t("voxelCockpit.status.taipei") }}</BaseBadge>
        <BaseBadge tone="warm">{{ t("voxelCockpit.status.source", { source: sourceLabel }) }}</BaseBadge>
      </div>

      <nav class="topbar-actions" aria-label="Cockpit actions">
        <RouterLink to="/design-system">{{ t("voxelCockpit.actions.designSystem") }}</RouterLink>
        <RouterLink to="/mrt-dashboard">{{ t("voxelCockpit.actions.legacy") }}</RouterLink>
        <LocaleSwitcher />
      </nav>
    </header>

    <section class="layout">
      <aside class="panel left-panel" aria-label="Overlay controls">
        <p class="eyebrow">{{ t("voxelCockpit.left.label") }}</p>
        <h1>{{ t("voxelCockpit.left.title") }}</h1>
        <p>{{ t("voxelCockpit.left.body") }}</p>

        <div class="overlay-list">
          <button
            v-for="group in overlayGroups"
            :key="group.key"
            type="button"
            :class="{ active: isOverlayActive(group) }"
            @click="toggleOverlay(group)"
          >
            <span class="overlay-dot" :data-overlay="group.key" aria-hidden="true" />
            <span>
              <strong>{{ t(`voxelCockpit.overlays.${group.key}.title`) }}</strong>
              <small>{{ t(`voxelCockpit.overlays.${group.key}.body`, { source: group.source }) }}</small>
            </span>
            <BaseBadge :tone="isOverlayActive(group) ? 'red' : 'neutral'">
              {{
                isOverlayActive(group)
                  ? t("voxelCockpit.overlays.on")
                  : t("voxelCockpit.overlays.off")
              }}
            </BaseBadge>
          </button>
        </div>
      </aside>

      <section class="world-stage" aria-label="Voxel world">
        <div class="world-toolbar">
          <div>
            <p class="eyebrow">{{ t("voxelCockpit.world.label") }}</p>
            <h2>{{ t("voxelCockpit.world.title") }}</h2>
          </div>
          <div class="module-tabs" role="tablist" aria-label="Renderer modules">
            <button
              v-for="module in voxelModules.slice(0, 5)"
              :key="module.key"
              type="button"
              :class="{ active: selectedModule === module.key }"
              @click="selectedModule = module.key"
            >
              {{ t(`voxelCockpit.modules.${module.key}`) }}
            </button>
          </div>
        </div>

        <div class="world-canvas">
          <VoxelPreview class="world-preview" :module-key="selectedModule" />
          <div
            v-if="visibleOverlayIds.includes('mrt-estimated-trains')"
            class="live-entity-layer"
            aria-label="Live MRT ontology objects"
          >
            <button
              v-for="marker in trainMarkers"
              :key="marker.id"
              type="button"
              class="train-entity"
              :class="{ selected: marker.id === selectedTrainId }"
              :style="trainMarkerStyle(marker)"
              @click="selectTrainMarker(marker.id)"
            >
              <span>{{ marker.trainCode }}</span>
              <small>{{ marker.arrivalMinutes }}m</small>
            </button>
          </div>
        </div>

        <div class="world-metrics" aria-label="Live metrics">
          <article v-for="metric in metricCards" :key="metric.key">
            <span>{{ metric.label }}</span>
            <strong>{{ metric.value }}</strong>
          </article>
        </div>
      </section>

      <aside class="panel right-panel" aria-label="Ontology object">
        <p class="eyebrow">{{ t("voxelCockpit.inspector.label") }}</p>
        <h2>{{ t("voxelCockpit.inspector.title") }}</h2>
        <p>{{ t("voxelCockpit.inspector.body") }}</p>

        <div class="object-card">
          <BaseBadge tone="red">{{ selectedModuleDetail.renderer }}</BaseBadge>
          <h3>{{ selectedTrain?.trainCode ?? t("voxelCockpit.inspector.emptyObject") }}</h3>
          <p v-if="liveBoardLoading" class="object-note">{{ t("voxelCockpit.inspector.loading") }}</p>
          <p v-else-if="liveBoardError" class="object-note">{{ liveBoardError }}</p>
          <dl v-if="selectedTrain">
            <div>
              <dt>{{ t("voxelCockpit.inspector.kind") }}</dt>
              <dd>{{ t("voxelCockpit.inspector.trainKind") }}</dd>
            </div>
            <div>
              <dt>{{ t("voxelCockpit.inspector.overlay") }}</dt>
              <dd>{{ t("voxelCockpit.inspector.overlayValue") }}</dd>
            </div>
            <div v-for="[label, value] in objectRelationships" :key="label">
              <dt>{{ label }}</dt>
              <dd>{{ value }}</dd>
            </div>
          </dl>
        </div>

        <div class="event-list">
          <article v-if="selectedTrain">
            <span>{{ displayedUpdatedAt ? new Date(displayedUpdatedAt).toLocaleTimeString() : "--" }}</span>
            <strong>{{ t("voxelCockpit.events.liveboard.title") }}</strong>
            <p>
              {{
                t("voxelCockpit.events.liveboard.body", {
                  station: stationLabel(selectedTrain),
                  destination: destinationLabel(selectedTrain),
                })
              }}
            </p>
          </article>
          <article>
            <span>{{ timelinePosition }}</span>
            <strong>{{ t("voxelCockpit.events.timeline.title") }}</strong>
            <p>{{ t("voxelCockpit.events.timeline.body") }}</p>
          </article>
        </div>
      </aside>
    </section>

    <footer class="timeline">
      <div class="transport">
        <button type="button" @click="toggleTimelineMode">
          {{ timelineMode === "live" ? t("voxelCockpit.timeline.pause") : t("voxelCockpit.timeline.play") }}
        </button>
        <strong>{{ displayedUpdatedAt ? new Date(displayedUpdatedAt).toLocaleTimeString() : "--:--" }}</strong>
        <BaseBadge :tone="timelineMode === 'live' ? 'green' : 'warm'">
          {{ timelineMode === "live" ? t("voxelCockpit.timeline.live") : t("voxelCockpit.timeline.paused") }}
        </BaseBadge>
      </div>
      <div class="track" aria-hidden="true">
        <span :style="{ width: timelineTrackFill }" />
      </div>
      <div class="speed">
        <button
          v-for="interval in supportedLiveRefreshIntervalsMs"
          :key="interval"
          type="button"
          :class="{ active: interval === liveRefreshIntervalMs }"
          @click="setRefreshInterval(interval)"
        >
          {{ interval / 1000 }}s
        </button>
      </div>
    </footer>
  </main>
</template>

<style scoped>
.voxel-cockpit {
  min-height: 100vh;
  display: grid;
  grid-template-rows: auto 1fr auto;
  background:
    radial-gradient(circle at 72% 14%, rgba(255, 249, 243, 0.86), transparent 28%),
    linear-gradient(135deg, #fbe5ec 0%, #8bcaf8 100%);
  color: var(--twf-color-text);
}

.topbar,
.timeline,
.panel,
.world-stage {
  border-color: rgba(240, 191, 208, 0.82);
  background: rgba(255, 249, 243, 0.9);
}

.topbar {
  min-height: 68px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 18px;
  align-items: center;
  border-bottom: 1px solid rgba(240, 191, 208, 0.82);
  padding: 0 22px;
}

.brand,
.topbar-actions,
.status-strip {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand,
.topbar-actions a {
  color: var(--twf-color-text);
  font-weight: 900;
  text-decoration: none;
}

.brand span {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 12px;
  background: var(--twf-color-text);
  color: var(--twf-color-surface);
  font-size: 0.86rem;
}

.status-strip {
  flex-wrap: wrap;
}

.topbar-actions {
  justify-content: flex-end;
}

.topbar-actions a {
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  border: 1px solid rgba(240, 191, 208, 0.9);
  border-radius: 12px;
  padding: 0 12px;
  background: rgba(255, 253, 251, 0.78);
  color: #94506a;
  font-size: 0.82rem;
}

.layout {
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(250px, 320px) minmax(0, 1fr) minmax(280px, 360px);
  gap: 18px;
  padding: 18px;
}

.panel,
.world-stage,
.timeline {
  border: 1px solid rgba(240, 191, 208, 0.82);
  border-radius: 24px;
  box-shadow: var(--twf-shadow-panel);
}

.panel {
  min-height: 0;
  overflow: auto;
  padding: 24px;
}

.eyebrow {
  margin: 0;
  color: var(--twf-color-text-faint);
  font-size: 0.74rem;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

h1,
h2,
h3,
p {
  margin: 0;
}

h1,
h2,
h3 {
  color: #8b3f59;
}

h1 {
  margin-top: 8px;
  font-size: clamp(2.2rem, 5vw, 4rem);
  line-height: 0.94;
}

h2 {
  margin-top: 8px;
  font-size: 1.8rem;
  line-height: 1.05;
}

p {
  color: var(--twf-color-text-muted);
  line-height: 1.62;
}

.left-panel > p:not(.eyebrow),
.right-panel > p:not(.eyebrow) {
  margin-top: 14px;
}

.overlay-list,
.event-list {
  display: grid;
  gap: 12px;
  margin-top: 24px;
}

.overlay-list button {
  display: grid;
  grid-template-columns: 24px 1fr auto;
  gap: 12px;
  align-items: center;
  border: 1px solid rgba(240, 191, 208, 0.9);
  border-radius: 16px;
  padding: 14px;
  background: rgba(255, 253, 251, 0.72);
  color: var(--twf-color-text);
  cursor: pointer;
  text-align: left;
}

.overlay-list button.active {
  background: #ffe7ef;
  border-color: #dc7898;
}

.overlay-list small {
  display: block;
  margin-top: 3px;
  color: var(--twf-color-text-muted);
}

.overlay-dot {
  width: 16px;
  height: 16px;
  border-radius: 5px;
  background: var(--twf-color-voxel-sakura-strong);
}

.overlay-dot[data-overlay="rain"] {
  background: var(--twf-color-voxel-mizu);
}

.overlay-dot[data-overlay="air"] {
  background: var(--twf-color-voxel-leaf);
}

.overlay-dot[data-overlay="incidents"] {
  background: var(--twf-color-route-red);
}

.world-stage {
  min-width: 0;
  display: grid;
  grid-template-rows: auto minmax(360px, 1fr) auto;
  gap: 14px;
  padding: 16px;
}

.world-toolbar {
  display: grid;
  grid-template-columns: minmax(180px, 0.42fr) 1fr;
  gap: 16px;
  align-items: end;
}

.module-tabs {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.module-tabs button,
.transport button,
.speed button {
  min-height: 34px;
  border: 1px solid rgba(240, 191, 208, 0.9);
  border-radius: 12px;
  padding: 0 12px;
  background: rgba(255, 253, 251, 0.8);
  color: #94506a;
  cursor: pointer;
  font-weight: 900;
}

.module-tabs button.active,
.speed button.active,
.transport button {
  background: var(--twf-color-text);
  color: var(--twf-color-surface);
}

.world-canvas {
  position: relative;
  min-height: 100%;
}

.world-preview {
  min-height: 100%;
}

.live-entity-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.train-entity {
  position: absolute;
  left: var(--marker-left);
  top: var(--marker-top);
  z-index: 2;
  display: grid;
  min-width: 88px;
  gap: 2px;
  border: 2px solid color-mix(in srgb, var(--line-color) 72%, white);
  border-radius: 14px;
  padding: 8px 10px;
  background: rgba(255, 249, 243, 0.9);
  box-shadow:
    0 8px 0 rgba(43, 35, 48, 0.12),
    0 0 0 6px color-mix(in srgb, var(--line-color) 22%, transparent);
  color: #8b3f59;
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 900;
  pointer-events: auto;
  transform: translate(-50%, -50%);
}

.train-entity.selected {
  background: #ffe7ef;
  box-shadow:
    0 8px 0 rgba(43, 35, 48, 0.14),
    0 0 0 8px color-mix(in srgb, var(--line-color) 34%, transparent);
}

.train-entity small {
  color: var(--line-color);
  font-size: 0.7rem;
}

.world-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.world-metrics article,
.object-card,
.event-list article {
  border: 1px solid rgba(240, 191, 208, 0.82);
  border-radius: 18px;
  background: rgba(255, 253, 251, 0.78);
}

.world-metrics article {
  padding: 14px;
}

.world-metrics span,
dt,
.event-list span {
  color: var(--twf-color-text-faint);
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.world-metrics strong {
  display: block;
  margin-top: 8px;
  color: #8b3f59;
  font-size: 1.35rem;
}

.object-card {
  margin-top: 24px;
  padding: 18px;
}

.object-card h3 {
  margin-top: 12px;
  font-size: 1.6rem;
}

.object-note {
  margin-top: 10px;
  font-size: 0.92rem;
}

dl {
  display: grid;
  gap: 12px;
  margin: 18px 0 0;
}

dl div {
  display: grid;
  grid-template-columns: 0.8fr 1fr;
  gap: 12px;
  border-top: 1px solid rgba(240, 191, 208, 0.62);
  padding-top: 10px;
}

dd {
  margin: 0;
  color: var(--twf-color-text);
  font-weight: 900;
}

.event-list article {
  padding: 14px;
}

.event-list strong {
  display: block;
  margin-top: 6px;
  color: #8b3f59;
}

.event-list p {
  margin-top: 5px;
  font-size: 0.9rem;
}

.timeline {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 18px;
  align-items: center;
  margin: 0 18px 18px;
  padding: 16px 20px;
}

.transport,
.speed {
  display: flex;
  align-items: center;
  gap: 10px;
}

.transport strong {
  color: #8b3f59;
  font-size: 1.6rem;
}

.track {
  height: 14px;
  overflow: hidden;
  border: 1px solid rgba(240, 191, 208, 0.9);
  border-radius: 999px;
  background: rgba(255, 253, 251, 0.86);
}

.track span {
  display: block;
  width: 62%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #df3f53, #f6b23a, #4f93df);
}

@media (max-width: 1100px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .topbar,
  .world-toolbar,
  .timeline {
    grid-template-columns: 1fr;
  }

  .topbar-actions,
  .module-tabs {
    justify-content: flex-start;
  }

  .world-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .layout,
  .timeline {
    margin: 0;
    padding: 12px;
  }

  .world-metrics {
    grid-template-columns: 1fr;
  }
}
</style>
