export type RasterPixels = Readonly<{
  data: Uint8ClampedArray;
  height: number;
  width: number;
}>;

export type ToneSettings = Readonly<{
  blackPoint: number;
  blur: number;
  gamma: number;
  grain: number;
  seed?: number;
  whitePoint: number;
}>;

export type DitherAlgorithm = "bayer" | "floyd-steinberg" | "random";
export type DitherSettings = Readonly<{
  algorithm: DitherAlgorithm;
  invert: boolean;
  seed?: number;
  threshold: number;
}>;

export const BAYER_8X8 = new Uint8Array([
  0, 48, 12, 60, 3, 51, 15, 63,
  32, 16, 44, 28, 35, 19, 47, 31,
  8, 56, 4, 52, 11, 59, 7, 55,
  40, 24, 36, 20, 43, 27, 39, 23,
  2, 50, 14, 62, 1, 49, 13, 61,
  34, 18, 46, 30, 33, 17, 45, 29,
  10, 58, 6, 54, 9, 57, 5, 53,
  42, 26, 38, 22, 41, 25, 37, 21,
]);

const clampByte = (value: number) => Math.max(0, Math.min(255, value));

export function createSeededRandom(seed = 0x6d2b79f5): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function sampleCover(source: RasterPixels, targetWidth: number, targetHeight: number): RasterPixels {
  const width = Math.max(1, Math.floor(targetWidth));
  const height = Math.max(1, Math.floor(targetHeight));
  const result = new Uint8ClampedArray(width * height * 4);
  const scale = Math.max(width / source.width, height / source.height);
  const cropX = (source.width - width / scale) / 2;
  const cropY = (source.height - height / scale) / 2;
  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(source.height - 1, Math.max(0, Math.floor(cropY + (y + 0.5) / scale)));
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(source.width - 1, Math.max(0, Math.floor(cropX + (x + 0.5) / scale)));
      const from = (sourceY * source.width + sourceX) * 4;
      result.set(source.data.subarray(from, from + 4), (y * width + x) * 4);
    }
  }
  return { data: result, height, width };
}

export function rasterToLuminance(source: RasterPixels): Float32Array {
  const luminance = new Float32Array(source.width * source.height);
  for (let index = 0; index < luminance.length; index += 1) {
    const offset = index * 4;
    const alpha = source.data[offset + 3] / 255;
    const value = source.data[offset] * 0.2126 + source.data[offset + 1] * 0.7152 + source.data[offset + 2] * 0.0722;
    luminance[index] = value * alpha + 255 * (1 - alpha);
  }
  return luminance;
}

function boxBlur(input: Float32Array, width: number, height: number, radius: number): Float32Array {
  const r = Math.max(0, Math.round(radius));
  if (r === 0) return input.slice();
  const horizontal = new Float32Array(input.length);
  const output = new Float32Array(input.length);
  for (let y = 0; y < height; y += 1) {
    let sum = 0;
    for (let x = -r; x <= r; x += 1) sum += input[y * width + Math.max(0, Math.min(width - 1, x))];
    for (let x = 0; x < width; x += 1) {
      horizontal[y * width + x] = sum / (r * 2 + 1);
      sum += input[y * width + Math.min(width - 1, x + r + 1)] - input[y * width + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < width; x += 1) {
    let sum = 0;
    for (let y = -r; y <= r; y += 1) sum += horizontal[Math.max(0, Math.min(height - 1, y)) * width + x];
    for (let y = 0; y < height; y += 1) {
      output[y * width + x] = sum / (r * 2 + 1);
      sum += horizontal[Math.min(height - 1, y + r + 1) * width + x] - horizontal[Math.max(0, y - r) * width + x];
    }
  }
  return output;
}

export function preprocessLuminance(input: Float32Array, width: number, height: number, settings: ToneSettings): Float32Array {
  const blurred = boxBlur(input, width, height, settings.blur);
  const result = new Float32Array(blurred.length);
  const random = createSeededRandom(settings.seed);
  const black = clampByte(settings.blackPoint);
  const white = Math.max(black + 1, clampByte(settings.whitePoint));
  const gamma = Math.max(0.01, settings.gamma);
  const grain = Math.max(0, settings.grain) * 255;
  for (let index = 0; index < blurred.length; index += 1) {
    const withGrain = blurred[index] + (random() * 2 - 1) * grain;
    const normalized = Math.max(0, Math.min(1, (withGrain - black) / (white - black)));
    result[index] = clampByte(Math.pow(normalized, 1 / gamma) * 255);
  }
  return result;
}

export function ditherLuminance(input: Float32Array, width: number, height: number, settings: DitherSettings): Uint8Array {
  const threshold = clampByte(settings.threshold);
  const output = new Uint8Array(input.length);
  const random = createSeededRandom(settings.seed);
  if (settings.algorithm === "floyd-steinberg") {
    const working = input.slice();
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = y * width + x;
        const quantized = working[index] >= threshold ? 255 : 0;
        output[index] = settings.invert ? 255 - quantized : quantized;
        const error = working[index] - quantized;
        if (x + 1 < width) working[index + 1] += error * (7 / 16);
        if (y + 1 < height) {
          if (x > 0) working[index + width - 1] += error * (3 / 16);
          working[index + width] += error * (5 / 16);
          if (x + 1 < width) working[index + width + 1] += error * (1 / 16);
        }
      }
    }
    return output;
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const localThreshold = settings.algorithm === "bayer"
        ? clampByte(threshold + (BAYER_8X8[(y % 8) * 8 + (x % 8)] - 31.5) * 4)
        : clampByte(threshold + (random() - 0.5) * 255);
      const quantized = input[index] >= localThreshold ? 255 : 0;
      output[index] = settings.invert ? 255 - quantized : quantized;
    }
  }
  return output;
}
