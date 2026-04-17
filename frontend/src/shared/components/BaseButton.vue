<script setup lang="ts">
defineProps<{
  variant?: "primary" | "secondary" | "ghost";
}>();
</script>

<template>
  <button class="base-button" :data-variant="variant ?? 'secondary'" type="button">
    <slot />
  </button>
</template>

<style scoped>
.base-button {
  min-height: 34px;
  border: 1px solid var(--twf-color-border);
  border-radius: var(--twf-radius-sm);
  padding: 0 14px;
  background: var(--twf-color-surface);
  color: var(--twf-color-text-muted);
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 700;
}

.base-button:hover {
  border-color: var(--twf-color-text-faint);
  color: var(--twf-color-text);
}

.base-button[data-variant="primary"] {
  border-color: var(--twf-color-text);
  background: var(--twf-color-text);
  color: var(--twf-color-surface);
}

.base-button[data-variant="ghost"] {
  border-color: transparent;
  background: transparent;
}
</style>
