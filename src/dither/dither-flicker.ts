const clamp = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => { const t = clamp(v); return t * t * (3 - 2 * t); };

function random(seed: number): number {
  let n = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function track(seed: number, phase: number, cycles: number): number {
  const t = phase * cycles;
  const frame = Math.floor(t);
  const a = random(seed + (frame % cycles) * 374761393);
  const b = random(seed + ((frame + 1) % cycles) * 374761393);
  return a + (b - a) * smooth(t - frame);
}

// Per-cell circular value noise: deterministic scrubbing/export, no moving bands.
// Adjacent integer tracks blend so fractional speed changes remain continuous.
export function particleFlicker(x: number, y: number, progress: number, speed: number): number {
  const seed = Math.imul(Math.round(x * 32), 73856093) ^ Math.imul(Math.round(y * 32), 19349663);
  const phase = ((progress % 1) + 1) % 1;
  const rate = Math.max(1, speed * (5 + random(seed ^ 0x51f15e) * 5));
  const low = Math.floor(rate);
  const value = track(seed, phase, low) * (1 - (rate - low)) + track(seed, phase, low + 1) * (rate - low);
  return smooth((value - 0.2) / 0.6);
}

export function pointerEnvelope(distance: number, radius: number, softness: number): number {
  const normalized = distance / Math.max(1, radius);
  if (normalized >= 1) return 0;
  const edge = Math.max(0.02, clamp(softness));
  return 1 - smooth((normalized - (1 - edge)) / edge);
}
