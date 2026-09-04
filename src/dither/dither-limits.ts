export const MAX_DITHER_SOURCE_PIXELS = 67_108_864;
export const MAX_DITHER_PREVIEW_PIXELS = 67_108_864;
export const MAX_DITHER_EXPORT_PIXELS = 67_108_864;
export const MAX_DITHER_PINS = 32;

export function assertDitherWorkload(input: { sourceWidth?: number; sourceHeight?: number; previewWidth?: number; previewHeight?: number; pinCount?: number }): void {
  if ((input.sourceWidth ?? 0) * (input.sourceHeight ?? 0) > MAX_DITHER_SOURCE_PIXELS) throw new Error("Source exceeds 67,108,864 pixels. Import a smaller image to continue.");
  if ((input.previewWidth ?? 0) * (input.previewHeight ?? 0) > MAX_DITHER_PREVIEW_PIXELS) throw new Error("Preview exceeds 67,108,864 pixels. Reduce scene dimensions or Resolution scale to continue.");
  if ((input.pinCount ?? 0) > MAX_DITHER_PINS) throw new Error("This scene supports up to 32 pins. Remove extra pins to resume rendering.");
}
