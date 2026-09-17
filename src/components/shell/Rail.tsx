"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import { addSongs, clearLibrary, createFolder, deleteFolder, forgetPlayed, renameFolder, restorePlayed, useFolders, useLibrary } from "@/lib/library/store";
import { Popover } from "@/components/ui/Popover";
import { pushToast, setFilters, setSearch, useFilters, useRailCollapsed } from "@/lib/ui-store";
import { formatDuration } from "@/lib/midi/analyze";
import { RollThumb } from "@/components/roll/RollThumb";
import { RowMenu } from "@/components/ui/RowMenu";
import { Mark, WordmarkText } from "./Wordmark";
import { HelpMenu, SavedTo, SettingsMenu } from "./RailMenus";
import { SizeSwitch } from "./SizeSwitch";
import {
  IconChevron,
  IconChevronDown,
  IconChevronUpDown,
  IconClose,
  IconCollapse,
  IconFolder,
  IconLibrary,
  IconPlus,
} from "@/components/ui/Icons";

type NavItem = { id: string; label: string; Icon: ComponentType<{ size?: number }>; count?: number; onClick?: () => void; active?: boolean };

function Row({
  Icon,
  label,
  count,
  active,
  collapsed,
  onClick,
  trailing,
  menuRoom = false,
}: {
  Icon: ComponentType<{ size?: number }>;
  label: string;
  count?: number;
  active?: boolean;
  collapsed: boolean;
  onClick?: () => void;
  trailing?: React.ReactNode;
  /** on touch the row's menu is always showing, so the count moves over for it */
  menuRoom?: boolean;
}) {
  return (
    <a
      href="#"
      title={collapsed ? label : undefined}
      aria-current={active ? "page" : undefined}
      onClick={(e) => {
        e.preventDefault();
        onClick?.();
      }}
      className={`ring-focus group flex h-8 items-center gap-2.5 rounded-[9px] text-[13px] transition-colors duration-150 ${
        collapsed ? "w-8 justify-center px-0" : menuRoom ? "px-2 [@media(hover:none)]:pr-8" : "px-2"
      } ${active ? "bg-ink/[0.07] font-medium text-ink" : "text-ink-soft hover:bg-ink/[0.045] hover:text-ink"}`}
    >
      <span className={`inline-flex shrink-0 ${active ? "text-ink" : "text-ink-dim group-hover:text-ink-soft"}`}>
        <Icon size={15} />
      </span>
      {collapsed ? null : (
        <>
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {trailing ?? (count ? <span className="tnum rounded-[6px] border border-line bg-card px-1.5 py-px text-[11px] text-ink-dim">{count}</span> : null)}
        </>
      )}
    </a>
  );
}

function Separator() {
  return <div className="my-3 border-t border-dashed border-line-strong" />;
}

export function Rail({ onNavigate, forceOpen = false }: { onNavigate?: () => void; forceOpen?: boolean }) {
  const songs = useLibrary();
  const folders = useFolders();
  const filters = useFilters();
  const [collapsedPref, toggle] = useRailCollapsed();
  const collapsed = forceOpen ? false : collapsedPref;
  const [foldersOpen, setFoldersOpen] = useState(true);
  const [newFolder, setNewFolder] = useState<string | null>(null);
  const newFolderInput = useRef<HTMLInputElement>(null);
  const totalSec = songs.reduce((s, x) => s + x.durationSec, 0);

  useEffect(() => {
    if (newFolder !== null) newFolderInput.current?.focus();
  }, [newFolder]);

  const go = (scope: "all") => {
    setFilters({ scope, folderId: null });
    onNavigate?.();
  };

  /* One destination. Favorites and recently played are filters in the bar
     above the table, not places; listing them here too was a duplicate. */
  const items: NavItem[] = [
    { id: "library", label: "Library", Icon: IconLibrary, count: songs.length || undefined, active: !filters.folderId, onClick: () => go("all") },
  ];
  const recents = [...songs]
    .filter((s) => s.lastPlayedAt)
    .sort((a, b) => new Date(b.lastPlayedAt!).getTime() - new Date(a.lastPlayedAt!).getTime())
    .slice(0, 4);

  const commitFolder = () => {
    const name = (newFolder ?? "").trim();
    if (name) createFolder(name);
    setNewFolder(null);
  };

  return (
    <nav aria-label="Primary" className={`flex min-h-full flex-col ${collapsed ? "items-center px-3" : "px-3"} pb-3 pt-3`}>
      <div className={`flex items-center ${collapsed ? "flex-col gap-2" : "gap-2 pl-1"}`}>
        <Popover
          label="Library options"
          width={280}
          trigger={({ ref, open, toggle, id }) => (
            <button
              ref={ref}
              type="button"
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-controls={id}
              onClick={toggle}
              className={`ring-focus flex min-w-0 flex-1 items-center gap-2.5 rounded-[10px] py-1 pr-1 text-left transition-colors hover:bg-ink/[0.04] ${open ? "bg-ink/[0.05]" : ""}`}
              title="Library options"
            >
          <span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-teal text-paper shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
            <Mark size={16} />
          </span>
          {collapsed ? null : (
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 text-[13px] font-semibold leading-4 text-ink">
                <span className="truncate">Sankritya&apos;s library</span>
                <IconChevronUpDown size={12} />
              </span>
              <span className="flex items-center gap-1 text-[11.5px] leading-4 text-ink-dim">
                Piano · <WordmarkText height={9} className="text-ink-dim" />
              </span>
            </span>
          )}
            </button>
          )}
        >
          {(close) => (
            <div className="p-0.5">
              <button
                type="button"
                onClick={() => {
                  close();
                  const snapshot = songs;
                  clearLibrary();
                  pushToast(`Cleared ${snapshot.length} ${snapshot.length === 1 ? "song" : "songs"}`, { label: "Undo", onClick: () => addSongs(snapshot) });
                }}
                className="ring-focus flex h-8 w-full items-center rounded-[8px] px-2 text-left text-[13px] text-coral hover:bg-coral-soft"
              >
                Clear library
              </button>
            </div>
          )}
        </Popover>
        {forceOpen ? null : (
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="press ring-focus grid size-7 shrink-0 place-items-center rounded-[8px] text-ink-dim transition-colors hover:bg-ink/[0.05] hover:text-ink"
          >
            {collapsed ? <IconChevron size={14} /> : <IconCollapse size={14} />}
          </button>
        )}
      </div>

      <ul className={`mt-4 flex flex-col gap-0.5 ${collapsed ? "items-center" : ""}`}>
        {items.map(({ id, label, Icon, count, onClick, active }) => (
          <li key={id}>
            <Row Icon={Icon} label={label} count={count} active={active} collapsed={collapsed} onClick={onClick} />
          </li>
        ))}
      </ul>

      <Separator />

      {collapsed ? (
        <Row Icon={IconFolder} label="Folders" collapsed onClick={toggle} />
      ) : (
        <>
          <div className="flex h-7 items-center justify-between pl-2 pr-1">
            <button
              type="button"
              onClick={() => setFoldersOpen((v) => !v)}
              aria-expanded={foldersOpen}
              className="ring-focus inline-flex items-center gap-1.5 rounded-[6px] text-[12.5px] font-medium text-ink-soft hover:text-ink"
            >
              <span className={`inline-flex transition-transform duration-200 ease-out ${foldersOpen ? "" : "-rotate-90"}`}>
                <IconChevronDown size={12} />
              </span>
              Folders
            </button>
            <button
              type="button"
              aria-label="New folder"
              title="New folder"
              onClick={() => {
                setFoldersOpen(true);
                setNewFolder("");
              }}
              className="press ring-focus grid size-6 place-items-center rounded-[6px] text-ink-dim hover:bg-ink/[0.05] hover:text-ink"
            >
              <IconPlus size={13} />
            </button>
          </div>
          <div className="grid transition-[grid-template-rows] duration-200 ease-out" style={{ gridTemplateRows: foldersOpen ? "1fr" : "0fr" }}>
            <div className="min-h-0 overflow-hidden">
              {newFolder !== null ? (
                <div className="flex h-8 items-center gap-2.5 rounded-[9px] bg-ink/[0.05] px-2">
                  <span className="inline-flex shrink-0 text-teal">
                    <IconFolder size={15} />
                  </span>
                  <input
                    ref={newFolderInput}
                    value={newFolder}
                    onChange={(e) => setNewFolder(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitFolder();
                      if (e.key === "Escape") setNewFolder(null);
                    }}
                    onBlur={commitFolder}
                    placeholder="Name this folder"
                    aria-label="New folder name"
                    className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-dim max-md:text-[16px]"
                  />
                  <kbd className="shrink-0 rounded-[4px] border border-line bg-card px-1 font-mono text-[9.5px] text-ink-dim">↵</kbd>
                </div>
              ) : null}
              {folders.length === 0 && newFolder === null ? (
                <p className="px-2 pb-1 pt-0.5 text-[12px] leading-5 text-ink-dim">No folders yet. Group songs by book, exam, or mood.</p>
              ) : (
                <ul className="flex flex-col gap-0.5">
                  {folders.map((f) => {
                    const n = songs.filter((s) => s.folderId === f.id).length;
                    const active = filters.folderId === f.id;
                    return (
                      <li key={f.id} className="group/f relative">
                        <Row
                          Icon={IconFolder}
                          label={f.name}
                          count={n || undefined}
                          active={active}
                          collapsed={false}
                          menuRoom
                          onClick={() => {
                            setFilters({ folderId: active ? null : f.id, scope: "all" });
                            onNavigate?.();
                          }}
                        />
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 focus-within:opacity-100 group-hover/f:opacity-100 [@media(hover:none)]:opacity-100">
                          <RowMenu
                            label={`Folder ${f.name}`}
                            className="[&>button]:size-6 [&>button]:rounded-[6px]"
                            items={[
                              {
                                label: "Rename",
                                onSelect: () => {
                                  const name = window.prompt("Rename folder", f.name);
                                  if (name !== null) renameFolder(f.id, name);
                                },
                              },
                              { label: "Delete folder", tone: "coral", onSelect: () => deleteFolder(f.id) },
                            ]}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {recents.length > 0 ? (
            <>
              <div className="group/recents mt-2 flex h-7 items-center justify-between pl-2 pr-1 text-[12.5px] font-medium text-ink-soft">
                Jump back in
                <button
                  type="button"
                  title="Clear everything from recently played"
                  onClick={() => {
                    const before = forgetPlayed(songs.filter((s) => s.lastPlayedAt).map((s) => s.id));
                    pushToast(`Cleared recently played (${before.length})`, { label: "Undo", onClick: () => restorePlayed(before) });
                  }}
                  className="ring-focus rounded-[6px] px-1.5 py-0.5 text-[11.5px] font-normal text-ink-dim opacity-0 transition-opacity hover:text-ink focus-visible:opacity-100 group-hover/recents:opacity-100 [@media(hover:none)]:opacity-100"
                >
                  Clear
                </button>
              </div>
              <ul className="flex flex-col gap-0.5">
                {recents.map((s) => (
                  <li key={s.id} className="group/recent relative">
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setSearch(s.title);
                        onNavigate?.();
                      }}
                      className="ring-focus flex h-8 items-center gap-2.5 rounded-[9px] px-2 text-[13px] text-ink-soft transition-colors duration-150 hover:bg-ink/[0.045] hover:text-ink group-hover/recent:bg-ink/[0.045]"
                    >
                      <RollThumb roll={s.roll} width={28} height={18} radius={4} />
                      <span className="min-w-0 flex-1 truncate">{s.title}</span>
                      <span className="tnum text-[11px] text-ink-dim transition-opacity group-focus-within/recent:opacity-0 group-hover/recent:opacity-0 [@media(hover:none)]:opacity-0">{formatDuration(s.durationSec)}</span>
                    </a>
                    {/* The length gives way to the remove button, in the same spot. */}
                    <button
                      type="button"
                      aria-label={`Remove ${s.title} from Jump back in`}
                      title="Remove from Jump back in"
                      onClick={() => {
                        const before = forgetPlayed([s.id]);
                        pushToast(`“${s.title}” removed from recently played`, { label: "Undo", onClick: () => restorePlayed(before) });
                      }}
                      className="ring-focus absolute right-1 top-1 grid size-6 place-items-center rounded-[7px] text-ink-dim opacity-0 transition-opacity hover:bg-ink/[0.08] hover:text-ink focus-visible:opacity-100 group-hover/recent:opacity-100 [@media(hover:none)]:right-0 [@media(hover:none)]:top-0 [@media(hover:none)]:size-8 [@media(hover:none)]:opacity-100"
                    >
                      <IconClose size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </>
      )}

      <div className="mt-auto">
        {collapsed ? null : <SizeSwitch />}
        <ul className={`flex flex-col gap-0.5 ${collapsed ? "items-center" : ""}`}>
          <li>
            <SettingsMenu collapsed={collapsed} />
          </li>
          <li>
            <HelpMenu collapsed={collapsed} />
          </li>
        </ul>
        <SavedTo collapsed={collapsed} />
        <Separator />
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          title={collapsed ? "Sankritya" : undefined}
          className={`ring-focus flex items-center gap-2.5 rounded-[10px] transition-colors hover:bg-ink/[0.04] ${collapsed ? "justify-center p-1" : "p-1.5"}`}
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sun font-serif text-[16px] text-sun-ink">S</span>
          {collapsed ? null : (
            <>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-[13px] font-medium leading-4 text-ink">
                  Sankritya
                  <span className="rounded-[5px] bg-teal-soft px-1 font-mono text-[9.5px] uppercase tracking-wide text-teal-deep">Learner</span>
                </span>
                <span className="tnum block truncate text-[11.5px] leading-4 text-ink-dim">
                  {songs.length} {songs.length === 1 ? "song" : "songs"} · {formatDuration(totalSec)} of music
                </span>
              </span>
              <span className="text-ink-dim">
                <IconChevron size={14} />
              </span>
            </>
          )}
        </a>
      </div>
    </nav>
  );
}
