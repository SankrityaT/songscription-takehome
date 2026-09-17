"use client";

import { useEffect, useRef, useState } from "react";
import { Portal } from "@/components/ui/Portal";
import { NOTES, setDesignNotes, useDesignNotes } from "@/lib/design-notes";

interface Placed {
  index: number;
  rect: { top: number; left: number; width: number; height: number };
}

const CARD_W = 300;

function onScreen(el: Element | null): DOMRect | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return null;
  if (r.bottom < 8 || r.top > window.innerHeight - 8 || r.right < 8 || r.left > window.innerWidth - 8) return null;
  const style = getComputedStyle(el);
  if (style.visibility === "hidden" || style.display === "none") return null;
  return r;
}

/** The top-bar button. Says how many notes are on screen while it is on. */
export function DesignNotesToggle() {
  const on = useDesignNotes();
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => setDesignNotes(!on)}
      title={on ? "Hide the design notes" : "Pin notes to the page that explain why each part exists"}
      className={`ring-focus press hidden h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium transition-colors duration-150 sm:inline-flex ${
        on ? "border-sun-ink/30 bg-sun text-sun-ink" : "border-line-strong bg-card text-ink-soft hover:text-ink"
      }`}
    >
      <span className={`grid size-4 place-items-center rounded-full text-[10px] font-semibold leading-none ${on ? "bg-sun-ink text-sun" : "bg-sun text-sun-ink"}`}>?</span>
      <span className="hidden 2xl:inline">{on ? "Hide design decisions" : "See my design decisions"}</span>
      <span className="2xl:hidden">{on ? "Hide decisions" : "Design decisions"}</span>
    </button>
  );
}

/* The layer of pins. Positions are read from the live elements on every
   frame that something could have moved (scroll, resize, and a slow tick
   for content that changes), so a pin stays on its subject. */
export function DesignNotesLayer() {
  const on = useDesignNotes();
  const [placed, setPlaced] = useState<Placed[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const pinned = useRef(false);

  useEffect(() => {
    if (!on) {
      setPlaced([]);
      setActive(null);
      return;
    }
    let raf = 0;
    const measure = () => {
      raf = 0;
      const next: Placed[] = [];
      NOTES.forEach((n, index) => {
        const r = onScreen(n.find());
        if (r) next.push({ index, rect: { top: r.top, left: r.left, width: r.width, height: r.height } });
      });
      setPlaced((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", queue, true);
    window.addEventListener("resize", queue);
    const tick = window.setInterval(queue, 400);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      pinned.current = false;
      setActive(null);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", queue, true);
      window.removeEventListener("resize", queue);
      window.clearInterval(tick);
      document.removeEventListener("keydown", onKey);
    };
  }, [on]);

  if (!on) return null;
  const current = placed.find((p) => p.index === active) ?? null;
  const note = current ? NOTES[current.index] : null;

  /* The card opens under its pin and is kept inside the window. */
  let card: { top?: number; bottom?: number; left: number } | null = null;
  if (current) {
    const left = Math.max(12, Math.min(window.innerWidth - CARD_W - 12, current.rect.left - 6));
    /* Under the thing it explains, never on top of it. Tall subjects (the
       table, a panel) keep the card near the pin instead. */
    const below = current.rect.height > 140 ? current.rect.top + 26 : current.rect.top + current.rect.height + 12;
    card = below + 230 > window.innerHeight ? { bottom: Math.max(12, window.innerHeight - current.rect.top + 14), left } : { top: below, left };
  }

  return (
    <Portal>
      <div className="pointer-events-none fixed inset-0 z-[65]" aria-live="polite">
        {current ? (
          <div
            className="absolute rounded-[12px] border-[1.5px] border-dashed border-sun-ink/60 bg-sun/10"
            style={{ top: current.rect.top - 4, left: current.rect.left - 4, width: current.rect.width + 8, height: current.rect.height + 8 }}
            aria-hidden
          />
        ) : null}
        {placed.map((p) => {
          const n = NOTES[p.index];
          const isActive = p.index === active;
          return (
            <button
              key={n.id}
              type="button"
              aria-label={`Design note ${p.index + 1}: ${n.title}`}
              aria-expanded={isActive}
              onMouseEnter={() => {
                if (!pinned.current) setActive(p.index);
              }}
              onMouseLeave={() => {
                if (!pinned.current) setActive(null);
              }}
              onFocus={() => setActive(p.index)}
              onClick={() => {
                const same = pinned.current && isActive;
                pinned.current = !same;
                setActive(same ? null : p.index);
              }}
              className={`ring-focus tnum pointer-events-auto absolute grid size-[22px] place-items-center rounded-full border text-[11px] font-semibold leading-none shadow-lift transition-transform duration-150 ${
                isActive ? "z-[1] scale-110 border-sun-ink bg-sun-ink text-sun" : "border-sun-ink/40 bg-sun text-sun-ink"
              }`}
              style={{ top: Math.max(4, p.rect.top - 9), left: Math.max(4, Math.min(window.innerWidth - 26, p.rect.left - 9)) }}
            >
              {p.index + 1}
            </button>
          );
        })}
        {note && card ? (
          <div
            role="note"
            className="absolute rounded-[14px] border border-line bg-card p-3.5 shadow-lift"
            style={{ ...card, width: CARD_W, animation: "menu-in 140ms cubic-bezier(0.16,1,0.3,1) both" }}
          >
            <p className="font-mono text-[10px] uppercase leading-[14px] tracking-[0.08em] text-sun-ink">The brief asks: {note.asks}</p>
            <p className="mt-1.5 text-[14px] font-semibold leading-5 text-ink">{note.title}</p>
            <p className="mt-1 text-[12.5px] leading-[18px] text-ink-soft">{note.body}</p>
          </div>
        ) : null}
        <p className="absolute bottom-3 left-1/2 hidden -translate-x-1/2 rounded-full bg-ink/85 px-3 py-1 text-[11.5px] text-paper md:left-[calc(50%+var(--rail-w)/2)] md:block" style={{ bottom: "max(12px, calc(var(--np-h, 0px) + 10px))" }}>
          {placed.length} of {NOTES.length} notes here · hover a number · open a song or press play to see more
        </p>
      </div>
    </Portal>
  );
}
