import { describe, expect, it } from "vitest";
import { resolveMapLibreStyle } from "./env";

describe("MapLibre style config", () => {
  it("uses an explicit style URL when configured", () => {
    expect(resolveMapLibreStyle("https://example.com/style.json", undefined)).toBe(
      "https://example.com/style.json",
    );
  });

  it("defaults to an OpenFreeMap style when no style URL is configured", () => {
    expect(resolveMapLibreStyle(undefined, undefined)).toBe(
      "https://tiles.openfreemap.org/styles/liberty",
    );
  });

  it("allows the raster tile URL to be customized", () => {
    const style = resolveMapLibreStyle(undefined, "https://tiles.example.com/{z}/{x}/{y}.png");

    expect(typeof style).toBe("object");
    expect(style).toMatchObject({
      sources: {
        osm: {
          tiles: ["https://tiles.example.com/{z}/{x}/{y}.png"],
        },
      },
    });
  });
});
