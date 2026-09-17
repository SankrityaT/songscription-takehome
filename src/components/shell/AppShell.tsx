"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Rail } from "./Rail";
import { Wordmark } from "./Wordmark";
import { useRailCollapsed } from "@/lib/ui-store";
import { bootLibrary } from "@/lib/library/boot";
import { IconClose, IconMenu } from "@/components/ui/Icons";

/* Rail on the left at md and up, collapsible to an icon rail. Below md the
   same Rail markup lives in a drawer, so there is one navigation to keep in
   sync, not two. The rail width animates as layout on purpose: it is one
   element, one infrequent action, and faking it with a transform would leave
   the content beside it the wrong size for the whole 200ms. */
export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [collapsed] = useRailCollapsed();
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    void bootLibrary();
  }, []);

  /* Overlays are portaled to the body, so the rail width they center on
     lives on the root element. Below md there is no rail. */
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => document.documentElement.style.setProperty("--rail-w", mq.matches ? (collapsed ? "82px" : "270px") : "0px");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [collapsed]);

  useEffect(() => {
    if (!open) return;
    const opener = openerRef.current;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      opener?.focus();
    };
  }, [open]);

  return (
    <div
      className="min-h-screen md:grid md:transition-[grid-template-columns] md:duration-200 md:ease-out"
      style={{ gridTemplateColumns: collapsed ? "82px 1fr" : "270px 1fr" }}
    >
      <aside className="hidden md:sticky md:top-0 md:block md:h-screen md:py-2.5 md:pl-2.5">
        <div className="glass-panel relative h-full overflow-hidden rounded-[22px]">
          {/* Scrolls when the window is shorter than the rail's content. */}
          <div className="scroll-quiet relative z-[1] h-full overflow-y-auto overflow-x-hidden">
            <Rail />
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-paper/90 px-4 backdrop-blur md:hidden">
        <Wordmark />
        <button
          ref={openerRef}
          type="button"
          aria-label="Open navigation"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="press ring-focus grid size-9 place-items-center rounded-ctl text-ink-soft hover:bg-ink/[0.05]"
        >
          <IconMenu size={18} />
        </button>
      </header>

      {open ? (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" aria-label="Close navigation" onClick={() => setOpen(false)} className="absolute inset-0 bg-ink/30" />
          <div className="glass-panel absolute inset-y-2 left-2 w-[280px] max-w-[85vw] overflow-hidden rounded-[22px]"><div className="relative z-[1] h-full">
            <button
              ref={closeRef}
              type="button"
              aria-label="Close navigation"
              onClick={() => setOpen(false)}
              className="press ring-focus absolute right-2 top-2.5 z-10 grid size-8 place-items-center rounded-[8px] text-ink-soft hover:bg-ink/[0.05]"
            >
              <IconClose size={15} />
            </button>
            <div className="scroll-quiet h-full overflow-y-auto overflow-x-hidden overscroll-contain">
              <Rail forceOpen onNavigate={() => setOpen(false)} />
            </div>
          </div></div>
        </div>
      ) : null}

      <main className="min-w-0 md:h-screen md:p-2.5">
        <div className="glass-panel-soft scroll-quiet relative min-h-[calc(100vh-20px)] overflow-clip rounded-[22px] md:h-full md:min-h-0 md:overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
