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
import { particleFlicker, pointerEnvelope } from "./dither-flicker";

export type StaticDitherField = Readonly<{
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
): Readonly<{ color: readonly [number, number, number]; scale: number; opacity: number; offsetX: number; offsetY: number }> {
  const progress = ((settings.timelineProgress % 1) + 1) % 1;
  let scale = settings.breathingEnabled
    ? 1 + Math.sin(progress * TAU) * settings.breathingAmount
    : 1;
  let color = parseHexColor(settings.ink);

  let influence = 0;
  let offsetX = 0;
  let offsetY = 0;
  if (settings.pointer.active) {
    const dx = sceneX - settings.pointer.x;
    const dy = sceneY - settings.pointer.y;
    influence = pointerEnvelope(Math.hypot(dx, dy), settings.pointer.radius, settings.pointer.softness ?? 0.65) * (settings.pointer.energy ?? 1);
    const raised = influence * settings.pointer.strength;
    offsetX = dx * raised * 0.28;
    offsetY = dy * raised * 0.28 - settings.pointer.radius * raised * 0.12;
    scale += raised * 0.25 + influence * (settings.pointer.size ?? 0.2);
  }

  let opacity = 1;
  if (settings.flickerEnabled) {
    const ambient = particleFlicker(sceneX, sceneY, progress, settings.flickerSpeed);
    const fast = influence > 0 ? particleFlicker(sceneX, sceneY, progress, settings.flickerSpeed * (settings.pointer.speed ?? 3)) : ambient;
    opacity = 1 - clamp01(settings.flickerAmount) * (1 - (ambient + (fast - ambient) * influence));
  }

  for (const pin of settings.pins) {
    const distance = Math.hypot(sceneX - pin.position.x, sceneY - pin.position.y);
    const radial = distance <= pin.core
      ? 1
      : 1 - clamp01((distance - pin.core) / Math.max(1, pin.bloom));
    const influence = radial * pin.intensity * (0.55 + pulseAt(progress, pin.pulse) * 0.45);
    if (influence <= 0) continue;
    const pinColor = parseHexColor(pin.color);
    color = color.map((channel, index) => Math.round(channel + (pinColor[index] - channel) * influence)) as unknown as readonly [number, number, number];
    scale += influence * 0.65;
  }

  return { color, scale: Math.max(0.08, scale), opacity, offsetX, offsetY };
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
      if (field.mask[index] === 0) continue;
      const centerX = (x + 0.5) * cellWidth;
      const centerY = (y + 0.5) * cellHeight;
      const dynamic = getDynamicCell(centerX, centerY, settings);
      const drawWidth = Math.max(1, cellWidth * 0.82 * dynamic.scale);
      const drawHeight = Math.max(1, cellHeight * 0.82 * dynamic.scale);
      context.fillStyle = `rgb(${dynamic.color[0]} ${dynamic.color[1]} ${dynamic.color[2]})`;
      context.globalAlpha = originalAlpha * dynamic.opacity;
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
