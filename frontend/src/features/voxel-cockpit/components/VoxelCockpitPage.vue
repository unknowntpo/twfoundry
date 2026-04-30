<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { type VoxelModuleKey, voxelModules } from "@/features/design-system/voxel/modules";
import VoxelPreview from "@/features/design-system/voxel/VoxelPreview.vue";
import BaseBadge from "@/shared/components/BaseBadge.vue";
import LocaleSwitcher from "@/shared/components/LocaleSwitcher.vue";

const { t } = useI18n();

const selectedModule = ref<VoxelModuleKey>("moving-object");
const timelineMode = ref<"live" | "replay">("live");
const activeOverlays = ref(["metro", "rain", "air", "incidents"]);

const overlayKeys = ["metro", "rain", "air", "incidents"] as const;
const metricKeys = ["trains", "rainfall", "pm25", "incidents"] as const;
const eventKeys = ["signal", "rain", "air"] as const;

const selectedModuleDetail = computed(
  () => voxelModules.find((module) => module.key === selectedModule.value) ?? voxelModules[0],
);

function toggleOverlay(key: string): void {
  activeOverlays.value = activeOverlays.value.includes(key)
    ? activeOverlays.value.filter((item) => item !== key)
    : [...activeOverlays.value, key];
}
</script>

<template>
  <main class="voxel-cockpit">
    <header class="topbar">
      <RouterLink class="brand" to="/">
        <span aria-hidden="true">TW</span>
        <strong>{{ t("voxelCockpit.brand") }}</strong>
      </RouterLink>

      <div class="status-strip" aria-label="Operational status">
        <BaseBadge tone="green">{{ t("voxelCockpit.status.live") }}</BaseBadge>
        <BaseBadge tone="blue">{{ t("voxelCockpit.status.taipei") }}</BaseBadge>
        <BaseBadge tone="warm">{{ t("voxelCockpit.status.timeline") }}</BaseBadge>
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
            v-for="key in overlayKeys"
            :key="key"
            type="button"
            :class="{ active: activeOverlays.includes(key) }"
            @click="toggleOverlay(key)"
          >
            <span class="overlay-dot" :data-overlay="key" aria-hidden="true" />
            <span>
              <strong>{{ t(`voxelCockpit.overlays.${key}.title`) }}</strong>
              <small>{{ t(`voxelCockpit.overlays.${key}.body`) }}</small>
            </span>
            <BaseBadge :tone="activeOverlays.includes(key) ? 'red' : 'neutral'">
              {{
                activeOverlays.includes(key)
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

        <VoxelPreview class="world-preview" :module-key="selectedModule" />

        <div class="world-metrics" aria-label="Live metrics">
          <article v-for="key in metricKeys" :key="key">
            <span>{{ t(`voxelCockpit.metrics.${key}.label`) }}</span>
            <strong>{{ t(`voxelCockpit.metrics.${key}.value`) }}</strong>
          </article>
        </div>
      </section>

      <aside class="panel right-panel" aria-label="Ontology object">
        <p class="eyebrow">{{ t("voxelCockpit.inspector.label") }}</p>
        <h2>{{ t("voxelCockpit.inspector.title") }}</h2>
        <p>{{ t("voxelCockpit.inspector.body") }}</p>

        <div class="object-card">
          <BaseBadge tone="red">{{ selectedModuleDetail.renderer }}</BaseBadge>
          <h3>{{ t("voxelCockpit.inspector.objectTitle") }}</h3>
          <dl>
            <div>
              <dt>{{ t("voxelCockpit.inspector.kind") }}</dt>
              <dd>{{ selectedModuleDetail.visualRole }}</dd>
            </div>
            <div>
              <dt>{{ t("voxelCockpit.inspector.overlay") }}</dt>
              <dd>{{ t("voxelCockpit.inspector.overlayValue") }}</dd>
            </div>
            <div>
              <dt>{{ t("voxelCockpit.inspector.relationship") }}</dt>
              <dd>{{ t("voxelCockpit.inspector.relationshipValue") }}</dd>
            </div>
          </dl>
        </div>

        <div class="event-list">
          <article v-for="key in eventKeys" :key="key">
            <span>{{ t(`voxelCockpit.events.${key}.time`) }}</span>
            <strong>{{ t(`voxelCockpit.events.${key}.title`) }}</strong>
            <p>{{ t(`voxelCockpit.events.${key}.body`) }}</p>
          </article>
        </div>
      </aside>
    </section>

    <footer class="timeline">
      <div class="transport">
        <button type="button" @click="timelineMode = timelineMode === 'live' ? 'replay' : 'live'">
          {{ timelineMode === "live" ? t("voxelCockpit.timeline.pause") : t("voxelCockpit.timeline.play") }}
        </button>
        <strong>{{ t("voxelCockpit.timeline.time") }}</strong>
        <BaseBadge :tone="timelineMode === 'live' ? 'green' : 'warm'">
          {{ timelineMode === "live" ? t("voxelCockpit.timeline.live") : t("voxelCockpit.timeline.replay") }}
        </BaseBadge>
      </div>
      <div class="track" aria-hidden="true">
        <span />
      </div>
      <div class="speed">
        <button type="button">1x</button>
        <button type="button" class="active">20x</button>
        <button type="button">60x</button>
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

.world-preview {
  min-height: 100%;
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
