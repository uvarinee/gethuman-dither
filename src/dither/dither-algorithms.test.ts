import { describe, expect, it } from "vitest";
import { ditherLuminance, preprocessLuminance, sampleCover } from "./dither-algorithms";

describe("dither algorithms", () => {
  it("cover-crops a wide source around its center", () => {
    const source = { data: new Uint8ClampedArray([10, 0, 0, 255, 20, 0, 0, 255, 30, 0, 0, 255, 40, 0, 0, 255]), height: 1, width: 4 };
    expect(Array.from(sampleCover(source, 2, 1).data)).toEqual([20, 0, 0, 255, 30, 0, 0, 255]);
  });

  it("keeps preprocessing bounded, deterministic, and immutable", () => {
    const input = new Float32Array([0, 64, 128, 255]);
    const before = Array.from(input);
    const settings = { blackPoint: 32, blur: 0, gamma: 1, grain: 1, seed: 7, whitePoint: 224 };
    const result = preprocessLuminance(input, 2, 2, settings);
    expect(Array.from(input)).toEqual(before);
    expect(Array.from(result).every((value) => value >= 0 && value <= 255)).toBe(true);
    expect(preprocessLuminance(input, 2, 2, settings)).toEqual(result);
  });

  it("produces the exact Floyd-Steinberg field without mutating input", () => {
    const input = new Float32Array([0, 80, 160, 240, 32, 96, 192, 224]);
    const before = Array.from(input);
    expect(Array.from(ditherLuminance(input, 4, 2, { algorithm: "floyd-steinberg", invert: false, threshold: 128 }))).toEqual([0, 0, 255, 255, 0, 255, 0, 255]);
    expect(Array.from(input)).toEqual(before);
  });

  it("produces the exact Bayer 8x8 threshold field", () => {
    const input = new Float32Array(64).fill(128);
    expect(Array.from(ditherLuminance(input, 8, 8, { algorithm: "bayer", invert: false, threshold: 128 }))).toEqual([
      255, 0, 255, 0, 255, 0, 255, 0, 0, 255, 0, 255, 0, 255, 0, 255,
      255, 0, 255, 0, 255, 0, 255, 0, 0, 255, 0, 255, 0, 255, 0, 255,
      255, 0, 255, 0, 255, 0, 255, 0, 0, 255, 0, 255, 0, 255, 0, 255,
      255, 0, 255, 0, 255, 0, 255, 0, 0, 255, 0, 255, 0, 255, 0, 255,
    ]);
  });

  it("keeps random dithering deterministic for a seed", () => {
    const input = new Float32Array([32, 64, 96, 128, 160, 192, 224, 255]);
    const settings = { algorithm: "random", invert: false, seed: 42, threshold: 128 } as const;
    const first = ditherLuminance(input, 4, 2, settings);
    expect(Array.from(first)).toEqual([0, 0, 0, 0, 255, 255, 255, 255]);
    expect(ditherLuminance(input, 4, 2, settings)).toEqual(first);
  });
});
