import type { DitherAlgorithm, RasterPixels } from "./dither-algorithms";
import type { DitherPin, DynamicDitherSettings } from "./dither-renderer";

export const numberValue = (value: unknown, fallback: number) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
export const booleanValue = (value: unknown, fallback: boolean) => typeof value === "boolean" ? value : fallback;
export const stringValue = (value: unknown, fallback: string) => typeof value === "string" ? value : fallback;

export function getDitherBackingSize(width: number, height: number, devicePixelRatio: number, renderScale: number) {
  return { width: Math.max(1, Math.round(width * devicePixelRatio * renderScale)), height: Math.max(1, Math.round(height * devicePixelRatio * renderScale)) };
}

export function parsePins(value: unknown, width: number, height: number, backingScale: number): DitherPin[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const pin = candidate as Record<string, unknown>;
    const position = pin.position && typeof pin.position === "object" ? pin.position as Record<string, unknown> : {};
    const axis = (value: unknown) => Math.max(-1, Math.min(1, Number.parseFloat(String(value)) || 0));
    return [{
      radius: numberValue(pin.radius, 100) * Math.max(0, backingScale),
      color: stringValue(pin.color, "#FF4F2E"),
      position: { x: (axis(position.x) + 1) * width / 2, y: (axis(position.y) + 1) * height / 2 },
      coverage: Math.max(0, Math.min(1, numberValue(pin.coverage, 0.55))),
      noise: Math.max(0, Math.min(1, numberValue(pin.noise, 0.85))),
      speed: Math.max(0, Math.min(4, numberValue(pin.speed, 1))),
      softness: Math.max(0, Math.min(1, numberValue(pin.softness, 0.25))),
      scatter: Math.max(0, Math.min(1, numberValue(pin.scatter, 0.2))),
    }];
  });
}

export function readToneSettings(values: Record<string, unknown>) {
  return {
    blackPoint: numberValue(values["tone.blackPoint"], 0), blur: numberValue(values["tone.blur"], 0),
    gamma: numberValue(values["tone.gamma"], 2), grain: numberValue(values["tone.grain"], 0.07),
    seed: 0x51f15e, whitePoint: numberValue(values["tone.whitePoint"], 251),
  };
}

export function readDitherSettings(values: Record<string, unknown>) {
  return {
    algorithm: stringValue(values["dither.algorithm"], "floyd-steinberg") as DitherAlgorithm,
    invert: booleanValue(values["dither.invert"], false), seed: 0xd17e3,
    threshold: numberValue(values["dither.threshold"], 128),
  };
}

export type DitherPointer = Readonly<{ active: boolean; energy: number; x: number; y: number }>;
export const idleDitherPointer: DitherPointer = Object.freeze({ active: false, energy: 0, x: 0, y: 0 });

export function readDynamicSettings(values: Record<string, unknown>, width: number, height: number, timelineProgress: number, includeBackground: boolean, pointer: DitherPointer = idleDitherPointer): DynamicDitherSettings {
  return {
    background: stringValue(values["appearance.background"], "#0A0A0A"),
    breathingAmount: numberValue(values["motion.breathing.amount"], 0.08), breathingEnabled: booleanValue(values["motion.breathing.enabled"], true),
    includeBackground, ink: stringValue(values["dither.ink"], "#F4F1EA"),
    pins: parsePins(values["pins.items"], width, height, 1),
    pointer: { active: booleanValue(values["pointer.enabled"], true) && pointer.active, radius: numberValue(values["pointer.radius"], 85), x: pointer.x, y: pointer.y, repelRadius: numberValue(values["pointer.repelRadius"], 200), repelForce: numberValue(values["pointer.repelForce"], 1.2), attractForce: numberValue(values["pointer.attractForce"], 0.06), returnSpeed: numberValue(values["pointer.return"], 0.008), damping: numberValue(values["pointer.damping"], 0.92) },
    flickerAmount: numberValue(values["motion.flicker.amount"], 0.65),
    flickerEnabled: booleanValue(values["motion.flicker.enabled"], true), flickerSpeed: numberValue(values["motion.flicker.speed"], 1), timelineProgress,
  };
}

// Flip in source axes, then rotate clockwise, matching the runtime image model.
export function transformSourcePixels(source: RasterPixels, transform: { rotationDeg?: number; flipHorizontal?: boolean; flipVertical?: boolean } | undefined): RasterPixels {
  const turns = (transform?.rotationDeg ?? 0) / 90;
  if (!turns && !transform?.flipHorizontal && !transform?.flipVertical) return source;
  const width = turns % 2 ? source.height : source.width;
  const height = turns % 2 ? source.width : source.height;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < source.height; y += 1) for (let x = 0; x < source.width; x += 1) {
    const fx = transform?.flipHorizontal ? source.width - 1 - x : x;
    const fy = transform?.flipVertical ? source.height - 1 - y : y;
    const dx = turns === 1 ? source.height - 1 - fy : turns === 2 ? source.width - 1 - fx : turns === 3 ? fy : fx;
    const dy = turns === 1 ? fx : turns === 2 ? source.height - 1 - fy : turns === 3 ? source.width - 1 - fx : fy;
    data.set(source.data.subarray((y * source.width + x) * 4, (y * source.width + x) * 4 + 4), (dy * width + dx) * 4);
  }
  return { data, width, height };
}

export function movePin(value: unknown, index: number, x: number, y: number): unknown[] {
  if (!Array.isArray(value)) return [];
  return value.map((pin, itemIndex) => itemIndex === index && pin && typeof pin === "object"
    ? { ...pin, position: { x: Math.max(-1, Math.min(1, x)).toFixed(4), y: Math.max(-1, Math.min(1, y)).toFixed(4) } }
    : pin);
}
