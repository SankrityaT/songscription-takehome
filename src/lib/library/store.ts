"use client";

import { useSyncExternalStore } from "react";
import type { Folder, Song } from "./types";
import { db, backendEnabled, toRow } from "@/lib/db/supabase";
import { spriteFromCompact } from "@/lib/midi/analyze";

/* The library is external state. It is read through useSyncExternalStore so
   the first client paint already has the right songs instead of painting
   empty and correcting a frame later.

   Persistence: Supabase (Postgres + storage) is the source of truth when it
   is configured; localStorage is the cache that makes the first paint
   instant and keeps the app working offline or without a backend. Every
   write goes to the cache first, then to the database. */

let backendState: "off" | "syncing" | "on" | "error" = backendEnabled ? "syncing" : "off";
const stateListeners = new Set<() => void>();
export function useBackendState() {
  return useSyncExternalStore(
    (cb) => {
      stateListeners.add(cb);
      return () => {
        stateListeners.delete(cb);
      };
    },
    () => backendState,
    () => ("off" as const),
  );
}
function setBackend(next: typeof backendState) {
  backendState = next;
  stateListeners.forEach((l) => l());
}

/* Set when a write did not reach the database. While it is set this
   browser holds the truth, so the next load pushes the cache up instead of
   letting the database overwrite work that was never saved there. */
const UNSYNCED_KEY = "songscription.unsynced.v1";
const isUnsynced = () => typeof window !== "undefined" && window.localStorage.getItem(UNSYNCED_KEY) !== null;

/* Fire-and-forget mirror. Writes go out one at a time, in the order they
   were made: "clear, then put these back" must never arrive as "put these
   back, then clear". A failure flips the badge; the cache is still right. */
let writes: Promise<unknown> = Promise.resolve();
function mirror(work: () => Promise<unknown>) {
  if (!backendEnabled) return;
  writes = writes.then(work).catch((e) => {
    console.warn("[library] backend write failed", e);
    window.localStorage.setItem(UNSYNCED_KEY, new Date().toISOString());
    setBackend("error");
  });
}

/** Make the database match this browser. Used after failed writes. */
export async function resync(): Promise<boolean> {
  if (!backendEnabled) return false;
  setBackend("syncing");
  try {
    const remote = await db.loadAll();
    if (!remote) return false;
    const remoteIds = new Set(remote.songs.map((s) => s.id));
    /* Two songs with the same notes are one song. Keep the saved one. */
    const seen = new Map<string, Song>();
    for (const s of load()) {
      const kept = seen.get(s.fingerprint);
      if (!kept || (!remoteIds.has(kept.id) && remoteIds.has(s.id))) seen.set(s.fingerprint, s);
    }
    const mine = load().filter((s) => seen.get(s.fingerprint) === s);
    const myIds = new Set(mine.map((s) => s.id));
    const folderIds = new Set(loadFolders().map((f) => f.id));
    await db.deleteSongs(remote.songs.filter((s) => !myIds.has(s.id)).map((s) => s.id));
    await Promise.all(loadFolders().map((f) => db.upsertFolder(f)));
    await db.upsertSongs(mine);
    await Promise.all(remote.folders.filter((f) => !folderIds.has(f.id)).map((f) => db.deleteFolder(f.id)));
    if (mine.length !== load().length) commit(mine);
    window.localStorage.removeItem(UNSYNCED_KEY);
    setBackend("on");
    return true;
  } catch (e) {
    console.warn("[library] resync failed", e);
    setBackend("error");
    return false;
  }
}

/** Pull the database into the cache once, on first load. */
export async function hydrateFromBackend() {
  if (!backendEnabled) return;
  if (isUnsynced()) {
    await resync();
    return;
  }
  try {
    const data = await db.loadAll();
    if (!data) return;
    /* A fresh database and a full cache means this browser has songs the
       backend has never seen: send them up instead of wiping them. */
    if (data.songs.length === 0 && data.folders.length === 0 && load().length > 0) {
      await Promise.all([db.upsertSongs(load()), ...loadFolders().map((f) => db.upsertFolder(f))]);
      setBackend("on");
      return;
    }
    songs = data.songs;
    folders = data.folders;
    persistSongs(songs);
    persist(FOLDERS_KEY, folders);
    emit();
    setBackend("on");
  } catch (e) {
    console.warn("[library] backend unreachable, using local cache", e);
    setBackend("error");
  }
}

const KEY = "songscription.library.v1";
const FOLDERS_KEY = "songscription.folders.v1";
const EMPTY: Song[] = [];
const NO_FOLDERS: Folder[] = [];

let songs: Song[] | null = null;
let folders: Folder[] | null = null;
const listeners = new Set<() => void>();

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/* The thumbnail sprite is most of a song's weight and can be redrawn from
   its notes, so the cache leaves it out. Three hundred songs then sit well
   inside the 5MB a browser allows, with room to keep adding. */
function load(): Song[] {
  if (songs) return songs;
  if (typeof window === "undefined") return EMPTY;
  songs = read<Song[]>(KEY, []).map((s) => (s.roll ? s : { ...s, roll: spriteFromCompact(s.notes, s.durationSec) }));
  return songs;
}

function persistSongs(list: Song[]) {
  persist(
    KEY,
    list.map((s) => ({ ...s, roll: undefined })),
  );
}

function loadFolders(): Folder[] {
  if (folders) return folders;
  if (typeof window === "undefined") return NO_FOLDERS;
  folders = read<Folder[]>(FOLDERS_KEY, []);
  return folders;
}

function persist(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or private mode: keep in memory for this session */
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function commit(next: Song[]) {
  songs = next;
  persistSongs(next);
  emit();
}

function commitFolders(next: Folder[]) {
  folders = next;
  persist(FOLDERS_KEY, next);
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) songs = null;
    if (e.key === FOLDERS_KEY) folders = null;
    if (e.key === KEY || e.key === FOLDERS_KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useLibrary(): Song[] {
  return useSyncExternalStore(subscribe, load, () => EMPTY);
}

export function useFolders(): Folder[] {
  return useSyncExternalStore(subscribe, loadFolders, () => NO_FOLDERS);
}

export function addSong(song: Song, file?: File) {
  commit([song, ...load()]);
  mirror(async () => {
    let storagePath: string | null = null;
    if (file) storagePath = await db.uploadMidi(song.id, file);
    await db.upsertSongs([{ ...song, storagePath: storagePath ?? undefined }]);
    if (storagePath) {
      songs = load().map((s) => (s.id === song.id ? { ...s, storagePath: storagePath! } : s));
      persistSongs(songs);
    }
  });
}

/* The row goes at once, the original .mid a little later: Undo puts the row
   back, and it has to find its file still there. Outlasts the toast. */
const FILE_GRACE_MS = 8000;
const doomedFiles = new Map<string, number>();

function deleteFileLater(song: Song) {
  if (!backendEnabled || !song.storagePath) return;
  const path = song.storagePath;
  doomedFiles.set(
    song.id,
    window.setTimeout(() => {
      doomedFiles.delete(song.id);
      mirror(() => db.deleteMidi(path));
    }, FILE_GRACE_MS),
  );
}

function keepFile(id: string) {
  const t = doomedFiles.get(id);
  if (t === undefined) return;
  window.clearTimeout(t);
  doomedFiles.delete(id);
}

export function addSongs(list: Song[]) {
  list.forEach((s) => keepFile(s.id));
  commit([...list, ...load()]);
  mirror(() => db.upsertSongs(list));
}

export function removeGenerated(): number {
  const current = load();
  const gone = current.filter((s) => s.generated);
  commit(current.filter((s) => !s.generated));
  if (gone.length) mirror(() => db.deleteGenerated());
  return gone.length;
}

export function clearLibrary() {
  const current = load();
  commit([]);
  mirror(() => db.deleteAllSongs());
  current.forEach(deleteFileLater);
}

/** Removes and returns the song with its position, so an Undo can put it back exactly. */
export function removeSong(id: string): { song: Song; index: number } | null {
  const current = load();
  const index = current.findIndex((s) => s.id === id);
  if (index < 0) return null;
  const song = current[index];
  commit(current.filter((s) => s.id !== id));
  mirror(() => db.deleteSongs([id]));
  deleteFileLater(song);
  return { song, index };
}

removeSong.peek = (id: string): Song | null => load().find((s) => s.id === id) ?? null;

export function restoreSong(song: Song, index: number) {
  keepFile(song.id);
  const current = load().filter((s) => s.id !== song.id);
  const next = [...current];
  next.splice(Math.min(index, next.length), 0, song);
  commit(next);
  mirror(() => db.upsertSongs([song]));
}

function update(id: string, fn: (s: Song) => Song) {
  const next = load().map((s) => (s.id === id ? fn(s) : s));
  commit(next);
  const changed = next.find((s) => s.id === id);
  if (changed) {
    const row = toRow(changed);
    mirror(() => db.patchSong(id, { title: row.title, favorite: row.favorite, folder_id: row.folder_id, last_played_at: row.last_played_at, play_count: row.play_count }));
  }
}

export function toggleFavorite(id: string) {
  update(id, (s) => ({ ...s, favorite: !s.favorite }));
}

export function markPlayed(id: string) {
  update(id, (s) => ({ ...s, lastPlayedAt: new Date().toISOString(), playCount: (s.playCount ?? 0) + 1 }));
}

/** Forget that these songs were played. They leave Recently played and Jump
    back in and stay in the library; the play count is history and is kept.
    Returns the songs as they were, for Undo. */
export function forgetPlayed(ids: string[]): Song[] {
  const gone = new Set(ids);
  const before = load().filter((s) => gone.has(s.id) && s.lastPlayedAt);
  if (before.length === 0) return before;
  commit(load().map((s) => (gone.has(s.id) ? { ...s, lastPlayedAt: null } : s)));
  mirror(() => db.clearLastPlayed(before.map((s) => s.id)));
  return before;
}

export function restorePlayed(before: Song[]) {
  const when = new Map(before.map((s) => [s.id, s.lastPlayedAt]));
  const next = load().map((s) => (when.has(s.id) ? { ...s, lastPlayedAt: when.get(s.id) ?? null } : s));
  commit(next);
  mirror(() => db.upsertSongs(next.filter((s) => when.has(s.id))));
}

export function moveToFolder(id: string, folderId: string | null) {
  update(id, (s) => ({ ...s, folderId }));
}

export function renameSong(id: string, title: string) {
  update(id, (s) => ({ ...s, title: title.trim() || s.title }));
}

export function createFolder(name: string): Folder {
  const folder: Folder = { id: newId(), name: name.trim() || "Untitled folder", createdAt: new Date().toISOString() };
  commitFolders([...loadFolders(), folder]);
  mirror(() => db.upsertFolder(folder));
  return folder;
}

export function renameFolder(id: string, name: string) {
  const next = loadFolders().map((f) => (f.id === id ? { ...f, name: name.trim() || f.name } : f));
  commitFolders(next);
  const f = next.find((x) => x.id === id);
  if (f) mirror(() => db.upsertFolder(f));
}

export function deleteFolder(id: string) {
  commit(load().map((s) => (s.folderId === id ? { ...s, folderId: null } : s)));
  commitFolders(loadFolders().filter((f) => f.id !== id));
  mirror(() => db.deleteFolder(id));
}

export function librarySize() {
  return load().length;
}

export function findByFingerprint(fingerprint: string) {
  return load().find((s) => s.fingerprint === fingerprint) ?? null;
}

export function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
