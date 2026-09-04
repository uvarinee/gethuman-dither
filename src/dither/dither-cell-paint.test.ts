import { expect, it } from "vitest";
import { pointColorFalloff } from "./dither-cell-paint";
import { getDynamicCell, renderDitherFrame, type DynamicDitherSettings, type StaticDitherField } from "./dither-renderer";
import { readDynamicSettings, decayDitherPointer } from "./dither-scene";

type Dot = { x: number; y: number; width: number; height: number; color: string; alpha: number };
function draw(field: StaticDitherField, settings: DynamicDitherSettings): Dot[] {
  const dots: Dot[] = [];
  const context = {
    fillStyle: "", globalAlpha: 1, clearRect() {},
    fillRect(x: number, y: number, width: number, height: number) {
      dots.push({ x, y, width, height, color: this.fillStyle, alpha: this.globalAlpha });
    },
  };
  renderDitherFrame(context as unknown as CanvasRenderingContext2D, field, 128, 128, settings);
  expect(context.globalAlpha).toBe(1);
  return dots;
}
const field: StaticDitherField = {
  width: 16, height: 16, pixelSize: 8,
  mask: Uint8Array.from({ length: 256 }, (_, i) => i % 3 === 0 ? 255 : 0),
  tone: new Float32Array(256).fill(96),
};
const values = { "motion.flicker.enabled": false, "motion.breathing.enabled": false, "pins.items": [], "pointer.radius": 44, "pointer.strength": 1, "pointer.size": 0 };
const pointer = { active: true, energy: 1, x: 64, y: 64 };
const idle = readDynamicSettings(values, 128, 128, 0, false);
const hover = readDynamicSettings(values, 128, 128, 0, false, pointer);

it("hover adds source-weighted cells locally without moving the grid or mutating its mask", () => {
  const originalMask = field.mask.slice();
  const baseline = draw(field, idle);
  const painted = draw(field, hover);
  expect(painted.length).toBeGreaterThan(baseline.length + 5);
  const outer = (dots: Dot[]) => dots.filter(dot => Math.hypot(dot.x + dot.width / 2 - 64, dot.y + dot.height / 2 - 64) >= 44);
  expect(outer(painted)).toEqual(outer(baseline));
  for (const dot of painted) {
    expect((dot.x + dot.width / 2) % 8).toBeCloseTo(4);
    expect((dot.y + dot.height / 2) % 8).toBeCloseTo(4);
    expect(dot.width).toBeLessThan(8);
    expect(dot.height).toBeLessThan(8);
  }
  expect(field.mask).toEqual(originalMask);
  expect(draw(field, hover)).toEqual(painted);
});

it("zero strength and fully decayed hover restore the exact original frame", () => {
  expect(draw(field, { ...hover, pointer: { ...hover.pointer, strength: 0 } })).toEqual(draw(field, idle));
  let fading = pointer;
  for (let frame = 0; frame < 80; frame++) fading = decayDitherPointer(fading, 0.82);
  expect(draw(field, readDynamicSettings(values, 128, 128, 0, false, fading))).toEqual(draw(field, idle));
});

it("hover respects inverted source support and never fills an empty source background", () => {
  const empty = { ...field, mask: new Uint8Array(256), tone: new Float32Array(256) };
  expect(draw(empty, hover)).toEqual([]);
  expect(draw({ ...empty, inverted: true, tone: new Float32Array(256).fill(255) }, hover)).toEqual([]);
  expect(draw({ ...empty, inverted: true }, hover).length).toBeGreaterThan(0);
});

it("Point paints cells with saturated core color and unchanged geometry in the shared frame renderer", () => {
  const pin = { core: 16, bloom: 24, color: "#FF0000", intensity: 1, position: { x: 64, y: 64 }, pulse: "single" as const };
  const settings = { ...idle, pins: [pin] };
  const baseline = draw(field, idle);
  const painted = draw(field, settings);
  const geometry = (dots: Dot[]) => dots.map(({ x, y, width, height }) => ({ x, y, width, height }));
  expect(geometry(painted)).toEqual(geometry(baseline));
  expect(getDynamicCell(64, 64, settings).color).toEqual([255, 0, 0]);
  expect(getDynamicCell(64, 64, settings).scale).toBe(1);
  expect(painted.some(dot => dot.color === "rgb(255 0 0)")).toBe(true);
  expect(getDynamicCell(110, 64, settings)).toEqual(getDynamicCell(110, 64, idle));
  expect(draw(field, { ...settings, pins: [{ ...pin, intensity: 0 }] })).toEqual(baseline);
  expect(draw(field, { ...settings, timelineProgress: 1 })).toEqual(painted);
});

it("Point Blur changes only smooth radial color falloff while leaving the core fully weighted", () => {
  expect(pointColorFalloff(12, 12, 48)).toBe(1);
  expect(pointColorFalloff(60, 12, 48)).toBe(0);
  expect(pointColorFalloff(24, 12, 48)).toBeGreaterThan(pointColorFalloff(24, 12, 16));
  let previous = 1;
  for (let distance = 12; distance <= 60; distance++) {
    const value = pointColorFalloff(distance, 12, 48);
    expect(value).toBeLessThanOrEqual(previous);
    previous = value;
  }
});
