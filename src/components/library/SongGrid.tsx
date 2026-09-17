"use client";

import { RollThumb } from "@/components/roll/RollThumb";
import { Playhead } from "@/components/roll/Playhead";
import { RowMenu } from "@/components/ui/RowMenu";
import { IconHeart, IconPause, IconPlay, IconTrash } from "@/components/ui/Icons";
import { formatDuration } from "@/lib/midi/analyze";
import { markPlayed, toggleFavorite, useFolders } from "@/lib/library/store";
import { player, useNowPlayingId } from "@/lib/audio/player";
import { playableFromSong } from "@/lib/audio/playable";
import type { Song } from "@/lib/library/types";
import { Level } from "./Level";
import { AddingRow } from "./AddingRow";
import { PlayButton, folderMenuItems, recentMenuItems, type Row } from "./SongTable";
import { useProgressive } from "@/hooks/useProgressive";

export function SongGrid({
  rows,
  selectedId,
  removingId,
  onSelect,
  onRemove,
  onRetry,
  onDismiss,
  onReplace,
  onShow,
  dragBind,
  wasDrag,
}: {
  rows: Row[];
  selectedId: string | null;
  removingId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
  onDismiss: (id: string) => void;
  onReplace: (id: string) => void;
  onShow: (songId: string) => void;
  dragBind: (song: Song) => { onPointerDown: (e: React.PointerEvent<HTMLElement>) => void };
  wasDrag: () => boolean;
}) {
  const nowPlaying = useNowPlayingId();
  const folders = useFolders();
  const pending = rows.filter((r) => r.kind === "pending");
  const songs = rows.filter((r) => r.kind === "song");
  const paged = useProgressive(songs, 48);
  const newFolder = () => (document.querySelector('[aria-label="New folder"]') as HTMLButtonElement | null)?.click();

  return (
    <div>
      {pending.length > 0 ? (
        <ul className="mb-3 flex flex-col gap-2">
          {pending.map((row) =>
            row.kind === "pending" ? (
              <li key={row.item.id} className="animate-row-in">
                <AddingRow item={row.item} onRetry={() => onRetry(row.item.id)} onDismiss={() => onDismiss(row.item.id)} onReplace={() => onReplace(row.item.id)} onShow={onShow} />
              </li>
            ) : null,
          )}
        </ul>
      ) : null}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {paged.visible.map((row) => {
          if (row.kind !== "song") return null;
          const s = row.song;
          const selected = s.id === selectedId;
          const playing = nowPlaying === s.id;
          const toggle = () => {
            if (!(player.snapshot().song?.id === s.id && player.snapshot().playing)) markPlayed(s.id);
            player.toggle(playableFromSong(s));
          };
          return (
            <li key={s.id} className={removingId === s.id ? "row-out" : ""}>
              <div
                role="button"
                tabIndex={0}
                id={`song-${s.id}`}
                aria-pressed={selected}
                {...dragBind(s)}
                onClick={() => {
                  if (!wasDrag()) onSelect(s.id);
                }}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onSelect(s.id);
                  }
                  if (e.key === " ") {
                    e.preventDefault();
                    toggle();
                  }
                  if (e.key === "Backspace" || e.key === "Delete") {
                    e.preventDefault();
                    onRemove(s.id);
                  }
                }}
                className={`ring-focus group relative cursor-grab select-none rounded-card border bg-card p-2 shadow-card transition-[box-shadow,border-color] duration-150 active:cursor-grabbing ${
                  selected ? "border-teal shadow-[0_0_0_3px_rgba(34,135,123,0.15)]" : "border-line hover:border-line-strong hover:shadow-lift"
                }`}
              >
                <span className="relative block overflow-hidden rounded-[9px]">
                  <RollThumb roll={s.roll} width={400} height={200} radius={9} className="h-auto w-full" title={`Piano roll of ${s.title}`} />
                  <Playhead active={playing} />
                  <span className="absolute bottom-2 left-2">
                    <PlayButton playing={playing} title={s.title} onClick={toggle} size={34} />
                  </span>
                </span>
                <div className="absolute right-3.5 top-3.5 flex items-center gap-1 opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                  <button
                    type="button"
                    aria-label={s.favorite ? `Remove ${s.title} from favorites` : `Add ${s.title} to favorites`}
                    aria-pressed={s.favorite}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(s.id);
                      const el = e.currentTarget.firstElementChild as HTMLElement | null;
                      el?.classList.remove("heart-pop");
                      void el?.offsetWidth;
                      el?.classList.add("heart-pop");
                    }}
                    className={`press ring-focus grid size-8 place-items-center rounded-full border border-white/70 bg-paper/95 shadow-lift backdrop-blur ${s.favorite ? "text-coral" : "text-ink"}`}
                  >
                    <span className="inline-flex">
                      <IconHeart size={13} {...(s.favorite ? { fill: "currentColor" } : {})} />
                    </span>
                  </button>
                  <RowMenu
                    label={`More for ${s.title}`}
                    className="[&>button]:size-8 [&>button]:rounded-full [&>button]:border [&>button]:border-white/70 [&>button]:bg-paper/95 [&>button]:text-ink [&>button]:shadow-lift [&>button]:backdrop-blur"
                    items={[
                      { label: playing ? "Pause" : "Play", icon: playing ? <IconPause size={13} /> : <IconPlay size={13} />, onSelect: toggle, shortcut: "Space" },
                      { label: s.favorite ? "Remove from favorites" : "Add to favorites", icon: <IconHeart size={13} {...(s.favorite ? { fill: "currentColor" } : {})} />, onSelect: () => toggleFavorite(s.id) },
                      ...folderMenuItems(s, folders, newFolder),
                      ...recentMenuItems(s),
                      { label: "Remove from library", icon: <IconTrash size={13} />, onSelect: () => onRemove(s.id), tone: "coral" },
                    ]}
                  />
                </div>
                {s.favorite ? (
                  <span className="pointer-events-none absolute right-3.5 top-3.5 grid size-8 place-items-center rounded-full border border-white/70 bg-paper/95 text-coral shadow-lift backdrop-blur group-hover:opacity-0 [@media(hover:none)]:hidden" aria-hidden>
                    <IconHeart size={13} fill="currentColor" />
                  </span>
                ) : null}
                <div className="px-1.5 pb-1 pt-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-[14px] font-medium text-ink">{s.title}</p>
                    <span className="tnum shrink-0 text-[12px] text-ink-dim">{formatDuration(s.durationSec)}</span>
                  </div>
                  <p className="truncate text-[12px] text-ink-dim">{s.composer || s.fileName}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[12px] text-ink-soft">
                      {s.key.label} · {s.bpm} bpm
                    </span>
                    <Level score={s.difficulty.score} label={s.difficulty.label} compact />
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {paged.remaining > 0 ? (
        <div ref={paged.sentinel} className="flex items-center justify-center gap-3 py-4 text-[12.5px] text-ink-dim">
          <span className="tnum">{paged.remaining} more below</span>
          <button type="button" onClick={paged.showAll} className="ring-focus rounded-[6px] font-medium text-teal-deep underline-offset-2 hover:underline">
            Show all
          </button>
        </div>
      ) : null}
    </div>
  );
}
