import { type AppLocale, defaultLocale, supportedLocales } from "./messages";

export const localeStorageKey = "twfoundry.locale";

export function isSupportedLocale(value: string | null | undefined): value is AppLocale {
  return supportedLocales.includes(value as AppLocale);
}

export function resolveLocale(value: string | null | undefined): AppLocale {
  return isSupportedLocale(value) ? value : defaultLocale;
}

export function loadStoredLocale(storage: Pick<Storage, "getItem"> | undefined): AppLocale {
  if (!storage) {
    return defaultLocale;
  }

  try {
    return resolveLocale(storage.getItem(localeStorageKey));
  } catch {
    return defaultLocale;
  }
}

export function persistLocale(
  locale: AppLocale,
  storage: Pick<Storage, "setItem"> | undefined,
): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(localeStorageKey, locale);
  } catch {
    // Ignore unavailable storage. Locale switching should still work in memory.
  }
}
