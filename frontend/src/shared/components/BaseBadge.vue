<script setup lang="ts">
defineProps<{
  tone?: "neutral" | "warm" | "red" | "blue" | "green";
}>();
</script>

<template>
  <span class="base-badge" :data-tone="tone ?? 'neutral'">
    <slot />
  </span>
</template>

<style scoped>
.base-badge {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  border: 1px solid var(--twf-color-border);
  border-radius: 999px;
  padding: 2px 10px;
  background: var(--twf-color-surface);
  color: var(--twf-color-text-muted);
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1;
}

.base-badge[data-tone="warm"] {
  border-color: #e7c9be;
  background: var(--twf-color-accent-warm-soft);
  color: #8a4b39;
}

.base-badge[data-tone="red"] {
  border-color: #f1c7cc;
  background: #fbeaea;
  color: var(--twf-color-route-red);
}

.base-badge[data-tone="blue"] {
  border-color: #c8d7f4;
  background: #eaf0fb;
  color: var(--twf-color-route-blue);
}

.base-badge[data-tone="green"] {
  border-color: #c8e3d2;
  background: #eaf5ee;
  color: var(--twf-color-route-green);
}
</style>
