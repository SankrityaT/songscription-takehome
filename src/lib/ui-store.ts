"use client";

import { useSyncExternalStore } from "react";

/* Small pieces of UI state that outlive a component: the rail's collapsed
   preference, the search text, and the filters. Read through
   useSyncExternalStore so the first client paint is already correct. */

const RAIL_KEY = "songscription.rail";
const listeners = new Set<() => void>();

export type Scope = "all" | "favorites" | "recent";
export type SortKey = "added" | "played" | "title" | "level" | "length" | "tempo";

export interface Filters {
  scope: Scope;
  levels: number[];
  keys: string[];
  hands: Array<"both" | "left" | "right">;
  folderId: string | null;
  sort: SortKey;
  dir: "asc" | "desc";
  /** melody-match scores by song id while Find by ear is open */
  ear: Record<string, number> | null;
}

export const DEFAULT_FILTERS: Filters = { scope: "all", levels: [], keys: [], hands: [], folderId: null, sort: "added", dir: "desc", ear: null };

let search = "";
let filters: Filters = DEFAULT_FILTERS;

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

/* Library-wide preferences. Per-song things (name, folder, favorite) live
   on the song; these are the defaults a learner sets once. */
const PREFS_KEY = "songscription.prefs.v1";
export interface Prefs {
  /** how the library opens */
  view: "list" | "grid";
  /** the speed a song starts at; the player can still change it per session */
  rate: number;
}
const DEFAULT_PREFS: Prefs = { view: "list", rate: 1 };
let prefsRaw: string | null = null;
let prefsValue: Prefs = DEFAULT_PREFS;

function readPrefs(): Prefs {
  const raw = window.localStorage.getItem(PREFS_KEY);
  if (raw !== prefsRaw) {
    prefsRaw = raw;
    try {
      prefsValue = raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) } : DEFAULT_PREFS;
    } catch {
      prefsValue = DEFAULT_PREFS;
    }
  }
  return prefsValue;
}

export function getPrefs(): Prefs {
  return typeof window === "undefined" ? DEFAULT_PREFS : readPrefs();
}

export function setPrefs(next: Partial<Prefs>) {
  window.localStorage.setItem(PREFS_KEY, JSON.stringify({ ...readPrefs(), ...next }));
  emit();
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(subscribe, readPrefs, () => DEFAULT_PREFS);
}

export function useRailCollapsed(): [boolean, () => void] {
  const collapsed =
    useSyncExternalStore(
      subscribe,
      () => window.localStorage.getItem(RAIL_KEY) ?? "open",
      () => "open",
    ) === "collapsed";
  const toggle = () => {
    window.localStorage.setItem(RAIL_KEY, collapsed ? "open" : "collapsed");
    emit();
  };
  return [collapsed, toggle];
}

export function setSearch(next: string) {
  search = next;
  emit();
}

export function useSearch(): [string, (value: string) => void] {
  const value = useSyncExternalStore(subscribe, () => search, () => "");
  return [value, setSearch];
}

export function setFilters(next: Partial<Filters>) {
  filters = { ...filters, ...next };
  emit();
}

export function resetFilters() {
  filters = DEFAULT_FILTERS;
  emit();
}

export function useFilters(): Filters {
  return useSyncExternalStore(subscribe, () => filters, () => DEFAULT_FILTERS);
}

export function activeFilterCount(f: Filters) {
  return (f.scope !== "all" ? 1 : 0) + f.levels.length + f.keys.length + f.hands.length + (f.folderId ? 1 : 0);
}

/* Focus the sidebar search from anywhere. */
export function focusSearch() {
  const el = document.getElementById("library-search") as HTMLInputElement | null;
  el?.focus();
  el?.select();
}


/* A one-shot request to open the keyboard view in the player bar. */
let keysRequest = 0;
export function requestKeys() {
  keysRequest += 1;
  emit();
}
export function useKeysRequest(): number {
  return useSyncExternalStore(subscribe, () => keysRequest, () => 0);
}


/* Viewport breakpoint as external state, so only one detail surface mounts. */
export function useMinWidth(px: number): boolean {
  const q = `(min-width: ${px}px)`;
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(q);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(q).matches,
    () => true,
  );
}


/* One global toast, so any surface can report an outcome with an undo. */
export interface ToastMessage {
  id: number;
  text: string;
  action?: { label: string; onClick: () => void };
}
let toastMsg: ToastMessage | null = null;
export function pushToast(text: string, action?: ToastMessage["action"]) {
  toastMsg = { id: Date.now(), text, action };
  emit();
}
export function clearToast() {
  toastMsg = null;
  emit();
}
export function useToast(): ToastMessage | null {
  return useSyncExternalStore(subscribe, () => toastMsg, () => null);
}
