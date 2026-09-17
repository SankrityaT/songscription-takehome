"use client";

import { useEffect, useState } from "react";
import { RollThumb } from "@/components/roll/RollThumb";
import { Button } from "@/components/ui/Button";
import { IconCheck, IconClose, IconRetry, IconUpload, IconWarn } from "@/components/ui/Icons";
import { formatDuration } from "@/lib/midi/analyze";
import { stageIndex, type UploadItem } from "@/hooks/useUploadQueue";
import { Level } from "./Level";

/* A file being added is not a skeleton, it is an event. It gets a taller
   card in the table: a big thumbnail that draws in as the notes are found,
   a four-step stepper that checks off as each stage completes, and a live
   line of what was found. On failure the same card turns coral and says
   exactly why, with the one button that fixes it. */

const STEPS = [
  { key: "reading", label: "Read the file", icon: <IconUpload size={13} /> },
  {
    key: "notes",
    label: "Find the notes",
    icon: (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <rect x="2" y="9" width="5" height="2.5" rx="1" />
        <rect x="6" y="4.5" width="6" height="2.5" rx="1" />
        <rect x="9" y="11" width="5" height="2.5" rx="1" />
      </svg>
    ),
  },
  {
    key: "key",
    label: "Listen for the key",
    icon: (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <rect x="2" y="7" width="2" height="6" rx="1" />
        <rect x="5.5" y="3" width="2" height="10" rx="1" />
        <rect x="9" y="5.5" width="2" height="7.5" rx="1" />
        <rect x="12.5" y="8.5" width="2" height="4.5" rx="1" />
      </svg>
    ),
  },
  {
    key: "roll",
    label: "Size it up",
    icon: (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <rect x="2" y="10" width="2" height="4" rx="0.8" />
        <rect x="5.5" y="8" width="2" height="6" rx="0.8" />
        <rect x="9" y="5" width="2" height="9" rx="0.8" />
        <rect x="12.5" y="2" width="2" height="12" rx="0.8" />
      </svg>
    ),
  },
];

function Stepper({ item }: { item: UploadItem }) {
  const idx = stageIndex(item.stage);
  return (
    <ol className="flex items-center gap-0" aria-label="Progress">
      {STEPS.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <li key={s.key} className="flex items-center">
            <span className="flex items-center gap-1.5">
              <span
                className={`grid size-6 place-items-center rounded-full border transition-[background-color,border-color,color,box-shadow] duration-300 ${
                  done
                    ? "border-teal bg-teal text-white"
                    : active
                      ? "border-sun-ink bg-sun text-sun-ink shadow-[0_0_0_4px_rgba(255,226,138,0.45)]"
                      : "border-line-strong bg-card text-ink-dim"
                }`}
                aria-current={active ? "step" : undefined}
              >
                {done ? <IconCheck size={12} /> : s.icon}
              </span>
              <span className={`text-[12.5px] transition-colors ${active ? "font-semibold text-ink" : done ? "text-ink-soft" : "text-ink-dim"}`}>{s.label}</span>
            </span>
            {i < STEPS.length - 1 ? (
              <span className="mx-2.5 h-px w-6 overflow-hidden rounded-full bg-ink/[0.12]" aria-hidden>
                <span className="block h-full rounded-full bg-teal transition-[width] duration-500 ease-out" style={{ width: done ? "100%" : "0%" }} />
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function BigThumb({ item }: { item: UploadItem }) {
  const [swept, setSwept] = useState(false);
  const has = !!item.found;
  useEffect(() => {
    if (!has) {
      setSwept(false);
      return;
    }
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setSwept(true)));
    return () => cancelAnimationFrame(id);
  }, [has]);
  const failed = item.stage === "failed";
  const reading = item.stage === "reading" || item.stage === "queued";
  return (
    <span className="relative block h-[68px] w-[120px] shrink-0 overflow-hidden rounded-[10px]">
      <span aria-hidden className={`absolute inset-0 ${failed ? "bg-coral-soft" : "bg-roll"}`} />
      {failed ? (
        <span className="absolute inset-0 grid place-items-center text-coral" aria-hidden>
          <IconWarn size={22} />
        </span>
      ) : null}
      {reading && !failed ? <span aria-hidden className="scan-line absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-white/30 to-transparent" /> : null}
      {item.found && !failed ? (
        <span className={`absolute inset-0 ${swept ? "sweep-in" : "sweep-out"}`}>
          <RollThumb roll={item.found.sprite} width={120} height={68} radius={10} />
        </span>
      ) : null}
    </span>
  );
}

export function AddingRow({
  item,
  onRetry,
  onDismiss,
  onReplace,
  onShow,
}: {
  item: UploadItem;
  onRetry: () => void;
  onDismiss: () => void;
  onReplace: () => void;
  onShow: (songId: string) => void;
}) {
  const failed = item.stage === "failed";
  const a = item.found?.analysis;
  const title = item.found?.title ?? item.title;
  const idx = stageIndex(item.stage);

  return (
    <div className={`flex items-center gap-4 rounded-[12px] border px-3 py-3 ${failed ? "border-coral/50 bg-coral-soft/40" : "border-sun/70 bg-sun-soft/40"}`} aria-busy={!failed}>
      <BigThumb item={item} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={`truncate text-[15px] font-semibold ${failed ? "text-coral" : "text-ink"}`}>{title}</p>
          <span className={`shrink-0 rounded-full px-2 py-px font-mono text-[10.5px] uppercase tracking-[0.08em] ${failed ? "bg-coral text-white" : "bg-sun text-sun-ink"}`}>
            {failed ? "Could not add" : "Adding"}
          </span>
          {item.found?.composer ? <span className="truncate text-[12.5px] text-ink-dim">{item.found.composer}</span> : null}
        </div>

        {failed ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <p className="text-[13px] text-ink">{item.error}</p>
            {item.failure === "duplicate" && item.duplicateOf ? (
              <Button size="sm" variant="secondary" onClick={() => onShow(item.duplicateOf!.id)}>
                Show it
              </Button>
            ) : null}
            {item.failure === "type" || item.failure === "size" || item.failure === "empty" ? (
              <Button size="sm" variant="secondary" onClick={onReplace} icon={<IconUpload size={13} />}>
                Choose another file
              </Button>
            ) : null}
            {item.failure === "corrupt" ? (
              <Button size="sm" variant="secondary" onClick={onRetry} icon={<IconRetry size={13} />}>
                Try again
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" onClick={onDismiss} icon={<IconClose size={13} />}>
              Remove
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-2">
              <Stepper item={item} />
            </div>
            <div className="mt-2 flex min-h-[22px] flex-wrap items-center gap-1.5 text-[12.5px] text-ink-soft" aria-live="polite">
              {idx >= 2 && a ? (
                <span className="cell-in inline-flex items-center rounded-full bg-card px-2 py-0.5 shadow-card">{a.noteCount} notes</span>
              ) : idx === 1 ? (
                <span className="cell-in">Reading every note, when it starts and how long it lasts…</span>
              ) : idx === 0 ? (
                <span className="cell-in">Checking this is a MIDI file…</span>
              ) : null}
              {idx >= 2 && a ? <span className="cell-in inline-flex items-center rounded-full bg-card px-2 py-0.5 shadow-card">{formatDuration(a.durationSec)}</span> : null}
              {idx >= 2 && a ? <span className="cell-in inline-flex items-center rounded-full bg-card px-2 py-0.5 shadow-card">{a.bpm} bpm</span> : null}
              {idx === 2 ? <span className="cell-in text-sun-ink">Listening for the key…</span> : null}
              {idx >= 3 && a ? (
                <span className="cell-in inline-flex items-center gap-1.5 rounded-full bg-card px-2 py-0.5 shadow-card">
                  <span className={`size-1.5 rounded-full ${a.key.mode === "minor" ? "bg-hand-l" : "bg-teal"}`} aria-hidden />
                  {a.key.label}
                </span>
              ) : null}
              {idx >= 3 && a ? (
                <span className="cell-in inline-flex items-center rounded-full bg-card px-2 py-0.5 shadow-card">
                  <Level score={a.difficulty.score} label={a.difficulty.label} animate />
                </span>
              ) : null}
              {idx >= 3 && a ? <span className="cell-in inline-flex items-center rounded-full bg-card px-2 py-0.5 shadow-card">{a.hands === "both" ? "Both hands" : a.hands === "left" ? "Left hand" : "Right hand"}</span> : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
