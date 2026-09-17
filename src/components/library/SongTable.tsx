"use client";

import { useState, type ReactNode } from "react";
import { useProgressive } from "@/hooks/useProgressive";
import { RollThumb } from "@/components/roll/RollThumb";
import { Playhead } from "@/components/roll/Playhead";
import { RowMenu, type MenuItem } from "@/components/ui/RowMenu";
import { IconCheck, IconClose, IconFolder, IconHeart, IconPause, IconPlay, IconTrash } from "@/components/ui/Icons";
import { formatDuration } from "@/lib/midi/analyze";
import { forgetPlayed, markPlayed, moveToFolder, restorePlayed, toggleFavorite, useFolders } from "@/lib/library/store";
import { player, useNowPlayingId } from "@/lib/audio/player";
import { playableFromSong } from "@/lib/audio/playable";
import { pushToast, setFilters, useFilters, useMinWidth, type SortKey } from "@/lib/ui-store";
import type { Song } from "@/lib/library/types";
import type { UploadItem } from "@/hooks/useUploadQueue";
import { Level } from "./Level";
import { AddingRow } from "./AddingRow";

export type Row = { kind: "song"; song: Song } | { kind: "pending"; item: UploadItem };

export function relative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const HANDS: Record<Song["hands"], string> = { both: "Both", left: "Left", right: "Right" };

/* The round play button, always visible, the same one the starters use. */
export function PlayButton({ playing, title, onClick, size = 36 }: { playing: boolean; title: string; onClick: () => void; size?: number }) {
  return (
    <button
      type="button"
      aria-label={playing ? `Pause ${title}` : `Play ${title}`}
      aria-pressed={playing}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      style={{ width: size, height: size }}
      className={`press ring-focus grid shrink-0 place-items-center rounded-full border transition-[background-color,border-color,color,box-shadow] duration-150 ${
        playing ? "border-ink bg-ink text-paper shadow-[0_0_0_4px_rgba(255,226,138,0.45)]" : "border-line-strong bg-card text-ink hover:border-ink hover:bg-ink hover:text-paper"
      }`}
    >
      {playing ? <IconPause size={15} /> : <IconPlay size={15} className="translate-x-px" />}
    </button>
  );
}

function HeartButton({ song }: { song: Song }) {
  const [pop, setPop] = useState(0);
  return (
    <button
      type="button"
      aria-label={song.favorite ? `Remove ${song.title} from favorites` : `Add ${song.title} to favorites`}
      title={song.favorite ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={song.favorite}
      onClick={(e) => {
        e.stopPropagation();
        toggleFavorite(song.id);
        setPop((n) => n + 1);
      }}
      className={`press ring-focus grid size-8 place-items-center rounded-[8px] transition-[opacity,color,background-color] duration-150 hover:bg-ink/[0.05] focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100 ${
        song.favorite ? "text-coral opacity-100" : "text-ink-dim opacity-0 hover:text-ink"
      }`}
    >
      <span key={pop} className={pop ? "heart-pop inline-flex" : "inline-flex"}>
        <IconHeart size={15} {...(song.favorite ? { fill: "currentColor" } : {})} />
      </span>
    </button>
  );
}

/* Sortable column header. Click sorts, click again flips direction. */
function Th({ col, label, align = "left", className = "" }: { col: SortKey | null; label: string; align?: "left" | "right"; className?: string }) {
  const f = useFilters();
  const active = col !== null && f.sort === col;
  const inner = (
    <span className={`inline-flex items-center gap-1 ${align === "right" ? "flex-row-reverse" : ""}`}>
      {label}
      {active ? <span aria-hidden>{f.dir === "asc" ? "↑" : "↓"}</span> : null}
    </span>
  );
  return (
    <th scope="col" aria-sort={active ? (f.dir === "asc" ? "ascending" : "descending") : undefined} className={`h-9 font-normal ${align === "right" ? "text-right" : "text-left"} ${className}`}>
      {col ? (
        <button
          type="button"
          onClick={() => setFilters({ sort: col, dir: active ? (f.dir === "asc" ? "desc" : "asc") : col === "title" ? "asc" : "desc" })}
          className={`ring-focus rounded-[4px] uppercase tracking-[0.08em] transition-colors hover:text-ink ${active ? "text-ink" : ""}`}
        >
          {inner}
        </button>
      ) : (
        inner
      )}
    </th>
  );
}

export function folderMenuItems(song: Song, folders: { id: string; name: string }[], onNewFolder: () => void): MenuItem[] {
  const items: MenuItem[] = folders.map((f) => ({
    label: song.folderId === f.id ? `Remove from ${f.name}` : `Move to ${f.name}`,
    icon: <IconFolder size={13} />,
    onSelect: () => moveToFolder(song.id, song.folderId === f.id ? null : f.id),
  }));
  items.push({ label: "New folder…", icon: <IconFolder size={13} />, onSelect: onNewFolder });
  return items;
}

/* Played by accident, or done with it for now: a song can leave Recently
   played and Jump back in without leaving the library. */
export function recentMenuItems(song: Song): MenuItem[] {
  if (!song.lastPlayedAt) return [];
  return [
    {
      label: "Remove from recently played",
      icon: <IconClose size={13} />,
      onSelect: () => {
        const before = forgetPlayed([song.id]);
        pushToast(`“${song.title}” removed from recently played`, { label: "Undo", onClick: () => restorePlayed(before) });
      },
    },
  ];
}

/* A table, because a learner scanning for tonight's song compares key,
   tempo, length and level across rows. Numbers are tabular so columns hold
   still. Files being added are taller cards inside the same table. Rows can
   be played in place, dragged to the bin, or removed with the Delete key. */
export function SongTable({
  rows,
  selectedId,
  recentlyAdded,
  removingId,
  highlightId,
  dropRow,
  onSelect,
  onRemove,
  onRetry,
  onDismiss,
  onReplace,
  onShow,
  onNewFolder,
  dragBind,
  wasDrag,
  dense = false,
}: {
  rows: Row[];
  selectedId: string | null;
  recentlyAdded: Set<string>;
  removingId: string | null;
  highlightId: string | null;
  dropRow?: ReactNode;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
  onDismiss: (id: string) => void;
  onReplace: (id: string) => void;
  onShow: (songId: string) => void;
  onNewFolder: () => void;
  dragBind: (song: Song) => { onPointerDown: (e: React.PointerEvent<HTMLElement>) => void };
  wasDrag: () => boolean;
  /** with the detail panel open there is no room for the wide columns */
  dense?: boolean;
}) {
  const nowPlaying = useNowPlayingId();
  const v = (cls: string) => (dense ? "hidden" : cls);
  /* An adding row spans the table. It must span only the columns showing at
     this width: in a fixed table every spanned column that is hidden comes
     back as an empty one, and they squeeze the Song column to nothing. */
  const sm = useMinWidth(640);
  const lg = useMinWidth(1024);
  /* Level, Hands and Added wait for 1536: at 1280 they left the title about 60px. Until then the level rides under the title. */
  const xl = useMinWidth(1536);
  const cols = 3 + (sm ? 1 : 0) + (!dense && lg ? 2 : 0) + (!dense && xl ? 3 : 0);
  const paged = useProgressive(rows, 60);
  const folders = useFolders();
  const f = useFilters();
  const songs = rows.filter((r): r is Extract<Row, { kind: "song" }> => r.kind === "song").map((r) => r.song);
  const total = songs.reduce((s, x) => s + x.durationSec, 0);
  const showPlayed = f.sort === "played" || f.scope === "recent";

  if (rows.length === 0 && dropRow) return <>{dropRow}</>;

  return (
    <div className="overflow-hidden rounded-card border border-line bg-card shadow-card">
      <table className="w-full table-fixed border-collapse text-[13px]">
        <thead className={rows.length === 0 ? "sr-only" : undefined}>
          <tr className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-dim">
            <th scope="col" className="h-9 w-[52px] pl-3 font-normal sm:w-[64px] sm:pl-4">
              <span className="sr-only">Play</span>
            </th>
            <Th col="title" label="Song" />
            <Th col={null} label="Key" className={v("hidden w-[120px] lg:table-cell")} />
            <Th col="tempo" label="Tempo" align="right" className={v("hidden w-[92px] lg:table-cell")} />
            <Th col="length" label="Length" align="right" className="hidden w-[76px] sm:table-cell" />
            <Th col="level" label="Level" className={v("hidden w-[150px] pl-6 2xl:table-cell")} />
            <Th col={null} label="Hands" className={v("hidden w-[80px] 2xl:table-cell")} />
            <Th col={showPlayed ? "played" : "added"} label={showPlayed ? "Played" : "Added"} align="right" className={v("hidden w-[104px] 2xl:table-cell")} />
            <th scope="col" className="h-9 w-[76px] pr-3 font-normal sm:w-[84px]">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {paged.visible.map((row) => {
            if (row.kind === "pending") {
              const it = row.item;
              return (
                <tr key={it.id} className="animate-row-in border-t border-line">
                  <td colSpan={cols} className="p-2">
                    <AddingRow item={it} onRetry={() => onRetry(it.id)} onDismiss={() => onDismiss(it.id)} onReplace={() => onReplace(it.id)} onShow={onShow} />
                  </td>
                </tr>
              );
            }

            const s = row.song;
            const selected = s.id === selectedId;
            const fresh = recentlyAdded.has(s.id);
            const playing = nowPlaying === s.id;
            const leaving = removingId === s.id;
            const flash = highlightId === s.id;
            const folder = s.folderId ? folders.find((x) => x.id === s.folderId) : null;
            const toggle = () => {
              if (!(player.snapshot().song?.id === s.id && player.snapshot().playing)) markPlayed(s.id);
              player.toggle(playableFromSong(s));
            };
            return (
              <tr
                key={s.id}
                id={`song-${s.id}`}
                aria-selected={selected}
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
                tabIndex={0}
                style={{ contentVisibility: "auto", containIntrinsicSize: "0 66px" }}
                className={`ring-focus group cursor-grab select-none border-t border-line active:cursor-grabbing ${fresh ? "animate-row-in" : ""} ${leaving ? "row-out" : ""} ${
                  flash || fresh ? "row-flash" : ""
                } ${selected ? "bg-teal-soft/70" : playing ? "bg-sun-soft/50" : "hover:bg-ink/[0.03]"}`}
              >
                <td className="py-2.5 pl-3 sm:pl-4">
                  <PlayButton playing={playing} title={s.title} onClick={toggle} size={40} />
                </td>
                {/* A phone row is its own layout: a smaller roll, a title that may
                    take two lines, and the facts on two deliberate lines. */}
                <td className="py-2 pr-2 sm:pr-4">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <span className="relative shrink-0 overflow-hidden rounded-[8px]">
                      <RollThumb roll={s.roll} width={84} height={48} radius={8} className="max-sm:h-8 max-sm:w-14" />
                      <Playhead active={playing} />
                    </span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-x-2 gap-y-0.5 text-[14.5px] font-medium text-ink max-sm:flex-wrap max-sm:leading-5">
                        <span className="min-w-0 max-sm:line-clamp-2 sm:truncate">{s.title}</span>
                        {fresh ? (
                          <span className="cell-in inline-flex shrink-0 items-center gap-1 rounded-full bg-sage px-1.5 py-px text-[11px] font-medium text-white">
                            <IconCheck size={11} /> Added
                          </span>
                        ) : null}
                        {folder ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-[5px] bg-paper-deep px-1.5 py-px text-[11px] text-ink-soft">
                            <IconFolder size={11} /> {folder.name}
                          </span>
                        ) : null}
                      </p>
                      <p className="tnum truncate text-[12.5px] text-ink-dim">
                        {s.composer || s.fileName}
                        <span className="max-sm:hidden"> · {s.noteCount} notes</span>
                      </p>
                      <p className={`tnum text-[12px] text-ink-soft sm:truncate ${dense ? "" : "2xl:hidden"}`}>
                        <span className={`max-sm:block max-sm:truncate ${dense ? "" : "lg:hidden"}`}>
                          {s.key.label} · {s.bpm} bpm
                        </span>
                        <span className="whitespace-nowrap max-sm:block">
                          <span className="sm:hidden">{formatDuration(s.durationSec)}</span>
                          <span className={dense ? "" : "lg:hidden"}> · </span>
                          {s.difficulty.label}
                        </span>
                      </p>
                    </div>
                  </div>
                </td>
                <td className={`whitespace-nowrap pr-4 text-ink-soft ${v("hidden lg:table-cell")}`}>
                  <span
                    className={`inline-flex items-center gap-1.5 ${s.key.declared ? "" : "underline decoration-dotted decoration-ink/30 underline-offset-[3px]"}`}
                    title={s.key.declared ? "Key declared in the file" : "Key guessed from the notes; the file did not declare one"}
                  >
                    <span className={`size-1.5 rounded-full ${s.key.mode === "minor" ? "bg-hand-l" : "bg-teal"}`} aria-hidden />
                    {s.key.label}
                  </span>
                </td>
                <td className={`tnum whitespace-nowrap pr-4 text-right text-ink-soft ${v("hidden lg:table-cell")}`}>{s.bpm} bpm</td>
                <td className="tnum hidden whitespace-nowrap pr-4 text-right text-ink-soft sm:table-cell">{formatDuration(s.durationSec)}</td>
                <td className={`whitespace-nowrap pl-6 pr-4 ${v("hidden 2xl:table-cell")}`}>
                  <Level score={s.difficulty.score} label={s.difficulty.label} />
                </td>
                <td className={`whitespace-nowrap pr-4 text-ink-soft ${v("hidden 2xl:table-cell")}`}>{HANDS[s.hands]}</td>
                <td className={`tnum whitespace-nowrap pr-4 text-right text-ink-dim ${v("hidden 2xl:table-cell")}`}>
                  {showPlayed ? (s.lastPlayedAt ? relative(s.lastPlayedAt) : "Never") : relative(s.addedAt)}
                </td>
                <td className="pr-2 text-right">
                  <div className="flex items-center justify-end gap-0.5">
                    <HeartButton song={s} />
                    <RowMenu
                      label={`More for ${s.title}`}
                      className="opacity-0 focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                      items={[
                        { label: playing ? "Pause" : "Play", icon: playing ? <IconPause size={13} /> : <IconPlay size={13} />, onSelect: toggle, shortcut: "Space" },
                        { label: s.favorite ? "Remove from favorites" : "Add to favorites", icon: <IconHeart size={13} {...(s.favorite ? { fill: "currentColor" } : {})} />, onSelect: () => toggleFavorite(s.id) },
                        ...folderMenuItems(s, folders, onNewFolder),
                        ...recentMenuItems(s),
                        { label: "Remove from library", icon: <IconTrash size={13} />, onSelect: () => onRemove(s.id), tone: "coral" },
                      ]}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {paged.remaining > 0 ? (
        <div ref={paged.sentinel} className="flex items-center justify-center gap-3 border-t border-line px-4 py-3 text-[12.5px] text-ink-dim">
          <span className="tnum">{paged.remaining} more below</span>
          <button type="button" onClick={paged.showAll} className="ring-focus rounded-[6px] font-medium text-teal-deep underline-offset-2 hover:underline">
            Show all
          </button>
        </div>
      ) : null}
      {songs.length > 0 ? (
        <div className="tnum flex items-center justify-between border-t border-line px-4 py-2.5 text-[12px] text-ink-dim">
          <span>
            {songs.length} {songs.length === 1 ? "song" : "songs"}
          </span>
          <span>
            {formatDuration(total)} of music
            {/* Dragging is a mouse gesture; on touch the row menu removes. No room for it on a phone either. */}
            <span className="max-sm:hidden [@media(hover:none)]:hidden"> · drag a row to the bin to remove it</span>
          </span>
        </div>
      ) : null}
    </div>
  );
}
