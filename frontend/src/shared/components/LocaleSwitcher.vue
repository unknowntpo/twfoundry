<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { type AppLocale, setAppLocale, supportedLocales } from "@/shared/i18n";

const { locale, t } = useI18n();

function updateLocale(event: Event): void {
  const nextLocale = (event.target as HTMLSelectElement).value as AppLocale;
  setAppLocale(nextLocale);
}
</script>

<template>
  <label class="locale-switcher">
    <span>{{ t("common.language") }}</span>
    <select :value="locale" :aria-label="t('common.language')" @change="updateLocale">
      <option v-for="appLocale in supportedLocales" :key="appLocale" :value="appLocale">
        {{
          appLocale === "zh-TW"
            ? t("common.traditionalChinese")
            : t("common.english")
        }}
      </option>
    </select>
  </label>
</template>

<style scoped>
.locale-switcher {
  display: inline-flex;
  align-items: center;
  gap: var(--twf-space-2);
  color: var(--twf-color-text-muted);
  font-size: 0.75rem;
  font-weight: 700;
}

.locale-switcher select {
  min-height: 30px;
  border: 1px solid var(--twf-color-border);
  border-radius: var(--twf-radius-sm);
  padding: 0 var(--twf-space-2);
  background: var(--twf-color-surface);
  color: var(--twf-color-text-muted);
  font: inherit;
}

@media (max-width: 1023px) {
  .locale-switcher span {
    display: none;
  }
}
</style>
