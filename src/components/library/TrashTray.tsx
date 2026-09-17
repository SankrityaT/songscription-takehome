"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import type { RollNote } from "@/lib/midi/analyze";
import { Portal } from "@/components/ui/Portal";

export interface TrashTrayHandle {
  rect: () => DOMRect | null;
  /** The card itself falls into the bin; the lid snaps; a puff of its notes escapes. */
  swallow: (ghost: HTMLElement | null, roll: RollNote[], origin?: { rect: DOMRect; node?: Element }) => Promise<void>;
}

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* Rises from the bottom while a row is being dragged. The lid opens as the
   row comes near. On drop, the little card lifts, then falls into the bin
   with gravity and shrinks as it goes; the lid snaps shut, the bin gulps,
   and a small puff of the song's notes escapes. Slow enough to read. */
export const TrashTray = forwardRef<TrashTrayHandle, { visible: boolean; hot: boolean; pouring?: boolean }>(function TrashTray(
  { visible, hot, pouring = false },
  ref,
) {
  const bin = useRef<HTMLDivElement>(null);
  const lid = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const icon = useRef<HTMLSpanElement>(null);

  useImperativeHandle(ref, () => ({
    rect: () => bin.current?.getBoundingClientRect() ?? null,
    swallow: async (ghost, roll, origin) => {
      const b = icon.current?.getBoundingClientRect();
      if (!b || reduced()) return;
      const mouthX = b.left + b.width / 2;
      const mouthY = b.top + 10;

      /* The thing that falls: the drag ghost, or a clone of the row's
         thumbnail placed exactly where the thumbnail is. */
      let card: HTMLElement | null = ghost;
      let temp: HTMLElement | null = null;
      if (!card && origin) {
        temp = document.createElement("div");
        temp.className = "pointer-events-none fixed z-[80] overflow-hidden rounded-[8px] shadow-lift";
        temp.style.left = `${origin.rect.left}px`;
        temp.style.top = `${origin.rect.top}px`;
        temp.style.width = `${origin.rect.width}px`;
        temp.style.height = `${origin.rect.height}px`;
        if (origin.node) temp.appendChild(origin.node.cloneNode(true));
        else temp.style.background = "#0E0F10";
        document.body.appendChild(temp);
        card = temp;
      }

      if (card) {
        const g = card.getBoundingClientRect();
        const base = ghost ? ghost.style.transform || "" : "";
        const cx = g.left + g.width / 2;
        const cy = g.top + g.height / 2;
        const dx = mouthX - cx;
        const dy = mouthY - cy;
        card.style.transformOrigin = "50% 50%";
        /* Anticipation: a small lift, then the fall. */
        await card.animate(
          [
            { transform: `${base} translate(0px, 0px) scale(1) rotate(0deg)` },
            { transform: `${base} translate(${dx * 0.08}px, -34px) scale(1.03) rotate(-3deg)` },
          ],
          { duration: 220, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards" },
        ).finished;
        await card.animate(
          [
            { transform: `${base} translate(${dx * 0.08}px, -34px) scale(1.03) rotate(-3deg)`, opacity: 1, offset: 0 },
            { transform: `${base} translate(${dx * 0.55}px, ${dy * 0.35}px) scale(0.72) rotate(10deg)`, opacity: 1, offset: 0.55 },
            { transform: `${base} translate(${dx}px, ${dy}px) scale(0.12) rotate(24deg)`, opacity: 0.85, offset: 1 },
          ],
          { duration: 620, easing: "cubic-bezier(0.5, 0, 0.9, 0.5)", fill: "forwards" },
        ).finished;
        card.style.opacity = "0";
      }

      /* Lid snaps, bin gulps. */
      lid.current?.animate(
        [
          { transform: "translateX(-50%) rotate(-34deg)" },
          { transform: "translateX(-50%) rotate(8deg)" },
          { transform: "translateX(-50%) rotate(-5deg)" },
          { transform: "translateX(-50%) rotate(0deg)" },
        ],
        { duration: 460, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards" },
      );
      body.current?.animate(
        [
          { transform: "translateX(-50%) scale(1)" },
          { transform: "translateX(-50%) scale(1.18, 0.84)" },
          { transform: "translateX(-50%) scale(0.94, 1.08)" },
          { transform: "translateX(-50%) scale(1)" },
        ],
        { duration: 520, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
      );

      /* A small puff of the song's own notes escapes the lid. */
      const host = document.createElement("div");
      host.className = "pointer-events-none fixed inset-0 z-[80]";
      document.body.appendChild(host);
      const sample = roll.filter((_, i) => i % Math.max(1, Math.ceil(roll.length / 12)) === 0).slice(0, 12);
      const puffs = sample.map((n, i) => {
        const el = document.createElement("span");
        el.className = `absolute block h-[4px] rounded-[2px] ${n.hand === "right" ? "bg-hand-r" : "bg-hand-l"}`;
        el.style.width = `${8 + Math.round((n.end - n.start) * 60)}px`;
        el.style.left = `${mouthX - 6}px`;
        el.style.top = `${mouthY - 4}px`;
        host.appendChild(el);
        const dir = i % 2 === 0 ? -1 : 1;
        const x = dir * (14 + Math.random() * 42);
        const rise = 30 + Math.random() * 36;
        return el.animate(
          [
            { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
            { transform: `translate(${x * 0.6}px, ${-rise}px) rotate(${dir * 60}deg)`, opacity: 1, offset: 0.45 },
            { transform: `translate(${x}px, ${rise * 0.6}px) rotate(${dir * 140}deg)`, opacity: 0 },
          ],
          { duration: 640 + Math.random() * 160, delay: 40 + i * 18, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" },
        );
      });
      void Promise.all(puffs.map((p) => p.finished)).then(() => host.remove());
      await wait(420);
      temp?.remove();
    },
  }));

  return (
    <Portal>
      <div
        aria-hidden
        className={`pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center transition-transform duration-300 ease-out md:left-[var(--rail-w)] ${
          visible ? "translate-y-0" : "translate-y-[140%]"
        }`}
      >
        <div className="relative mb-6">
          <div
            ref={bin}
            className={`flex items-center gap-3 rounded-full border px-4 py-2.5 shadow-lift transition-[background-color,border-color,transform] duration-200 ease-out ${
              hot ? "scale-[1.06] border-coral bg-coral-soft" : "border-line-strong bg-card"
            }`}
          >
            <span ref={icon} className="relative grid size-9 place-items-center">
              <div
                ref={lid}
                className={`absolute left-1/2 top-[7px] h-[3px] w-[18px] rounded-full transition-transform duration-200 ease-out ${hot ? "bg-coral" : "bg-ink-soft"}`}
                style={{ transformOrigin: "10% 50%", transform: hot ? "translateX(-50%) rotate(-34deg)" : "translateX(-50%) rotate(0deg)" }}
              />
              <div
                ref={body}
                className={`absolute left-1/2 top-[11px] h-[18px] w-[14px] rounded-b-[4px] rounded-t-[2px] border-2 ${hot ? "border-coral" : "border-ink-soft"}`}
                style={{ transformOrigin: "50% 100%", transform: "translateX(-50%)" }}
              >
                <span className={`absolute left-[3px] top-[3px] h-[9px] w-px ${hot ? "bg-coral" : "bg-ink-soft"}`} />
                <span className={`absolute right-[3px] top-[3px] h-[9px] w-px ${hot ? "bg-coral" : "bg-ink-soft"}`} />
              </div>
            </span>
            <span className={`text-[13px] font-medium ${hot ? "text-coral" : "text-ink-soft"}`}>
              {pouring ? "Into the bin it goes" : hot ? "Let go to drop it in" : "Drop here to remove"}
            </span>
          </div>
        </div>
      </div>
    </Portal>
  );
});
