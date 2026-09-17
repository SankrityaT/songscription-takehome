"use client";

import { useEffect, useState } from "react";
import { RollThumb } from "@/components/roll/RollThumb";
import { IconRetry, IconWarn } from "@/components/ui/Icons";
import { formatDuration } from "@/lib/midi/analyze";
import { STAGE_LABEL, stageIndex, type UploadItem } from "@/hooks/useUploadQueue";
import { Level } from "./Level";

/* Cells for a row whose song does not exist yet. Each stage has its own
   visual, so you can see what is happening, not just that something is:
   reading = a scan line over the dark thumbnail; finding = the notes sweep
   in; listening = a small level meter breathes in the key cell; sizing up =
   the level pips fill one by one. Failures name the reason and offer the
   one action that fixes it. */

export function Skeleton({ w = 56, className = "" }: { w?: number; className?: string }) {
  return <span aria-hidden className={`inline-block h-3 animate-breathe rounded-full bg-ink/[0.08] align-middle ${className}`} style={{ width: w }} />;
}

function Cell({ ready, children, w = 56, align = "left" }: { ready: boolean; children: React.ReactNode; w?: number; align?: "left" | "right" }) {
  return ready ? (
    <span className="cell-in inline-block">{children}</span>
  ) : (
    <span className={`block ${align === "right" ? "text-right" : ""}`}>
      <Skeleton w={w} />
    </span>
  );
}

function Meter() {
  return (
    <span className="inline-flex h-3 items-end gap-[2px]" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="eq-bar block w-[3px] rounded-[1px] bg-sun-ink" style={{ height: 12, animationDelay: `${i * 110}ms` }} />
      ))}
    </span>
  );
}

export function PendingThumb({ item, width, height, radius }: { item: UploadItem; width: number; height: number; radius: number }) {
  const [swept, setSwept] = useState(false);
  const has = !!item.found;
  useEffect(() => {
    if (!has) {
      setSwept(false);
      return;
    }
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setSwept(true)));
    return () => cancelAnimationFrame(id);
  }, [has]);
  const failed = item.stage === "failed";
  const reading = item.stage === "reading" || item.stage === "queued";
  return (
    <span className="relative inline-block shrink-0 overflow-hidden" style={{ width, height, borderRadius: radius }}>
      <span aria-hidden className={`absolute inset-0 ${failed ? "bg-coral-soft" : "bg-roll"}`} />
      {failed ? (
        <span aria-hidden className="absolute inset-0 grid place-items-center text-coral">
          <IconWarn size={16} />
        </span>
      ) : null}
      {reading && !failed ? <span aria-hidden className="scan-line absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-white/25 to-transparent" /> : null}
      {item.found && !failed ? (
        <span className={`absolute inset-0 ${swept ? "sweep-in" : "sweep-out"}`}>
          <RollThumb roll={item.found.sprite} width={width} height={height} radius={radius} />
        </span>
      ) : null}
    </span>
  );
}

function LinkButton({ onClick, children, tone = "coral" }: { onClick: () => void; children: React.ReactNode; tone?: "coral" | "muted" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`ring-focus inline-flex items-center gap-1 rounded-[5px] font-medium underline-offset-2 hover:underline ${tone === "coral" ? "text-coral" : "text-ink-dim hover:text-ink"}`}
    >
      {children}
    </button>
  );
}

export function PendingStageLine({
  item,
  onRetry,
  onDismiss,
  onReplace,
  onShow,
}: {
  item: UploadItem;
  onRetry: () => void;
  onDismiss: () => void;
  onReplace?: () => void;
  onShow?: (songId: string) => void;
}) {
  const idx = stageIndex(item.stage);
  if (item.stage === "failed") {
    return (
      <span className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[12px] leading-4">
        <span className="text-coral">{item.error}</span>
        {item.failure === "duplicate" && item.duplicateOf && onShow ? (
          <LinkButton onClick={() => onShow(item.duplicateOf!.id)}>Show it</LinkButton>
        ) : null}
        {(item.failure === "type" || item.failure === "size" || item.failure === "empty") && onReplace ? <LinkButton onClick={onReplace}>Choose another file</LinkButton> : null}
        {item.failure === "corrupt" ? (
          <LinkButton onClick={onRetry}>
            <IconRetry size={12} /> Try again
          </LinkButton>
        ) : null}
        <LinkButton onClick={onDismiss} tone="muted">
          Remove
        </LinkButton>
      </span>
    );
  }
  const found = item.found?.analysis;
  const detail = item.stage === "key" && found ? ` · ${found.noteCount} notes` : item.stage === "roll" && found ? ` · ${found.key.label}, ${found.bpm} bpm` : "";
  return (
    <span className="mt-0.5 flex items-center gap-2 text-[12px] leading-4 text-sun-ink">
      <span className="inline-flex items-center gap-[3px]" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`size-1.5 rounded-full transition-colors duration-200 ${i < idx ? "bg-sun-ink" : i === idx ? "animate-breathe bg-sun-ink" : "bg-ink/[0.12]"}`} />
        ))}
      </span>
      <span key={item.stage} className="cell-in">
        {STAGE_LABEL[item.stage]}
        {detail}…
      </span>
    </span>
  );
}

export function PendingKey({ item }: { item: UploadItem }) {
  const a = item.found?.analysis;
  if (item.stage === "key") {
    return (
      <span className="inline-flex items-center gap-2 text-[12px] text-sun-ink">
        <Meter /> listening
      </span>
    );
  }
  return (
    <Cell ready={!!a && stageIndex(item.stage) >= 3} w={64}>
      {a ? (
        <span className="inline-flex items-center gap-1.5 text-ink-soft">
          <span className={`size-1.5 rounded-full ${a.key.mode === "minor" ? "bg-hand-l" : "bg-teal"}`} aria-hidden />
          {a.key.label}
        </span>
      ) : null}
    </Cell>
  );
}

export function PendingTempo({ item }: { item: UploadItem }) {
  const a = item.found?.analysis;
  return (
    <Cell ready={!!a} w={48} align="right">
      <span className="tnum text-ink-soft">{a ? `${a.bpm} bpm` : ""}</span>
    </Cell>
  );
}

export function PendingLength({ item }: { item: UploadItem }) {
  const a = item.found?.analysis;
  return (
    <Cell ready={!!a} w={32} align="right">
      <span className="tnum text-ink-soft">{a ? formatDuration(a.durationSec) : ""}</span>
    </Cell>
  );
}

export function PendingLevel({ item, compact = false }: { item: UploadItem; compact?: boolean }) {
  const a = item.found?.analysis;
  const ready = !!a && stageIndex(item.stage) >= 3;
  return ready && a ? <Level score={a.difficulty.score} label={a.difficulty.label} compact={compact} animate /> : <Skeleton w={72} />;
}

export function PendingHands({ item }: { item: UploadItem }) {
  const a = item.found?.analysis;
  const label = a ? (a.hands === "both" ? "Both" : a.hands === "left" ? "Left" : "Right") : "";
  return (
    <Cell ready={!!a && stageIndex(item.stage) >= 3} w={36}>
      <span className="text-ink-soft">{label}</span>
    </Cell>
  );
}
