"use client";

import { useMemo } from "react";
import { Popover, PickerRow } from "@/components/ui/Popover";
import { Button } from "@/components/ui/Button";
import { IconChevronDown, IconClose } from "@/components/ui/Icons";
import { useFolders } from "@/lib/library/store";
import { activeFilterCount, resetFilters, setFilters, useFilters, useMinWidth, type Scope, type SortKey } from "@/lib/ui-store";
import type { Song } from "@/lib/library/types";
import { Level } from "./Level";

const LEVEL_LABELS = ["Beginner", "Easy", "Intermediate", "Advanced", "Expert"];
const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: "added", label: "Recently added" },
  { key: "played", label: "Last played" },
  { key: "title", label: "Title" },
  { key: "level", label: "Level" },
  { key: "length", label: "Length" },
  { key: "tempo", label: "Tempo" },
];

function Trigger({
  refEl,
  open,
  toggle,
  id,
  label,
  active,
}: {
  refEl: React.RefObject<HTMLButtonElement | null>;
  open: boolean;
  toggle: () => void;
  id: string;
  label: string;
  active: number;
}) {
  return (
    <button
      ref={refEl}
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={id}
      onClick={toggle}
      className={`btn-fill ring-focus inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[9px] border px-2.5 text-[13px] transition-colors duration-150 [--fill:#E6F1EE] ${
        active ? "border-teal/40 bg-teal-soft text-teal-deep" : open ? "border-line-strong bg-ink/[0.04] text-ink" : "border-line bg-card text-ink-soft hover:border-teal/50 hover:text-teal-deep"
      }`}
    >
      {label}
      {active ? <span className="tnum rounded-[5px] bg-teal px-1 text-[10.5px] font-medium text-white">{active}</span> : null}
      <IconChevronDown size={12} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
    </button>
  );
}

const MicIcon = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
    <rect x="5.5" y="2" width="5" height="8" rx="2.5" />
    <path d="M3.5 8a4.5 4.5 0 0 0 9 0M8 12.5V14M6 14h4" />
  </svg>
);

/* Facets that answer "how do I find it again": scope, level, key, hands,
   folder, and a sort. Counts on every option are computed from the real
   library so an empty result is never a surprise. With the detail panel
   open there is no width for one line, so it becomes two deliberate rows.
   A phone gets three: scope, the pickers on one line that scrolls sideways,
   then the count with the two actions. */
export function FilterBar({
  songs,
  shown,
  onPick,
  earOpen,
  onEar,
  dense = false,
}: {
  songs: Song[];
  shown: number;
  onPick: () => void;
  earOpen: boolean;
  onEar: () => void;
  dense?: boolean;
}) {
  const f = useFilters();
  const folders = useFolders();
  const active = activeFilterCount(f);
  const phone = !useMinWidth(640);

  const counts = useMemo(() => {
    const level = new Map<number, number>();
    const key = new Map<string, number>();
    const hands = new Map<string, number>();
    const folder = new Map<string, number>();
    for (const s of songs) {
      level.set(s.difficulty.score, (level.get(s.difficulty.score) ?? 0) + 1);
      key.set(s.key.label, (key.get(s.key.label) ?? 0) + 1);
      hands.set(s.hands, (hands.get(s.hands) ?? 0) + 1);
      if (s.folderId) folder.set(s.folderId, (folder.get(s.folderId) ?? 0) + 1);
    }
    return { level, key: [...key.entries()].sort((a, b) => b[1] - a[1]), hands, folder };
  }, [songs]);

  const toggleIn = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const recentCount = songs.filter((s) => s.lastPlayedAt).length;
  const favCount = songs.filter((s) => s.favorite).length;

  const scope = (value: Scope, label: string, count?: number) => (
    <button
      type="button"
      role="radio"
      aria-checked={f.scope === value}
      onClick={() => setFilters({ scope: value })}
      className={`ring-focus inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-[7px] px-2.5 text-[13px] transition-colors duration-150 ${
        f.scope === value ? "bg-card text-ink shadow-card" : "text-ink-soft hover:text-ink"
      }`}
    >
      {label}
      {count !== undefined ? <span className="tnum text-[11px] text-ink-dim">{count}</span> : null}
    </button>
  );

  const scopeGroup = (
    <div role="radiogroup" aria-label="Scope" className="flex items-center gap-0.5 rounded-[9px] border border-line bg-paper-deep p-0.5">
      {scope("all", "All", songs.length)}
      {scope("favorites", "Favorites", favCount)}
      {scope("recent", "Recently played", recentCount)}
    </div>
  );

  const countLabel = (
    <span className="tnum ml-1 text-[12.5px] text-ink-dim">
      {shown === songs.length ? `${songs.length} ${songs.length === 1 ? "song" : "songs"}` : `${shown} of ${songs.length}`}
    </span>
  );

  const facets = (
    <>
      <Popover label="Level" trigger={({ ref, open, toggle, id }) => <Trigger refEl={ref} open={open} toggle={toggle} id={id} label="Level" active={f.levels.length} />}>
        {() => (
          <div>
            {[1, 2, 3, 4, 5].map((n) => (
              <PickerRow key={n} checked={f.levels.includes(n)} onChange={() => setFilters({ levels: toggleIn(f.levels, n) })} count={counts.level.get(n) ?? 0}>
                <Level score={n as 1 | 2 | 3 | 4 | 5} label={LEVEL_LABELS[n - 1]} />
              </PickerRow>
            ))}
          </div>
        )}
      </Popover>

      <Popover label="Key" width={260} trigger={({ ref, open, toggle, id }) => <Trigger refEl={ref} open={open} toggle={toggle} id={id} label="Key" active={f.keys.length} />}>
        {() => (
          <div className="scroll-quiet max-h-[280px] overflow-y-auto">
            {counts.key.length === 0 ? <p className="px-2 py-2 text-[12.5px] text-ink-dim">No keys yet.</p> : null}
            {counts.key.map(([label, n]) => (
              <PickerRow key={label} checked={f.keys.includes(label)} onChange={() => setFilters({ keys: toggleIn(f.keys, label) })} count={n}>
                <span className="inline-flex items-center gap-1.5">
                  <span className={`size-1.5 rounded-full ${label.endsWith("minor") ? "bg-hand-l" : "bg-teal"}`} aria-hidden />
                  {label}
                </span>
              </PickerRow>
            ))}
          </div>
        )}
      </Popover>

      <Popover label="Hands" width={200} trigger={({ ref, open, toggle, id }) => <Trigger refEl={ref} open={open} toggle={toggle} id={id} label="Hands" active={f.hands.length} />}>
        {() => (
          <div>
            {(["right", "left", "both"] as const).map((h) => (
              <PickerRow key={h} checked={f.hands.includes(h)} onChange={() => setFilters({ hands: toggleIn(f.hands, h) })} count={counts.hands.get(h) ?? 0}>
                {h === "both" ? "Both hands" : `${h[0].toUpperCase()}${h.slice(1)} hand only`}
              </PickerRow>
            ))}
          </div>
        )}
      </Popover>

      {folders.length > 0 ? (
        <Popover
          label="Folder"
          trigger={({ ref, open, toggle, id }) => (
            <Trigger refEl={ref} open={open} toggle={toggle} id={id} label={f.folderId ? (folders.find((x) => x.id === f.folderId)?.name ?? "Folder") : "Folder"} active={f.folderId ? 1 : 0} />
          )}
        >
          {(close) => (
            <div>
              {folders.map((fo) => (
                <PickerRow
                  key={fo.id}
                  checked={f.folderId === fo.id}
                  onChange={() => {
                    setFilters({ folderId: f.folderId === fo.id ? null : fo.id });
                    close();
                  }}
                  count={counts.folder.get(fo.id) ?? 0}
                >
                  {fo.name}
                </PickerRow>
              ))}
            </div>
          )}
        </Popover>
      ) : null}

      {active > 0 ? (
        <button type="button" onClick={resetFilters} className="ring-focus inline-flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-[9px] px-2 text-[12.5px] text-ink-dim hover:text-ink">
          <IconClose size={12} /> Clear
        </button>
      ) : null}
    </>
  );

  const sort = (
    <Popover
      label="Sort"
      align={dense || phone ? "left" : "right"}
      width={220}
      trigger={({ ref, open, toggle, id }) => <Trigger refEl={ref} open={open} toggle={toggle} id={id} label={`Sort: ${SORTS.find((s) => s.key === f.sort)?.label ?? "Added"}`} active={0} />}
    >
      {(close) => (
        <div>
          {SORTS.map((s) => (
            <PickerRow
              key={s.key}
              checked={f.sort === s.key}
              onChange={() => {
                setFilters({ sort: s.key, dir: f.sort === s.key ? (f.dir === "asc" ? "desc" : "asc") : s.key === "title" ? "asc" : "desc" });
                close();
              }}
            >
              {s.label}
              {f.sort === s.key ? <span className="ml-1 text-ink-dim">{f.dir === "asc" ? "↑" : "↓"}</span> : null}
            </PickerRow>
          ))}
        </div>
      )}
    </Popover>
  );

  const earButton = (
    <Button size="sm" variant={earOpen ? "primary" : "secondary"} onClick={onEar} aria-pressed={earOpen} title="Hum or tap a melody to find the song" icon={MicIcon}>
      Find by ear
    </Button>
  );

  const pickButton = (
    <Button size="sm" variant="sun" onClick={onPick} title="Choose something to practice from what you have played least">
      Pick for me
    </Button>
  );

  if (phone) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex">{scopeGroup}</div>
        {/* Bleeds to the screen edges so the cut-off picker says "there is more". */}
        <div data-allow-overflow className="no-scrollbar -mx-4 -my-1 flex items-center gap-2 overflow-x-auto px-4 py-1">
          {facets}
          {sort}
        </div>
        <div className="flex items-center gap-2">
          {countLabel}
          <div className="ml-auto flex items-center gap-2">
            {earButton}
            {pickButton}
          </div>
        </div>
      </div>
    );
  }

  if (dense) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          {scopeGroup}
          {countLabel}
          <div className="ml-auto">{pickButton}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {facets}
          {sort}
          {earButton}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {scopeGroup}
      {facets}
      {countLabel}
      <div className="ml-auto flex items-center gap-2">
        {sort}
        {earButton}
        {pickButton}
      </div>
    </div>
  );
}
