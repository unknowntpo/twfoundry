import { describe, expect, it, vi } from "vitest";
import { isSupportedLocale, loadStoredLocale, localeStorageKey, persistLocale } from "./locale";
import { defaultLocale } from "./messages";

describe("locale resolution", () => {
  it("accepts supported locales and rejects unknown values", () => {
    expect(isSupportedLocale("en-US")).toBe(true);
    expect(isSupportedLocale("zh-TW")).toBe(true);
    expect(isSupportedLocale("ja-JP")).toBe(false);
  });

  it("defaults when storage is empty or invalid", () => {
    expect(loadStoredLocale(undefined)).toBe(defaultLocale);
    expect(loadStoredLocale({ getItem: () => null })).toBe(defaultLocale);
    expect(loadStoredLocale({ getItem: () => "unknown" })).toBe(defaultLocale);
  });

  it("loads and persists valid locale preferences", () => {
    const setItem = vi.fn();

    expect(loadStoredLocale({ getItem: () => "zh-TW" })).toBe("zh-TW");
    persistLocale("zh-TW", { setItem });

    expect(setItem).toHaveBeenCalledWith(localeStorageKey, "zh-TW");
  });

  it("ignores unavailable storage", () => {
    expect(
      loadStoredLocale({
        getItem: () => {
          throw new Error("blocked");
        },
      }),
    ).toBe(defaultLocale);

    expect(() =>
      persistLocale("zh-TW", {
        setItem: () => {
          throw new Error("blocked");
        },
      }),
    ).not.toThrow();
  });
});
