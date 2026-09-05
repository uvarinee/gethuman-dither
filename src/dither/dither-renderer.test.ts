import { describe, expect, it } from "vitest";
import { getDynamicCell, StaticDitherCache, type DynamicDitherSettings } from "./dither-renderer";

const dynamics: DynamicDitherSettings = {
  background: "#000000",
  breathingAmount: 0.1,
  breathingEnabled: true,
  includeBackground: true,
  ink: "#ffffff",
  pins: [{ radius: 40, color: "#ff0000", flashes: 2, fill: 25, hold: 20, clear: 25, branches: 0.65, position: { x: 10, y: 10 } }],
  pointer: { active: true, radius: 20, repelRadius: 200, repelForce: 1.2, attractForce: 0.06, returnSpeed: 0.008, damping: 0.92, x: 10, y: 10 },
  flickerAmount: 0.4,

  flickerEnabled: true,
  flickerSpeed: 1,
  timelineProgress: 0,
};

describe("dither renderer", () => {
  it("retains a static field until source or static settings change", () => {
    const cache = new StaticDitherCache();
    const source = { data: new Uint8ClampedArray([255, 255, 255, 255]), height: 1, width: 1 };
    const options = {
      dither: { algorithm: "bayer", invert: false, seed: 2, threshold: 128 } as const,
      pixelSize: 2,
      source,
      targetHeight: 4,
      targetWidth: 4,
      tone: { blackPoint: 0, blur: 0, gamma: 1, grain: 0, seed: 1, whitePoint: 255 },
    };
    const first = cache.get(options);
    expect(cache.get(options)).toBe(first);
    expect(cache.get({ ...options, dither: { ...options.dither, threshold: 129 } })).not.toBe(first);
  });

  it("stitches dynamic motion at the timeline loop boundary", () => {
    expect(getDynamicCell(10, 10, { ...dynamics, timelineProgress: 0 })).toEqual(
      getDynamicCell(10, 10, { ...dynamics, timelineProgress: 1 }),
    );
  });

  it("applies pointer and pin influence without changing static data", () => {
    const near = getDynamicCell(10, 10, { ...dynamics, timelineProgress: 0.16 });
    const far = getDynamicCell(1000, 1000, dynamics);
    expect(near.scale).toBeGreaterThan(0);
    expect(far.color).toEqual([255, 255, 255]);
    expect(near.color[0]).toBeGreaterThan(near.color[1]);
  });
});
