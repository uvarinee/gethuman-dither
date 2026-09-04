import * as React from "react";
import { useToolcraftDispatch, useToolcraftSelector } from "@/toolcraft/runtime/react";
import { movePin, parsePins } from "./dither-scene";
import styles from "./DitherCanvas.module.css";

export function DitherPinHandles({ width, height }: { width: number; height: number }) {
  const dispatch = useToolcraftDispatch();
  const items = useToolcraftSelector((state) => state.values["pins.items"], Object.is);
  const current = React.useRef(items); current.current = items;
  const overlay = React.useRef<HTMLDivElement>(null);
  const gesture = React.useRef<{ index: number; pointerId: number; historyGroup: string } | null>(null);
  const pins = parsePins(items, width, height, 1);
  const update = (event: React.PointerEvent<HTMLDivElement>) => {
    const active = gesture.current;
    if (!active || event.pointerId !== active.pointerId || !overlay.current) return;
    event.stopPropagation();
    const bounds = overlay.current.getBoundingClientRect();
    dispatch({ type: "controls.setValue", target: "pins.items", value: movePin(current.current, active.index, (event.clientX - bounds.left) / bounds.width * 2 - 1, (event.clientY - bounds.top) / bounds.height * 2 - 1), historyGroup: active.historyGroup, history: "merge", label: "Move pin" });
  };
  const end = (event: React.PointerEvent<HTMLDivElement>) => {
    if (gesture.current?.pointerId !== event.pointerId) return;
    event.stopPropagation(); gesture.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return <div className={styles.handles} ref={overlay} data-dither-handles="">
    {pins.map((pin, index) => <div key={index} className={styles.pin} data-toolcraft-canvas-handle="" data-testid="dither-pin-handle" data-pin-index={index} data-interaction-id="pin-position-drag" style={{ left: `${pin.position.x / width * 100}%`, top: `${pin.position.y / height * 100}%` }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.stopPropagation(); event.preventDefault();
        gesture.current = { index, pointerId: event.pointerId, historyGroup: `pin-drag-${crypto.randomUUID()}` };
        event.currentTarget.setPointerCapture(event.pointerId);
      }} onPointerMove={update} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} />)}
  </div>;
}
