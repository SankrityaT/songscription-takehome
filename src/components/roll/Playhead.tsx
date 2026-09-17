"use client";

import { useEffect, useRef } from "react";
import { player } from "@/lib/audio/player";

/* A playhead over a thumbnail. Reads the player's clock on every frame and
   writes a transform directly, so sixty updates a second never touch React. */
export function Playhead({ active, className = "" }: { active: boolean; className?: string }) {
  const line = useRef<HTMLSpanElement>(null);
  const wrap = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const tick = () => {
      const w = wrap.current?.clientWidth ?? 0;
      const d = player.snapshot().song?.durationSec || 1;
      const x = Math.min(w, (player.position / d) * w);
      if (line.current) line.current.style.transform = `translateX(${x}px)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  if (!active) return null;
  return (
    <span ref={wrap} aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <span ref={line} className="absolute inset-y-0 left-0 w-px bg-sun shadow-[0_0_6px_rgba(255,226,138,0.9)]" />
    </span>
  );
}
