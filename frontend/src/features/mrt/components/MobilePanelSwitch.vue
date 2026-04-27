<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

type MobilePanelId = "layers" | "detail" | "time";

const props = defineProps<{
  activePanel: MobilePanelId;
  open: boolean;
}>();

const emit = defineEmits<{
  "update:open": [open: boolean];
  select: [panel: MobilePanelId];
}>();

const { t } = useI18n();

const panelOptions = computed<MobilePanelId[]>(() => ["layers", "detail", "time"]);
const activePanelLabel = computed(() => t(`dashboard.compactPanels.${props.activePanel}`));

function toggleOpen(): void {
  emit("update:open", !props.open);
}

function selectPanel(panel: MobilePanelId): void {
  emit("select", panel);
  emit("update:open", false);
}
</script>

<template>
  <nav
    class="mobile-panel-switch"
    :data-open="open"
    :aria-label="t('dashboard.compactPanels.aria')"
    data-testid="mobile-panel-switch"
  >
    <button
      type="button"
      class="mobile-panel-switch__toggle"
      :aria-expanded="open"
      @click="toggleOpen"
    >
      <span>{{ activePanelLabel }}</span>
      <span class="mobile-panel-switch__chevron" aria-hidden="true">
        {{ open ? "⌃" : "⌄" }}
      </span>
    </button>
    <div class="mobile-panel-switch__options">
      <button
        v-for="panel in panelOptions"
        :key="panel"
        type="button"
        :aria-pressed="activePanel === panel"
        @click="selectPanel(panel)"
      >
        {{ t(`dashboard.compactPanels.${panel}`) }}
      </button>
    </div>
  </nav>
</template>

<style scoped>
.mobile-panel-switch {
  display: grid;
  gap: 6px;
  border-bottom: 1px solid var(--twf-color-border);
  padding: var(--twf-space-1) var(--twf-space-2);
  background: var(--twf-color-surface-raised);
}

.mobile-panel-switch__toggle,
.mobile-panel-switch__options button {
  min-height: 44px;
  border: 0;
  border-radius: var(--twf-radius-sm);
  background: transparent;
  color: var(--twf-color-text-muted);
  font: inherit;
  font-size: 0.72rem;
  font-weight: 800;
}

.mobile-panel-switch__toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid var(--twf-color-border);
  padding: 0 12px;
  background: var(--twf-color-surface);
  color: var(--twf-color-text);
  text-align: left;
}

.mobile-panel-switch__chevron {
  display: grid;
  width: 26px;
  height: 26px;
  place-items: center;
  border-radius: 999px;
  background: var(--twf-color-surface-raised);
  color: var(--twf-color-text-muted);
}

.mobile-panel-switch__options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.mobile-panel-switch[data-open="false"] .mobile-panel-switch__options {
  display: none;
}

.mobile-panel-switch__options button[aria-pressed="true"] {
  background: var(--twf-color-text);
  color: var(--twf-color-surface-raised);
}
</style>
