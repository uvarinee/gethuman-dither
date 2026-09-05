import { expect, it } from "vitest";
import { getDynamicCell } from "./dither-renderer";
import { readDynamicSettings } from "./dither-scene";
import { PointerSimulation, stepCell } from "./pointer-physics";
import { pinCellIsColored, type DitherPin } from "./pin-animation";
const pointer = { active: true, energy: 1, x: 64, y: 64 };
const base = { "pointer.radius": 85, "pointer.repelRadius": 40 };
function simulate(values: Record<string, unknown>, hz = 60) {
  const sim = new PointerSimulation(new Uint8Array(256).fill(255), 16, 16, 128, 128);
  const settings = readDynamicSettings({ ...base, ...values }, 128, 128, 0, false, pointer);
  for (let i = 0; i < hz; i++) sim.advance(1 / hz, settings.pointer);
  return sim;
}
for (const [label, patch] of [
  ["Pointer response", { "pointer.enabled": false }], ["Pointer radius", { "pointer.radius": 24 }],
  ["Pointer repel radius", { "pointer.repelRadius": 10 }], ["Pointer repel force", { "pointer.repelForce": 0 }],
  ["Pointer attract force", { "pointer.attractForce": 0.5 }], ["Pointer return", { "pointer.return": 0.04 }], ["Pointer inertia", { "pointer.damping": 0.8 }],
] as const) it(label + " changes dither output", () => {
  expect([...simulate(patch).cells]).not.toEqual([...simulate({}).cells]);
});
it("simulation is independent of display rate and restores the exact mask after leaving", () => {
  const sim = simulate({});
  expect([...simulate({}, 30).cells]).toEqual([...sim.cells]);
  expect([...simulate({}, 120).cells]).toEqual([...sim.cells]);
  expect(sim.cells.size).toBeGreaterThan(0);
  const away = readDynamicSettings({}, 128, 128, 0, false).pointer;
  for (let i = 0; i < 1200; i++) sim.advance(1 / 60, away);
  expect(sim.cells.size).toBe(0);
  expect(sim.mask.every(v => v === 255)).toBe(true);
});
it("reference rings repel inside and attract outside, including the screenshot's reversed radii", () => {
  const settings = readDynamicSettings(base, 128, 128, 0, false, pointer).pointer;
  const near = { x: 0, y: 0, vx: 0, vy: 0 }, far = { ...near };
  stepCell(near, 80, 64, settings); stepCell(far, 120, 64, settings);
  expect(near.x).toBeGreaterThan(0); expect(far.x).toBeLessThan(0);
  const shot = { x: 0, y: 0, vx: 0, vy: 0 };
  stepCell(shot, 120, 64, { ...settings, repelRadius: 200 });
  expect(shot.x).toBeGreaterThan(0);
});
it("empty cells never become particles and resetting releases all displacement", () => {
  const sim = new PointerSimulation(new Uint8Array(256), 16, 16, 128, 128);
  sim.advance(0.1, readDynamicSettings(base, 128, 128, 0, false, pointer).pointer);
  expect(sim.cells.size).toBe(0);
  const active = simulate({}); active.clear(); expect(active.cells.size).toBe(0);
});
const pin: DitherPin = { position: { x: 64, y: 64 }, color: "#FF4F2E", radius: 40, flashes: 2, fill: 25, hold: 20, clear: 25, branches: 0.65 };
it("Pins changes dither output", () => {
  const settings = readDynamicSettings({ "motion.flicker.amount": 1 }, 128, 128, 0.16, false);
  const colored = { ...settings, pins: [pin] };
  expect(getDynamicCell(64, 64, colored).color).toEqual([255, 79, 46]);
  expect(getDynamicCell(103, 64, colored).color).toEqual([255, 79, 46]);
  expect(getDynamicCell(103, 64, colored).opacity).toBe(1);
  expect(getDynamicCell(105, 64, colored)).toEqual(getDynamicCell(105, 64, settings));
});
it("pin wave fills outward, holds, clears cell-by-cell and stitches at every loop", () => {
  const count = (phase: number, p = pin) => { let total = 0; for (let y = 24; y <= 104; y += 4) for (let x = 24; x <= 104; x += 4) total += Number(pinCellIsColored(x, y, phase, p)); return total; };
  expect(count(0)).toBe(0);
  expect(count(0.08)).toBeGreaterThan(count(0.02));
  expect(count(0.16)).toBeGreaterThan(count(0.08));
  expect(count(0.27)).toBeLessThan(count(0.16));
  expect(count(0.4)).toBe(0);
  for (let flashes = 1; flashes <= 8; flashes++) {
    expect(count(1, { ...pin, flashes })).toBe(count(0, { ...pin, flashes }));
    expect(count(1 - 1e-8, { ...pin, flashes })).toBe(0);
  }
  const signature = (p: DitherPin) => Array.from({ length: 100 }, (_, i) => count(i / 100, p));
  for (const patch of [{ radius: 20 }, { flashes: 3 }, { fill: 5 }, { hold: 5 }, { clear: 5 }, { branches: 0 }]) expect(signature({ ...pin, ...patch })).not.toEqual(signature(pin));
});
