import type { ComposerTranslation } from "vue-i18n";
import { resolveLocalizedText } from "./localized-text";
import type { LocalizedText, MrtLineId } from "./types";

const knownLineIds: MrtLineId[] = ["red", "blue", "green", "orange", "brown", "yellow"];

export function formatMrtLineName(t: ComposerTranslation, lineId: string): string {
  if (knownLineIds.includes(lineId as MrtLineId)) {
    return t(`dashboard.station.lineNames.${lineId}`);
  }

  return t("dashboard.station.lineNames.neutral");
}

export function resolveMrtLineLabel(
  t: ComposerTranslation,
  locale: string,
  lineId: string,
  apiLineName?: LocalizedText,
): string {
  const localizedLabel = resolveLocalizedText(locale, apiLineName);
  return localizedLabel ?? formatMrtLineName(t, lineId);
}
