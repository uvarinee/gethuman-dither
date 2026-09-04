import { type ToolcraftProductExportRenderer } from "@/toolcraft/runtime";
import { exportFramePass } from "@/app/app-performance";
import { getDitherSourcePixels } from "./dither-source";
import { getDitherSource, numberValue, readDitherSettings, readDynamicSettings, readToneSettings, transformSourcePixels } from "./dither-scene";
import { buildStaticDitherField, renderDitherFrame, type StaticDitherField } from "./dither-renderer";
import type { RasterPixels } from "./dither-algorithms";
import { assertDitherWorkload } from "./dither-limits";

// One field per live source; dropping the source lease also makes its cache collectible.
const fields = new WeakMap<RasterPixels, { key: string; field: StaticDitherField }>();

export const ditherExportRenderer: ToolcraftProductExportRenderer = {
  baseFileName: "interactive-dither",
  async renderFrame({ context, frame, rendererPipeline, state, timelineProgress }) {
    const asset = getDitherSource(state);
    if (!asset) throw new Error("Import a JPG or PNG image before exporting.");
    assertDitherWorkload({ pinCount: Array.isArray(state.values["pins.items"]) ? state.values["pins.items"].length : 0 });
    // Acquire this exact immutable source before asynchronous export work begins.
    const sourcePromise = getDitherSourcePixels(asset.resourceRef);
    const render = async () => {
      const rawSource = await sourcePromise;
      const settings = {
        targetWidth: frame.width, targetHeight: frame.height,
        pixelSize: numberValue(state.values["dither.pixelSize"], 2),
        tone: readToneSettings(state.values), dither: readDitherSettings(state.values),
      };
      const key = JSON.stringify({ ...settings, transform: asset.transform });
      const cached = fields.get(rawSource);
      const field = cached?.key === key ? cached.field : buildStaticDitherField({ ...settings, source: transformSourcePixels(rawSource, asset.transform) });
      if (cached?.field !== field) fields.set(rawSource, { key, field });
      context.save();
      try {
        context.translate(frame.x, frame.y);
        context.beginPath(); context.rect(0, 0, frame.width, frame.height); context.clip();
        // Runtime owns background and destination clearing for both artifact kinds.
        renderDitherFrame(context, field, frame.width, frame.height, readDynamicSettings(state.values, frame.width, frame.height, timelineProgress, false), false);
      } finally { context.restore(); }
    };
    if (rendererPipeline) await rendererPipeline.runPass(exportFramePass, undefined, render);
    else await render();
  },
};
