"use client";

import { useState } from "react";
import { addSong, addSongs, clearLibrary, findByFingerprint, removeGenerated, useLibrary } from "@/lib/library/store";
import { generateSongs } from "@/lib/library/seed";
import { songFromFile } from "@/lib/library/fromFile";
import { STARTERS, fetchSampleFile } from "@/components/library/StarterSongs";
import { pushToast, resetFilters, setSearch } from "@/lib/ui-store";
import type { Song } from "@/lib/library/types";

/* "What does it feel like with 0 items, with 3, with 300?" is a question
   this build is asked, so the answer is one click away instead of hidden in
   a menu. It is demo tooling and says so. Every jump can be undone. */

type Size = "empty" | "few" | "many";

const OPTIONS: Array<{ id: Size; label: string; hint: string }> = [
  { id: "empty", label: "Empty", hint: "The first-run library, with starter songs to add" },
  { id: "few", label: "3 songs", hint: "Just the three sample files" },
  { id: "many", label: "300", hint: "Three hundred generated songs, to try search, filters and sort" },
];

export function SizeSwitch() {
  const songs = useLibrary();
  const [busy, setBusy] = useState<Size | null>(null);
  const current: Size = songs.length === 0 ? "empty" : songs.some((s) => s.generated) ? "many" : "few";

  const restore = (snapshot: Song[]) => () => {
    clearLibrary();
    addSongs(snapshot);
  };

  const go = async (size: Size) => {
    if (size === current || busy) return;
    const snapshot = songs;
    setBusy(size);
    setSearch("");
    resetFilters();
    try {
      if (size === "empty") {
        clearLibrary();
        pushToast("This is the empty library", { label: "Undo", onClick: restore(snapshot) });
      } else if (size === "few") {
        removeGenerated();
        for (const name of STARTERS) {
          const file = await fetchSampleFile(name);
          const song = await songFromFile(file);
          if (!findByFingerprint(song.fingerprint)) addSong(song, file);
        }
        pushToast("This is a small library: the three samples", { label: "Undo", onClick: restore(snapshot) });
      } else {
        addSongs(await generateSongs(300, null));
        pushToast("Added 300 generated songs, built from the three samples", { label: "Undo", onClick: restore(snapshot) });
      }
    } catch {
      pushToast("Could not reach the sample files. Check the connection and try again.", { label: "Retry", onClick: () => void go(size) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mb-3 rounded-[12px] border border-dashed border-line-strong px-2 pb-2 pt-1.5">
      <p className="flex items-center justify-between px-0.5 pb-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-dim">
        See it at size
        <span className="rounded-[5px] bg-sun-soft px-1 text-[9.5px] text-sun-ink">Demo</span>
      </p>
      <div role="radiogroup" aria-label="Library size" className="flex items-center rounded-[9px] border border-line bg-paper-deep/80 p-0.5">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={current === o.id}
            title={o.hint}
            disabled={busy !== null}
            onClick={() => void go(o.id)}
            className={`ring-focus tnum h-7 min-w-0 flex-1 rounded-[7px] px-1.5 text-[12px] font-medium transition-colors disabled:cursor-wait ${
              current === o.id ? "bg-card text-ink shadow-card" : "text-ink-dim hover:text-ink"
            } ${busy === o.id ? "animate-pulse" : ""}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
