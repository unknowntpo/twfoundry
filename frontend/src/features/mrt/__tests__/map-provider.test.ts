import { describe, expect, it } from "vitest";
import { resolveMapProvider } from "../map/map-provider";

describe("map provider boundary", () => {
  it("defaults to mock when no provider is configured", () => {
    expect(resolveMapProvider(undefined)).toBe("mock");
  });

  it("accepts google and mock explicitly", () => {
    expect(resolveMapProvider("google")).toBe("google");
    expect(resolveMapProvider("mock")).toBe("mock");
  });

  it("rejects unknown providers instead of silently falling back", () => {
    expect(() => resolveMapProvider("leaflet")).toThrow("Unsupported map provider");
  });
});
