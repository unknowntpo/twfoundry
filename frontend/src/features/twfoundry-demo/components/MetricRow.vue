<script setup lang="ts">
defineProps<{
  label: string;
  value: string | number;
  accent?: boolean;
}>();
</script>

<template>
  <div class="metric-row">
    <span>{{ label }}</span>
    <strong :class="{ accent }">{{ value }}</strong>
  </div>
</template>

<style scoped>
.metric-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px dotted var(--twf-color-border);
  padding: 7px 0;
}

.metric-row span {
  color: var(--twf-color-text-faint);
  font-size: clamp(0.82rem, 0.78vw, 0.94rem);
}

.metric-row strong {
  color: var(--twf-color-text);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: clamp(0.9rem, 0.82vw, 1rem);
}

.metric-row strong.accent {
  color: var(--twf-color-accent-warm);
}
</style>
