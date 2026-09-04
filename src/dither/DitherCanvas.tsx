"use client";
import * as React from "react";
import { getToolcraftTimelineLoopProgress, shouldIncludeToolcraftPreviewBackground } from "@/toolcraft/runtime";
import { useToolcraftEvaluatedValues, useToolcraftMediaPresentationUrls, useToolcraftPipeline, useToolcraftPipelinePass, useToolcraftProductSceneFrame, useToolcraftSelector, useToolcraftViewportInteractionActive } from "@/toolcraft/runtime/react";
import { ditherBuildPass, dynamicFieldPass, previewPresentPass, sourceDecodePass, toneMapPass } from "@/app/app-performance";
import { buildDitherField, buildToneField, renderDitherFrame, type DynamicDitherSettings, type StaticDitherField, type ToneField } from "./dither-renderer";
import { booleanValue, getDitherBackingSize, getDitherSource, idleDitherPointer, numberValue, readDitherSettings, readDynamicSettings, readToneSettings, transformSourcePixels } from "./dither-scene";
import { useDitherPointer, useDitherSource, usePreviewLifecycle, useRecoverablePreviewError } from "./dither-preview-hooks";
import { DitherPinHandles } from "./DitherPinHandles";
import { assertDitherWorkload } from "./dither-limits";
import type { RasterPixels } from "./dither-algorithms";
import styles from "./DitherCanvas.module.css";
import { getDitherSourcePixels } from "./dither-source";
export { parsePins } from "./dither-scene";

function resultOf<Result>(state: { status: string; result?: unknown }): Result | null { return state.status === "success" ? state.result as Result : null; }

export function DitherCanvas(): React.JSX.Element {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const sceneFrame = useToolcraftProductSceneFrame();
  const mediaAssets = useToolcraftSelector((state) => state.mediaAssets, Object.is);
  const timeline = useToolcraftSelector((state) => state.timeline, Object.is);
  const includeBackground = useToolcraftSelector((state) => shouldIncludeToolcraftPreviewBackground({ state }), Object.is);
  const urls = useToolcraftMediaPresentationUrls(mediaAssets);
  const values = useToolcraftEvaluatedValues();
  const pipeline = useToolcraftPipeline();
  const viewportActive = useToolcraftViewportInteractionActive();
  const lifecycle = usePreviewLifecycle(ref);
  const asset = getDitherSource({ mediaAssets });
  const decoded = useDitherSource(asset?.resourceRef, asset ? urls.get(asset.id) : undefined);
  const rect = sceneFrame.kind === "ready" ? sceneFrame.rect : null;
  const width = rect?.width ?? 1; const height = rect?.height ?? 1;
  const renderScale = numberValue(values["canvas.renderScale"], 2);
  const [dpr, setDpr] = React.useState(() => window.devicePixelRatio || 1);
  React.useEffect(() => { const update = () => setDpr(window.devicePixelRatio || 1); window.addEventListener("resize", update); return () => window.removeEventListener("resize", update); }, []);
  const { width: backingWidth, height: backingHeight } = getDitherBackingSize(width, height, dpr, renderScale);
  let guardError: string | undefined;
  try { assertDitherWorkload({ previewWidth: backingWidth, previewHeight: backingHeight, pinCount: Array.isArray(values["pins.items"]) ? values["pins.items"].length : 0 }); } catch (error) { guardError = error instanceof Error ? error.message : String(error); }
  const rawSource = decoded?.pixels ?? null;
  const sourceState = useToolcraftPipelinePass(sourceDecodePass, { "source.mediaId": rawSource, "source.transform": asset?.transform ?? null }, async () => rawSource && asset ? transformSourcePixels(await getDitherSourcePixels(asset.resourceRef), asset.transform) : null);
  const sourceError = sourceState.status === "error" ? String(sourceState.error instanceof Error ? sourceState.error.message : sourceState.error) : undefined;
  useRecoverablePreviewError(guardError ?? decoded?.error ?? sourceError);
  const source = resultOf<RasterPixels>(sourceState);
  const tone = React.useMemo(() => readToneSettings(values), [values["tone.blackPoint"], values["tone.blur"], values["tone.gamma"], values["tone.grain"], values["tone.whitePoint"]]);
  const toneState = useToolcraftPipelinePass(toneMapPass, { "source-decode": source, "tone.blackPoint": tone.blackPoint, "tone.blur": tone.blur, "tone.gamma": tone.gamma, "tone.grain": tone.grain, "tone.whitePoint": tone.whitePoint }, () => source ? buildToneField({ source, tone }) : null);
  const toneField = resultOf<ToneField>(toneState);
  const dither = React.useMemo(() => readDitherSettings(values), [values["dither.algorithm"], values["dither.invert"], values["dither.threshold"]]);
  const pixelSize = numberValue(values["dither.pixelSize"], 2);
  const fieldState = useToolcraftPipelinePass(ditherBuildPass, { "canvas.sceneFrame": `${width}x${height}@${pixelSize}:${guardError ? "unsupported" : "ready"}`, "dither.settings": dither, "tone-map": toneField }, () => toneField && !guardError ? buildDitherField(toneField, width, height, pixelSize, dither) : null);
  const field = resultOf<StaticDitherField>(fieldState);
  const ready = Boolean(rect && rawSource && field && !guardError && !decoded?.error);
  const pointer = useDitherPointer(ref, width, height, numberValue(values["pointer.decay"], 0.82), ready && lifecycle.visible && !lifecycle.reducedMotion && booleanValue(values["pointer.enabled"], true));
  const progress = lifecycle.reducedMotion ? 0 : getToolcraftTimelineLoopProgress(timeline);
  const dynamic = React.useMemo(() => readDynamicSettings(values, width, height, progress, includeBackground, lifecycle.reducedMotion ? idleDitherPointer : pointer.pointer), [height, includeBackground, lifecycle.reducedMotion, pointer.pointer, progress, values, width]);
  const latest = React.useRef({ dynamic, field, ready, width, height, backingWidth, backingHeight, duration: timeline.durationSeconds });
  latest.current = { dynamic, field, ready, width, height, backingWidth, backingHeight, duration: timeline.durationSeconds };
  const lastPaint = React.useRef(0);
  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (!ready) { canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height); return; }
    if (!lifecycle.visible || viewportActive) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      const next = latest.current;
      if (cancelled || !next.ready || !next.field || !ref.current) return;
      const render = async () => {
        const settings = pipeline ? await pipeline.runPass(dynamicFieldPass, undefined, () => next.dynamic) : next.dynamic;
        if (cancelled || !ref.current) return;
        const canvas = ref.current;
        if (canvas.width !== next.backingWidth) canvas.width = next.backingWidth;
        if (canvas.height !== next.backingHeight) canvas.height = next.backingHeight;
        const context = canvas.getContext("2d"); if (!context) return;
        const present = () => {
          context.save(); context.scale(next.backingWidth / next.width, next.backingHeight / next.height);
          renderDitherFrame(context, next.field!, next.width, next.height, settings as DynamicDitherSettings);
          context.restore(); lastPaint.current = performance.now();
          canvas.dataset.ditherCycleDuration = String(next.duration);
        };
        if (pipeline) await pipeline.runPass(previewPresentPass, undefined, present); else present();
      };
      void render();
    }, Math.max(0, 1000 / 30 - (performance.now() - lastPaint.current)));
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [backingHeight, backingWidth, dynamic, field, lifecycle.visible, pipeline, ready, viewportActive]);
  return <>
    <canvas className={rect ? styles.canvas : `${styles.canvas} ${styles.hidden}`} data-dither-output="" data-toolcraft-product-output="" ref={ref} onPointerMove={pointer.onPointerMove} onPointerLeave={pointer.onPointerLeave} />
    {ready && <DitherPinHandles width={width} height={height} />}
  </>;
}
