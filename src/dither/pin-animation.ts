import { particleFlicker, pointerEnvelope } from "./dither-flicker";

export type DitherPin = Readonly<{
  color: string; radius: number; position: Readonly<{ x: number; y: number }>;
  coverage: number; noise: number; speed: number; softness: number; scatter: number;
}>;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Pin-local coordinates keep the same noise at every preview/export backing scale. */
export function samplePin(x: number, y: number, progress: number, pin: DitherPin) {
  const dx = x - pin.position.x, dy = y - pin.position.y;
  const distance = Math.hypot(dx, dy);
  if (pin.radius <= 0 || distance >= pin.radius) return { weight: 0, offsetX: 0, offsetY: 0 };
  const r = distance / pin.radius;
  const edge = pin.softness === 0 ? 1 : pointerEnvelope(distance, pin.radius, pin.softness);
  const nx = dx / pin.radius * 128, ny = dy / pin.radius * 128;
  const phase = pin.speed === 0 ? 0 : progress;
  const speed = Math.max(0.1, pin.speed);
  const noise = particleFlicker(nx, ny, phase, speed);
  const weight = edge * clamp01(pin.coverage + (noise - 0.5) * 2 * pin.noise);
  // Independent, signed motion grows towards the edge. No central repulsion or hole.
  const spread = pin.scatter * pin.radius * 0.7 * r * r * r * edge;
  const offsetX = spread === 0 ? 0 : spread * (2 * particleFlicker(nx + 413, ny - 179, phase, speed * 0.7) - 1);
  const offsetY = spread === 0 ? 0 : spread * (2 * particleFlicker(nx - 271, ny + 593, phase, speed * 0.7) - 1);
  return { weight, offsetX, offsetY };
}
