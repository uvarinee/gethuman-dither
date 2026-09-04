import * as React from "react";
import { decayDitherPointer, idleDitherPointer, type DitherPointer } from "./dither-scene";
import { retainDitherSource } from "./dither-source";

export function useDitherSource(resourceRef: string | undefined, url: string | undefined) {
  const [result, setResult] = React.useState<{ key: string; pixels: HTMLImageElement | null; error?: string } | null>(null);
  React.useEffect(() => {
    if (!resourceRef || !url) return;
    let active = true;
    const lease = retainDitherSource(resourceRef, url);
    void lease.promise.then(
      (pixels) => { if (active) setResult({ key: resourceRef, pixels }); },
      (error: unknown) => { if (active) setResult({ key: resourceRef, pixels: null, error: String(error instanceof Error ? error.message : error) }); },
    );
    return () => { active = false; lease.release(); };
  }, [resourceRef, url]);
  return result?.key === resourceRef && url ? result : null;
}

export function usePreviewLifecycle(ref: React.RefObject<HTMLCanvasElement | null>) {
  const [visible, setVisible] = React.useState(true);
  const [reducedMotion, setReducedMotion] = React.useState(false);
  React.useEffect(() => {
    let intersecting = true;
    const update = () => setVisible(!document.hidden && intersecting);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => setReducedMotion(media.matches);
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => { intersecting = entry.isIntersecting; update(); });
    if (ref.current) observer?.observe(ref.current);
    document.addEventListener("visibilitychange", update); media.addEventListener("change", motion);
    update(); motion();
    return () => { observer?.disconnect(); document.removeEventListener("visibilitychange", update); media.removeEventListener("change", motion); };
  }, [ref]);
  return { visible, reducedMotion };
}

export function useDitherPointer(ref: React.RefObject<HTMLCanvasElement | null>, width: number, height: number, decay: number, enabled: boolean) {
  const [pointer, setPointer] = React.useState<DitherPointer>(idleDitherPointer);
  const currentPointer = React.useRef<DitherPointer>(idleDitherPointer);
  const frame = React.useRef<number | null>(null);
  const stop = React.useCallback(() => { if (frame.current !== null) cancelAnimationFrame(frame.current); frame.current = null; }, []);
  React.useEffect(() => { if (!enabled) { stop(); currentPointer.current = idleDitherPointer; setPointer(idleDitherPointer); } return stop; }, [enabled, stop]);
  const onPointerMove = React.useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!enabled || !ref.current) return;
    stop();
    const bounds = ref.current.getBoundingClientRect();
    const x = (event.clientX - bounds.left) * width / Math.max(1, bounds.width);
    const y = (event.clientY - bounds.top) * height / Math.max(1, bounds.height);
    frame.current = requestAnimationFrame(() => { frame.current = null; currentPointer.current = { active: true, energy: 1, x, y }; setPointer(currentPointer.current); });
  }, [enabled, height, ref, stop, width]);
  const onPointerLeave = React.useCallback(() => {
    stop(); if (!enabled) return;
    const fade = () => {
      const next = decayDitherPointer(currentPointer.current, decay);
      currentPointer.current = next;
      setPointer(next);
      frame.current = next.active ? requestAnimationFrame(fade) : null;
    };
    frame.current = requestAnimationFrame(fade);
  }, [decay, enabled, stop]);
  return { pointer, onPointerMove, onPointerLeave };
}

export function useRecoverablePreviewError(error: string | undefined) {
  const previous = React.useRef<string | undefined>(undefined);
  React.useEffect(() => {
    if (error && error !== previous.current) window.alert(error);
    previous.current = error;
  }, [error]);
}
