"use client";

import { useEffect } from "react";
import { focusSearch, useSearch } from "@/lib/ui-store";
import type { ParsedQuery } from "@/lib/search/query";
import { IconClose, IconSearch } from "@/components/ui/Icons";

/* Search acts on the table, so it sits above the table with the other
   things that narrow it, not in the navigation. "/" jumps to it. */
export function SearchField({ className = "" }: { className?: string }) {
  const [search, setSearch] = useSearch();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) return;
      e.preventDefault();
      focusSearch();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <label
      className={`group flex h-9 items-center gap-2 rounded-[10px] border border-line-strong bg-card px-3 text-[13px] text-ink-dim shadow-card transition-[border-color,box-shadow] focus-within:border-teal focus-within:shadow-[0_0_0_3px_rgba(34,135,123,0.15)] ${className}`}
    >
      <IconSearch size={14} />
      <input
        id="library-search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setSearch("");
            (e.target as HTMLInputElement).blur();
          }
        }}
        placeholder="Search, or try “easy in C”"
        aria-label="Search songs"
        /* 16px on phones: iOS zooms the page when a smaller field takes focus. */
        className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-dim max-sm:text-[16px]"
      />
      {search ? (
        <button type="button" aria-label="Clear search" onClick={() => setSearch("")} className="ring-focus grid size-5 place-items-center rounded-[5px] text-ink-dim hover:text-ink">
          <IconClose size={12} />
        </button>
      ) : (
        <kbd aria-hidden className="hidden rounded-[5px] border border-line bg-paper-deep/80 px-1.5 font-mono text-[10.5px] leading-[18px] text-ink-dim group-focus-within:hidden sm:block">
          /
        </kbd>
      )}
    </label>
  );
}

/* How the search was read, shown where the results are. Never a black box. */
export function SearchChips({ parsed }: { parsed: ParsedQuery }) {
  if (parsed.chips.length === 0) return null;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-1.5" aria-live="polite">
      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-dim">Understood as</span>
      {parsed.chips.map((c, i) => (
        <span key={i} className="cell-in inline-flex items-center gap-1 rounded-full bg-teal-soft px-2 py-0.5 text-[11.5px] text-teal-deep" style={{ animationDelay: `${i * 40}ms` }}>
          <span className="font-mono uppercase tracking-wide text-teal-deep/70">{c.label}</span>
          {c.value}
        </span>
      ))}
      {parsed.text ? <span className="inline-flex items-center rounded-full bg-paper-deep px-2 py-0.5 text-[11.5px] text-ink-soft">“{parsed.text}”</span> : null}
    </div>
  );
}
