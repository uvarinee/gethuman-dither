import { expect, it } from "vitest";
import { particleFlicker } from "./dither-flicker";

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
