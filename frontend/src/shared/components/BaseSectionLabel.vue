<template>
  <p class="base-section-label">
    <slot />
  </p>
</template>

<style scoped>
.base-section-label {
  margin: 0;
  color: var(--twf-color-text-faint);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  line-height: 1.3;
  text-transform: uppercase;
}
</style>
