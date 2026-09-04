import { describe, expect, it } from "vitest";
import { createToolcraftState, getToolcraftTimelineLoopProgress, outwardRoundToolcraftSceneRect, type ToolcraftState } from "@/toolcraft/runtime";
import { resolveToolcraftExportFrame } from "@/toolcraft/runtime/export/export-frame";
import { appSchema } from "./app-schema";
import { getDitherBackingSize, getDitherSceneBounds, movePin, parsePins, readDynamicSettings } from "@/dither/dither-scene";
import { getDynamicCell } from "@/dither/dither-renderer";

describe("dither canvas acceptance", () => {
  it("plays a seamless forward dither loop", () => {
    for (const durationSeconds of [7.2, 2]) {
      const phases = [0, .25, .5, .75, 1].map((ratio) => getToolcraftTimelineLoopProgress({ currentTimeSeconds: durationSeconds * ratio, durationSeconds }));
      phases.forEach((phase, index) => expect(phase).toBeCloseTo([0, .25, .5, .75, 0][index], 12));
      const start = getDynamicCell(25, 30, readDynamicSettings({}, 320, 180, phases[0], false));
      expect(getDynamicCell(25, 30, readDynamicSettings({}, 320, 180, phases[4], false))).toEqual(start);
      expect(getDynamicCell(25, 30, readDynamicSettings({}, 320, 180, phases[1], false))).not.toEqual(start);
    }
  });
  it("keeps selected raster backing in every required state", () => {
    for (const state of ["interaction", "playback", "steady"]) for (const dpr of [1, 2]) for (const scale of [1, 1.25, 2]) {
      const size = getDitherBackingSize(320, 180, dpr, scale);
      expect(size.width / (dpr * scale), state).toBe(320);
      expect(size.height / (dpr * scale), state).toBe(180);
    }
  });
  it("drags a pin directly over the image", () => {
    const pins = [{ position: { x: "0", y: "0" }, core: 12 }];
    const next = movePin(pins, 0, .5, -.5);
    expect(parsePins(next, 320, 180, 1)[0].position).toEqual({ x: 240, y: 45 });
    expect(pins[0].position).toEqual({ x: "0", y: "0" });
  });
  it("preserves scene continuity in Infinity mode", () => {
    const state = createToolcraftState(appSchema);
    state.mediaAssets = [{ assetKind: "image", id: "image", sourceTarget: "source.image", lifecycle: "ready", position: { x: 0, y: 0 }, size: { width: 320, height: 180, unit: "px" } }] as ToolcraftState["mediaAssets"];
    const before = getDitherSceneBounds({ state });
    state.canvas.mode = "infinite";
    expect(getDitherSceneBounds({ state })).toEqual(before);
    state.canvas.mode = "finite";
    expect(getDitherSceneBounds({ state })).toEqual(before);
  });
  it("crops Infinity image export to product bounds", () => {
    const state = createToolcraftState(appSchema); state.canvas.mode = "infinite";
    const rect = { x: -10.5, y: -20.25, width: 96, height: 64 };
    expect(resolveToolcraftExportFrame(state, rect)).toEqual({ ok: true, frame: outwardRoundToolcraftSceneRect(rect) });
  });
  it("keeps stable bounds across Infinity video frames", () => {
    const state = createToolcraftState(appSchema);
    state.mediaAssets = [{ assetKind: "image", id: "image", sourceTarget: "source.image", lifecycle: "ready", position: { x: 0, y: 0 }, size: { width: 320, height: 180, unit: "px" } }] as ToolcraftState["mediaAssets"];
    state.canvas.mode = "infinite";
    const first = getDitherSceneBounds({ state });
    for (const time of [0, .25, .5, .75, 1]) { state.timeline.currentTimeSeconds = time; expect(getDitherSceneBounds({ state })).toEqual(first); }
  });
});
