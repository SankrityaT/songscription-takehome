"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/* A small anchored panel for pickers. Portal-rendered, closes on outside
   click or Escape, returns focus to its trigger. */
export function Popover({
  trigger,
  children,
  label,
  align = "left",
  side = "bottom",
  width = 240,
  open,
  onOpenChange,
}: {
  trigger: (props: { ref: React.RefObject<HTMLButtonElement | null>; open: boolean; toggle: () => void; id: string }) => ReactNode;
  children: (close: () => void) => ReactNode;
  label: string;
  align?: "left" | "right";
  /** "right" opens beside the trigger, growing upward: for menus low in the rail */
  side?: "bottom" | "right";
  width?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internal, setInternal] = useState(false);
  const isOpen = open ?? internal;
  const setOpen = (v: boolean) => {
    setInternal(v);
    onOpenChange?.(v);
  };
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; width: number; maxHeight: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();

  useLayoutEffect(() => {
    if (!isOpen || !btn.current) return;
    const r = btn.current.getBoundingClientRect();
    /* Never off-screen: the panel is clamped to the viewport with an 8px
       margin on every side, and scrolls inside itself if it is too tall. */
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const w = Math.min(width, vw - 16);
    const clampX = (x: number) => Math.max(8, Math.min(x, vw - w - 8));
    if (side === "right") {
      /* Beside the trigger when there is room, otherwise above it. */
      const beside = r.right + 10 + w <= vw - 8;
      const bottom = beside ? Math.max(8, vh - r.bottom) : vh - r.top + 6;
      setPos({ bottom, left: beside ? r.right + 10 : clampX(r.left), width: w, maxHeight: vh - bottom - 8 });
      return;
    }
    const top = r.bottom + 6;
    setPos({ top, left: clampX(align === "left" ? r.left : r.right - w), width: w, maxHeight: Math.max(120, vh - top - 8) });
  }, [isOpen, align, side, width]);

  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !btn.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btn.current?.focus();
      }
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <>
      {trigger({ ref: btn, open: isOpen, toggle: () => setOpen(!isOpen), id })}
      {isOpen && pos
        ? createPortal(
            <div
              ref={panel}
              id={id}
              role="dialog"
              aria-label={label}
              className="scroll-quiet fixed z-[70] overflow-y-auto rounded-[12px] border border-line bg-card p-1.5 shadow-lift"
              style={{ top: pos.top, bottom: pos.bottom, left: pos.left, width: pos.width, maxHeight: pos.maxHeight, animation: "menu-in 140ms cubic-bezier(0.16,1,0.3,1) both" }}
            >
              {children(() => setOpen(false))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export function PickerRow({ checked, onChange, children, count }: { checked: boolean; onChange: () => void; children: ReactNode; count?: number }) {
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={checked}
      onClick={onChange}
      className={`ring-focus flex h-8 w-full items-center gap-2.5 rounded-[8px] px-2 text-left text-[13px] transition-colors duration-100 hover:bg-ink/[0.05] ${checked ? "text-ink" : "text-ink-soft"}`}
    >
      <span className={`grid size-4 shrink-0 place-items-center rounded-[5px] border transition-colors ${checked ? "border-teal bg-teal text-white" : "border-line-strong bg-card"}`}>
        {checked ? (
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3.5 8.5l3 3 6-7" />
          </svg>
        ) : null}
      </span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {count !== undefined ? <span className="tnum text-[11px] text-ink-dim">{count}</span> : null}
    </button>
  );
}
