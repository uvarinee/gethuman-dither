import { describe, expect, it } from "vitest";
import { getDynamicCell, buildStaticDitherField, renderDitherFrame, type DynamicDitherSettings } from "@/dither/dither-renderer";
import { createToolcraftVideoFrameSchedule } from "@/toolcraft/runtime/export/video-frame-schedule";
import { resolveToolcraftImageExportSettings, resolveToolcraftVideoExportSettings } from "@/toolcraft/runtime/export/artifact-export-settings";
import { getToolcraftImageExportSize, getToolcraftVideoExportSize } from "@/toolcraft/runtime/export/export-sizing";
import type { ToolcraftState } from "@/toolcraft/runtime";

const settings: DynamicDitherSettings = {
  background: "#0A0A0A", breathingAmount: 0.08, breathingEnabled: true,
  includeBackground: false, ink: "#F4F1EA", pins: [],
  pointer: { active: false, radius: 180, repelRadius: 200, repelForce: 1.2, attractForce: 0.06, returnSpeed: 0.008, damping: 0.92, x: 0, y: 0 },
  flickerAmount: 1, flickerEnabled: true,
  flickerSpeed: 0.65, timelineProgress: 0,
};

describe("dither artifact frame semantics", () => {
  const stateWith = (values: ToolcraftState["values"]) => ({ values, defaults: {} }) as ToolcraftState;
  const frame = { x: 0, y: 0, width: 320, height: 180 };
  it("Image format changes dither output", () => {
    for (const format of ["png", "jpg"]) expect(resolveToolcraftImageExportSettings(stateWith({ "export.image.format": format })).format).toBe(format);
    expect(() => resolveToolcraftImageExportSettings(stateWith({ "export.image.format": "svg" }))).toThrow();
  });
  it("Image resolution changes dither output", () => {
    for (const [resolution, width, height] of [["2k", 2048, 1152], ["4k", 4096, 2304], ["8k", 8192, 4608]] as const)
      expect(getToolcraftImageExportSize({ state: stateWith({}), frame, resolution })).toMatchObject({ width, height });
  });
  it("Video format changes dither output", () => {
    for (const format of ["mp4", "webm"]) expect(resolveToolcraftVideoExportSettings(stateWith({ "export.video.format": format })).format).toBe(format);
    expect(() => resolveToolcraftVideoExportSettings(stateWith({ "export.video.format": "gif" }))).toThrow();
  });
  it("Video resolution changes dither output", () => {
    for (const [resolution, width, height] of [["current", 320, 180], ["4k", 3840, 2160]] as const)
      expect(getToolcraftVideoExportSize({ state: stateWith({}), frame, resolution })).toMatchObject({ width, height });
  });
  it("draws dither product into the supplied export context without editor overlays", () => {
    const source = { width: 2, height: 2, data: new Uint8ClampedArray(16).fill(255) };
    const field = buildStaticDitherField({ source, targetWidth: 16, targetHeight: 16, pixelSize: 2,
      dither: { algorithm: "bayer", invert: false, threshold: 128, seed: 1 },
      tone: { blackPoint: 0, whitePoint: 255, gamma: 1, blur: 0, grain: 0, seed: 1 } });
    const paints: Array<{ color: string; rect: number[] }> = [];
    const context = { fillStyle: "", fillRect(...rect: number[]) { paints.push({ color: this.fillStyle, rect }); } };
    renderDitherFrame(context as unknown as CanvasRenderingContext2D, field, 16, 16,
      { ...settings, flickerEnabled: false, breathingEnabled: false }, false);
    expect(paints).toHaveLength(64);
    expect(paints.every(({ color }) => color === "rgb(244 241 234)")).toBe(true);
    expect(paints.every(({ rect }) => rect[2] > 0 && rect[3] > 0)).toBe(true);
  });

  it("maps the canonical video schedule to changing deterministic product frames", () => {
    const schedule = createToolcraftVideoFrameSchedule(0.2);
    expect(schedule).toHaveLength(6);
    const animated = { ...settings, pins: [{ color: "#FF4F2E", radius: 40, position: { x: 45, y: 45 }, coverage: 0.55, noise: 0.85, speed: 1, softness: 0.25, scatter: 0.2 }] };
    const colors = schedule.map(({ timeSeconds }) => getDynamicCell(45, 45, { ...animated, timelineProgress: timeSeconds / 0.2 }).color.join(","));
    expect(new Set(colors).size).toBeGreaterThan(2);
    expect(getDynamicCell(45, 45, settings)).toEqual(getDynamicCell(45, 45, { ...settings, timelineProgress: 1 }));
  });
});
