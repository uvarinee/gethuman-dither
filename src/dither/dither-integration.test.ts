import { describe, expect, it, vi } from "vitest";
import { createToolcraftState, type ToolcraftState } from "@/toolcraft/runtime";
import { appSchema } from "@/app/app-schema";
import { getDitherSceneBounds, movePin, readDynamicSettings, transformSourcePixels } from "./dither-scene";
import { getDynamicCell, renderDitherFrame } from "./dither-renderer";
import { assertDitherWorkload, MAX_DITHER_SOURCE_PIXELS } from "./dither-limits";
import { getDitherSourcePixels } from "./dither-source";

const raster = { width: 3, height: 2, data: new Uint8ClampedArray([1,2,3,4,5,6].flatMap((value) => [value,value,value,255])) };
const red = (data: Uint8ClampedArray) => Array.from(data).filter((_, index) => index % 4 === 0);

describe("dither integration", () => {
  it("Source image changes dither output", () => {
    expect(red(transformSourcePixels(raster, { rotationDeg: 90 }).data)).toEqual([4,1,5,2,6,3]);
    expect(red(transformSourcePixels(raster, { rotationDeg: 180 }).data)).toEqual([6,5,4,3,2,1]);
    expect(red(transformSourcePixels(raster, { rotationDeg: 270 }).data)).toEqual([3,6,2,5,1,4]);
    expect(red(transformSourcePixels(raster, { flipHorizontal: true }).data)).toEqual([3,2,1,6,5,4]);
    expect(red(transformSourcePixels(raster, { flipVertical: true }).data)).toEqual([4,5,6,1,2,3]);
    expect(red(transformSourcePixels(raster, { rotationDeg: 90, flipHorizontal: true }).data)).toEqual([6,3,5,2,4,1]);
    expect(red(raster.data)).toEqual([1,2,3,4,5,6]);
  });

  it("uses runtime scene geometry rather than source pixels and keeps mode bounds", () => {
    const state = createToolcraftState(appSchema);
    state.mediaAssets = [{ assetKind: "image", id: "image", lifecycle: "ready", sourceTarget: "source.image", position: { x: 20, y: 40 }, size: { width: 320, height: 180, unit: "px" }, sourceSize: { width: 4000, height: 3000, unit: "px" } }] as ToolcraftState["mediaAssets"];
    const bounds = getDitherSceneBounds({ state });
    expect(bounds).toEqual([{ x: -140, y: -50, width: 320, height: 180 }]);
    expect(getDitherSceneBounds({ state: { ...state, canvas: { ...state.canvas, mode: "infinite" } } })).toEqual(bounds);
    state.mediaAssets[0].lifecycle = "unavailable";
    expect(getDitherSceneBounds({ state })).toEqual([]);
  });

  it("changes one dragged pin without touching the other pin or sibling properties", () => {
    const pins = [{ position: { x: "0", y: "0" }, color: "#FF0000" }, { position: { x: "0.5", y: "0.5" }, color: "#00FF00" }];
    const moved = movePin(pins, 0, -2, 0.75);
    expect(moved[0]).toEqual({ position: { x: "-1.0000", y: "0.7500" }, color: "#FF0000" });
    expect(moved[1]).toBe(pins[1]);
    expect(pins[0].position.x).toBe("0");
  });

  it.each([0.1, 0.65, 1, 1.75, 3])("stitches the actual near-end frame at fractional flicker speed %s", (speed) => {
    const settings = readDynamicSettings({ "motion.flicker.speed": speed }, 320, 180, 0, false);
    for (const point of [[3,11], [70,23], [151,109]]) {
      const start = getDynamicCell(point[0], point[1], settings);
      const end = getDynamicCell(point[0], point[1], { ...settings, timelineProgress: 1 - 1e-8 });
      expect(end.color).toEqual(start.color);
      expect(end.scale).toBeCloseTo(start.scale, 6);
    }
  });

  it("keeps scene-unit cells and paint geometry independent of backing scale", () => {
    const field = { width: 2, height: 1, pixelSize: 2, mask: new Uint8Array([1,1]), tone: new Float32Array([255,255]) };
    const paints: unknown[][] = [];
    const context = { clearRect: vi.fn(), fillRect: (...args: unknown[]) => paints.push(args), fillStyle: "" } as unknown as CanvasRenderingContext2D;
    renderDitherFrame(context, field, 4, 2, readDynamicSettings({ "motion.flicker.enabled": false, "motion.breathing.enabled": false }, 4, 2, 0, false), false);
    expect(context.clearRect).not.toHaveBeenCalled();
    expect(paints).toEqual([[0.18000000000000005,0.18000000000000005,1.64,1.64],[2.18,0.18000000000000005,1.64,1.64]]);
  });

  it("rejects oversized work without clamping boundaries or silently dropping pins", () => {
    expect(() => assertDitherWorkload({ sourceWidth: MAX_DITHER_SOURCE_PIXELS, sourceHeight: 1, previewWidth: 8192, previewHeight: 8192, pinCount: 32 })).not.toThrow();
    expect(() => assertDitherWorkload({ sourceWidth: MAX_DITHER_SOURCE_PIXELS + 1, sourceHeight: 1 })).toThrow("smaller image");
    expect(() => assertDitherWorkload({ previewWidth: 8193, previewHeight: 8192 })).toThrow("Resolution scale");
    expect(() => assertDitherWorkload({ pinCount: 33 })).toThrow("32 pins");
  });

  it("cannot export a replacement source using a previous source's pixels", async () => {
    await expect(getDitherSourcePixels("new-source-not-ready")).rejects.toThrow("current source is not ready");
  });
});
