"use client";

import { Button } from "@/components/ui/Button";
import { IconPlus } from "@/components/ui/Icons";
import { SearchField } from "./SearchField";
import { DesignNotesToggle } from "@/components/notes/DesignNotes";

export type View = "list" | "grid";

function ViewToggle({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const opt = (v: View, label: string, glyph: React.ReactNode) => (
    <button
      type="button"
      role="radio"
      aria-checked={view === v}
      aria-label={label}
      title={label}
      onClick={() => onChange(v)}
      className={`ring-focus grid h-7 w-8 place-items-center rounded-[7px] transition-colors duration-150 ${
        view === v ? "bg-card text-ink shadow-card" : "text-ink-dim hover:text-ink"
      }`}
    >
      {glyph}
    </button>
  );
  return (
    <div role="radiogroup" aria-label="View" className="flex items-center gap-0.5 rounded-[9px] border border-line bg-paper-deep p-0.5">
      {opt(
        "list",
        "List view",
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
          <path d="M3 4.5h10M3 8h10M3 11.5h10" />
        </svg>,
      )}
      {opt(
        "grid",
        "Grid view",
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1.2" />
          <rect x="9" y="2.5" width="4.5" height="4.5" rx="1.2" />
          <rect x="2.5" y="9" width="4.5" height="4.5" rx="1.2" />
          <rect x="9" y="9" width="4.5" height="4.5" rx="1.2" />
        </svg>,
      )}
    </div>
  );
}

export interface Progress {
  done: number;
  total: number;
  current: string | null;
  failed: number;
}

/* While files are being added, the title bar carries the live count, so
   the state is visible even when the rows have scrolled away. */
function ProgressPill({ p }: { p: Progress }) {
  const r = 7;
  const c = 2 * Math.PI * r;
  const frac = p.total ? p.done / p.total : 0;
  return (
    <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-sun-soft px-2.5 py-1 text-[12.5px] text-sun-ink" role="status" aria-live="polite">
      <svg width="18" height="18" viewBox="0 0 18 18" className="-rotate-90" aria-hidden>
        <circle cx="9" cy="9" r={r} fill="none" stroke="rgba(122,90,0,0.18)" strokeWidth="2.5" />
        <circle cx="9" cy="9" r={r} fill="none" stroke="#7A5A00" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={`${frac * c} ${c}`} className="transition-[stroke-dasharray] duration-500 ease-out" />
      </svg>
      {/* On a phone the pill shares one row with the buttons, so it says "1/3". */}
      <span className="tnum">
        <span className="max-sm:sr-only">Adding </span>
        {Math.min(p.done + 1, p.total)}
        <span className="max-sm:hidden"> of </span>
        <span className="sm:hidden">/</span>
        {p.total}
      </span>
      {p.current ? <span className="hidden max-w-[220px] truncate text-sun-ink/70 md:inline">· {p.current}</span> : null}
      {p.failed ? <span className="text-coral">· {p.failed} failed</span> : null}
    </span>
  );
}

export function TopBar({
  subtitle,
  total,
  view,
  onView,
  onAdd,
  progress,
}: {
  subtitle: string;
  /** songs in the library, not the filtered count: a search with no matches must keep its field */
  total: number;
  view: View;
  onView: (v: View) => void;
  onAdd: () => void;
  progress: Progress | null;
}) {
  /* Below md the app header is sticky too and covers the title row, so the
     bar sticks 8px down: the search field lands just under the header. */
  return (
    <div className="sticky top-2 z-20 -mx-4 flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line bg-paper/80 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6 md:top-0 md:-mx-8 md:rounded-t-[22px] md:px-8">
      <div className="flex min-w-0 items-center gap-2.5 sm:flex-1">
        <h1 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">Library</h1>
        {progress ? <ProgressPill p={progress} /> : <p className="hidden truncate text-[13px] text-ink-dim md:block">{subtitle}</p>}
      </div>
      {/* The actions never shrink (they clipped at 1280). From 2xl both sides flex equally, which centers the field. Below sm the field takes its own row. */}
      {total > 0 ? <SearchField className="order-last w-full sm:order-none sm:w-auto sm:max-w-[460px] sm:flex-1" /> : null}
      <div className="flex shrink-0 items-center justify-end gap-2 max-sm:ml-auto 2xl:flex-1">
        <DesignNotesToggle />
        {total > 0 ? <ViewToggle view={view} onChange={onView} /> : null}
        <Button size="sm" variant="primary" onClick={onAdd} icon={<IconPlus size={14} />}>
          Add song
        </Button>
      </div>
    </div>
  );
}
