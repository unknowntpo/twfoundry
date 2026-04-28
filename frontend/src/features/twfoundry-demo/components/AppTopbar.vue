<script setup lang="ts">
import type { DemoTab } from "../data";

const tabs: Array<{ id: DemoTab; label: string; enabled: boolean }> = [
  { id: "map", label: "Map", enabled: true },
  { id: "pipelines", label: "Pipelines", enabled: false },
  { id: "ontology", label: "Ontology", enabled: true },
  { id: "workshop", label: "Workshop", enabled: false },
  { id: "issues", label: "Issues", enabled: false },
];

defineProps<{
  activeTab: DemoTab;
  onlineLabel: string;
}>();

const emit = defineEmits<{
  "update:activeTab": [tab: DemoTab];
}>();
</script>

<template>
  <header class="app-topbar">
    <div class="brand-lockup">
      <span class="brand-mark" aria-hidden="true">
        <i />
      </span>
      <strong>TWFoundry</strong>
      <span>/ Operational view</span>
    </div>

    <nav class="tab-list" aria-label="Demo sections">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        :class="{ active: activeTab === tab.id }"
        :disabled="!tab.enabled"
        @click="emit('update:activeTab', tab.id)"
      >
        {{ tab.label }}
      </button>
    </nav>

    <div class="status-strip" aria-label="System status">
      <span class="online-dot" aria-hidden="true" />
      <span>{{ onlineLabel }}</span>
      <span>LAT 25.04</span>
      <span>LON 121.56</span>
    </div>
  </header>
</template>

<style scoped>
.app-topbar {
  display: grid;
  grid-template-columns:
    var(--demo-left-sidebar-width, clamp(330px, 22vw, 430px)) 1fr
    var(--demo-right-sidebar-width, clamp(390px, 26vw, 520px));
  align-items: center;
  min-height: 70px;
  border-bottom: 1px solid var(--twf-color-border);
  background: var(--twf-color-surface-raised);
  color: var(--twf-color-text);
}

.brand-lockup,
.status-strip {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 clamp(22px, 1.9vw, 38px);
  min-width: 0;
}

.brand-lockup strong {
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(1.2rem, 1.25vw, 1.55rem);
}

.brand-lockup span:last-child,
.status-strip {
  color: var(--twf-color-text-faint);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: clamp(0.7rem, 0.72vw, 0.9rem);
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.brand-mark {
  position: relative;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--twf-color-text);
  border-radius: 999px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  line-height: 1;
}

.brand-mark::before,
.brand-mark::after {
  position: absolute;
  background: rgba(31, 27, 23, 0.72);
  content: "";
}

.brand-mark::before {
  width: 1px;
  height: 30px;
}

.brand-mark::after {
  width: 30px;
  height: 1px;
}

.brand-mark i {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1;
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--twf-color-accent-warm);
}

.tab-list {
  display: flex;
  align-items: stretch;
  justify-content: center;
  min-height: 70px;
}

.tab-list button {
  border: 0;
  border-bottom: 4px solid transparent;
  background: transparent;
  padding: 0 clamp(12px, 1vw, 18px);
  color: var(--twf-color-text-muted);
  cursor: pointer;
  font-size: clamp(0.9rem, 0.9vw, 1.08rem);
}

.tab-list button.active {
  border-bottom-color: var(--twf-color-accent-warm);
  color: var(--twf-color-text);
  font-weight: 700;
}

.tab-list button:disabled {
  color: var(--twf-color-text-faint);
  cursor: default;
  opacity: 0.55;
}

.status-strip {
  justify-content: flex-end;
}

.online-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--twf-color-route-green);
  animation: online-breathe 1.8s ease-in-out infinite;
  box-shadow: 0 0 0 5px rgba(47, 158, 98, 0.14);
}

@keyframes online-breathe {
  0%,
  100% {
    opacity: 0.78;
    transform: scale(0.9);
    box-shadow: 0 0 0 4px rgba(47, 158, 98, 0.12);
  }

  50% {
    opacity: 1;
    transform: scale(1.08);
    box-shadow: 0 0 0 8px rgba(47, 158, 98, 0.2);
  }
}

@media (max-width: 920px) {
  .app-topbar {
    grid-template-columns: 1fr;
  }

  .tab-list {
    justify-content: flex-start;
    overflow-x: auto;
    border-top: 1px solid var(--twf-color-border-soft);
  }

  .status-strip {
    display: none;
  }
}
</style>
