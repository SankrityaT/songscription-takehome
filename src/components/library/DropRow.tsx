"use client";

import { IconUpload } from "@/components/ui/Icons";

/* The first thing in an empty library is the drop target, shaped like the
   rows that will follow it. Clicking it opens the file picker; dropping
   anywhere on the page works too. */
export function DropRow({ onBrowse }: { onBrowse: () => void }) {
  return (
    <button
      type="button"
      onClick={onBrowse}
      className="ring-focus group flex w-full items-center gap-3 rounded-card sm:gap-4 border border-dashed border-line-strong bg-card px-4 py-4 text-left shadow-card transition-[border-color,background-color,box-shadow] duration-150 hover:border-teal hover:bg-teal-soft/40 hover:shadow-lift"
    >
      <span className="grid h-8 w-14 shrink-0 place-items-center sm:h-12 sm:w-[84px] rounded-[8px] bg-roll text-white/70 transition-colors group-hover:text-hand-r">
        <IconUpload size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-medium text-ink">
          Drop a .mid file anywhere on this page, or <span className="text-teal underline underline-offset-[3px]">browse</span>
        </span>
        <span className="block text-[12.5px] text-ink-soft">A MIDI export stands in for a transcription. We read the notes, find the key, and draw its roll, right here in the row.</span>
        {/* Below md the limits sit under the text instead of beside it. */}
        <span className="mt-1.5 block font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-dim md:hidden">.mid · .midi · up to 5 MB</span>
      </span>
      <span className="hidden shrink-0 font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-dim md:block">.mid · .midi · up to 5 MB</span>
    </button>
  );
}
