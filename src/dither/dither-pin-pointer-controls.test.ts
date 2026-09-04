import { expect, it } from "vitest";
import { getDynamicCell } from "./dither-renderer";
import { decayDitherPointer, parsePins, readDynamicSettings, type DitherPointer } from "./dither-scene";

const pointer: DitherPointer = { active: true, energy: 1, x: 120, y: 80 };
for (const [label, values] of [
  ["Pointer response", { "pointer.enabled": false }],
  ["Pointer radius", { "pointer.radius": 24 }],
  ["Pointer strength", { "pointer.strength": 0 }],
] as const) {
  it(`${label} changes dither output`, () => {
    const baseline = getDynamicCell(150, 80, readDynamicSettings({}, 320, 180, 0, true, pointer));
    const changed = getDynamicCell(150, 80, readDynamicSettings(values, 320, 180, 0, true, pointer));
    expect(changed.scale).toBeLessThan(baseline.scale);
  });
}

it("Pins changes dither output", () => {
  const pin = { position: { x: "0", y: "0" }, core: 12, bloom: 48, color: "#FF4F2E", intensity: 0.9, pulse: "double" };
  const without = readDynamicSettings({ "pins.items": [] }, 320, 180, 0.24, true);
  const withPin = readDynamicSettings({ "pins.items": [pin] }, 320, 180, 0.24, true);
  const atCenter = getDynamicCell(160, 90, withPin);
  expect(atCenter).not.toEqual(getDynamicCell(160, 90, without));
  expect(atCenter.color[0]).toBeGreaterThan(atCenter.color[1]);
  for (const update of [{ color: "#00FF00" }, { intensity: 0 }, { pulse: "single" }, { position: { x: "-1", y: "-1" } }]) {
    const changed = readDynamicSettings({ "pins.items": [{ ...pin, ...update }] }, 320, 180, 0.24, true);
    expect(getDynamicCell(160, 90, changed)).not.toEqual(atCenter);
  }
  expect(parsePins([pin, { ...pin, color: "#00FF00" }], 320, 180, 1)).toHaveLength(2);
  expect(parsePins([], 320, 180, 1)).toEqual([]);
});

it("Pointer decay changes dither output", () => {
  let fast = pointer;
  let slow = pointer;
  for (let index = 0; index < 10; index++) {
    fast = decayDitherPointer(fast, 0.1);
    slow = decayDitherPointer(slow, 0.99);
  }
  expect(fast.active).toBe(false);
  expect(slow.active).toBe(true);
  const faded = getDynamicCell(120, 80, readDynamicSettings({}, 320, 180, 0, true, fast));
  const retained = getDynamicCell(120, 80, readDynamicSettings({}, 320, 180, 0, true, slow));
  expect(retained.scale).toBeGreaterThan(faded.scale);
});
