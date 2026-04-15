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
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  max-width: 420px;
}

.layer-button {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  gap: 8px;
  border: 1px solid rgba(32, 33, 36, 0.16);
  border-radius: 8px;
  padding: 7px 10px;
  background: rgba(255, 255, 255, 0.92);
  color: #202124;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(32, 33, 36, 0.08);
}

.layer-button.muted {
  opacity: 0.52;
}

.line-dot {
  width: 10px;
  height: 10px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: var(--line-color);
}
</style>
