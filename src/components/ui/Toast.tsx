"use client";

import { useEffect } from "react";
import { Portal } from "./Portal";

export interface ToastData {
  id: number;
  text: string;
  action?: { label: string; onClick: () => void };
}

/* One toast at a time, bottom center, with the action that undoes the thing
   it reports. Reversible actions get an undo window, not a confirm dialog. */
export function Toast({ toast, onClose, ttl = 6000 }: { toast: ToastData | null; onClose: () => void; ttl?: number }) {
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(onClose, ttl);
    return () => window.clearTimeout(t);
  }, [toast, onClose, ttl]);

  if (!toast) return null;
  return (
    <Portal>
      <div
        className={`pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4 transition-[bottom] duration-200 md:left-[var(--rail-w)]`}
        style={{ bottom: "max(24px, calc(var(--np-h, 0px) + 14px))" }}
        role="status"
        aria-live="polite"
      >
        {/* A 20px radius is still a pill on one line, and becomes a rounded
            rectangle when a long message wraps on a phone. */}
        <div className="animate-row-in pointer-events-auto flex max-w-full items-center gap-3 rounded-[20px] border border-white/10 bg-ink px-4 py-2 text-[13px] text-paper shadow-lift">
          <span className="min-w-0">{toast.text}</span>
          {toast.action ? (
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick();
                onClose();
              }}
              className="press ring-focus shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-[12.5px] font-medium text-sun transition-colors hover:bg-white/15"
            >
              {toast.action.label}
            </button>
          ) : null}
        </div>
      </div>
    </Portal>
  );
}
