"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { RollThumb } from "@/components/roll/RollThumb";
import type { DragState } from "@/hooks/useRowDrag";
import { Portal } from "@/components/ui/Portal";

/* The row you are carrying. Follows the pointer through a rAF lerp rather
   than a CSS transition, so a fast sweep never lags and then lurches. Tilts
   a little in the direction of travel. Over the bin it lifts up out of the
   way, shrinks, and hangs above the lid, so the bin's own words stay
   readable and the drop reads as "this is about to go in". */
export const DragGhost = forwardRef<HTMLDivElement, { drag: DragState }>(function DragGhost({ drag }, ref) {
  const el = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => el.current as HTMLDivElement);
  const pos = useRef({ x: drag.x - drag.dx, y: drag.y - drag.dy, vx: 0, s: 1, r: 0 });
  const target = useRef({ x: 0, y: 0, s: 1, r: 0 });
  target.current = drag.over
    ? { x: drag.x - 130, y: drag.y - 104, s: 0.86, r: -4 }
    : { x: drag.x - Math.min(drag.dx, 120), y: drag.y - 20, s: 1, r: 0 };
  const following = drag.phase === "dragging";

  useEffect(() => {
    if (!following) return;
    let raf = 0;
    const tick = () => {
      const p = pos.current;
      const t = target.current;
      const nx = p.x + (t.x - p.x) * 0.28;
      const ny = p.y + (t.y - p.y) * 0.28;
      p.vx = nx - p.x;
      p.x = nx;
      p.y = ny;
      p.s += (t.s - p.s) * 0.2;
      const travelTilt = Math.max(-6, Math.min(6, p.vx * 0.6));
      p.r += ((t.r || travelTilt) - p.r) * 0.2;
      if (el.current) el.current.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${p.r}deg) scale(${p.s})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [following]);

  return (
    <Portal>
      <div
        ref={el}
        aria-hidden
        className={`pointer-events-none fixed left-0 top-0 z-[60] flex w-[260px] items-center gap-3 rounded-[12px] border bg-card p-2 pr-3 will-change-transform transition-[box-shadow,border-color] duration-200 ${
          drag.over ? "border-coral shadow-[0_30px_50px_rgba(228,85,58,0.28),0_6px_14px_rgba(20,19,15,0.12)]" : "border-line-strong shadow-lift"
        }`}
        style={{ transform: `translate(${pos.current.x}px, ${pos.current.y}px)`, transformOrigin: "50% 100%" }}
      >
        <RollThumb roll={drag.song.roll} width={60} height={34} radius={6} className="shrink-0" />
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-medium text-ink">{drag.song.title}</p>
          <p className={`text-[12px] transition-colors ${drag.over ? "text-coral" : "text-ink-dim"}`}>{drag.over ? "Over the bin" : "Drag to the bin to remove"}</p>
        </div>
      </div>
    </Portal>
  );
});
