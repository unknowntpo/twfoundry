import { describe, expect, it } from "vitest";
import { findOverlayById, mrtOverlayRegistry } from "../map/overlay-registry";

describe("mrtOverlayRegistry", () => {
  it("defines the phase-1 MRT overlays with stable ids", () => {
    expect(mrtOverlayRegistry.map((overlay) => overlay.id)).toEqual([
      "mrt-routes",
      "mrt-stations",
      "mrt-estimated-trains",
      "timeline",
    ]);
  });

  it("marks estimated trains and timeline as timeline-aware", () => {
    expect(findOverlayById("mrt-estimated-trains")?.timelineAware).toBe(true);
    expect(findOverlayById("timeline")?.timelineAware).toBe(true);
    expect(findOverlayById("mrt-routes")?.timelineAware).toBe(false);
  });
});
