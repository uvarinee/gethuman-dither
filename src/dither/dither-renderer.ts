import {
  ditherLuminance,
  preprocessLuminance,
  rasterToLuminance,
  sampleCover,
  type DitherSettings,
  type RasterPixels,
  type ToneSettings,
} from "./dither-algorithms";
import { assertDitherWorkload } from "./dither-limits";
import { particleFlicker } from "./dither-flicker";
import { pointColorFalloff, pointerCellField, revealedCellOpacity } from "./dither-cell-paint";

export type StaticDitherField = Readonly<{
  inverted?: boolean;
  height: number;
  mask: Uint8Array;
  pixelSize: number;
  tone: Float32Array;
  width: number;
}>;

export type ToneField = Readonly<{
  height: number;
  tone: Float32Array;
  width: number;
}>;

export type DitherPin = Readonly<{
  bloom: number;
  color: string;
  core: number;
  intensity: number;
  position: Readonly<{ x: number; y: number }>;
  pulse: "double" | "single";
}>;

export type DynamicDitherSettings = Readonly<{
  background: string;
  breathingAmount: number;
  breathingEnabled: boolean;
  includeBackground: boolean;
  ink: string;
  pins: readonly DitherPin[];
  pointer: Readonly<{ active: boolean; radius: number; strength: number; x: number; y: number; energy?: number; speed?: number; softness?: number; size?: number }>;
  flickerAmount: number;
  flickerEnabled: boolean;
  flickerSpeed: number;
  timelineProgress: number;
}>;

export type StaticDitherOptions = Readonly<{
  dither: DitherSettings;
  pixelSize: number;
  source: RasterPixels;
  targetHeight: number;
  targetWidth: number;
  tone: ToneSettings;
}>;

const TAU = Math.PI * 2;
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function buildToneField(options: Pick<StaticDitherOptions, "source" | "tone">): ToneField {
  const width = options.source.width;
  const height = options.source.height;
  const tone = preprocessLuminance(
    rasterToLuminance(options.source),
    width,
    height,
    options.tone,
  );
  return { height, tone, width };
}

export function buildDitherField(
  toneField: ToneField,
  targetWidth: number,
  targetHeight: number,
  pixelSize: number,
  dither: DitherSettings,
): StaticDitherField {
  const resolvedPixelSize = Math.max(1, Math.round(pixelSize));
  const width = Math.max(1, Math.ceil(targetWidth / resolvedPixelSize));
  const height = Math.max(1, Math.ceil(targetHeight / resolvedPixelSize));
  const sourcePixels = new Uint8ClampedArray(toneField.tone.length * 4);
  for (let index = 0; index < toneField.tone.length; index += 1) {
    const value = toneField.tone[index];
    sourcePixels.set([value, value, value, 255], index * 4);
  }
  const sampled = sampleCover(
    { data: sourcePixels, height: toneField.height, width: toneField.width },
    width,
    height,
  );
  const tone = rasterToLuminance(sampled);
  return {
    height,
    mask: ditherLuminance(tone, width, height, dither),
    inverted: dither.invert,
    pixelSize: resolvedPixelSize,
    tone,
    width,
  };
}

export function buildStaticDitherField(options: StaticDitherOptions): StaticDitherField {
  return buildDitherField(
    buildToneField(options),
    options.targetWidth,
    options.targetHeight,
    options.pixelSize,
    options.dither,
  );
}

export class StaticDitherCache {
  private key: string | undefined;
  private source: RasterPixels | undefined;
  private value: StaticDitherField | undefined;

  get(options: StaticDitherOptions): StaticDitherField {
    const key = JSON.stringify({
      dither: options.dither,
      pixelSize: options.pixelSize,
      targetHeight: options.targetHeight,
      targetWidth: options.targetWidth,
      tone: options.tone,
    });
    if (this.source === options.source && this.key === key && this.value) return this.value;
    this.source = options.source;
    this.key = key;
    this.value = buildStaticDitherField(options);
    return this.value;
  }

  clear(): void {
    this.key = undefined;
    this.source = undefined;
    this.value = undefined;
  }
}

export function parseHexColor(value: string): readonly [number, number, number] {
  const match = /^#([0-9a-f]{6})$/i.exec(value);
  if (!match) return [255, 255, 255];
  return [
    Number.parseInt(match[1].slice(0, 2), 16),
    Number.parseInt(match[1].slice(2, 4), 16),
    Number.parseInt(match[1].slice(4, 6), 16),
  ];
}

function pulseAt(progress: number, pulse: DitherPin["pulse"]): number {
  const wave = (offset: number) => Math.pow(Math.max(0, Math.cos((progress - offset) * TAU)), 12);
  return pulse === "double" ? Math.max(wave(0), wave(0.22)) : wave(0);
}

export function getDynamicCell(
  sceneX: number,
  sceneY: number,
  settings: DynamicDitherSettings,
): Readonly<{ color: readonly [number, number, number]; scale: number; opacity: number; offsetX: number; offsetY: number; reveal: number }> {
  const progress = ((settings.timelineProgress % 1) + 1) % 1;
  let scale = settings.breathingEnabled
    ? 1 + Math.sin(progress * TAU) * settings.breathingAmount
    : 1;
  let color = parseHexColor(settings.ink);

  const pointer = settings.pointer;
  const influence = pointer.active
    ? pointerCellField(sceneX, sceneY, pointer.x, pointer.y, pointer.radius, pointer.softness ?? 0.65)
      * clamp01(pointer.energy ?? 1) * clamp01(pointer.strength)
    : 0;
  // Hover can fill more of a cell, but never move it or close its grid gap.
  scale += influence * clamp01(pointer.size ?? 0.2) * Math.max(0, 1.16 - scale);

  let opacity = 1;
  if (settings.flickerEnabled) {
    const ambient = particleFlicker(sceneX, sceneY, progress, settings.flickerSpeed);
    const fast = influence > 0 ? particleFlicker(sceneX, sceneY, progress, settings.flickerSpeed * (settings.pointer.speed ?? 3)) : ambient;
    // Local flicker adds visibility; a phase change must never darken a hovered cell.
    const visible = ambient + Math.max(0, fast - ambient) * influence;
    opacity = 1 - clamp01(settings.flickerAmount) * (1 - visible);
  }

  opacity += (1 - opacity) * influence;

  for (const pin of settings.pins) {
    const distance = Math.hypot(sceneX - pin.position.x, sceneY - pin.position.y);
    const radial = pointColorFalloff(distance, pin.core, pin.bloom);
    const influence = radial * clamp01(pin.intensity) * (0.55 + pulseAt(progress, pin.pulse) * 0.45);
    if (influence <= 0) continue;
    const pinColor = parseHexColor(pin.color);
    color = color.map((channel, index) => Math.round(channel + (pinColor[index] - channel) * influence)) as unknown as readonly [number, number, number];
    opacity += (1 - opacity) * influence;
  }

  return { color, scale: Math.max(0.08, scale), opacity, offsetX: 0, offsetY: 0, reveal: influence };
}

export function renderDitherFrame(
  context: CanvasRenderingContext2D,
  field: StaticDitherField,
  width: number,
  height: number,
  settings: DynamicDitherSettings,
  clear = true,
): void {
  if (clear) context.clearRect(0, 0, width, height);
  if (settings.includeBackground) {
    context.fillStyle = settings.background;
    context.fillRect(0, 0, width, height);
  }
  const cellWidth = width / field.width;
  const cellHeight = height / field.height;
  const originalAlpha = context.globalAlpha ?? 1;
  for (let y = 0; y < field.height; y += 1) {
    for (let x = 0; x < field.width; x += 1) {
      const index = y * field.width + x;
      const centerX = (x + 0.5) * cellWidth;
      const centerY = (y + 0.5) * cellHeight;
      const empty = field.mask[index] === 0;
      if (empty && (!settings.pointer.active || settings.pointer.strength <= 0
        || Math.hypot(centerX - settings.pointer.x, centerY - settings.pointer.y) >= settings.pointer.radius)) continue;
      const dynamic = getDynamicCell(centerX, centerY, settings);
      const coverage = empty ? revealedCellOpacity(x, y, field.tone[index], dynamic.reveal, field.inverted) : 1;
      if (coverage <= 0) continue;
      const drawWidth = Math.max(1, cellWidth * 0.82 * dynamic.scale);
      const drawHeight = Math.max(1, cellHeight * 0.82 * dynamic.scale);
      context.fillStyle = `rgb(${dynamic.color[0]} ${dynamic.color[1]} ${dynamic.color[2]})`;
      context.globalAlpha = originalAlpha * dynamic.opacity * coverage;
      context.fillRect(centerX + dynamic.offsetX - drawWidth / 2, centerY + dynamic.offsetY - drawHeight / 2, drawWidth, drawHeight);
    }
  }
  context.globalAlpha = originalAlpha;
}

export function decodeImageElement(image: HTMLImageElement): RasterPixels {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  assertDitherWorkload({ sourceWidth: width, sourceHeight: height });
  if (width <= 0 || height <= 0) throw new Error("Source image has no decodable pixels.");
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas 2D is unavailable.");
  context.drawImage(image, 0, 0);
  const imageData = context.getImageData(0, 0, width, height);
  canvas.width = 0;
  canvas.height = 0;
  return { data: imageData.data.slice(), height, width };
}
