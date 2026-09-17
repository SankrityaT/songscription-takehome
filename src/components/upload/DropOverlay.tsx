"use client";

import { IconUpload } from "@/components/ui/Icons";
import { Portal } from "@/components/ui/Portal";

/* Whole-page target while a file is in flight, so nobody has to aim. */
export function DropOverlay({ visible }: { visible: boolean }) {
  return (
    <Portal>
      <div
        aria-hidden
        className={`pointer-events-none fixed inset-0 z-50 transition-opacity duration-150 ease-out ${visible ? "opacity-100" : "opacity-0"}`}
      >
        <div className="absolute inset-0 bg-paper/60" />
        <div className="absolute inset-3 rounded-card border-2 border-dashed border-teal/70 md:left-[calc(var(--rail-w,270px)+10px)] md:right-2.5 md:bottom-2.5 md:top-2.5 md:rounded-[22px]" />
        <div className="absolute left-1/2 top-1/2 flex md:left-[calc(50%+var(--rail-w,270px)/2)] -translate-x-1/2 -translate-y-1/2 items-center gap-3 rounded-full border border-line bg-card px-4 py-2.5 text-[14px] font-medium text-ink shadow-lift">
          <span className="grid size-7 place-items-center rounded-full bg-teal-soft text-teal">
            <IconUpload size={15} />
          </span>
          Drop to add to your library
        </div>
      </div>
    </Portal>
  );
}
