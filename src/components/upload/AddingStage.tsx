"use client";

import { useEffect, useState } from "react";
import { RollThumb } from "@/components/roll/RollThumb";
import { Button } from "@/components/ui/Button";
import { IconCheck, IconClose, IconRetry, IconUpload } from "@/components/ui/Icons";
import { formatDuration } from "@/lib/midi/analyze";
import { STAGE_LABEL, stageIndex, type UploadItem } from "@/hooks/useUploadQueue";
import { Level } from "@/components/library/Level";
import { StageArt } from "./StageArt";

/* When the library is nearly empty, adding a song is the whole screen: the
   stage art for what is happening right now, the song's roll drawing in,
   a four-step path, and the facts landing one by one. Failures take the
   same stage and say exactly what to do. Other files wait in a strip below. */

const STEPS = [
  { key: "reading", label: "Read the file" },
  { key: "notes", label: "Find the notes" },
  { key: "key", label: "Listen for the key" },
  { key: "roll", label: "Size it up" },
];

const STORY: Record<string, string> = {
  queued: "Waiting its turn",
  reading: "Checking this is a MIDI file and reading every byte",
  notes: "Finding each note, when it starts and how long it lasts",
  key: "Weighing the notes against every key to hear which one this is",
  roll: "Working out the level from density, reach and how many notes sound together",
  done: "In your library, ready to practice",
  failed: "Could not add this one",
};

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
    /* On a phone the roll takes the card's full width, drawn wider and
       shorter so the steps below it stay on screen, and the text sits under it. */
    <span className={`relative block aspect-[5/2] w-full shrink-0 overflow-hidden rounded-[14px] shadow-[0_18px_40px_rgba(20,19,15,0.18)] sm:aspect-auto sm:h-[132px] sm:w-[232px] ${failed && !item.found ? "hidden" : ""}`}>
      <span aria-hidden className="absolute inset-0 bg-roll" />
      {reading && !failed ? <span aria-hidden className="scan-line absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-white/30 to-transparent" /> : null}
      {/* A duplicate was read fine, so its roll is shown. A file that could not be read has nothing to show, and the block goes. */}
      {item.found ? (
        <span className={`absolute inset-0 ${swept ? "sweep-in" : "sweep-out"} ${failed ? "opacity-60 saturate-50" : ""}`}>
          {/* RollThumb sets display inline, hence the important. */}
          <RollThumb roll={item.found.sprite} width={320} height={128} radius={14} className="h-full w-full sm:!hidden" />
          <RollThumb roll={item.found.sprite} width={232} height={132} radius={14} className="max-sm:!hidden" />
        </span>
      ) : null}
    </span>
  );
}

export function AddingStage({
  items,
  onRetry,
  onDismiss,
  onReplace,
  onShow,
}: {
  items: UploadItem[];
  onRetry: (id: string) => void;
  onDismiss: (id: string) => void;
  onReplace: (id: string) => void;
  onShow: (songId: string) => void;
}) {
  const current = items.find((it) => it.stage !== "queued" && it.stage !== "failed" && it.stage !== "done") ?? items.find((it) => it.stage === "done") ?? items.find((it) => it.stage === "failed") ?? items[0];
  if (!current) return null;
  const others = items.filter((it) => it.id !== current.id);
  const idx = stageIndex(current.stage);
  const a = current.found?.analysis;
  const failed = current.stage === "failed";
  const done = current.stage === "done";
  const title = current.found?.title ?? current.title;

  return (
    <div className="flex flex-col items-center py-4 sm:min-h-[calc(100vh-220px)] sm:justify-center sm:py-8">
      <div className="w-full max-w-[720px]">
        <div className="relative h-[110px] sm:h-[150px]">
          <StageArt stage={current.stage} className="h-full w-full" />
        </div>

        <div className={`animate-row-in rounded-[20px] border p-4 shadow-lift sm:p-6 ${failed ? "border-coral/40 bg-coral-soft/40" : done ? "border-sage/40 bg-sage-soft/50" : "border-sun/70 bg-card"}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <BigThumb item={current} />
            <div className="min-w-0 sm:flex-1">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-dim">
                {failed ? "Could not add" : done ? "Added" : `Adding${others.length ? ` · ${others.length} more waiting` : ""}`}
              </p>
              <h2 className={`mt-1 text-[20px] font-semibold tracking-[-0.01em] max-sm:line-clamp-2 max-sm:leading-7 sm:truncate sm:text-[24px] ${failed ? "text-coral" : "text-ink"}`}>{title}</h2>
              {current.found?.composer ? <p className="text-[13.5px] text-ink-dim">{current.found.composer}</p> : null}
              <p className={`mt-2 text-[14px] leading-6 ${failed ? "text-ink" : "text-ink-soft"}`}>{failed ? current.error : STORY[current.stage]}</p>

              {failed ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {current.failure === "duplicate" && current.duplicateOf ? (
                    <Button variant="secondary" onClick={() => onShow(current.duplicateOf!.id)}>
                      Show it
                    </Button>
                  ) : null}
                  {current.failure === "type" || current.failure === "size" || current.failure === "empty" ? (
                    <Button variant="secondary" onClick={() => onReplace(current.id)} icon={<IconUpload size={14} />}>
                      Choose another file
                    </Button>
                  ) : null}
                  {current.failure === "corrupt" ? (
                    <Button variant="secondary" onClick={() => onRetry(current.id)} icon={<IconRetry size={14} />}>
                      Try again
                    </Button>
                  ) : null}
                  <Button variant="ghost" onClick={() => onDismiss(current.id)} icon={<IconClose size={14} />}>
                    Remove
                  </Button>
                </div>
              ) : null}
            </div>
          </div>

          {!failed ? (
            <>
              {/* Four labels do not fit one phone line, so there they sit two by two. */}
              <ol className="mt-5 grid grid-cols-2 gap-x-3 gap-y-2.5 sm:mt-6 sm:flex sm:items-center sm:gap-0" aria-label="Progress">
                {STEPS.map((s, i) => {
                  const isDone = i < idx;
                  const active = i === idx && !done;
                  return (
                    <li key={s.key} className="flex min-w-0 items-center sm:flex-1 sm:last:flex-none">
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className={`grid size-7 shrink-0 place-items-center rounded-full border transition-[background-color,border-color,color,box-shadow] duration-300 ${
                            isDone || done ? "border-teal bg-teal text-white" : active ? "border-sun-ink bg-sun text-sun-ink shadow-[0_0_0_5px_rgba(255,226,138,0.45)]" : "border-line-strong bg-card text-ink-dim"
                          }`}
                          aria-current={active ? "step" : undefined}
                        >
                          {isDone || done ? <IconCheck size={13} /> : <span className="tnum text-[11px] font-semibold">{i + 1}</span>}
                        </span>
                        <span className={`text-[13px] max-sm:leading-4 ${active ? "font-semibold text-ink" : isDone || done ? "text-ink-soft" : "text-ink-dim"}`}>{s.label}</span>
                      </span>
                      {i < STEPS.length - 1 ? (
                        <span className="mx-3 hidden h-px flex-1 overflow-hidden rounded-full bg-ink/[0.12] sm:block" aria-hidden>
                          <span className="block h-full rounded-full bg-teal transition-[width] duration-500 ease-out" style={{ width: isDone || done ? "100%" : "0%" }} />
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ol>

              <div className="mt-5 flex min-h-[32px] flex-wrap items-center gap-2" aria-live="polite">
                {idx >= 2 && a ? <span className="cell-in tnum rounded-full border border-line bg-card px-3 py-1 text-[13px] text-ink">{a.noteCount} notes</span> : null}
                {idx >= 2 && a ? <span className="cell-in tnum rounded-full border border-line bg-card px-3 py-1 text-[13px] text-ink">{formatDuration(a.durationSec)}</span> : null}
                {idx >= 2 && a ? <span className="cell-in tnum rounded-full border border-line bg-card px-3 py-1 text-[13px] text-ink">{a.bpm} bpm</span> : null}
                {idx >= 3 && a ? (
                  <span className="cell-in inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1 text-[13px] text-ink">
                    <span className={`size-1.5 rounded-full ${a.key.mode === "minor" ? "bg-hand-l" : "bg-teal"}`} aria-hidden />
                    {a.key.label}
                  </span>
                ) : null}
                {idx >= 4 && a ? (
                  <span className="cell-in inline-flex items-center rounded-full border border-line bg-card px-3 py-1 text-[13px]">
                    <Level score={a.difficulty.score} label={a.difficulty.label} animate />
                  </span>
                ) : null}
                {idx >= 4 && a ? <span className="cell-in rounded-full border border-line bg-card px-3 py-1 text-[13px] text-ink">{a.hands === "both" ? "Both hands" : a.hands === "left" ? "Left hand" : "Right hand"}</span> : null}
              </div>
            </>
          ) : null}
        </div>

        {others.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {others.map((it) => (
              <li key={it.id} className={`inline-flex items-center gap-2 rounded-full border px-2 py-1 text-[12.5px] ${it.stage === "failed" ? "border-coral/40 bg-coral-soft/50 text-coral" : it.stage === "done" ? "border-sage/40 bg-sage-soft text-sage" : "border-line bg-card text-ink-soft"}`}>
                <span className="inline-block h-4 w-7 overflow-hidden rounded-[3px] bg-roll">{it.found ? <RollThumb roll={it.found.sprite} width={28} height={16} radius={3} /> : null}</span>
                <span className="max-w-[160px] truncate">{it.found?.title ?? it.title}</span>
                <span className="text-ink-dim">· {STAGE_LABEL[it.stage]}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
