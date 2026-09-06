import { buildStaticDitherField, decodeImageElement, renderDitherFrame } from "../dither/dither-renderer";
import { PointerSimulation } from "../dither/pointer-physics";
import { getDitherBackingSize, idleDitherPointer, readDitherSettings, readToneSettings, readDynamicSettings, transformSourcePixels, type DitherPointer } from "../dither/dither-settings";
import { assertDitherWorkload } from "../dither/dither-limits";
import { validateEffectSettings } from "./settings";
export type { EffectSettings } from "./settings";

/** Mount one independent effect. Logical scene geometry stays fixed as the container resizes. */
export async function createDitherEffect(options: {
  container: HTMLElement; settings: unknown; imageUrl?: string; autoplay?: boolean; signal?: AbortSignal;
}) {
  const settings = validateEffectSettings(options.settings);
  const { scene, output, values } = settings;
  options.signal?.throwIfAborted();
  const image = new Image();
  image.crossOrigin = "anonymous";
  const abortImage = () => { image.src = ""; };
  options.signal?.addEventListener("abort", abortImage, {once:true});
  try {
    image.src = options.imageUrl ?? settings.image;
    await image.decode();
    options.signal?.throwIfAborted();
  } finally { options.signal?.removeEventListener("abort", abortImage); }
  const source = transformSourcePixels(decodeImageElement(image), settings.transform);
  const field = buildStaticDitherField({ source, targetWidth: scene.width, targetHeight: scene.height, pixelSize: values["dither.pixelSize"] as number, tone: readToneSettings(values), dither: readDitherSettings(values) });
  const sim = new PointerSimulation(field.mask, field.width, field.height, scene.width, scene.height);
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-label", "Interactive dither effect");
  canvas.dataset.ditherEffect = "";
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.aspectRatio = output.width + " / " + output.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D is unavailable.");
  let destroyed = false, frame = 0, previous = 0, lastPaint = 0, dirty = true;
  let playing = options.autoplay !== false;
  let time = settings.playback.initialTimeSeconds;
  let pointer: DitherPointer = idleDitherPointer;
  let intersecting = true;
  let error: Error | null = null;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const controller = new AbortController();
  function assertLive() { if (destroyed) throw new Error("Effect has been destroyed."); }
  function resize() {
    assertLive();
    const width = canvas.getBoundingClientRect().width;
    if (width <= 0) return;
    const height = width * output.height / output.width;
    const backing = getDitherBackingSize(width, height, devicePixelRatio || 1, settings.renderScale);
    assertDitherWorkload({previewWidth:backing.width, previewHeight:backing.height});
    if (canvas.width !== backing.width) canvas.width = backing.width;
    if (canvas.height !== backing.height) canvas.height = backing.height;
    dirty = true;
  }
  function paint() {
    context!.setTransform(canvas.width / output.width, 0, 0, canvas.height / output.height, 0, 0);
    context!.clearRect(0,0,output.width,output.height);
    if (settings.includeBackground) {
      context!.fillStyle = values["appearance.background"] as string;
      context!.fillRect(0,0,output.width,output.height);
    }
    context!.save();
    context!.translate(scene.x-output.x, scene.y-output.y);
    context!.beginPath(); context!.rect(0,0,scene.width,scene.height); context!.clip();
    const progress = motion.matches ? 0 : time / settings.playback.durationSeconds;
    renderDitherFrame(context!, field, scene.width,scene.height,readDynamicSettings(values,scene.width,scene.height,progress,false,pointer),false,sim.cells);
    context!.restore();
    dirty = false;
  }
  function fail(cause: unknown) {
    error = cause instanceof Error ? cause : new Error(String(cause));
    playing = false;
    cancelAnimationFrame(frame); frame = 0;
    canvas.dispatchEvent(new CustomEvent("dither-error", {detail:error, bubbles:true}));
  }
  function visible() { return !document.hidden && intersecting; }
  function tick(now: number) {
    frame = 0;
    if (destroyed || !visible() || error) return;
    const dt = previous ? (now - previous) / 1000 : 1/60;
    if (now - lastPaint >= 1000/30) {
      previous = now;
      if (playing && !motion.matches) {
        time += dt;
        if (settings.playback.loop) time %= settings.playback.durationSeconds;
        else if (time >= settings.playback.durationSeconds) { time = settings.playback.durationSeconds; playing = false; }
        dirty = true;
      }
      if (!motion.matches && (pointer.active || sim.cells.size)) {
        sim.advance(dt,readDynamicSettings(values,scene.width,scene.height,0,false,pointer).pointer);
        dirty = true;
      }
      try {
        resize(); // Checks DPR changes too; logical dither field is retained.
        if (dirty) paint();
      } catch(cause) { fail(cause); return; }
      lastPaint = now;
    }
    if (playing && !motion.matches || pointer.active || sim.cells.size || dirty) schedule();
  }
  function schedule() { if (!frame && !destroyed && visible() && !error) frame = requestAnimationFrame(tick); }
  function leave() { pointer = idleDitherPointer; schedule(); }
  function onPointer(event: PointerEvent) {
    if (!values["pointer.enabled"] || motion.matches || event.buttons !== 0) { leave(); return; }
    const box = canvas.getBoundingClientRect();
    pointer = {active:true,energy:1,x:(event.clientX-box.left)*output.width/Math.max(1,box.width)+output.x-scene.x,y:(event.clientY-box.top)*output.height/Math.max(1,box.height)+output.y-scene.y};
    if (!frame) previous = 0;
    schedule();
  }
  function visibilityChanged() {
    previous = 0;
    if (!visible()) { leave(); cancelAnimationFrame(frame); frame = 0; }
    else { dirty = true; schedule(); }
  }
  function motionChanged() { pointer = idleDitherPointer; sim.clear(); dirty = true; previous = 0; schedule(); }
  const observer = new IntersectionObserver(([entry]) => { intersecting = entry.isIntersecting; visibilityChanged(); });
  const resizer = new ResizeObserver(() => { try { resize(); schedule(); } catch(cause) { fail(cause); } });
  function destroy() {
    if (destroyed) return;
    destroyed = true; cancelAnimationFrame(frame);
    controller.abort(); observer.disconnect(); resizer.disconnect();
    motion.removeEventListener("change",motionChanged);
    options.signal?.removeEventListener("abort",destroy);
    sim.clear(); canvas.remove(); canvas.width = 0; canvas.height = 0;
  }
  options.container.append(canvas);
  try {
    resize(); paint();
    canvas.addEventListener("pointermove",onPointer,{signal:controller.signal});
    canvas.addEventListener("pointerleave",leave,{signal:controller.signal});
    canvas.addEventListener("pointercancel",leave,{signal:controller.signal});
    document.addEventListener("visibilitychange",visibilityChanged,{signal:controller.signal});
    window.addEventListener("resize",() => { try { resize(); schedule(); } catch(cause) { fail(cause); } },{signal:controller.signal});
    motion.addEventListener("change",motionChanged);
    observer.observe(canvas); resizer.observe(canvas);
    options.signal?.addEventListener("abort",destroy,{once:true});
    options.signal?.throwIfAborted();
    schedule();
  } catch(cause) { destroy(); throw cause; }
  return {
    canvas,
    get currentTime() { return time; },
    get isPlaying() { return playing; },
    get error() { return error; },
    play() { assertLive(); if (time >= settings.playback.durationSeconds) time = 0; playing=true;previous=0;schedule(); },
    pause() { assertLive();playing=false; },
    seek(seconds:number) {
      assertLive(); if (!Number.isFinite(seconds)) throw new Error("Invalid time.");
      time=Math.max(0,Math.min(settings.playback.durationSeconds,seconds));
      pointer=idleDitherPointer;sim.clear();dirty=true;previous=0;paint();schedule();
    },
    resize() { resize(); paint(); },
    destroy,
  };
}
