"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Song } from "@/lib/library/types";

export interface DragState {
  song: Song;
  /** current pointer position */
  x: number;
  y: number;
  /** pointer offset inside the row when the drag started */
  dx: number;
  dy: number;
  over: boolean;
  phase: "dragging" | "dropping";
}

const THRESHOLD = 6;

/* Pointer-driven row drag. A press that never moves more than six pixels is
   still a click, so rows keep their normal behaviour. Buttons, links and
   menus inside the row never start a drag. */
export function useRowDrag({ targetRect, onDrop }: { targetRect: () => DOMRect | null; onDrop: (song: Song) => Promise<void> | void }) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const start = useRef<{ x: number; y: number; dx: number; dy: number; song: Song; active: boolean } | null>(null);
  const suppressClick = useRef(false);
  const target = useRef(targetRect);
  target.current = targetRect;
  const drop = useRef(onDrop);
  drop.current = onDrop;

  const isOver = useCallback((x: number, y: number) => {
    const r = target.current();
    if (!r) return false;
    const pad = 28;
    return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const s = start.current;
      if (!s) return;
      if (!s.active) {
        if (Math.hypot(e.clientX - s.x, e.clientY - s.y) < THRESHOLD) return;
        s.active = true;
        suppressClick.current = true;
        document.body.style.userSelect = "none";
        document.body.style.cursor = "grabbing";
      }
      setDrag({ song: s.song, x: e.clientX, y: e.clientY, dx: s.dx, dy: s.dy, over: isOver(e.clientX, e.clientY), phase: "dragging" });
    };
    const finish = () => {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      start.current = null;
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 0);
    };
    const onUp = async (e: PointerEvent) => {
      const s = start.current;
      if (!s) return;
      const active = s.active;
      finish();
      if (!active) return;
      if (isOver(e.clientX, e.clientY)) {
        setDrag((d) => (d ? { ...d, phase: "dropping", over: true } : d));
        await drop.current(s.song);
      }
      setDrag(null);
    };
    const onCancel = () => {
      finish();
      setDrag(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("blur", onCancel);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("blur", onCancel);
    };
  }, [isOver]);

  const bind = useCallback((song: Song) => {
    return {
      onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
        if (e.button !== 0 || e.pointerType === "touch") return;
        if ((e.target as Element).closest("button, a, input, [role=menu]")) return;
        const rect = e.currentTarget.getBoundingClientRect();
        start.current = { x: e.clientX, y: e.clientY, dx: e.clientX - rect.left, dy: e.clientY - rect.top, song, active: false };
      },
    };
  }, []);

  const wasDrag = useCallback(() => suppressClick.current, []);

  return { drag, bind, wasDrag };
}
