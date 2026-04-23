import type { LocalizedText } from "./types";

export function resolveLocalizedText(
  locale: string,
  value: LocalizedText | undefined,
  fallback?: string,
): string | undefined {
  if (!value) {
    return fallback;
  }

  const normalizedLocale = locale.toLowerCase();
  if (normalizedLocale.startsWith("zh")) {
    return value.Zh_tw?.trim() || value.En?.trim() || fallback;
  }

  return value.En?.trim() || value.Zh_tw?.trim() || fallback;
}
