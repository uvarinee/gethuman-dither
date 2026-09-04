import { expect, it } from "vitest";
import { createToolcraftState, createToolcraftPersistenceSnapshot, parseToolcraftPersistenceSnapshot, getToolcraftTimelineLoopProgress, type ToolcraftImageAsset } from "@/toolcraft/runtime";
import { appSchema } from "./app-schema";
import { readToneSettings, readDitherSettings, readDynamicSettings, transformSourcePixels } from "@/dither/dither-scene";
import { buildStaticDitherField, getDynamicCell } from "@/dither/dither-renderer";

it("restores dither workspace after reload", () => {
  const media: ToolcraftImageAsset = {
    assetKind: "image", fileName: "source.png", id: "source-1", layerId: "layer-1",
    lifecycle: "ready", mimeType: "image/png", resourceRef: "repository-source-1", sourceTarget: "source.image",
    position: { x: -160, y: -90 }, size: { width: 320, height: 180, unit: "px" },
    sourceSize: { width: 4, height: 2, unit: "px" }, transform: { rotationDeg: 90, flipHorizontal: true },
  };
  const original = createToolcraftState(appSchema, {
    canvas: { size: { width: 320, height: 180, unit: "px" }, zoom: 110 },
    values: { "tone.gamma": 1.3, "dither.invert": true, "dither.algorithm": "bayer", "motion.flicker.speed": 0.65 },
    panels: { controls: { collapsed: true, offset: { x: -48, y: 24 } } },
    timeline: { currentTimeSeconds: 0.7, durationSeconds: 3, isPlaying: false },
    mediaAssets: [media],
  });
  const payload = createToolcraftPersistenceSnapshot(original, appSchema.persistence);
  expect(Object.keys(payload!.state).sort()).toEqual(["canvas", "mediaAssets", "panels", "timeline", "values"]);
  const parsed = parseToolcraftPersistenceSnapshot(appSchema, JSON.stringify(payload));
  expect(parsed).toBeDefined();
  const restored = createToolcraftState(appSchema, parsed);
  expect(restored.canvas).toEqual(original.canvas);
  expect(restored.values).toEqual(original.values);
  expect(restored.panels).toEqual(original.panels);
  expect(restored.timeline).toEqual(original.timeline);
  // Snapshot parsing restores identity/geometry first; the browser repository
  // subsequently resolves bytes and moves restoring -> ready (proved in E2E).
  expect(restored.mediaAssets).toEqual(original.mediaAssets.map((asset) => ({ ...asset, lifecycle: "restoring" })));
  const data = Uint8ClampedArray.from(Array.from({ length: 8 }, (_, index) => [index * 32, index * 32, index * 32, 255]).flat());
  const field = (state: typeof original) => buildStaticDitherField({
    source: transformSourcePixels({ width: 4, height: 2, data }, (state.mediaAssets[0] as ToolcraftImageAsset).transform),
    targetWidth: 32, targetHeight: 18, pixelSize: 2,
    tone: readToneSettings(state.values), dither: readDitherSettings(state.values),
  });
  expect(field(restored)).toEqual(field(original));
  const dynamic = (state: typeof original) => readDynamicSettings(state.values, 32, 18, getToolcraftTimelineLoopProgress(state.timeline), false);
  expect(getDynamicCell(11, 7, dynamic(restored))).toEqual(getDynamicCell(11, 7, dynamic(original)));
  expect(parseToolcraftPersistenceSnapshot(appSchema, "invalid JSON")).toBeUndefined();
});
