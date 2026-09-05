export type DitherPin = Readonly<{ color: string; radius: number; position: Readonly<{ x: number; y: number }>; flashes: number; fill: number; hold: number; clear: number; branches: number }>;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
/** Arrival order stays spatially stable across frames and export resolutions. */
export function pinArrival(x: number, y: number, pin: DitherPin): number {
  const dx = x - pin.position.x, dy = y - pin.position.y;
  const r = Math.hypot(dx, dy) / pin.radius;
  const angle = Math.atan2(dy, dx);
  const tendrils = 0.5 + 0.3 * Math.sin(angle * 9 + r * 5) + 0.2 * Math.sin(angle * 17 - r * 3);
  return clamp01(r * (1 - pin.branches * 0.65 * tendrils));
}
export function pinCellIsColored(x: number, y: number, progress: number, pin: DitherPin): boolean {
  if (pin.radius <= 0 || Math.hypot(x - pin.position.x, y - pin.position.y) > pin.radius) return false;
  const phase = (((progress % 1) + 1) % 1 * pin.flashes) % 1;
  const fill = pin.fill / 100, hold = pin.hold / 100, clear = pin.clear / 100;
  const arrival = pinArrival(x, y, pin);
  if (phase < fill) return phase / fill > arrival;
  if (phase < fill + hold) return true;
  if (clear > 0 && phase < fill + hold + clear) return (phase - fill - hold) / clear < arrival;
  return false;
}
