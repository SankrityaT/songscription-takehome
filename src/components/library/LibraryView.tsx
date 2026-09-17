"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { markPlayed, removeSong, restoreSong, useLibrary } from "@/lib/library/store";
import { clearToast, pushToast, resetFilters, setPrefs, setSearch, useFilters, useMinWidth, usePrefs, useSearch, useToast } from "@/lib/ui-store";
import { player } from "@/lib/audio/player";
import { playableFromSong } from "@/lib/audio/playable";
import { matchesQuery, parseQuery } from "@/lib/search/query";
import { pickForMe } from "@/lib/library/pick";
import { useUploadQueue } from "@/hooks/useUploadQueue";
import { useDropAnywhere } from "@/hooks/useDropAnywhere";
import { useGreeting } from "@/hooks/useGreeting";
import { useRowDrag } from "@/hooks/useRowDrag";
import { formatDuration } from "@/lib/midi/analyze";
import type { Song } from "@/lib/library/types";
import { DropOverlay } from "@/components/upload/DropOverlay";
import { AddingStage } from "@/components/upload/AddingStage";
import { Toast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { NowPlayingBar } from "@/components/player/NowPlayingBar";
import { Portal } from "@/components/ui/Portal";
import { TopBar, type View } from "./TopBar";
import { SearchChips } from "./SearchField";
import { SongTable, type Row } from "./SongTable";
import { SongGrid } from "./SongGrid";
import { DropRow } from "./DropRow";
import { FilterBar } from "./FilterBar";
import { EarFinder } from "./EarFinder";
import { SongDetail } from "./SongDetail";
import { StarterSongs, STARTERS, fetchSampleFile } from "./StarterSongs";
import { TrashTray, type TrashTrayHandle } from "./TrashTray";
import { DragGhost } from "./DragGhost";

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function LibraryView() {
  const songs = useLibrary();
  const [search] = useSearch();
  const filters = useFilters();
  const wide = useMinWidth(1280);
  const queue = useUploadQueue();
  const greeting = useGreeting();
  const dragging = useDropAnywhere(queue.enqueue);
  const view: View = usePrefs().view;
  const setView = (next: View) => setPrefs({ view: next });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState<Set<string>>(new Set());
  const toast = useToast();
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [earOpen, setEarOpen] = useState(false);
  const [trayForced, setTrayForced] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const replaceTarget = useRef<string | null>(null);
  const seen = useRef(new Set<string>());
  const tray = useRef<TrashTrayHandle>(null);
  const ghost = useRef<HTMLDivElement>(null);

  /* Bring a row into view and flash it, for "Show it" and "Pick for me". */
  const showRow = useCallback((id: string) => {
    setHighlightId(null);
    requestAnimationFrame(() => {
      document.getElementById(`song-${id}`)?.scrollIntoView({ block: "center", behavior: reducedMotion() ? "auto" : "smooth" });
      setHighlightId(id);
      window.setTimeout(() => setHighlightId((cur) => (cur === id ? null : cur)), 1600);
    });
  }, []);

  /* Rows that landed in this session say "Added" for a few seconds. */
  useEffect(() => {
    for (const it of queue.items) {
      if (it.stage === "done" && it.song && !seen.current.has(it.song.id)) {
        const id = it.song.id;
        seen.current.add(id);
        setRecentlyAdded((prev) => new Set(prev).add(id));
        window.setTimeout(() => {
          setRecentlyAdded((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }, 5000);
      }
    }
  }, [queue.items]);

  const addStarter = async (name: string) => {
    player.stop();
    setAdding((prev) => new Set(prev).add(name));
    try {
      queue.enqueue([await fetchSampleFile(name)]);
    } finally {
      setAdding((prev) => {
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
    }
  };

  const addAllStarters = async () => {
    player.stop();
    setAdding(new Set(STARTERS));
    try {
      queue.enqueue(await Promise.all(STARTERS.map(fetchSampleFile)));
    } finally {
      setAdding(new Set());
    }
  };

  /* Every removal looks the same: the bin rises, the song's notes pour in
     from wherever the song is, the bin gulps, the row fades. Dragging just
     lets you carry it there yourself. */
  const remove = useCallback(async (id: string, viaDrag = false) => {
    const song = removeSong.peek(id);
    if (!song) return;
    if (player.snapshot().song?.id === id) player.stop();
    if (!reducedMotion()) {
      if (!viaDrag) {
        setTrayForced(true);
        await new Promise((r) => setTimeout(r, 340));
        const node = document.querySelector(`#song-${id} svg[data-roll]`);
        await tray.current?.swallow(null, song.roll, node ? { rect: node.getBoundingClientRect(), node } : undefined);
        setTrayForced(false);
      }
      setRemovingId(id);
      await new Promise((r) => setTimeout(r, 190));
      setRemovingId(null);
    }
    const removed = removeSong(id);
    if (!removed) return;
    setSelectedId((cur) => (cur === id ? null : cur));
    pushToast(`Removed “${removed.song.title}” and its ${removed.song.noteCount} notes`, { label: "Undo", onClick: () => restoreSong(removed.song, removed.index) });
  }, []);

  const rowDrag = useRowDrag({
    targetRect: () => tray.current?.rect() ?? null,
    onDrop: async (song: Song) => {
      await tray.current?.swallow(ghost.current, song.roll);
      await remove(song.id, true);
    },
  });

  const closeToast = useCallback(() => clearToast(), []);

  /* Escape closes the panel; arrow keys walk the list while it is open. */
  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "Escape") setSelectedId(null);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedId((cur) => {
          const ids = filteredRef.current;
          const i = ids.indexOf(cur ?? "");
          const next = e.key === "ArrowDown" ? Math.min(ids.length - 1, i + 1) : Math.max(0, i - 1);
          return ids[next] ?? cur;
        });
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedId]);

  const pick = () => {
    const p = pickForMe(songs);
    if (!p) return;
    setSelectedId(p.song.id);
    showRow(p.song.id);
    markPlayed(p.song.id);
    player.play(playableFromSong(p.song));
    pushToast(`Tonight: “${p.song.title}”, ${p.reason}.`);
  };

  const parsed = useMemo(() => parseQuery(search), [search]);
  const filtered = useMemo(() => {
    let list = songs.filter((s) => matchesQuery(s, parsed));
    if (filters.scope === "favorites") list = list.filter((s) => s.favorite);
    if (filters.scope === "recent") list = list.filter((s) => s.lastPlayedAt);
    if (filters.levels.length) list = list.filter((s) => filters.levels.includes(s.difficulty.score));
    if (filters.keys.length) list = list.filter((s) => filters.keys.includes(s.key.label));
    if (filters.hands.length) list = list.filter((s) => filters.hands.includes(s.hands));
    if (filters.folderId) list = list.filter((s) => s.folderId === filters.folderId);
    if (filters.ear) {
      const ear = filters.ear;
      return list.filter((s) => (ear[s.id] ?? 0) >= 0.35).sort((a, b) => (ear[b.id] ?? 0) - (ear[a.id] ?? 0));
    }
    const dir = filters.dir === "asc" ? 1 : -1;
    const t = (iso?: string | null) => (iso ? new Date(iso).getTime() : 0);
    list = [...list].sort((a, b) => {
      switch (filters.sort) {
        case "title":
          return a.title.localeCompare(b.title) * dir;
        case "level":
          return (a.difficulty.score - b.difficulty.score || a.durationSec - b.durationSec) * dir;
        case "length":
          return (a.durationSec - b.durationSec) * dir;
        case "tempo":
          return (a.bpm - b.bpm) * dir;
        case "played":
          return (t(a.lastPlayedAt) - t(b.lastPlayedAt)) * dir;
        default:
          return (t(a.addedAt) - t(b.addedAt)) * dir;
      }
    });
    return list;
  }, [songs, parsed, filters]);

  const filteredRef = useRef<string[]>([]);
  filteredRef.current = filtered.map((s) => s.id);
  const selected = selectedId ? songs.find((s) => s.id === selectedId) ?? null : null;

  const pending = queue.pending;
  /* A near-empty library gives the adding flow the whole stage; a full one
     keeps it inline so browsing continues. */
  const bigStage = queue.items.length > 0 && songs.length - queue.items.filter((it) => it.stage === "done").length < 6;
  const rows: Row[] = [...(bigStage ? [] : pending.map((item) => ({ kind: "pending" as const, item }))), ...filtered.map((song) => ({ kind: "song" as const, song }))];

  const total = songs.reduce((s, x) => s + x.durationSec, 0);
  const subtitle =
    songs.length === 0
      ? `${greeting.weekday ? `${greeting.weekday} ${greeting.partOfDay}` : "Empty"} · nothing to practice yet`
      : `${songs.length} ${songs.length === 1 ? "song" : "songs"} · ${formatDuration(total)} of music`;
  const progress = queue.busy
    ? { done: queue.settled, total: queue.total, current: queue.current?.found?.title ?? queue.current?.title ?? null, failed: queue.failedCount }
    : null;

  const empty = songs.length === 0 && queue.items.length === 0;
  const browse = () => inputRef.current?.click();
  const newFolder = () => (document.querySelector('[aria-label="New folder"]') as HTMLButtonElement | null)?.click();
  const noMatch = !empty && filtered.length === 0 && pending.length === 0;

  return (
    /* The last row must clear the player: 160px is enough for the desktop bar,
       a phone's taller one is measured into --np-h. */
    <div className="px-4 sm:px-6 md:px-8" style={{ paddingBottom: "max(160px, calc(var(--np-h, 0px) + 24px))" }}>
      <DropOverlay visible={dragging} />
      <TopBar subtitle={subtitle} total={songs.length} view={view} onView={setView} onAdd={browse} progress={progress} />

      <input
        ref={inputRef}
        type="file"
        accept=".mid,.midi,audio/midi,audio/x-midi"
        multiple
        className="sr-only"
        aria-label="Choose MIDI files"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) queue.enqueue(files);
          e.target.value = "";
        }}
      />
      <input
        ref={replaceRef}
        type="file"
        accept=".mid,.midi,audio/midi,audio/x-midi"
        className="sr-only"
        aria-label="Choose another file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && replaceTarget.current) queue.replace(replaceTarget.current, file);
          e.target.value = "";
        }}
      />

      {songs.length > 0 ? (
        <div className="mt-4" style={{ paddingRight: selected && wide ? 376 : undefined }}>
          <SearchChips parsed={parsed} />
          <FilterBar songs={songs} shown={filtered.length} onPick={pick} earOpen={earOpen} onEar={() => setEarOpen((v) => !v)} dense={!!selected && wide} />
        </div>
      ) : null}

      {earOpen && songs.length > 0 ? (
        <div className="mt-4" style={{ paddingRight: selected && wide ? 376 : undefined }}>
          <EarFinder songs={songs} onClose={() => setEarOpen(false)} onShow={showRow} />
        </div>
      ) : null}

      {bigStage ? (
        <AddingStage
          items={queue.items}
          onRetry={queue.retry}
          onDismiss={queue.dismiss}
          onReplace={(id) => {
            replaceTarget.current = id;
            replaceRef.current?.click();
          }}
          onShow={showRow}
        />
      ) : null}

      <div className={`mt-4 flex items-start gap-4 ${bigStage ? "hidden" : ""}`} style={{ paddingRight: selected && wide ? 376 : undefined }}>
        <div className="min-w-0 flex-1">
        {noMatch ? (
          <div className="rounded-card border border-dashed border-line-strong px-4 py-10 text-center">
            <p className="text-[14px] font-medium text-ink">Nothing matches.</p>
            <p className="mt-1 text-[13px] text-ink-soft">
              {filters.ear ? "No melody in the library matches that yet. Hum a few more notes." : parsed.chips.length ? "Try loosening one of the search chips, or clear a filter." : "Try a title, a composer, a key like “in G”, or a level like “easy”."}
            </p>
            {!filters.ear ? (
              <div className="mt-3 flex justify-center gap-2">
                {search ? (
                  <Button size="sm" variant="secondary" onClick={() => setSearch("")}>
                    Clear search
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" onClick={resetFilters}>
                  Clear filters
                </Button>
              </div>
            ) : null}
          </div>
        ) : view === "list" || empty ? (
          <SongTable
            rows={rows}
            selectedId={selectedId}
            recentlyAdded={recentlyAdded}
            removingId={removingId}
            highlightId={highlightId}
            dropRow={empty ? <DropRow onBrowse={browse} /> : undefined}
            onSelect={setSelectedId}
            onRemove={remove}
            onRetry={queue.retry}
            onDismiss={queue.dismiss}
            onReplace={(id) => {
              replaceTarget.current = id;
              replaceRef.current?.click();
            }}
            onShow={showRow}
            onNewFolder={newFolder}
            dragBind={rowDrag.bind}
            wasDrag={rowDrag.wasDrag}
            dense={!!selected && wide}
          />
        ) : (
          <SongGrid
            rows={rows}
            selectedId={selectedId}
            removingId={removingId}
            onSelect={setSelectedId}
            onRemove={remove}
            onRetry={queue.retry}
            onDismiss={queue.dismiss}
            onReplace={(id) => {
              replaceTarget.current = id;
              replaceRef.current?.click();
            }}
            onShow={showRow}
            dragBind={rowDrag.bind}
            wasDrag={rowDrag.wasDrag}
          />
        )}
        </div>
      </div>
      {selected && wide ? (
        <Portal>
          {/* Pinned to the content panel's right edge, outside the scroller,
              so it never fights the sticky title bar or the scroll flow. */}
          <div className="fixed right-5 z-30 w-[360px] transition-[bottom] duration-200" style={{ top: 76, bottom: "max(20px, calc(var(--np-h, 0px) + 12px))" }}>
            <SongDetail song={selected} onClose={() => setSelectedId(null)} onRemove={remove} onNewFolder={newFolder} />
          </div>
        </Portal>
      ) : null}
      {selected && !wide ? (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label={`Details for ${selected.title}`}>
          <button type="button" aria-label="Close details" onClick={() => setSelectedId(null)} className="absolute inset-0 bg-ink/30" />
          {/* Stops above the player, which floats over this dialog. */}
          <div className="absolute right-2 top-2 w-[380px] max-w-[calc(100vw-16px)] transition-[bottom] duration-200" style={{ bottom: "max(8px, calc(var(--np-h, 0px) + 8px))" }}>
            <SongDetail song={selected} onClose={() => setSelectedId(null)} onRemove={remove} onNewFolder={newFolder} />
          </div>
        </div>
      ) : null}

      {empty && !bigStage ? <StarterSongs onAdd={addStarter} onAddAll={addAllStarters} adding={adding} /> : null}

      <TrashTray ref={tray} visible={rowDrag.drag !== null || trayForced} hot={(rowDrag.drag?.over ?? false) || trayForced} pouring={trayForced} />
      {rowDrag.drag ? <DragGhost ref={ghost} drag={rowDrag.drag} /> : null}
      <NowPlayingBar />
      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
