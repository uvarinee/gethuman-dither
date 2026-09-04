import { BAYER_8X8 } from "./dither-algorithms";
import { pointerEnvelope } from "./dither-flicker";

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
export const smoothCellPaint = (value: number) => { const t = clamp01(value); return t * t * (3 - 2 * t); };

function latticeNoise(x: number, y: number): number {
  let n = Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ 0x51f15e;
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function softNoise(x: number, y: number): number {
  const ix = Math.floor(x); const iy = Math.floor(y);
  const tx = smoothCellPaint(x - ix); const ty = smoothCellPaint(y - iy);
  const top = latticeNoise(ix, iy) * (1 - tx) + latticeNoise(ix + 1, iy) * tx;
  const bottom = latticeNoise(ix, iy + 1) * (1 - tx) + latticeNoise(ix + 1, iy + 1) * tx;
  return top * (1 - ty) + bottom * ty;
}

/** Spatially stable lobes: movement reveals the field without a second animation clock. */
export function pointerCellField(x: number, y: number, centerX: number, centerY: number, radius: number, softness: number): number {
  const distance = Math.hypot(x - centerX, y - centerY);
  if (distance >= radius) return 0;
  const noiseScale = Math.max(8, radius * 0.32);
  const noise = softNoise(x / noiseScale, y / noiseScale);
  const contour = radius * (0.78 + noise * 0.22);
  const edge = pointerEnvelope(distance, contour, softness);
  const core = 1 - smoothCellPaint(distance / Math.max(1, radius * 0.28));
  return edge * (core + (1 - core) * (0.48 + noise * 0.52));
}

/** The threshold is fixed to the grid, so decay removes cells without random popping. */
export function revealedCellOpacity(x: number, y: number, tone: number, amount: number, inverted = false): number {
  if (amount <= 0) return 0;
  const source = clamp01((inverted ? 255 - tone : tone) / 255);
  if (source === 0) return 0;
  const threshold = (BAYER_8X8[(y % 8) * 8 + (x % 8)] + 0.5) / 64;
  return smoothCellPaint((amount * Math.sqrt(source) - threshold) * 8);
}

export function pointColorFalloff(distance: number, core: number, blur: number): number {
  return 1 - smoothCellPaint((distance - core) / Math.max(1, blur));
}
