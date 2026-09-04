import { expect, it } from "vitest";
import { createToolcraftState } from "@/toolcraft/runtime";
import { appSchema } from "./app-schema";
import { readDynamicSettings } from "@/dither/dither-scene";
import { renderDitherFrame } from "@/dither/dither-renderer";

function renderBackground(background: string, included: boolean) {
  const paints: Array<{ color: string; bounds: number[] }> = [];
  let cleared = false;
  const context = {
    fillStyle: "",
    clearRect: () => { cleared = true; },
    fillRect(x: number, y: number, width: number, height: number) {
      paints.push({ color: this.fillStyle, bounds: [x, y, width, height] });
    },
  };
  const state = createToolcraftState(appSchema, { values: { "appearance.background": background } });
  renderDitherFrame(context as unknown as CanvasRenderingContext2D,
    { width: 1, height: 1, pixelSize: 2, mask: new Uint8Array([0]), tone: new Float32Array([0]) },
    32, 18, readDynamicSettings(state.values, 32, 18, 0, included));
  return { paints, cleared };
}

it("Background changes dither output", () => {
  expect(renderBackground("#205080", true)).toEqual({ cleared: true, paints: [{ color: "#205080", bounds: [0, 0, 32, 18] }] });
  expect(renderBackground("#205080", false)).toEqual({ cleared: true, paints: [] });
});

it("Background color changes dither output", () => {
  const original = renderBackground("#0A0A0A", true);
  const changed = renderBackground("#205080", true);
  expect(changed.paints[0].color).toBe("#205080");
  expect(changed).not.toEqual(original);
  expect(renderBackground("#205080", false).paints).toEqual([]);
});
