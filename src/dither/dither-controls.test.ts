import { expect, it } from "vitest";
import { buildStaticDitherField, type StaticDitherOptions } from "./dither-renderer";

const data = new Uint8ClampedArray(96 * 64 * 4);
for (let y = 0; y < 64; y++) for (let x = 0; x < 96; x++) {
  const value = Math.round(x / 95 * 180 + ((x + y) % 7) * 10);
  data.set([value, value, value, 255], (y * 96 + x) * 4);
}
const options: StaticDitherOptions = {
  dither: { algorithm: "floyd-steinberg", invert: false, seed: 12, threshold: 128 },
  pixelSize: 2, source: { data, width: 96, height: 64 }, targetHeight: 180, targetWidth: 320,
  tone: { blackPoint: 0, blur: 0, gamma: 2, grain: 0.07, seed: 17, whitePoint: 251 },
};
for (const [label, patch] of [
  ["Blur", { blur: 12 }], ["Grain", { grain: 0.8 }], ["Gamma", { gamma: 0.5 }],
  ["Black point", { blackPoint: 100 }], ["White point", { whitePoint: 120 }],
] as const) {
  it(`${label} changes dither output`, () => {
    const baseline = buildStaticDitherField(options);
    const changed = buildStaticDitherField({ ...options, tone: { ...options.tone, ...patch } });
    expect(changed.mask).not.toEqual(baseline.mask);
  });
}
it("Pixel size changes dither output", () => {
  const baseline = buildStaticDitherField(options);
  const changed = buildStaticDitherField({ ...options, pixelSize: 8 });
  expect(changed.width).toBe(40);
  expect(changed.height).toBe(23);
  expect(changed.mask.length).toBeLessThan(baseline.mask.length);
});
it("Threshold changes dither output", () => {
  const baseline = buildStaticDitherField(options);
  const changed = buildStaticDitherField({ ...options, dither: { ...options.dither, threshold: 220 } });
  expect(changed.mask).not.toEqual(baseline.mask);
});
it("Invert changes dither output", () => {
  const baseline = buildStaticDitherField(options);
  const changed = buildStaticDitherField({ ...options, dither: { ...options.dither, invert: true } });
  expect(changed.mask.every((value, index) => value === 255 - baseline.mask[index])).toBe(true);
});
it("Algorithm changes dither output", () => {
  const masks = ["floyd-steinberg", "bayer", "random"].map(algorithm =>
    buildStaticDitherField({ ...options, dither: { ...options.dither, algorithm: algorithm as StaticDitherOptions["dither"]["algorithm"] } }).mask);
  expect(masks[0]).not.toEqual(masks[1]);
  expect(masks[1]).not.toEqual(masks[2]);
  expect(masks[0]).not.toEqual(masks[2]);
});
