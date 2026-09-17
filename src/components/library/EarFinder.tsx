"use client";

import { useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { IconClose } from "@/components/ui/Icons";
import { useEar } from "@/hooks/useEar";
import { noteLabel, rankByEar } from "@/lib/ear/match";
import { player } from "@/lib/audio/player";
import { setFilters } from "@/lib/ui-store";
import type { Song } from "@/lib/library/types";

const KEYS = ["a", "w", "s", "e", "d", "f", "t", "g", "y", "h", "u", "j", "k", "o", "l", "p", ";"];
const BLACK = new Set([1, 3, 6, 8, 10]);
const BASE = 60;

function ping(midi: number) {
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.value = 440 * 2 ** ((midi - 69) / 12);
  g.gain.setValueAtTime(0.0001, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
  osc.connect(g).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.4);
  osc.onended = () => void ctx.close();
}

/* Find by ear. Hum it, sing it, or tap it on the keys, and the library
   ranks itself by how well each song's melody contains what you gave it.
   Everything is intervals, so the key you hum in does not matter. */
export function EarFinder({ songs, onClose, onShow }: { songs: Song[]; onClose: () => void; onShow: (id: string) => void }) {
  const ear = useEar();
  const panel = useRef<HTMLDivElement>(null);
  const matches = useMemo(() => rankByEar(songs, ear.notes), [songs, ear.notes]);
  const enough = ear.notes.length >= 3;
  const top = matches.filter((m) => m.score >= 0.35).slice(0, 5);

  /* The table follows the ranking while this panel is open. */
  useEffect(() => {
    const scores: Record<string, number> = {};
    for (const m of matches) scores[m.id] = m.score;
    setFilters({ ear: enough ? scores : null });
    return () => setFilters({ ear: null });
  }, [matches, enough]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      if (e.key === "Backspace") {
        e.preventDefault();
        ear.undo();
        return;
      }
      const i = KEYS.indexOf(e.key.toLowerCase());
      if (i >= 0 && !e.repeat) {
        e.preventDefault();
        player.pause();
        ear.tap(BASE + i);
        ping(BASE + i);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [ear]);

  const whites = Array.from({ length: 17 }, (_, i) => BASE + i).filter((m) => !BLACK.has(m % 12));

  return (
    <div ref={panel} className="animate-row-in rounded-card border border-line bg-card p-4 shadow-card" role="region" aria-label="Find by ear">
      <div className="flex flex-wrap items-start gap-5">
        {/* mic */}
        <div className="flex w-[220px] shrink-0 flex-col items-start gap-3">
          <div>
            <p className="text-[14px] font-semibold text-ink">Find by ear</p>
            <p className="mt-0.5 text-[12.5px] leading-5 text-ink-soft">Hum or sing a few notes of it, or tap them on the keys. Any key works, we match the shape.</p>
          </div>
          <button
            type="button"
            onClick={() => (ear.listening ? ear.stop() : ear.start())}
            aria-pressed={ear.listening}
            className={`press ring-focus relative inline-flex h-11 items-center gap-3 rounded-full border pl-2 pr-4 text-[13.5px] font-medium transition-[background-color,border-color,color] duration-150 ${
              ear.listening ? "border-coral bg-coral text-white" : "border-line-strong bg-card text-ink hover:border-ink"
            }`}
          >
            <span className="relative grid size-7 place-items-center rounded-full bg-white/20">
              {ear.listening ? (
                <span className="absolute inset-0 rounded-full bg-white/30" style={{ transform: `scale(${1 + ear.level * 1.6})`, transition: "transform 60ms linear" }} aria-hidden />
              ) : null}
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden className="relative">
                <rect x="5.5" y="2" width="5" height="8" rx="2.5" />
                <path d="M3.5 8a4.5 4.5 0 0 0 9 0M8 12.5V14M6 14h4" />
              </svg>
            </span>
            {ear.listening ? "Listening… tap to stop" : "Hum it"}
          </button>
          {ear.denied ? <p className="text-[12px] text-coral">Microphone blocked. Tap the notes instead.</p> : null}
        </div>

        {/* keys */}
        <div className="min-w-[280px] flex-1">
          <div className="relative h-[84px] select-none overflow-hidden rounded-[10px] border border-line bg-ink/[0.06]">
            <div className="flex h-full">
              {whites.map((m, i) => (
                <button
                  key={m}
                  type="button"
                  aria-label={noteLabel(m)}
                  onPointerDown={() => {
                    player.pause();
                    ear.tap(m);
                    ping(m);
                  }}
                  className={`relative h-full flex-1 border-r border-ink/15 bg-[#FCFAF6] transition-colors duration-75 last:border-r-0 hover:bg-sun-soft active:bg-sun ${
                    ear.live === m ? "!bg-sun" : ""
                  }`}
                >
                  <span className="pointer-events-none absolute bottom-1.5 left-1/2 -translate-x-1/2 font-mono text-[9.5px] text-ink-dim">{KEYS[m - BASE]}</span>
                  {m % 12 === 0 ? <span className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 font-mono text-[8.5px] text-ink-dim/70">{noteLabel(m)}</span> : null}
                </button>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-0">
              {Array.from({ length: 17 }, (_, i) => BASE + i)
                .filter((m) => BLACK.has(m % 12))
                .map((m) => {
                  const leftWhite = whites.indexOf(m - 1);
                  return (
                    <button
                      key={m}
                      type="button"
                      aria-label={noteLabel(m)}
                      onPointerDown={() => {
                        player.pause();
                        ear.tap(m);
                        ping(m);
                      }}
                      className={`pointer-events-auto absolute top-0 h-[56%] rounded-b-[4px] bg-ink shadow-[0_2px_0_rgba(0,0,0,0.35)] transition-colors hover:bg-[#2a2a28] active:bg-sun-ink ${ear.live === m ? "!bg-sun-ink" : ""}`}
                      style={{ left: `${((leftWhite + 1) / whites.length) * 100 - 3}%`, width: "6%" }}
                    >
                      <span className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 font-mono text-[8.5px] text-white/60">{KEYS[m - BASE]}</span>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* captured notes */}
          <div className="mt-2.5 flex min-h-[28px] flex-wrap items-center gap-1.5">
            {ear.notes.length === 0 ? (
              <span className="text-[12.5px] text-ink-dim">Your notes will appear here. Three or more and the library starts ranking.</span>
            ) : (
              ear.notes.map((m, i) => (
                <span key={`${i}-${m}`} className="cell-in tnum inline-flex h-6 items-center rounded-full bg-teal-soft px-2 font-mono text-[11px] text-teal-deep">
                  {noteLabel(m)}
                </span>
              ))
            )}
            {ear.notes.length > 0 ? (
              <>
                <Button size="sm" variant="ghost" onClick={ear.undo}>
                  Undo
                </Button>
                <Button size="sm" variant="ghost" onClick={ear.clear}>
                  Clear
                </Button>
              </>
            ) : null}
          </div>
        </div>

        {/* matches */}
        <div className="w-[260px] shrink-0">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-dim">Best matches</p>
            <button type="button" aria-label="Close find by ear" onClick={onClose} className="press ring-focus grid size-7 place-items-center rounded-[7px] text-ink-dim hover:bg-ink/[0.05] hover:text-ink">
              <IconClose size={14} />
            </button>
          </div>
          {!enough ? (
            <p className="mt-2 text-[12.5px] text-ink-dim">Waiting for a few notes…</p>
          ) : top.length === 0 ? (
            <p className="mt-2 text-[12.5px] text-ink-dim">Nothing close yet. Try a few more notes, or the part you remember best.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1.5">
              {top.map((m, i) => {
                const s = songs.find((x) => x.id === m.id)!;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => onShow(s.id)}
                      className={`ring-focus flex w-full items-center gap-2.5 rounded-[9px] px-2 py-1.5 text-left transition-colors hover:bg-ink/[0.04] ${i === 0 ? "bg-sun-soft/60" : ""}`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-ink">{s.title}</span>
                        <span className="mt-1 block h-1 overflow-hidden rounded-full bg-ink/[0.08]">
                          <span className={`block h-full rounded-full transition-[width] duration-500 ease-out ${i === 0 ? "bg-sun-ink" : "bg-teal"}`} style={{ width: `${Math.round(m.score * 100)}%` }} />
                        </span>
                      </span>
                      <span className="tnum shrink-0 font-mono text-[11px] text-ink-soft">{Math.round(m.score * 100)}%</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
