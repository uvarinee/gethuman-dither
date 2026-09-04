"use client";

import * as React from "react";

import { getToolcraftTimelineLoopProgress, type ToolcraftImageAsset, type ToolcraftMediaAsset } from "@/toolcraft/runtime";
import {
  useToolcraftEvaluatedValues,
  useToolcraftMediaPresentationUrls,
  useToolcraftPipeline,
  useToolcraftPipelinePass,
  useToolcraftProductSceneFrame,
  useToolcraftSelector,
  useToolcraftViewportInteractionActive,
} from "@/toolcraft/runtime/react";
import {
  ditherBuildPass,
  dynamicFieldPass,
  previewPresentPass,
  sourceDecodePass,
  toneMapPass,
} from "@/app/app-performance";

import styles from "./DitherCanvas.module.css";
import type { DitherAlgorithm, RasterPixels } from "./dither-algorithms";
import {
  buildDitherField,
  buildToneField,
  decodeImageElement,
  renderDitherFrame,
  type DitherPin,
  type DynamicDitherSettings,
  type StaticDitherField,
  type ToneField,
} from "./dither-renderer";

type PointerField = Readonly<{ active: boolean; energy: number; x: number; y: number }>;

const selectMediaAssets = (state: { mediaAssets: ToolcraftMediaAsset[] }) => state.mediaAssets;
const selectTimeline = (state: { timeline: { currentTimeSeconds: number; durationSeconds: number } }) => ({
  currentTimeSeconds: state.timeline.currentTimeSeconds,
  durationSeconds: state.timeline.durationSeconds,
});
const sameTimeline = (left: ReturnType<typeof selectTimeline>, right: ReturnType<typeof selectTimeline>) =>
  left.currentTimeSeconds === right.currentTimeSeconds && left.durationSeconds === right.durationSeconds;

const numberValue = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;
const booleanValue = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;
const stringValue = (value: unknown, fallback: string) =>
  typeof value === "string" ? value : fallback;

export function parsePins(
  value: unknown,
  width: number,
  height: number,
  backingScale: number,
): DitherPin[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const pin = candidate as Record<string, unknown>;
    const position = pin.position && typeof pin.position === "object"
      ? pin.position as Record<string, unknown>
      : {};
    const rawX = Number.parseFloat(String(position.x ?? 0));
    const rawY = Number.parseFloat(String(position.y ?? 0));
    const normalizedX = Number.isFinite(rawX) ? Math.max(-1, Math.min(1, rawX)) : 0;
    const normalizedY = Number.isFinite(rawY) ? Math.max(-1, Math.min(1, rawY)) : 0;
    const resolvedBackingScale = Math.max(0, backingScale);
    return [{
      bloom: numberValue(pin.bloom, 48) * resolvedBackingScale,
      color: stringValue(pin.color, "#FF4F2E"),
      core: numberValue(pin.core, 12) * resolvedBackingScale,
      intensity: numberValue(pin.intensity, 0.9),
      position: {
        x: ((normalizedX + 1) / 2) * width,
        y: ((normalizedY + 1) / 2) * height,
      },
      pulse: pin.pulse === "single" ? "single" : "double",
    }];
  });
}

function useDecodedImage(url: string | undefined): HTMLImageElement | null {
  const [image, setImage] = React.useState<HTMLImageElement | null>(null);
  React.useEffect(() => {
    if (!url) {
      setImage(null);
      return;
    }
    let active = true;
    const next = new Image();
    next.decoding = "async";
    next.onload = () => { if (active) setImage(next); };
    next.onerror = () => { if (active) setImage(null); };
    next.src = url;
    return () => {
      active = false;
      next.onload = null;
      next.onerror = null;
      next.src = "";
    };
  }, [url]);
  return image;
}

function usePointerField(canvasRef: React.RefObject<HTMLCanvasElement | null>, decay: number) {
  const [pointer, setPointer] = React.useState<PointerField>({ active: false, energy: 0, x: 0, y: 0 });
  const queued = React.useRef<{ x: number; y: number } | null>(null);
  const frame = React.useRef<number | null>(null);

  const flush = React.useCallback(() => {
    frame.current = null;
    const next = queued.current;
    queued.current = null;
    if (next) setPointer({ active: true, energy: 1, ...next });
  }, []);

  const onPointerMove = React.useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    queued.current = {
      x: (event.clientX - bounds.left) * (canvas.width / Math.max(1, bounds.width)),
      y: (event.clientY - bounds.top) * (canvas.height / Math.max(1, bounds.height)),
    };
    if (frame.current === null) frame.current = requestAnimationFrame(flush);
  }, [canvasRef, flush]);

  const onPointerLeave = React.useCallback(() => {
    queued.current = null;
    const fade = () => {
      setPointer((current) => {
        const energy = current.energy * Math.max(0.1, Math.min(0.99, decay));
        if (energy < 0.01) return { ...current, active: false, energy: 0 };
        frame.current = requestAnimationFrame(fade);
        return { ...current, active: true, energy };
      });
    };
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(fade);
  }, [decay]);

  React.useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    queued.current = null;
  }, []);

  return { onPointerLeave, onPointerMove, pointer };
}

function resultOf<Result>(state: { status: string; result?: unknown }): Result | null {
  return state.status === "success" ? state.result as Result : null;
}

export function DitherCanvas(): React.JSX.Element {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const sceneFrame = useToolcraftProductSceneFrame();
  const mediaAssets = useToolcraftSelector(selectMediaAssets, Object.is);
  const urls = useToolcraftMediaPresentationUrls(mediaAssets);
  const values = useToolcraftEvaluatedValues();
  const timeline = useToolcraftSelector(selectTimeline, sameTimeline);
  const viewportInteractionActive = useToolcraftViewportInteractionActive();
  const pipeline = useToolcraftPipeline();
  const sourceAsset = mediaAssets.find((asset): asset is ToolcraftImageAsset => asset.assetKind === "image" && asset.sourceTarget === "source.image");
  const sourceUrl = sourceAsset ? urls.get(sourceAsset.id) : undefined;
  const image = useDecodedImage(sourceUrl);
  const rect = sceneFrame.kind === "ready" ? sceneFrame.rect : null;
  const renderScale = Math.max(1, numberValue(values["canvas.renderScale"], 2));
  const dpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  const backingWidth = Math.max(1, Math.round((rect?.width ?? 1) * dpr * renderScale));
  const backingHeight = Math.max(1, Math.round((rect?.height ?? 1) * dpr * renderScale));

  const sourceState = useToolcraftPipelinePass(
    sourceDecodePass,
    {
      "source.mediaId": image ?? sourceAsset?.resourceRef ?? "empty",
      "source.transform": sourceAsset?.transform ?? null,
    },
    () => image ? decodeImageElement(image) : null,
  );
  const source = resultOf<RasterPixels | null>(sourceState);
  const pixelSize = Math.max(1, Math.round(numberValue(values["dither.pixelSize"], 2)));
  const toneSettings = React.useMemo(() => ({
    blackPoint: numberValue(values["tone.blackPoint"], 0),
    blur: numberValue(values["tone.blur"], 0),
    gamma: numberValue(values["tone.gamma"], 2),
    grain: numberValue(values["tone.grain"], 0.07),
    seed: 0x51f15e,
    whitePoint: numberValue(values["tone.whitePoint"], 251),
  }), [
    values["tone.blackPoint"],
    values["tone.blur"],
    values["tone.gamma"],
    values["tone.grain"],
    values["tone.whitePoint"],
  ]);
  const toneState = useToolcraftPipelinePass(
    toneMapPass,
    {
      "source-decode": source,
      "tone.blackPoint": toneSettings.blackPoint,
      "tone.blur": toneSettings.blur,
      "tone.gamma": toneSettings.gamma,
      "tone.grain": toneSettings.grain,
      "tone.whitePoint": toneSettings.whitePoint,
    },
    () => source ? buildToneField({ source, tone: toneSettings }) : null,
  );
  const toneField = resultOf<ToneField | null>(toneState);
  const ditherSettings = React.useMemo(() => ({
    algorithm: stringValue(values["dither.algorithm"], "floyd-steinberg") as DitherAlgorithm,
    invert: booleanValue(values["dither.invert"], false),
    seed: 0xd17e3,
    threshold: numberValue(values["dither.threshold"], 128),
  }), [
    values["dither.algorithm"],
    values["dither.invert"],
    values["dither.threshold"],
  ]);
  const ditherState = useToolcraftPipelinePass(
    ditherBuildPass,
    {
      "canvas.sceneFrame": `${backingWidth}x${backingHeight}@${pixelSize}`,
      "dither.settings": ditherSettings,
      "tone-map": toneField,
    },
    () => toneField ? buildDitherField(toneField, backingWidth, backingHeight, pixelSize, ditherSettings) : null,
  );
  const field = resultOf<StaticDitherField | null>(ditherState);
  const pointerDecay = numberValue(values["pointer.decay"], 0.82);
  const pointerInteraction = usePointerField(canvasRef, pointerDecay);
  const timelineProgress = getToolcraftTimelineLoopProgress(timeline);
  const dynamicSettings = React.useMemo<DynamicDitherSettings>(() => ({
    background: stringValue(values["appearance.background"], "#0A0A0A"),
    breathingAmount: numberValue(values["motion.breathing.amount"], 0.08),
    breathingEnabled: booleanValue(values["motion.breathing.enabled"], true),
    includeBackground: booleanValue(values["export.includeBackground"], true),
    ink: stringValue(values["dither.ink"], "#F4F1EA"),
    pins: parsePins(values["pins.items"], backingWidth, backingHeight, dpr * renderScale),
    pointer: {
      active: booleanValue(values["pointer.enabled"], true) && pointerInteraction.pointer.active,
      radius: numberValue(values["pointer.radius"], 180) * dpr * renderScale,
      strength: numberValue(values["pointer.strength"], 0.55) * pointerInteraction.pointer.energy,
      x: pointerInteraction.pointer.x,
      y: pointerInteraction.pointer.y,
    },
    shimmerAmount: numberValue(values["motion.shimmer.amount"], 0.28),
    shimmerColor: stringValue(values["motion.shimmer.color"], "#FF4F2E"),
    shimmerEnabled: booleanValue(values["motion.shimmer.enabled"], true),
    shimmerSpeed: numberValue(values["motion.shimmer.speed"], 0.65),
    timelineProgress,
  }), [backingHeight, backingWidth, dpr, pointerInteraction.pointer, renderScale, timelineProgress, values]);
  React.useEffect(() => {
    if (viewportInteractionActive || !field || !canvasRef.current || !rect) return;
    let active = true;
    const render = async () => {
      const dynamic = pipeline
        ? await pipeline.runPass(dynamicFieldPass, undefined, () => dynamicSettings)
        : dynamicSettings;
      if (!active || !canvasRef.current) return;
      const canvas = canvasRef.current;
      if (canvas.width !== backingWidth) canvas.width = backingWidth;
      if (canvas.height !== backingHeight) canvas.height = backingHeight;
      const context = canvas.getContext("2d");
      if (!context) return;
      const present = () => renderDitherFrame(
        context,
        field,
        backingWidth,
        backingHeight,
        dynamic as DynamicDitherSettings,
      );
      if (pipeline) await pipeline.runPass(previewPresentPass, undefined, present);
      else present();
    };
    void render();
    return () => { active = false; };
  }, [backingHeight, backingWidth, dynamicSettings, field, pipeline, rect, viewportInteractionActive]);

  return (
    <canvas
      className={rect ? styles.canvas : `${styles.canvas} ${styles.hidden}`}
      data-dither-output=""
      data-toolcraft-product-output=""
      height={backingHeight}
      onPointerLeave={pointerInteraction.onPointerLeave}
      onPointerMove={pointerInteraction.onPointerMove}
      width={backingWidth}
      ref={canvasRef}
    />
  );
}
