import { expect, it } from "vitest";
import { particleFlicker, pointerEnvelope } from "./dither-flicker";
import { getDynamicCell } from "./dither-renderer";
import { readDynamicSettings } from "./dither-scene";

it("fades independent particles deterministically and closes fractional-speed loops", () => {
  for (const speed of [0.25, 0.65, 1, 1.73, 4, 24]) {
    for (let x = 0; x < 16; x++) {
      expect(particleFlicker(x * 3, 10, 0, speed)).toBe(particleFlicker(x * 3, 10, 1, speed));
      expect(Math.abs(particleFlicker(x * 3, 10, 0, speed) - particleFlicker(x * 3, 10, 1 - 1e-8, speed))).toBeLessThan(1e-6);
    }
  }
  const samples = Array.from({ length: 64 }, (_, x) => particleFlicker(x, 64 - x, 0.23, 1));
  expect(new Set(samples).size).toBeGreaterThan(40); // no common diagonal stripe
  expect(Math.min(...samples)).toBe(0);
  expect(Math.max(...samples)).toBe(1);
});

it("higher speed produces more independent fade variation over the same duration", () => {
  const variation = (speed: number) => {
    let sum = 0;
    for (let x = 0; x < 12; x++) for (let i = 1; i <= 240; i++) sum += Math.abs(particleFlicker(x * 4, 7, i / 240, speed) - particleFlicker(x * 4, 7, (i - 1) / 240, speed));
    return sum;
  };
  expect(variation(3)).toBeGreaterThan(variation(1) * 1.5);
});

it("hover restores cell visibility with a fixed grid and a smooth edge", () => {
  const values = { "motion.breathing.enabled": false, "motion.flicker.amount": 1, "dither.ink": "#2266AA", "pointer.radius": 100 };
  const idle = readDynamicSettings(values, 320, 180, 0.23, true);
  const hover = readDynamicSettings(values, 320, 180, 0.23, true, { active: true, energy: 1, x: 120, y: 80 });
  const center = getDynamicCell(120, 80, hover);
  expect(center.color).toEqual([34, 102, 170]);
  expect(center.offsetY).toBe(0);
  expect(center.reveal).toBeGreaterThan(0);
  expect(center.opacity).toBeGreaterThanOrEqual(getDynamicCell(120, 80, idle).opacity);
  expect(getDynamicCell(140, 80, hover).offsetX).toBe(0);
  expect(getDynamicCell(240, 80, hover)).toEqual(getDynamicCell(240, 80, idle));
  expect(pointerEnvelope(99.999, 100, 0.7)).toBeLessThan(1e-6);
  expect(pointerEnvelope(75, 100, 0.9)).toBeLessThan(pointerEnvelope(75, 100, 0.1));
  const solid = readDynamicSettings({ ...values, "motion.flicker.amount": 0 }, 320, 180, 0.23, true);
  expect(getDynamicCell(120, 80, solid).opacity).toBe(1);
});

for (const [label, patch] of [
  ["Pointer speed", { "pointer.speed": 6 }],
  ["Pointer softness", { "pointer.softness": 1 }],
  ["Pointer size", { "pointer.size": 1 }],
] as const) {
  it(`${label} changes dither output`, () => {
    const pointer = { active: true, energy: 1, x: 120, y: 80 };
    const sample = (values: Record<string, unknown>) => Array.from({ length: 24 }, (_, i) =>
      getDynamicCell(160 + (i % 6) * 8, 64 + Math.floor(i / 6) * 8, readDynamicSettings(values, 320, 180, 0.23, true, pointer)));
    expect(sample(patch)).not.toEqual(sample({}));
  });
}
