"use client";

import { useEffect, useMemo, useRef } from "react";
import { player, type Playable } from "@/lib/audio/player";

/* The keyboard view. Notes fall from above onto a piano and light the key
   they land on, the way the practice roll in the app works. Time runs on the
   vertical axis, pitch across. The falling layer is moved every frame by a
   single transform driven by the player's clock; keys are lit by toggling a
   class, so a song with thousands of notes never re-renders React. */

const BLACK = new Set([1, 3, 6, 8, 10]);
const PIXELS_PER_SECOND = 150;
const KEYBOARD_HEIGHT = 92;

function isBlack(midi: number) {
  return BLACK.has(midi % 12);
}

function range(notes: Playable["notes"]) {
  let low = 127;
  let high = 0;
  for (const [m] of notes) {
    if (m < low) low = m;
    if (m > high) high = m;
  }
  if (low > high) return { low: 48, high: 83 };
  /* Snap to white keys at the edges and keep at least two octaves. */
  low = Math.max(21, low - 2);
  high = Math.min(108, high + 2);
  while (isBlack(low)) low -= 1;
  while (isBlack(high)) high += 1;
  while (high - low < 24) {
    low = Math.max(21, low - 1);
    high = Math.min(108, high + 1);
    while (isBlack(low)) low -= 1;
    while (isBlack(high)) high += 1;
  }
  return { low, high };
}

export function FallingRoll({ song, className = "" }: { song: Playable; className?: string }) {
  const layer = useRef<HTMLDivElement>(null);
  const keys = useRef(new Map<number, HTMLDivElement>());
  const lit = useRef(new Set<number>());

  const geometry = useMemo(() => {
    const { low, high } = range(song.notes);
    const whites: number[] = [];
    const whiteIndex = new Map<number, number>();
    for (let m = low; m <= high; m++) {
      if (!isBlack(m)) {
        whiteIndex.set(m, whites.length);
        whites.push(m);
      }
    }
    /* Black keys sit between the white keys on either side. */
    const xOf = (m: number) => {
      if (!isBlack(m)) return whiteIndex.get(m)! + 0.5;
      const left = whiteIndex.get(m - 1);
      return (left ?? 0) + 1;
    };
    return { low, high, whites, xOf };
  }, [song.notes]);

  const whiteCount = geometry.whites.length;

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const pos = player.position;
      if (layer.current) layer.current.style.transform = `translateY(${pos * PIXELS_PER_SECOND}px)`;
      const next = new Set<number>();
      const ms = pos * 1000;
      for (const [m, s, d] of song.notes) {
        if (s <= ms && ms < s + d) next.add(m);
        if (s > ms) break;
      }
      for (const m of lit.current) {
        if (!next.has(m)) keys.current.get(m)?.removeAttribute("data-lit");
      }
      for (const m of next) {
        if (!lit.current.has(m)) {
          const el = keys.current.get(m);
          if (el) el.setAttribute("data-lit", song.notes.find(([mm, s]) => mm === m && s <= ms)?.[3] === 1 ? "r" : "l");
        }
      }
      lit.current = next;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [song.notes]);

  return (
    <div className={`relative flex h-full flex-col overflow-hidden bg-roll ${className}`}>
      {/* lanes */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="absolute inset-0 flex" aria-hidden>
          {geometry.whites.map((m) => (
            <div key={m} className="relative flex-1 border-r border-white/[0.05]">
              {m % 12 === 0 ? <span className="absolute bottom-1 left-1 font-mono text-[9px] text-white/25">C{Math.floor(m / 12) - 1}</span> : null}
            </div>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-sun/70 shadow-[0_0_10px_rgba(255,226,138,0.6)]" aria-hidden />
        <div ref={layer} className="absolute inset-x-0 bottom-0 will-change-transform" aria-hidden>
          {song.notes.map(([m, s, d, hand], i) => {
            const black = isBlack(m);
            const x = geometry.xOf(m);
            const w = black ? 0.62 : 0.86;
            const h = Math.max(6, (d / 1000) * PIXELS_PER_SECOND - 2);
            return (
              <div
                key={i}
                className={`absolute rounded-[3px] ${hand === 1 ? "bg-hand-r" : "bg-hand-l"}`}
                style={{
                  left: `${((x - w / 2) / whiteCount) * 100}%`,
                  width: `${(w / whiteCount) * 100}%`,
                  height: h,
                  bottom: (s / 1000) * PIXELS_PER_SECOND,
                  opacity: 0.92,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* keyboard */}
      <div className="relative shrink-0 border-t border-white/10 bg-[#1A1B1D]" style={{ height: KEYBOARD_HEIGHT }} aria-hidden>
        <div className="flex h-full">
          {geometry.whites.map((m) => (
            <div
              key={m}
              ref={(el) => {
                if (el) keys.current.set(m, el);
              }}
              className="h-full flex-1 rounded-b-[5px] border-r border-black/25 bg-[#F4F0E8] transition-[background-color] duration-[60ms] data-[lit=r]:bg-hand-r data-[lit=l]:bg-hand-l"
            />
          ))}
        </div>
        <div className="pointer-events-none absolute inset-0">
          {Array.from({ length: geometry.high - geometry.low + 1 }, (_, i) => geometry.low + i)
            .filter(isBlack)
            .map((m) => {
              const x = geometry.xOf(m);
              return (
                <div
                  key={m}
                  ref={(el) => {
                    if (el) keys.current.set(m, el);
                  }}
                  className="absolute top-0 h-[60%] rounded-b-[4px] bg-ink shadow-[0_3px_0_rgba(0,0,0,0.45)] transition-[background-color] duration-[60ms] data-[lit=r]:bg-hand-r data-[lit=l]:bg-hand-l"
                  style={{ left: `${((x - 0.31) / whiteCount) * 100}%`, width: `${(0.62 / whiteCount) * 100}%` }}
                />
              );
            })}
        </div>
      </div>
    </div>
  );
}
