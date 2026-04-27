<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { supportedLiveRefreshIntervalsMs, useMrtDashboardStore } from "@/app/stores/mrt-dashboard";
import LocaleSwitcher from "@/shared/components/LocaleSwitcher.vue";
import { appConfig } from "@/shared/config/env";
import { mrtLines, mrtStations } from "../data/mrt-fixtures";
import { mrtOverlayRegistry } from "../map/overlay-registry";
import LayerControl from "./LayerControl.vue";
import MobilePanelSwitch from "./MobilePanelSwitch.vue";
import MrtMap from "./MrtMap.vue";
import StationPanel from "./StationPanel.vue";

const { t } = useI18n();
const store = useMrtDashboardStore();
const {
  displayedLiveBoards,
  displayedUpdatedAt,
  liveBoardError,
  liveBoardLoading,
  selectedStation,
  selectedStationId,
  selectedLiveBoards,
  timelineCursorIndex,
  timelineMode,
  timelineSnapshots,
  liveRefreshIntervalMs,
  visibleLineIds,
  visibleOverlayIds,
} = storeToRefs(store);

const visibleLines = computed(() =>
  mrtLines.filter((line) => visibleLineIds.value.includes(line.id)),
);
const movingOverlays = computed(() =>
  mrtOverlayRegistry.filter((overlay) => overlay.category === "moving"),
);
const routeOverlay = computed(() =>
  mrtOverlayRegistry.find((overlay) => overlay.id === "mrt-routes"),
);
const stationOverlays = computed(() =>
  mrtOverlayRegistry.filter((overlay) => overlay.category === "station"),
);

const lineTrainCounts = computed(
  () =>
    Object.fromEntries(
      mrtLines.map((line) => [
        line.id,
        displayedLiveBoards.value.filter((row) => row.lineId === line.id).length,
      ]),
    ) as Record<string, number>,
);
const activeTrainCount = computed(() => displayedLiveBoards.value.length);
const liveBoardSourceLabel = computed(() =>
  appConfig.mrtLiveBoardSource === "tdx" ? "TDX live" : "Mock",
);
const clockNow = ref(Date.now());
const timelineHasReplay = computed(() => timelineSnapshots.value.length > 1);
const timelineTimestampLabel = computed(() => {
  if (!displayedUpdatedAt.value) {
    return t("dashboard.timeline.noData");
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(displayedUpdatedAt.value));
});
const timelineUpdatedLabel = computed(() => {
  if (!displayedUpdatedAt.value) {
    return t("dashboard.timeline.noData");
  }

  const diffSeconds = Math.max(
    0,
    Math.floor((clockNow.value - new Date(displayedUpdatedAt.value).getTime()) / 1000),
  );
  const relative =
    diffSeconds < 60 ? `${diffSeconds}s ago` : `${Math.floor(diffSeconds / 60)}m ago`;
  return t("dashboard.timeline.updated", { relative });
});
const timelineModeLabel = computed(() =>
  timelineMode.value === "live" ? t("dashboard.timeline.live") : t("dashboard.timeline.paused"),
);
const timelineSnapshotPositionLabel = computed(() => {
  if (timelineSnapshots.value.length <= 1) {
    return timelineModeLabel.value;
  }

  return `${timelineCursorIndex.value + 1}/${timelineSnapshots.value.length}`;
});
const timelineTrackFill = computed(() => {
  if (timelineSnapshots.value.length <= 1) {
    return "100%";
  }

  const ratio = timelineCursorIndex.value / (timelineSnapshots.value.length - 1);
  return `${Math.round(ratio * 100)}%`;
});
const isLayerSidebarCollapsed = ref(false);
const isStationPanelCollapsed = ref(false);
const isMobileControlsOpen = ref(true);
const activeMobilePanel = ref<"layers" | "detail" | "time">("detail");
let liveRefreshTimer: number | undefined;
let freshnessTicker: number | undefined;

function toggleLayerSidebar(): void {
  isLayerSidebarCollapsed.value = !isLayerSidebarCollapsed.value;
  notifyMapLayoutChanged();
}

function toggleStationPanel(): void {
  isStationPanelCollapsed.value = !isStationPanelCollapsed.value;
  notifyMapLayoutChanged();
}

function notifyMapLayoutChanged(): void {
  void nextTick(() => {
    window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
    });
  });
}

function showMobilePanel(panel: "layers" | "detail" | "time"): void {
  activeMobilePanel.value = panel;
  if (panel === "detail") {
    isStationPanelCollapsed.value = false;
  }

  notifyMapLayoutChanged();
}

function setMobileControlsOpen(open: boolean): void {
  isMobileControlsOpen.value = open;
  notifyMapLayoutChanged();
}

function clearLiveRefreshTimer(): void {
  if (liveRefreshTimer !== undefined) {
    window.clearInterval(liveRefreshTimer);
    liveRefreshTimer = undefined;
  }
}

function clearFreshnessTicker(): void {
  if (freshnessTicker !== undefined) {
    window.clearInterval(freshnessTicker);
    freshnessTicker = undefined;
  }
}

function syncLiveRefreshTimer(): void {
  clearLiveRefreshTimer();

  if (appConfig.mrtLiveBoardSource !== "tdx" || timelineMode.value !== "live") {
    return;
  }

  liveRefreshTimer = window.setInterval(() => {
    void store.refreshLiveBoards();
  }, liveRefreshIntervalMs.value);
}

function setLiveMode(mode: "live" | "paused"): void {
  store.setTimelineMode(mode);
  if (mode === "live") {
    store.goToLatestTimeline();
    void store.refreshLiveBoards();
  }
}

function setLiveRefreshInterval(intervalMs: number): void {
  store.setLiveRefreshIntervalMs(intervalMs);
  if (timelineMode.value === "live") {
    void store.refreshLiveBoards();
  }
}

function scrubTimelineFromEvent(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  store.scrubTimeline(Number(target.value));
}

onMounted(() => {
  if (appConfig.mrtLiveBoardSource === "tdx") {
    void (async () => {
      await store.loadTimelineSnapshots();
      await store.refreshLiveBoards();
    })();
  }
  syncLiveRefreshTimer();
  freshnessTicker = window.setInterval(() => {
    clockNow.value = Date.now();
  }, 1000);
});

onBeforeUnmount(() => {
  clearLiveRefreshTimer();
  clearFreshnessTicker();
});

watch([timelineMode, liveRefreshIntervalMs, selectedStationId], () => {
  syncLiveRefreshTimer();
});
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
      <h1>{{ t("dashboard.title") }}</h1>

      <div class="line-stats" :aria-label="t('dashboard.serviceSummary')">
        <span v-for="line in mrtLines" :key="line.id" class="line-stat">
          <span class="stat-dot" :style="{ '--line-color': line.color }" aria-hidden="true" />
          {{ t("dashboard.trains", { count: lineTrainCounts[line.id] ?? 0 }) }}
        </span>
        <span>{{
          t("dashboard.activeSource", { count: activeTrainCount, source: liveBoardSourceLabel })
        }}</span>
      </div>

      <div class="topbar-actions" :aria-label="t('dashboard.actions.mapView')">
        <LocaleSwitcher />
        <button type="button">{{ t("dashboard.actions.capture") }}</button>
        <button type="button" class="primary">{{ t("dashboard.actions.altitude") }}</button>
        <RouterLink to="/design-system">{{ t("dashboard.actions.designSystem") }}</RouterLink>
      </div>
    </header>

    <div
      class="workspace"
      :class="{
        'layers-collapsed': isLayerSidebarCollapsed,
        'station-collapsed': isStationPanelCollapsed,
        [`mobile-panel-${activeMobilePanel}`]: true
      }"
    >
      <nav class="icon-rail" :aria-label="t('dashboard.nav.sections')">
        <button type="button" class="rail-button active" :aria-label="t('dashboard.nav.dashboard')">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M1.5 7L8 1.5 14.5 7v8h-13V7z" />
          </svg>
        </button>
        <button
          v-if="isLayerSidebarCollapsed"
          type="button"
          class="rail-button"
          data-testid="expand-layers-sidebar"
          :aria-label="t('dashboard.layers.expand')"
          aria-controls="layers-sidebar-content"
          :aria-expanded="false"
          :title="t('dashboard.layers.expand')"
          @click="toggleLayerSidebar"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M6 4l4 4-4 4" />
          </svg>
        </button>
        <button type="button" class="rail-button" :aria-label="t('dashboard.nav.stations')">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="8" cy="6" r="3.5" />
            <path d="M8 9.5V14" />
          </svg>
        </button>
        <button type="button" class="rail-button" :aria-label="t('dashboard.nav.tables')">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="2" y="3" width="12" height="10" rx="1.5" />
            <path d="M2 7h12M6 3v10" />
          </svg>
        </button>
      </nav>

      <aside
        class="layer-sidebar"
        :data-collapsed="isLayerSidebarCollapsed"
        :aria-label="t('dashboard.layers.aria')"
      >
        <div v-if="!isLayerSidebarCollapsed" id="layers-sidebar-content" class="sidebar-content">
          <div class="sidebar-head">
            <h2>{{ t("dashboard.layers.title") }}</h2>
            <div class="sidebar-head-actions">
              <span>{{ t("dashboard.layers.allOff") }}</span>
              <button
                type="button"
                class="collapse-button"
                data-testid="collapse-layers-sidebar"
                :aria-label="t('dashboard.layers.collapse')"
                aria-controls="layers-sidebar-content"
                :aria-expanded="true"
                @click="toggleLayerSidebar"
              >
                ‹
              </button>
            </div>
          </div>

          <div class="layer-group">
            <p class="group-label">{{ t("dashboard.layers.moving") }}</p>
            <article
              v-for="overlay in movingOverlays"
              :key="overlay.id"
              class="layer-card active"
              :class="{ inactive: !visibleOverlayIds.includes(overlay.id) }"
              :data-testid="`overlay-${overlay.id}`"
              @click="store.toggleOverlay(overlay.id)"
            >
              <span class="layer-icon">M</span>
              <strong>{{ overlay.title }}</strong>
              <span class="layer-count">
                {{ visibleOverlayIds.includes(overlay.id) ? activeTrainCount : "OFF" }}
              </span>
            </article>
            <div class="layer-settings">
              <div><span>{{ t("dashboard.layers.train") }}</span><strong>ON</strong></div>
              <div><span>{{ t("dashboard.layers.track") }}</span><strong>3D</strong></div>
              <div><span>{{ t("dashboard.layers.railZ") }}</span><strong>+58m</strong></div>
              <div><span>{{ t("dashboard.layers.glow") }}</span><strong>0.7</strong></div>
            </div>
          </div>

          <div class="layer-group">
            <p class="group-label">{{ routeOverlay?.title ?? t("dashboard.layers.route") }}</p>
            <article
              v-for="overlay in stationOverlays"
              :key="overlay.id"
              class="layer-card active compact"
              :class="{ inactive: !visibleOverlayIds.includes(overlay.id) }"
              :data-testid="`overlay-${overlay.id}`"
              @click="store.toggleOverlay(overlay.id)"
            >
              <span class="layer-icon">S</span>
              <strong>{{ overlay.title }}</strong>
              <span class="layer-count">
                {{ visibleOverlayIds.includes(overlay.id) ? "ON" : "OFF" }}
              </span>
            </article>
            <LayerControl :lines="mrtLines" />
          </div>
        </div>
      </aside>

      <MobilePanelSwitch
        class="mobile-panel-switch-shell"
        :active-panel="activeMobilePanel"
        :open="isMobileControlsOpen"
        @select="showMobilePanel"
        @update:open="setMobileControlsOpen"
      />

      <section class="map-region" :aria-label="t('dashboard.map.dashboard')">
        <MrtMap :lines="visibleLines" :stations="mrtStations" />
      </section>

      <StationPanel
        class="station-panel"
        :collapsed="isStationPanelCollapsed"
        :error="liveBoardError"
        :is-loading="liveBoardLoading"
        :station="selectedStation"
        :live-boards="selectedLiveBoards"
        :updated-label="timelineUpdatedLabel"
        @refresh="store.refreshLiveBoards"
        @toggle-collapse="toggleStationPanel"
      />
    </div>

    <footer class="timeline" :aria-label="t('dashboard.timeline.aria')">
      <section class="timeline-panel timeline-panel-meta">
        <div class="timeline-meta-copy">
          <strong class="timeline-timestamp">{{ timelineTimestampLabel }}</strong>
          <span class="timeline-updated">{{ timelineUpdatedLabel }}</span>
        </div>
      </section>

      <section class="timeline-panel timeline-panel-player">
        <div class="timeline-scrubber-head">
          <small>{{ t("dashboard.timeline.feed", { source: liveBoardSourceLabel }) }}</small>
          <span class="timeline-position">{{ timelineSnapshotPositionLabel }}</span>
        </div>

        <div class="timeline-slider-shell">
          <input
            class="timeline-slider"
            type="range"
            :min="0"
            :max="Math.max(timelineSnapshots.length - 1, 0)"
            :value="timelineCursorIndex"
            :disabled="timelineSnapshots.length <= 1"
            :aria-label="t('dashboard.timeline.aria')"
            @input="scrubTimelineFromEvent"
          />
          <div class="timeline-track" aria-hidden="true">
            <span :style="{ width: timelineTrackFill }" />
          </div>
        </div>

        <div class="timeline-controls-row">
          <div class="timeline-buttons" role="group" :aria-label="t('dashboard.timeline.aria')">
            <button
              type="button"
              :aria-label="t('dashboard.timeline.previous')"
              :disabled="!timelineHasReplay || timelineCursorIndex <= 0"
              @click="store.stepTimeline(-1)"
            >
              ‹
            </button>
            <button
              type="button"
              class="timeline-live-toggle"
              :aria-label="
                timelineMode === 'live'
                  ? t('dashboard.timeline.pause')
                  : t('dashboard.timeline.live')
              "
              data-testid="timeline-live-toggle"
              @click="setLiveMode(timelineMode === 'live' ? 'paused' : 'live')"
            >
              {{ timelineMode === "live" ? "Ⅱ" : "▶" }}
            </button>
            <button
              type="button"
              :aria-label="t('dashboard.timeline.next')"
              :disabled="!timelineHasReplay || timelineCursorIndex >= timelineSnapshots.length - 1"
              @click="store.stepTimeline(1)"
            >
              ›
            </button>
          </div>

          <button type="button" class="now-button" @click="setLiveMode('live')">
            {{ t("dashboard.timeline.now") }}
          </button>

          <span class="timeline-mode-pill" :data-mode="timelineMode">
            {{ timelineModeLabel }}
          </span>
        </div>
      </section>

      <section class="timeline-panel timeline-panel-sidecar">
        <div class="timeline-frequency">
          <span class="timeline-frequency-label">{{ t("dashboard.timeline.every") }}</span>
          <div class="timeline-intervals" data-testid="timeline-intervals">
            <button
              v-for="intervalMs in supportedLiveRefreshIntervalsMs"
              :key="intervalMs"
              type="button"
              class="interval-button"
              :class="{ active: liveRefreshIntervalMs === intervalMs }"
              :aria-pressed="liveRefreshIntervalMs === intervalMs"
              @click="setLiveRefreshInterval(intervalMs)"
            >
              {{ intervalMs < 60000 ? `${intervalMs / 1000}s` : "1m" }}
            </button>
          </div>
        </div>
      </section>
    </footer>
  </main>
</template>

<style scoped>
.dashboard-shell {
  --bg: var(--twf-color-canvas);
  --surface: var(--twf-color-surface);
  --white: var(--twf-color-surface-raised);
  --border: var(--twf-color-border);
  --border-soft: var(--twf-color-border-soft);
  --text: var(--twf-color-text);
  --text-muted: var(--twf-color-text-muted);
  --text-faint: var(--twf-color-text-faint);

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
.topbar-actions a,
.timeline button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  border: 1px solid var(--border);
  border-radius: 7px;
  padding: 0 12px;
  background: var(--surface);
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 600;
  text-decoration: none;
}

.topbar-actions .primary,
.timeline .now-button {
  border-color: var(--text);
  background: var(--text);
  color: var(--white);
}

.workspace {
  --layers-width: 228px;
  --station-width: minmax(320px, 360px);

  display: grid;
  flex: 1;
  min-height: 0;
  grid-template-columns: 44px var(--layers-width) minmax(0, 1fr) var(--station-width);
  transition: grid-template-columns 180ms ease;
}

.workspace.layers-collapsed {
  --layers-width: 0px;
}

.workspace.station-collapsed {
  --station-width: 36px;
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
  overflow: hidden;
  border-right: 1px solid var(--border);
  background: var(--surface);
}

.layer-sidebar[data-collapsed="true"] {
  border-right: 0;
  background: var(--white);
}

.sidebar-content {
  min-width: 228px;
}

.sidebar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 52px;
  border-bottom: 1px solid var(--border);
  padding: 0 14px;
}

.sidebar-head-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
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

.collapse-button {
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--surface);
  color: var(--text-muted);
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
.rail-button:hover {
  border-color: var(--text-muted);
  color: var(--text);
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

.layer-card.inactive {
  opacity: 0.58;
}

.layer-card.compact {
  margin-bottom: 10px;
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
  color: var(--twf-color-route-red);
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
  overflow: hidden;
  background: var(--twf-color-border);
}

.station-panel {
  min-width: 0;
}

.mobile-panel-switch-shell {
  display: none;
}

.timeline {
  display: grid;
  grid-template-columns: minmax(180px, 260px) minmax(420px, 1fr) minmax(180px, 240px);
  align-items: stretch;
  gap: 8px;
  border-top: 1px solid var(--border);
  padding: 10px 14px;
  background: var(--surface);
  color: var(--text-muted);
  font-size: 0.75rem;
}

.timeline-panel {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  min-height: 78px;
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  padding: 12px 14px;
  background: var(--white);
  box-shadow: 0 1px 2px color-mix(in srgb, var(--text) 7%, transparent);
}

.timeline-buttons {
  display: inline-flex;
  overflow: hidden;
  gap: 0;
  border: 1px solid var(--border);
  border-radius: 9px;
  padding: 0;
  background: var(--white);
}

.timeline-buttons button {
  width: 34px;
  min-height: 32px;
  border: 0;
  border-radius: 0;
  padding: 0;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.86rem;
}

.timeline-buttons button + button {
  border-left: 1px solid var(--border-soft);
}

.timeline-live-toggle {
  background: var(--text) !important;
  color: var(--white) !important;
}

.timeline-mode-pill {
  display: flex;
  align-items: center;
  min-height: 28px;
  border-radius: 999px;
  border: 1px solid var(--border-soft);
  padding: 0 10px;
  background: var(--surface);
  color: var(--text);
  font-weight: 700;
  white-space: nowrap;
}

.timeline-mode-pill[data-mode="live"] {
  background: color-mix(in srgb, var(--twf-color-route-green) 16%, var(--white));
  color: color-mix(in srgb, var(--twf-color-route-green) 64%, var(--text));
}

.timeline-panel-meta {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-content: center;
}

.timeline-meta-copy {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.timeline-timestamp {
  min-width: 0;
  color: var(--text);
  font-size: 0.96rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.timeline-updated {
  color: var(--text-faint);
}

.timeline-frequency {
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 9px;
  min-width: 0;
}

.timeline-frequency-label {
  color: var(--text-faint);
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  white-space: nowrap;
}

.timeline-panel-player {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-content: center;
  gap: 10px;
}

.timeline-intervals {
  display: inline-grid;
  grid-template-columns: repeat(4, minmax(38px, 1fr));
  gap: 0;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--white);
}

.interval-button {
  min-width: 0;
  min-height: 34px;
  border: 0;
  border-radius: 0;
  padding-inline: 9px;
  background: transparent;
}

.interval-button + .interval-button {
  border-left: 1px solid var(--border-soft);
}

.interval-button.active {
  background: var(--text);
  color: var(--white);
}

.interval-button:not(.active) {
  color: var(--text);
}

.timeline-scrubber-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.timeline-position {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  border: 1px solid var(--border-soft);
  border-radius: 999px;
  padding: 0 8px;
  background: var(--surface);
  color: var(--text);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.timeline-slider-shell {
  display: grid;
  min-width: 0;
  align-items: center;
}

.timeline-controls-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  flex-wrap: wrap;
}

.timeline-panel-sidecar {
  justify-content: center;
}

.timeline-track {
  grid-area: 1 / 1;
  height: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--border-soft);
}

.timeline-slider {
  grid-area: 1 / 1;
  z-index: 1;
  width: 100%;
  margin: 0;
  appearance: none;
  background: transparent;
}

.timeline-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--twf-color-route-blue);
}

.timeline small {
  color: var(--text-faint);
}

.timeline-slider::-webkit-slider-runnable-track {
  height: 7px;
  background: transparent;
}

.timeline-slider::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  margin-top: -6px;
  border: 3px solid var(--white);
  border-radius: 999px;
  background: var(--twf-color-route-blue);
  box-shadow: 0 3px 10px color-mix(in srgb, var(--twf-color-route-blue) 35%, transparent);
}

.timeline-slider::-moz-range-track {
  height: 7px;
  background: transparent;
}

.timeline-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border: 3px solid var(--white);
  border-radius: 999px;
  background: var(--twf-color-route-blue);
  box-shadow: 0 3px 10px color-mix(in srgb, var(--twf-color-route-blue) 35%, transparent);
}

.timeline button:disabled,
.timeline-slider:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

@media (max-width: 1023px) {
  .dashboard-shell {
    min-height: 100svh;
    overflow: auto;
  }

  .workspace {
    --layers-width: 0px;
    --station-width: auto;

    flex: none;
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(340px, 52vh) auto;
  }

  .topbar {
    flex-wrap: wrap;
    padding: 10px 12px;
  }

  .line-stats,
  .topbar-actions,
  .icon-rail,
  .layer-sidebar,
  .station-panel,
  .timeline {
    display: none;
  }

  .map-region {
    grid-row: 2;
    min-height: 0;
    height: min(52vh, 560px);
  }

  .workspace.mobile-panel-map {
    flex: 1;
    grid-template-rows: auto minmax(520px, 1fr);
  }

  .workspace.mobile-panel-map .map-region {
    height: auto;
    min-height: 520px;
  }

  .mobile-panel-switch-shell {
    grid-row: 1;
    display: grid;
  }

  .workspace.mobile-panel-layers .layer-sidebar,
  .workspace.mobile-panel-detail .station-panel {
    grid-row: 3;
    display: block;
  }

  .workspace.mobile-panel-layers .layer-sidebar {
    border-top: 1px solid var(--border);
    border-right: 0;
    overflow: auto;
    max-height: min(44vh, 520px);
  }

  .workspace.mobile-panel-layers .sidebar-content {
    min-width: 0;
  }

  .workspace.mobile-panel-detail .station-panel {
    min-height: 280px;
    max-height: min(44vh, 520px);
    overflow: auto;
  }

  .workspace.mobile-panel-time + .timeline {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--twf-space-2);
    max-height: none;
    padding: var(--twf-space-2);
  }

  .workspace.mobile-panel-time + .timeline .timeline-panel {
    min-height: auto;
    padding: 12px;
  }

  .workspace.mobile-panel-time + .timeline .timeline-panel-controls {
    flex-wrap: wrap;
  }

  .workspace.mobile-panel-time + .timeline .timeline-controls-row {
    justify-content: flex-start;
  }

  .workspace.mobile-panel-time + .timeline .timeline-frequency {
    align-items: flex-start;
  }

  .workspace.mobile-panel-time + .timeline .timeline-scrubber-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .workspace.mobile-panel-time + .timeline .timeline-timestamp {
    white-space: normal;
  }
}
</style>
