import { expect, it } from "vitest";
import { renderDitherFrame, type DynamicDitherSettings, type StaticDitherField } from "./dither-renderer";
import { readDynamicSettings } from "./dither-scene";
type Dot = { x: number; y: number; width: number; height: number; color: string; alpha: number };
function draw(field: StaticDitherField, settings: DynamicDitherSettings, offsets?: ReadonlyMap<number, { x: number; y: number; vx: number; vy: number }>): Dot[] {
  const dots: Dot[] = [];
  const context = {
    fillStyle: "", globalAlpha: 1, clearRect() {},
    fillRect(x: number, y: number, width: number, height: number) {
      dots.push({ x, y, width, height, color: this.fillStyle, alpha: this.globalAlpha });
    },
  };
  renderDitherFrame(context as unknown as CanvasRenderingContext2D, field, 128, 128, settings, true, offsets);
  expect(context.globalAlpha).toBe(1);
  return dots;
}
const field: StaticDitherField = {
  width: 16, height: 16, pixelSize: 8,
  mask: Uint8Array.from({ length: 256 }, (_, i) => i % 3 === 0 ? 255 : 0),
  tone: new Float32Array(256).fill(96),
};

const idle = readDynamicSettings({ "motion.flicker.enabled": false, "motion.breathing.enabled": false }, 128, 128, 0.16, false);
it("hard pin colors preserve geometry, gaps and exact RGB even at the edge", () => {
  const baseline = draw(field, idle);
  const pin = { radius: 40, color: "#FF4F2E", position: { x: 64, y: 64 }, coverage: 1, noise: 0, speed: 1, softness: 0, scatter: 0 };
  const painted = draw(field, { ...idle, pins: [pin] });
  expect(painted.length).toBe(baseline.length);
  painted.forEach((dot, i) => {
    expect({ ...dot, color: baseline[i].color }).toEqual(baseline[i]);
    const inside = Math.hypot(dot.x + dot.width / 2 - 64, dot.y + dot.height / 2 - 64) <= 40;
    expect(dot.color).toBe(inside ? "rgb(255 79 46)" : baseline[i].color);
    expect(dot.alpha).toBe(1);
  });
  expect(draw(field, { ...idle, pins: [{ ...pin, coverage: 0 }] })).toEqual(baseline);
});
it("empty dither masks stay empty under pointer and pins", () => {
  expect(draw({ ...field, mask: new Uint8Array(256) }, idle)).toEqual([]);
});

it("Pin displacement adds to Pointer offsets without altering its field", () => {
  const pins = [{ radius: 50, color: "#FF4F2E", position: { x: 64, y: 64 }, coverage: 0.55, noise: 0.85, speed: 1, softness: 0.25, scatter: 1 }];
  const offsets = new Map(Array.from({ length: 256 }, (_, i) => [i, { x: 7, y: -3, vx: 2, vy: 1 }] as const));
  const before = [...offsets].map(([i, p]) => [i, { ...p }]);
  const pinOnly = draw(field, { ...idle, pins });
  const combined = draw(field, { ...idle, pins }, offsets);
  combined.forEach((dot,i) => {
    expect(dot.x).toBeCloseTo(pinOnly[i].x + 7); expect(dot.y).toBeCloseTo(pinOnly[i].y - 3);
    expect(dot.color).toBe(pinOnly[i].color); expect(dot.width).toBe(pinOnly[i].width);
  });
  expect([...offsets]).toEqual(before);
  expect(combined).toHaveLength(field.mask.filter(v => v !== 0).length);
});
