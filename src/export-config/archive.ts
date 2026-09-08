import { getToolcraftImageSceneRect, getToolcraftFiniteArtboardRect, type ToolcraftState } from "../toolcraft/runtime";
import { createToolcraftSettingsPayload, type ToolcraftPanelActionHandler } from "../toolcraft/runtime/react";
import { getDitherSource } from "../dither/dither-scene";
import { effectValueTargets, validateEffectSettings, type EffectSettings } from "./settings";
import effectSource from "virtual:dither-effect-source";
import demoSource from "./demo.html?raw";
import readmeSource from "./README.txt?raw";
import licenseSource from "../../LICENSE.md?raw";

function dataUrl(bytes: Uint8Array, mime: string): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 32768) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
  }
  return "data:" + mime + ";base64," + btoa(binary);
}

export function snapshotEffectSettings(state: ToolcraftState): EffectSettings {
  const asset = getDitherSource(state);
  if (!asset) throw new Error("Import a JPG or PNG image before exporting.");
  if (!["image/png","image/jpeg"].includes(asset.mimeType)) throw new Error("Export Config supports JPG and PNG sources.");
  const scene = getToolcraftImageSceneRect(asset);
  return validateEffectSettings({
    format:"interactive-dither",version:1,
    image:asset.mimeType === "image/jpeg" ? "image.jpg" : "image.png",
    values:Object.fromEntries(effectValueTargets.map(key => [key, structuredClone(state.values[key])])),
    transform: structuredClone(asset.transform ?? {}),
    scene, output:state.canvas.mode === "finite" ? getToolcraftFiniteArtboardRect(state.canvas.size) : {
      x:Math.floor(scene.x),y:Math.floor(scene.y),width:Math.ceil(scene.x+scene.width)-Math.floor(scene.x),height:Math.ceil(scene.y+scene.height)-Math.floor(scene.y),
    },
    includeBackground:state.values["export.includeBackground"] !== false,
    renderScale:state.values["canvas.renderScale"] ?? 2,
    playback:{durationSeconds:state.timeline.durationSeconds,initialTimeSeconds:state.timeline.currentTimeSeconds,loop:state.timeline.isLooping},
  });
}
export const exportConfig: ToolcraftPanelActionHandler = async context => {
  if (context.action.value !== "export.config") return;
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(),30000);
  try {
    // Snapshot all editable data before awaiting resource resolution.
    const settings = snapshotEffectSettings(context.state);
    const studioSettings = JSON.stringify(createToolcraftSettingsPayload(context.state), null, 2);
    const resourceRef = getDitherSource(context.state)!.resourceRef;
    context.reportProgress(0.1);
    const bytes = await context.resolveMediaResource(resourceRef,{signal:abort.signal});
    if (!bytes?.byteLength) throw new Error("Source image is unavailable. Re-import it and try again.");
    abort.signal.throwIfAborted();
    context.reportProgress(0.4);
    const encode = (text:string) => new TextEncoder().encode(text);
    const bundle = JSON.stringify({
      settings,
      imageUrl: dataUrl(bytes, settings.image.endsWith("jpg") ? "image/jpeg" : "image/png"),
      moduleUrl: dataUrl(encode(effectSource), "text/javascript"),
    }).replaceAll("<", "\\u003c");
    const demo = demoSource.replace("__DITHER_BUNDLE__", () => bundle);
    await context.downloadArchive({
      baseFileName:"interactive-dither-effect",
      entries:[
        {path:"effect/"+settings.image,bytes},
        {path:"effect/settings.json",bytes:encode(JSON.stringify(settings,null,2))},
        {path:"effect/import-style.json",bytes:encode(studioSettings)},
        {path:"effect/effect.js",bytes:encode(effectSource)},
        {path:"effect/demo.html",bytes:encode(demo)},
        {path:"effect/README.txt",bytes:encode(readmeSource)},
        {path:"effect/LICENSE.txt",bytes:encode(licenseSource)},
      ],
    });
  } catch(error) {
    context.reportFeedback({code:"config-export-failed",message:error instanceof Error ? error.message : "Could not export the effect."});
  } finally { clearTimeout(timeout); }
};
