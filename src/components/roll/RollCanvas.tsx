"use client";

import { useMemo } from "react";
import type { CompactNote } from "@/lib/library/types";

/* The stage roll: a real piano roll, the same object the learner practices
   on. A vertical keyboard on the left, semitone lanes across, bar lines at
   the song's meter, notes colored by hand, and a playhead when it plays. */

const BLACK = new Set([1, 3, 6, 8, 10]);

export interface RollRange {
  low: number;
  high: number;
}

export function rangeFor(notes: CompactNote[] | null): RollRange {
  if (!notes || notes.length === 0) return { low: 48, high: 83 };
  let low = 127;
  let high = 0;
  for (const [m] of notes) {
    if (m < low) low = m;
    if (m > high) high = m;
  }
  low = Math.floor(low / 12) * 12;
  high = Math.ceil((high + 1) / 12) * 12 - 1;
  while (high - low < 23) {
    low = Math.max(0, low - 12);
    high = Math.min(127, high + 12);
  }
  return { low, high };
}

export function RollCanvas({
  notes,
  durationSec,
  bpm,
  beatsPerBar,
  playhead,
  dim = false,
  reveal = true,
  height = 320,
  className = "",
}: {
  notes: CompactNote[] | null;
  durationSec: number;
  bpm: number;
  beatsPerBar: number;
  playhead: number | null;
  dim?: boolean;
  /** false renders the notes clipped to zero width so a transition can sweep them in */
  reveal?: boolean;
  height?: number;
  className?: string;
}) {
  const range = useMemo(() => rangeFor(notes), [notes]);
  const lanes = range.high - range.low + 1;
  const laneH = height / lanes;
  const dur = Math.max(0.001, durationSec);
  const barSec = (60 / Math.max(20, bpm)) * Math.max(1, beatsPerBar);
  const barCount = Math.min(400, Math.floor(dur / barSec));
  const W = 1000;

  const active = useMemo(() => {
    if (playhead === null || !notes) return new Set<number>();
    const ms = playhead * 1000;
    const set = new Set<number>();
    for (const [m, s, d] of notes) {
      if (s <= ms && ms < s + d) set.add(m);
    }
    return set;
  }, [notes, playhead]);

  return (
    <div className={`relative flex overflow-hidden rounded-stage bg-roll ${className}`} style={{ height }}>
      {/* keyboard */}
      <div className="relative w-12 shrink-0 border-r border-white/10" aria-hidden>
        {Array.from({ length: lanes }, (_, i) => {
          const midi = range.high - i;
          const black = BLACK.has(midi % 12);
          const isC = midi % 12 === 0;
          const on = active.has(midi);
          return (
            <div
              key={midi}
              className="absolute left-0 right-0"
              style={{ top: i * laneH, height: laneH }}
            >
              <div
                className={`h-full ${black ? "w-[62%] rounded-r-[2px]" : "w-full"} ${
                  on ? "bg-teal" : black ? "bg-[#1A1B1D]" : "bg-[#F1EDE6]"
                } ${black ? "" : "border-b border-black/20"}`}
                style={{ transition: "background-color 90ms cubic-bezier(0.16,1,0.3,1)" }}
              />
              {isC && laneH >= 6 ? (
                <span className="tnum pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 font-mono text-[9px] leading-none text-ink/60">
                  C{Math.floor(midi / 12) - 1}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* lanes + notes */}
      <div className="relative min-w-0 flex-1">
        <svg
          viewBox={`0 0 ${W} ${height}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-hidden
        >
          {Array.from({ length: lanes }, (_, i) => {
            const midi = range.high - i;
            const black = BLACK.has(midi % 12);
            const isC = midi % 12 === 0;
            return (
              <g key={midi}>
                {black ? <rect x={0} y={i * laneH} width={W} height={laneH} fill="rgba(255,255,255,0.025)" /> : null}
                {isC ? (
                  <line x1={0} x2={W} y1={(i + 1) * laneH} y2={(i + 1) * laneH} stroke="rgba(255,255,255,0.09)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                ) : null}
              </g>
            );
          })}
          {Array.from({ length: barCount }, (_, i) => {
            const x = (((i + 1) * barSec) / dur) * W;
            return <line key={i} x1={x} x2={x} y1={0} y2={height} stroke="rgba(255,255,255,0.07)" strokeWidth={1} vectorEffect="non-scaling-stroke" />;
          })}

          <defs>
            <clipPath id="roll-reveal" clipPathUnits="userSpaceOnUse">
              <rect x={0} y={0} height={height} width={reveal ? W : 0} style={{ transition: "width 700ms cubic-bezier(0.16,1,0.3,1)" }} />
            </clipPath>
          </defs>

          <g clipPath="url(#roll-reveal)" opacity={dim ? 0.38 : 1} style={{ transition: "opacity 300ms cubic-bezier(0.16,1,0.3,1)" }}>
            {(notes ?? []).map(([m, s, d, hand], i) => {
              const x = (s / 1000 / dur) * W;
              const w = Math.max(3, (d / 1000 / dur) * W);
              const y = (range.high - m) * laneH + laneH * 0.14;
              const h = laneH * 0.72;
              const on = active.has(m) && playhead !== null && s <= playhead * 1000 && playhead * 1000 < s + d;
              return (
                <rect
                  key={i}
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  rx={Math.min(3, h / 2)}
                  fill={hand === 1 ? "#3DDC97" : "#5B8DEF"}
                  opacity={on ? 1 : 0.88}
                  vectorEffect="non-scaling-stroke"
                  stroke={on ? "#FFFFFF" : "none"}
                  strokeWidth={on ? 1.5 : 0}
                />
              );
            })}
          </g>

          {playhead !== null ? (
            <g>
              <rect x={(playhead / dur) * W - 24} y={0} width={24} height={height} fill="url(#playhead-fade)" />
              <line
                x1={(playhead / dur) * W}
                x2={(playhead / dur) * W}
                y1={0}
                y2={height}
                stroke="#FFE28A"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ) : null}
          <defs>
            <linearGradient id="playhead-fade" x1="0" x2="1">
              <stop offset="0" stopColor="#FFE28A" stopOpacity="0" />
              <stop offset="1" stopColor="#FFE28A" stopOpacity="0.16" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}
