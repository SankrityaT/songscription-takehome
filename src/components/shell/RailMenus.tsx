"use client";

import type { ComponentType, ReactNode, RefObject } from "react";
import { Popover } from "@/components/ui/Popover";
import { IconHelp, IconSettings } from "@/components/ui/Icons";
import { resync, useBackendState } from "@/lib/library/store";
import { pushToast, setPrefs, setSearch, usePrefs } from "@/lib/ui-store";
import { player } from "@/lib/audio/player";

/* The two menus at the foot of the rail, and the line that says where the
   library is saved. Settings holds only what is library-wide; anything about
   one song (name, folder, favorite) is set on that song. */

function RailButton({
  Icon,
  label,
  collapsed,
  open,
  toggle,
  id,
  btnRef,
}: {
  Icon: ComponentType<{ size?: number }>;
  label: string;
  collapsed: boolean;
  open: boolean;
  toggle: () => void;
  id: string;
  btnRef: RefObject<HTMLButtonElement | null>;
}) {
  return (
    <button
      ref={btnRef}
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={id}
      title={collapsed ? label : undefined}
      onClick={toggle}
      className={`ring-focus group flex h-8 items-center gap-2.5 rounded-[9px] text-left text-[13px] transition-colors duration-150 ${collapsed ? "w-8 justify-center px-0" : "w-full px-2"} ${
        open ? "bg-ink/[0.07] text-ink" : "text-ink-soft hover:bg-ink/[0.045] hover:text-ink"
      }`}
    >
      <span className={`inline-flex shrink-0 ${open ? "text-ink" : "text-ink-dim group-hover:text-ink-soft"}`}>
        <Icon size={15} />
      </span>
      {collapsed ? null : <span className="min-w-0 flex-1 truncate">{label}</span>}
    </button>
  );
}

function Heading({ children }: { children: ReactNode }) {
  return <p className="px-2 pb-1 pt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-dim first:pt-1">{children}</p>;
}

function Segmented<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: Array<{ value: T; label: string }>; onChange: (v: T) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 px-2 py-1.5">
      <span className="text-[13px] text-ink">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex items-center rounded-[9px] border border-line bg-paper-deep/80 p-0.5">
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={`ring-focus tnum h-7 rounded-[7px] px-2.5 text-[12px] font-medium transition-colors ${value === o.value ? "bg-card text-ink shadow-card" : "text-ink-dim hover:text-ink"}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SettingsMenu({ collapsed }: { collapsed: boolean }) {
  const prefs = usePrefs();
  const backend = useBackendState();
  return (
    <Popover label="Settings" side="right" width={320} trigger={({ ref, open, toggle, id }) => <RailButton Icon={IconSettings} label="Settings" collapsed={collapsed} open={open} toggle={toggle} id={id} btnRef={ref} />}>
      {() => (
        <div className="p-0.5">
          <Heading>Library</Heading>
          <Segmented
            label="Opens as"
            value={prefs.view}
            options={[
              { value: "list", label: "List" },
              { value: "grid", label: "Grid" },
            ]}
            onChange={(view) => setPrefs({ view })}
          />
          <Heading>Playback</Heading>
          <Segmented
            label="Songs start at"
            value={prefs.rate}
            options={[
              { value: 0.5, label: "0.5×" },
              { value: 0.75, label: "0.75×" },
              { value: 1, label: "1×" },
            ]}
            onChange={(rate) => {
              setPrefs({ rate });
              player.setRate(rate);
            }}
          />
          <Heading>Storage</Heading>
          <div className="flex items-center justify-between gap-3 px-2 py-1.5">
            <span className="min-w-0">
              <span className="block text-[13px] text-ink">{SAVED_TO[backend].label}</span>
              <span className="block text-[11.5px] leading-4 text-ink-dim">{SAVED_TO[backend].hint}</span>
            </span>
            {backend === "on" || backend === "error" ? (
              <button type="button" onClick={() => void syncNow()} className="ring-focus btn-fill h-7 shrink-0 rounded-[8px] border border-line-strong px-2.5 text-[12px] font-medium text-ink">
                Sync now
              </button>
            ) : null}
          </div>
          <p className="mx-2 mt-2 border-t border-line pb-1 pt-2 text-[11.5px] leading-4 text-ink-dim">Name, folder and favorite belong to a song: open one to change them. Clear library is in the library menu, top left.</p>
        </div>
      )}
    </Popover>
  );
}

const SHORTCUTS: Array<[string, string]> = [
  ["/", "Search the library"],
  ["↑ ↓", "Move through songs"],
  ["Enter", "Open the selected song"],
  ["Space", "Play or pause it"],
  ["← →", "Seek, when the timeline is focused"],
  ["Delete", "Remove the selected song (Undo follows)"],
  ["Esc", "Close a panel, a menu or the keys"],
];

const SEARCHES = ["easy in c major", "left hand under 1 min", "chopin slow", "favorites intermediate"];

export function HelpMenu({ collapsed }: { collapsed: boolean }) {
  return (
    <Popover
      label="Help and shortcuts"
      side="right"
      width={320}
      trigger={({ ref, open, toggle, id }) => <RailButton Icon={IconHelp} label="Help & shortcuts" collapsed={collapsed} open={open} toggle={toggle} id={id} btnRef={ref} />}
    >
      {(close) => (
        <div className="p-0.5">
          <Heading>Add a song</Heading>
          <p className="px-2 pb-1 text-[12.5px] leading-[18px] text-ink-soft">Drop a .mid file anywhere on the page, or use Add song. The same notes are never added twice, even under a new file name.</p>
          <Heading>Search understands music</Heading>
          <div className="flex flex-wrap gap-1.5 px-2 pb-1">
            {SEARCHES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  setSearch(q);
                  close();
                }}
                className="ring-focus btn-fill h-7 rounded-full border border-line-strong px-2.5 text-[12px] text-ink"
              >
                {q}
              </button>
            ))}
          </div>
          <Heading>Keyboard</Heading>
          <dl className="px-2 pb-1">
            {SHORTCUTS.map(([keys, what]) => (
              <div key={keys} className="flex items-center justify-between gap-3 py-1">
                <dt className="text-[12.5px] text-ink-soft">{what}</dt>
                <dd className="tnum shrink-0 rounded-[6px] border border-line bg-paper-deep/80 px-1.5 py-px font-mono text-[11px] text-ink">{keys}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </Popover>
  );
}

/* Where the library lives right now. Quiet when all is well, plain when not. */
const SAVED_TO = {
  on: { dot: "bg-teal", label: "Saved to Supabase", hint: "Songs and files are in the database." },
  syncing: { dot: "bg-sun-ink/70 animate-pulse", label: "Syncing…", hint: "Talking to the database." },
  error: { dot: "bg-sun-ink", label: "Saved on this device", hint: "A change did not reach the database. It is kept in this browser." },
  off: { dot: "bg-ink/30", label: "Saved on this device", hint: "No database configured. Songs are kept in this browser." },
} as const;

async function syncNow() {
  const ok = await resync();
  pushToast(ok ? "Library synced to the database" : "Still cannot reach the database. Your songs are safe in this browser.", ok ? undefined : { label: "Retry", onClick: () => void syncNow() });
}

export function SavedTo({ collapsed }: { collapsed: boolean }) {
  const backend = useBackendState();
  const state = SAVED_TO[backend];
  const body = (
    <>
      <span className={`size-1.5 shrink-0 rounded-full ${state.dot}`} aria-hidden />
      {collapsed ? <span className="sr-only">{state.label}</span> : <span className="min-w-0 truncate">{state.label}</span>}
    </>
  );
  const layout = `mt-2 flex items-center gap-2 text-[11.5px] leading-4 text-ink-dim ${collapsed ? "justify-center" : "px-2"}`;
  if (backend !== "error") {
    return (
      <p role="status" title={collapsed ? `${state.label}. ${state.hint}` : state.hint} className={layout}>
        {body}
      </p>
    );
  }
  /* Something did not save: the line becomes the way to fix it. */
  return (
    <button type="button" onClick={() => void syncNow()} title={`${state.hint} Click to sync.`} className={`ring-focus w-full rounded-[7px] py-0.5 hover:text-ink ${layout}`}>
      {body}
      {collapsed ? null : <span className="ml-auto font-medium text-ink-soft underline decoration-dotted underline-offset-2">Sync</span>}
    </button>
  );
}
