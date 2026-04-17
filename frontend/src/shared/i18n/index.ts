import { createI18n } from "vue-i18n";
import { loadStoredLocale, persistLocale } from "./locale";
import { defaultLocale, type MessageSchema, messages } from "./messages";

const initialLocale =
  typeof window === "undefined" ? defaultLocale : loadStoredLocale(window.localStorage);

export const i18n = createI18n<[MessageSchema], keyof typeof messages>({
  fallbackLocale: defaultLocale,
  legacy: false,
  locale: initialLocale,
  messages,
});

export function setAppLocale(locale: keyof typeof messages): void {
  (i18n.global.locale as unknown as { value: keyof typeof messages }).value = locale;
  if (typeof window !== "undefined") {
    persistLocale(locale, window.localStorage);
  }
}

export type { AppLocale } from "./messages";
export { defaultLocale, supportedLocales } from "./messages";
