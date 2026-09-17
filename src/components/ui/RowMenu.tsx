"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export interface MenuItem {
  label: string;
  onSelect: () => void;
  tone?: "neutral" | "coral";
  icon?: ReactNode;
  shortcut?: string;
}

function Dots() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <circle cx="3.5" cy="8" r="1.4" />
      <circle cx="8" cy="8" r="1.4" />
      <circle cx="12.5" cy="8" r="1.4" />
    </svg>
  );
}

/* A small menu anchored to its trigger. Rendered in a portal so a clipped
   table card cannot cut it off. Opens on mousedown, closes on outside click
   or Escape, arrow keys move, focus returns to the trigger. Scales in from
   0.98: magnitude proportional to the element. */
export function RowMenu({ label, items, className = "" }: { label: string; items: MenuItem[]; className?: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right?: number; left?: number; fitted?: boolean } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const id = useId();

  useLayoutEffect(() => {
    if (!open || !trigger.current) return;
    const r = trigger.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, right: Math.max(8, document.documentElement.clientWidth - r.right) });
  }, [open]);

  /* Second pass, before paint: now that the menu has a size, keep it on
     screen. Pin it to the left margin if it would cross it, and open upward
     if it would run past the bottom. */
  useLayoutEffect(() => {
    if (!open || !pos || pos.fitted || !list.current || !trigger.current) return;
    const r = trigger.current.getBoundingClientRect();
    const w = list.current.offsetWidth;
    const h = list.current.offsetHeight;
    const vw = document.documentElement.clientWidth;
    const crossesLeft = vw - (pos.right ?? 8) - w < 8;
    const crossesBottom = pos.top + h > window.innerHeight - 8;
    setPos({
      top: crossesBottom ? Math.max(8, r.top - 4 - h) : pos.top,
      ...(crossesLeft ? { left: 8 } : { right: pos.right }),
      fitted: true,
    });
  }, [open, pos]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!list.current?.contains(t) && !trigger.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        trigger.current?.focus();
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const buttons = Array.from(list.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]") ?? []);
        const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next = e.key === "ArrowDown" ? (i + 1) % buttons.length : (i - 1 + buttons.length) % buttons.length;
        buttons[next]?.focus();
      }
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    requestAnimationFrame(() => list.current?.querySelector<HTMLButtonElement>("[role=menuitem]")?.focus());
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  return (
    <div className={`relative ${className}`} data-open={open} onClick={(e) => e.stopPropagation()}>
      <button
        ref={trigger}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={`press ring-focus grid size-8 place-items-center rounded-[8px] text-ink-dim transition-colors duration-150 hover:bg-ink/[0.05] hover:text-ink ${open ? "bg-ink/[0.06] text-ink" : ""}`}
      >
        <Dots />
      </button>
      {open && pos
        ? createPortal(
            <div
              ref={list}
              id={id}
              role="menu"
              aria-label={label}
              onClick={(e) => e.stopPropagation()}
              className="fixed z-[70] min-w-[196px] max-w-[calc(100vw-16px)] origin-top-right rounded-[12px] border border-line bg-card p-1 shadow-lift"
              style={{ top: pos.top, right: pos.right, left: pos.left, animation: "menu-in 140ms cubic-bezier(0.16,1,0.3,1) both" }}
            >
              {items.map((item, i) => (
                <button
                  key={`${i}-${item.label}`}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    item.onSelect();
                  }}
                  className={`ring-focus flex h-8 w-full items-center gap-2.5 rounded-[8px] px-2.5 text-left text-[13px] transition-colors duration-100 ${
                    item.tone === "coral" ? "text-coral hover:bg-coral-soft" : "text-ink hover:bg-ink/[0.05]"
                  }`}
                >
                  {item.icon ? <span className="inline-flex shrink-0 opacity-80">{item.icon}</span> : null}
                  <span className="flex-1">{item.label}</span>
                  {item.shortcut ? <kbd className="font-mono text-[10.5px] text-ink-dim">{item.shortcut}</kbd> : null}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
