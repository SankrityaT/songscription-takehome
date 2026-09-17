"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RollCanvas } from "@/components/roll/RollCanvas";
import { Playhead } from "@/components/roll/Playhead";
import { Button } from "@/components/ui/Button";
import { RowMenu } from "@/components/ui/RowMenu";
import { IconClose, IconFolder, IconHeart, IconKeys, IconPause, IconPencil, IconPlay, IconTrash } from "@/components/ui/Icons";
import { markPlayed, renameSong, toggleFavorite, useFolders } from "@/lib/library/store";
import { player, usePlayer } from "@/lib/audio/player";
import { playableFromSong } from "@/lib/audio/playable";
import { requestKeys } from "@/lib/ui-store";
import { formatDuration, noteName } from "@/lib/midi/analyze";
import type { Song } from "@/lib/library/types";
import { Level } from "./Level";
import { folderMenuItems, recentMenuItems, relative } from "./SongTable";

function polyphony(song: Song) {
  const ev: Array<[number, number]> = [];
  for (const [, s, d] of song.notes) {
    ev.push([s, 1]);
    ev.push([s + d, -1]);
  }
  ev.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let cur = 0;
  let max = 0;
  for (const [, d] of ev) {
    cur += d;
    if (cur > max) max = cur;
  }
  return max;
}

function Fact({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="rounded-[10px] border border-line bg-card px-3 py-2.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-dim">{label}</p>
      <p className="tnum mt-1 text-[14px] font-medium text-ink">{value}</p>
      {sub ? <p className="mt-0.5 text-[11.5px] leading-4 text-ink-soft">{sub}</p> : null}
    </div>
  );
}

/* The song, up close, for a learner deciding whether to sit down with it:
   its roll, how it plays, and the facts that matter before the first bar.
   Everything here is read from the file or from what the player recorded.
   Nothing is invented. */
export function SongDetail({ song, onClose, onRemove, onNewFolder }: { song: Song; onClose: () => void; onRemove: (id: string) => void; onNewFolder: () => void }) {
  const folders = useFolders();
  const { song: loaded, playing } = usePlayer();
  const isLoaded = loaded?.id === song.id;
  const isPlaying = isLoaded && playing;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(song.title);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(song.title);
    setEditing(false);
  }, [song.id, song.title]);

  useEffect(() => {
    if (editing) input.current?.select();
  }, [editing]);

  const facts = useMemo(() => {
    const nps = song.noteCount / Math.max(1, song.durationSec);
    const barSec = (60 / Math.max(20, song.bpm)) * Math.max(1, song.timeSignature[0]);
    const bars = Math.max(1, Math.round(song.durationSec / barSec));
    const octaves = (song.pitchHigh - song.pitchLow) / 12;
    return { nps: Math.round(nps * 10) / 10, poly: polyphony(song), bars, octaves: Math.round(octaves * 10) / 10 };
  }, [song]);

  const folder = song.folderId ? folders.find((f) => f.id === song.folderId) : null;

  const toggle = () => {
    if (!isPlaying) markPlayed(song.id);
    player.toggle(playableFromSong(song));
  };
  const practice = () => {
    if (!isLoaded) {
      markPlayed(song.id);
      player.play(playableFromSong(song));
    } else if (!playing) player.resume();
    requestKeys();
  };
  const commitRename = () => {
    renameSong(song.id, draft);
    setEditing(false);
  };

  return (
    <aside aria-label={`Details for ${song.title}`} className="flex h-full flex-col overflow-hidden rounded-card border border-line bg-card shadow-card">
      {/* roll */}
      <div className="relative">
        <RollCanvas notes={song.notes} durationSec={song.durationSec} bpm={song.bpm} beatsPerBar={song.timeSignature[0]} playhead={null} height={168} className="!rounded-none" />
        <Playhead active={isPlaying} className="left-12" />
        <button
          type="button"
          aria-label="Close details"
          onClick={onClose}
          className="press ring-focus absolute right-2.5 top-2.5 grid size-8 place-items-center rounded-full border border-white/15 bg-black/55 text-white/85 backdrop-blur hover:bg-black/70"
        >
          <IconClose size={14} />
        </button>
      </div>

      <div className="scroll-quiet min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {/* title + actions */}
        <div className="px-4 pt-4">
          {editing ? (
            <input
              ref={input}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") {
                  setDraft(song.title);
                  setEditing(false);
                }
              }}
              aria-label="Song title"
              className="ring-focus h-9 w-full rounded-[9px] border border-teal bg-card px-2.5 text-[17px] font-semibold text-ink outline-none"
            />
          ) : (
            <div className="group flex items-start gap-2">
              <h2 className="min-w-0 flex-1 text-[18px] font-semibold leading-6 tracking-[-0.01em] text-ink">{song.title}</h2>
              <button
                type="button"
                aria-label="Rename"
                title="Rename"
                onClick={() => setEditing(true)}
                className="press ring-focus grid size-7 shrink-0 place-items-center rounded-[7px] text-ink-dim opacity-0 transition-opacity hover:bg-ink/[0.05] hover:text-ink focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
              >
                <IconPencil size={14} />
              </button>
            </div>
          )}
          <p className="mt-0.5 truncate text-[13px] text-ink-dim">
            {song.composer || song.fileName}
            {folder ? (
              <span className="ml-2 inline-flex items-center gap-1 rounded-[5px] bg-paper-deep px-1.5 py-px text-[11px] text-ink-soft">
                <IconFolder size={11} /> {folder.name}
              </span>
            ) : null}
          </p>

          <div className="mt-3 flex items-center gap-2">
            <Button variant="primary" size="md" onClick={practice} icon={<IconKeys size={15} />}>
              Practice
            </Button>
            <Button variant="secondary" size="md" onClick={toggle} icon={isPlaying ? <IconPause size={14} /> : <IconPlay size={14} />} aria-pressed={isPlaying}>
              {isPlaying ? "Pause" : "Listen"}
            </Button>
            <button
              type="button"
              aria-label={song.favorite ? "Remove from favorites" : "Add to favorites"}
              aria-pressed={song.favorite}
              onClick={() => toggleFavorite(song.id)}
              className={`press ring-focus grid size-10 place-items-center rounded-ctl border transition-colors ${
                song.favorite ? "border-coral/40 bg-coral-soft text-coral" : "border-line-strong bg-card text-ink-dim hover:text-coral"
              }`}
            >
              <IconHeart size={16} {...(song.favorite ? { fill: "currentColor" } : {})} />
            </button>
            <RowMenu
              label="More"
              className="[&>button]:size-10 [&>button]:rounded-ctl [&>button]:border [&>button]:border-line-strong [&>button]:bg-card"
              items={[
                { label: "Rename", icon: <IconPencil size={13} />, onSelect: () => setEditing(true) },
                ...folderMenuItems(song, folders, onNewFolder),
                ...recentMenuItems(song),
                { label: "Remove from library", icon: <IconTrash size={13} />, onSelect: () => onRemove(song.id), tone: "coral" },
              ]}
            />
          </div>
        </div>

        {/* facts */}
        <div className="grid grid-cols-2 gap-2 px-4 pt-4">
          <Fact
            label="Key"
            value={
              <span className="inline-flex items-center gap-1.5">
                <span className={`size-1.5 rounded-full ${song.key.mode === "minor" ? "bg-hand-l" : "bg-teal"}`} aria-hidden />
                {song.key.label}
              </span>
            }
            sub={song.key.declared ? "Declared in the file" : "Guessed from the notes"}
          />
          <Fact label="Tempo" value={`${song.bpm} bpm`} sub={song.tempoChanges ? `${song.tempoChanges} tempo ${song.tempoChanges === 1 ? "change" : "changes"}` : "Steady throughout"} />
          <Fact label="Meter" value={`${song.timeSignature[0]}/${song.timeSignature[1]}`} sub={`About ${facts.bars} ${facts.bars === 1 ? "bar" : "bars"}`} />
          <Fact label="Length" value={formatDuration(song.durationSec)} sub={`${song.noteCount} notes, ${facts.nps} a second`} />
          <Fact label="Range" value={`${noteName(song.pitchLow)} to ${noteName(song.pitchHigh)}`} sub={`${facts.octaves} octaves`} />
          <Fact label="Hands" value={song.hands === "both" ? "Both hands" : song.hands === "left" ? "Left hand" : "Right hand"} sub={`Up to ${facts.poly} ${facts.poly === 1 ? "note" : "notes"} at once`} />
        </div>

        <div className="px-4 pt-3">
          <div className="rounded-[10px] border border-line bg-card px-3 py-2.5">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-dim">Level</p>
              <Level score={song.difficulty.score} label={song.difficulty.label} />
            </div>
            <p className="mt-1.5 text-[11.5px] leading-4 text-ink-soft">
              Scored from note density ({facts.nps} a second), reach ({facts.octaves} octaves) and how many notes sound together (up to {facts.poly}).
            </p>
          </div>
        </div>

        {/* practice record */}
        <div className="px-4 pb-4 pt-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-dim">Your record</p>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            <Fact label="Played" value={song.playCount ? `${song.playCount}×` : "Not yet"} sub={song.lastPlayedAt ? `Last ${relative(song.lastPlayedAt).toLowerCase()}` : "Press Listen to hear it"} />
            <Fact label="Accuracy" value="—" sub="Practice mode listens to you play in the app. Not part of this preview." />
          </div>
          <p className="mt-3 text-[11.5px] text-ink-dim">
            Added {relative(song.addedAt).toLowerCase()} from {song.fileName} ({Math.max(1, Math.round(song.fileSize / 1024))} KB).
          </p>
        </div>
      </div>
    </aside>
  );
}
