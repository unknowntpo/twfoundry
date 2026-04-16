<script setup lang="ts">
import { useMrtDashboardStore } from "@/app/stores/mrt-dashboard";
import type { MrtLine } from "../types";

defineProps<{
  lines: MrtLine[];
}>();

const store = useMrtDashboardStore();
</script>

<template>
  <div class="layer-control" aria-label="MRT layer controls">
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
  gap: 8px;
}

.layer-button {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  min-height: 38px;
  gap: 8px;
  border: 0;
  border-radius: 8px;
  padding: 7px 8px;
  background: transparent;
  color: #26241e;
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
  box-shadow: inset 0 0 0 1px rgba(38, 36, 30, 0.08);
  content: "";
}

.layer-button.muted {
  color: #9b9485;
}

.layer-button.muted::after {
  background: #ddd9ce;
}

.line-dot {
  width: 24px;
  height: 24px;
  flex: 0 0 auto;
  border: 1px solid #ddd9ce;
  border-radius: 7px;
  background:
    linear-gradient(var(--line-color), var(--line-color)) center / 14px 3px no-repeat,
    #fafaf7;
}
</style>
