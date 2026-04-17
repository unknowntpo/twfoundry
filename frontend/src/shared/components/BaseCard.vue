<template>
  <article class="base-card">
    <slot />
  </article>
</template>

<style scoped>
.base-card {
  border: 1px solid var(--twf-color-border);
  border-radius: var(--twf-radius-xl);
  background: var(--twf-color-surface);
  padding: var(--twf-space-6);
}
</style>
