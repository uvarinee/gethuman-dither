import { assertDitherWorkload } from "../dither/dither-limits";
export const effectValueTargets = [
  "tone.blackPoint", "tone.blur", "tone.gamma", "tone.grain", "tone.whitePoint",
  "dither.algorithm", "dither.invert", "dither.threshold", "dither.pixelSize", "dither.ink",
  "appearance.background", "motion.breathing.amount", "motion.breathing.enabled",
  "motion.flicker.amount", "motion.flicker.enabled", "motion.flicker.speed",
  "pointer.enabled", "pointer.radius", "pointer.repelRadius", "pointer.repelForce",
  "pointer.attractForce", "pointer.return", "pointer.damping", "pins.items",
] as const;
export type EffectRect = { x: number; y: number; width: number; height: number };
export type EffectSettings = {
  format: "interactive-dither"; version: 1;
  image: string;
  values: Record<string, unknown>;
  transform: { rotationDeg?: number; flipHorizontal?: boolean; flipVertical?: boolean };
  scene: EffectRect;
  output: EffectRect;
  includeBackground: boolean;
  renderScale: number;
  playback: { durationSeconds: number; initialTimeSeconds: number; loop: boolean };
};
export function validateEffectSettings(input: unknown): EffectSettings {
  if (!input || typeof input !== "object") throw new Error("Missing effect settings.");
  const s = structuredClone(input) as EffectSettings;
  if (s.format !== "interactive-dither" || s.version !== 1) throw new Error("Unsupported effect settings version.");
  if (!/^image\.(png|jpg)$/.test(s.image)) throw new Error("Unsupported source image.");
  for (const r of [s.scene, s.output]) {
    if (!r || ![r.x, r.y, r.width, r.height].every(Number.isFinite) || r.width <= 0 || r.height <= 0 || r.width > 8192 || r.height > 8192) throw new Error("Invalid effect dimensions.");
    assertDitherWorkload({ previewWidth: r.width, previewHeight: r.height });
  }
  if (!s.playback || !Number.isFinite(s.playback.durationSeconds) || s.playback.durationSeconds <= 0 || !Number.isFinite(s.playback.initialTimeSeconds) || s.playback.initialTimeSeconds < 0 || s.playback.initialTimeSeconds > s.playback.durationSeconds || typeof s.playback.loop !== "boolean") throw new Error("Invalid playback settings.");
  if (!s.transform || ![0, 90, 180, 270].includes(s.transform.rotationDeg ?? 0) ||
    [s.transform.flipHorizontal, s.transform.flipVertical].some(v => v !== undefined && typeof v !== "boolean")) throw new Error("Invalid image transform.");
  if (typeof s.includeBackground !== "boolean" || !Number.isFinite(s.renderScale) || s.renderScale < 1 || s.renderScale > 2) throw new Error("Invalid render quality.");
  if (!s.values || typeof s.values !== "object" || Array.isArray(s.values)) throw new Error("Invalid effect values.");
  const v = s.values;
  for (const key of Object.keys(v)) if (!(effectValueTargets as readonly string[]).includes(key)) throw new Error("Unknown effect setting: " + key);
  const ranges: Record<string, [number, number]> = {
    "tone.blackPoint":[0,255], "tone.whitePoint":[0,255], "tone.blur":[0,32], "tone.gamma":[0.01,10], "tone.grain":[0,1],
    "dither.threshold":[0,255], "dither.pixelSize":[1,128], "motion.breathing.amount":[0,1],
    "motion.flicker.amount":[0,1], "motion.flicker.speed":[0,20], "pointer.radius":[0,600], "pointer.repelRadius":[0,600],
    "pointer.repelForce":[0,3], "pointer.attractForce":[0,0.5], "pointer.return":[0.002,0.04], "pointer.damping":[0.8,0.98],
  };
  for (const [key, [min,max]] of Object.entries(ranges)) if (typeof v[key] !== "number" || !Number.isFinite(v[key]) || (v[key] as number) < min || (v[key] as number) > max) throw new Error("Invalid effect value: " + key);
  for (const key of ["dither.invert","motion.breathing.enabled","motion.flicker.enabled","pointer.enabled"]) if (typeof v[key] !== "boolean") throw new Error("Invalid switch: " + key);
  for (const key of ["dither.ink","appearance.background"]) if (!/^#[0-9A-Fa-f]{6}$/.test(String(v[key]))) throw new Error("Invalid color: " + key);
  if (!["floyd-steinberg","bayer","random"].includes(String(v["dither.algorithm"]))) throw new Error("Invalid dither algorithm.");
  if (!Array.isArray(v["pins.items"])) throw new Error("Invalid pins.");
  assertDitherWorkload({pinCount:v["pins.items"].length});
  for (const pin of v["pins.items"]) {
    if (!pin || typeof pin !== "object" || !pin.position || !/^#[0-9a-f]{6}$/i.test(pin.color)) throw new Error("Invalid pin.");
    for (const axis of ["x","y"]) if (!Number.isFinite(Number(pin.position[axis])) || Math.abs(Number(pin.position[axis])) > 1) throw new Error("Invalid pin position.");
    for (const [key,max] of [["radius",600],["coverage",1],["noise",1],["speed",4],["softness",1],["scatter",1]] as const) if (typeof pin[key] !== "number" || !Number.isFinite(pin[key]) || pin[key] < 0 || pin[key] > max) throw new Error("Invalid pin " + key);
  }
  return s;
}
