<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useMrtDashboardStore } from "@/app/stores/mrt-dashboard";
import type { MrtLine } from "../types";

defineProps<{
  lines: MrtLine[];
}>();

const store = useMrtDashboardStore();
const { t } = useI18n();
</script>

<template>
  <div class="layer-control" :aria-label="t('dashboard.layers.controls')">
    <button
      v-for="line in lines"
      :key="line.id"
      type="button"
      class="layer-button"
      :class="{ muted: !store.visibleLineIds.includes(line.id) }"
      :style="{ '--line-color': line.color }"
      :aria-pressed="store.visibleLineIds.includes(line.id)"
      @click="store.toggleLine(line.id)"
    >
      <span class="line-dot" aria-hidden="true" />
      {{ line.name }}
    </button>
  </div>
</template>

<style scoped>
.layer-control {
  display: grid;
  gap: var(--twf-space-2);
}

.layer-button {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  min-height: 38px;
  gap: var(--twf-space-2);
  border: 0;
  border-radius: var(--twf-radius-md);
  padding: 7px 8px;
  background: transparent;
  color: var(--twf-color-text);
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 700;
  text-align: left;
}

.layer-button::after {
  display: block;
  width: 28px;
  height: 16px;
  border-radius: 999px;
  background: var(--line-color);
  box-shadow: var(--twf-shadow-hairline);
  content: "";
}

.layer-button.muted {
  color: var(--twf-color-text-faint);
}

.layer-button.muted::after {
  background: var(--twf-color-border);
}

.line-dot {
  width: 24px;
  height: 24px;
  flex: 0 0 auto;
  border: 1px solid var(--twf-color-border);
  border-radius: var(--twf-radius-sm);
  background:
    linear-gradient(var(--line-color), var(--line-color)) center / 14px 3px no-repeat,
    var(--twf-color-surface);
}
</style>
