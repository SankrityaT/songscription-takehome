"use client";

import { useEffect, useState } from "react";
import { RollThumb, RollSkeleton } from "@/components/roll/RollThumb";
import { Playhead } from "@/components/roll/Playhead";
import { Button } from "@/components/ui/Button";
import { IconArrow, IconPause, IconPlay, IconPlus } from "@/components/ui/Icons";
import { player, usePlayer } from "@/lib/audio/player";
import { parseMidi } from "@/lib/midi/parse";
import { analyze, formatDuration, spriteFromCompact, titleFromFile, type RollNote, type SongAnalysis } from "@/lib/midi/analyze";
import { Level } from "./Level";
import { Skeleton } from "./PendingCells";

export const STARTERS = ["c-major-scale.mid", "twinkle-twinkle.mid", "beethoven-fur-elise.mid"];

interface Starter {
  name: string;
  title: string;
  composer: string;
  analysis: SongAnalysis;
  sprite: RollNote[];
}

export async function fetchSampleFile(name: string) {
  const res = await fetch(`/samples/${name}`);
  const blob = await res.blob();
  return new File([blob], name, { type: "audio/midi" });
}

/* The empty library is made of music, not instructions. Three real songs,
   parsed the moment the page opens, that you can hear and add in one click.
   Same row anatomy as the library, so the first screen already teaches it. */
export function StarterSongs({ onAdd, onAddAll, adding }: { onAdd: (name: string) => void; onAddAll: () => void; adding: Set<string> }) {
  const [starters, setStarters] = useState<Starter[] | null>(null);
  const { song: current, playing } = usePlayer();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const out: Starter[] = [];
      for (const name of STARTERS) {
        try {
          const file = await fetchSampleFile(name);
          const parsed = parseMidi(await file.arrayBuffer());
          const analysis = analyze(parsed);
          const { title, composer } = titleFromFile(name, parsed.trackNames);
          out.push({ name, title, composer, analysis, sprite: spriteFromCompact(analysis.notes, analysis.durationSec) });
        } catch {
          /* a sample that fails to load simply is not offered */
        }
      }
      if (!cancelled) setStarters(out);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section aria-labelledby="starters-heading" className="mt-8">
      {/* On a phone the button goes under the text, never clipped beside it. */}
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h2 id="starters-heading" className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
            Start with a song
          </h2>
          <p className="mt-0.5 text-[13px] text-ink-soft">Three pieces at three levels. Press play to hear one, then add what you want to practice.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={onAddAll} disabled={!starters || starters.length === 0} icon={<IconPlus size={14} />} className="shrink-0">
          Add all three
        </Button>
      </div>

      <ul className="mt-3 overflow-hidden rounded-card border border-line bg-card shadow-card">
        {(starters ?? STARTERS.map((name) => ({ name }))).map((st, i) => {
          const full = "analysis" in st ? (st as Starter) : null;
          const id = `starter:${st.name}`;
          const isCurrent = current?.id === id;
          const isPlaying = isCurrent && playing;
          const isAdding = adding.has(st.name);
          const toggle = () =>
            full &&
            player.toggle({
              id,
              title: full.title,
              subtitle: full.composer,
              notes: full.analysis.notes,
              durationSec: full.analysis.durationSec,
              bpm: full.analysis.bpm,
              beatsPerBar: full.analysis.timeSignature[0],
              roll: full.sprite,
              keyLabel: full.analysis.key.label,
            });
          return (
            <li key={st.name} className={`flex flex-wrap items-center gap-x-3 gap-y-2.5 px-3 py-3 sm:flex-nowrap sm:gap-4 sm:px-4 ${i > 0 ? "border-t border-line" : ""} ${isCurrent ? "bg-sun-soft/40" : ""}`}>
              <button
                type="button"
                aria-label={isPlaying ? `Pause ${full?.title ?? "preview"}` : `Play ${full?.title ?? "preview"}`}
                aria-pressed={isPlaying}
                disabled={!full}
                onClick={toggle}
                className={`press ring-focus grid size-10 shrink-0 place-items-center rounded-full border transition-[background-color,border-color,color,box-shadow] duration-150 disabled:cursor-default disabled:opacity-40 ${
                  isPlaying
                    ? "border-ink bg-ink text-paper shadow-[0_0_0_4px_rgba(255,226,138,0.45)]"
                    : "border-line-strong bg-card text-ink hover:border-ink hover:bg-ink hover:text-paper"
                }`}
              >
                {isPlaying ? <IconPause size={16} /> : <IconPlay size={16} className="translate-x-px" />}
              </button>

              <span className="relative shrink-0 overflow-hidden rounded-[8px]">
                {full ? <RollThumb roll={full.sprite} width={84} height={48} radius={8} className="max-sm:h-8 max-sm:w-14" /> : <RollSkeleton width={84} height={48} radius={8} className="max-sm:!h-8 max-sm:!w-14" />}
                <Playhead active={isPlaying} />
              </span>

              <div className="min-w-0 flex-1">
                {full ? (
                  <>
                    <p className="text-[14.5px] font-medium text-ink max-sm:line-clamp-2 max-sm:leading-5 sm:truncate">{full.title}</p>
                    <p className="tnum truncate text-[12.5px] text-ink-dim">
                      <span className="max-sm:block max-sm:truncate">{full.composer}</span>
                      <span className="max-sm:hidden"> · </span>
                      {full.analysis.key.label} · {full.analysis.bpm} bpm · {formatDuration(full.analysis.durationSec)} · {full.analysis.noteCount} notes
                    </p>
                  </>
                ) : (
                  <>
                    <Skeleton w={140} className="mb-1.5 block" />
                    <Skeleton w={220} className="block" />
                  </>
                )}
              </div>

              <div className="hidden w-[150px] shrink-0 sm:block">{full ? <Level score={full.analysis.difficulty.score} label={full.analysis.difficulty.label} /> : <Skeleton w={90} />}</div>

              <Button variant="secondary" size="md" disabled={!full || isAdding} onClick={() => onAdd(st.name)} icon={<IconPlus size={14} />} className="shrink-0 max-sm:h-9 max-sm:basis-full">
                {isAdding ? "Adding…" : "Add to library"}
              </Button>
            </li>
          );
        })}
      </ul>

      <a
        href="https://www.songscription.ai/new"
        target="_blank"
        rel="noreferrer"
        className="ring-focus mt-3 inline-flex items-center gap-1.5 rounded-[6px] text-[13px] text-ink-soft underline-offset-[3px] hover:text-ink hover:underline"
      >
        Transcribed something on Songscription? Export the MIDI and drop it here <IconArrow size={13} />
      </a>
    </section>
  );
}
