<template>
  <section class="base-panel">
    <slot />
  </section>
</template>

<style scoped>
.base-panel {
  border: 1px solid var(--twf-color-border-soft);
  border-radius: var(--twf-radius-lg);
  background: var(--twf-color-canvas);
  padding: var(--twf-space-4);
}
</style>
