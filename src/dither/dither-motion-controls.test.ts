import { expect, it } from "vitest";
import { getDynamicCell, type DynamicDitherSettings } from "./dither-renderer";

const base: DynamicDitherSettings = {
  background: "#0A0A0A", breathingAmount: 0.08, breathingEnabled: true,
  includeBackground: true, ink: "#F4F1EA", pins: [],
  pointer: { active: false, radius: 180, strength: 0.55, x: 80, y: 45 },
  flickerAmount: 0.28, flickerEnabled: true,
  flickerSpeed: 0.65, timelineProgress: 0.23,
};
const field = (settings: DynamicDitherSettings) => Array.from({ length: 128 }, (_, index) => getDynamicCell(index * 3, index % 40, settings));
for (const [label, patch] of [
  ["Particle color", { ink: "#00FF88" }],
  ["Flicker amount", { flickerAmount: 0.9 }],
  ["Flicker speed", { flickerSpeed: 1.8 }],
  ["Breathing amount", { breathingAmount: 0.4 }],
  ["Flicker", { flickerEnabled: false }],
  ["Breathing", { breathingEnabled: false }],
] as const) {
  it(`${label} changes dither output`, () => {
    expect(field({ ...base, ...patch })).not.toEqual(field(base));
  });
}
