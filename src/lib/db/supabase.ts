"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Folder, Song } from "@/lib/library/types";

/* The library's backend: a local Supabase (Postgres + storage) reached
   through the public anon key. Rows map one-to-one onto the Song type, so
   the catalogue can be filtered, sorted and searched in SQL as it grows,
   and the original .mid lives in the `midi` bucket. When the env vars are
   absent (or the stack is down) the app keeps working on localStorage. */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient | null {
  if (!URL || !KEY) return null;
  if (!client) client = createClient(URL, KEY, { auth: { persistSession: false } });
  return client;
}

export const backendEnabled = Boolean(URL && KEY);

/* Row shapes, snake_case in the database. */
interface SongRow {
  id: string;
  title: string;
  composer: string;
  file_name: string;
  file_size: number;
  storage_path: string | null;
  added_at: string;
  duration_sec: number;
  bpm: number;
  tempo_changes: number;
  time_sig_num: number;
  time_sig_den: number;
  key_tonic: string;
  key_mode: "major" | "minor";
  key_declared: boolean;
  note_count: number;
  pitch_low: number;
  pitch_high: number;
  hands: "both" | "left" | "right";
  level_score: 1 | 2 | 3 | 4 | 5;
  level_label: string;
  fingerprint: string;
  roll: Song["roll"];
  notes: Song["notes"];
  favorite: boolean;
  folder_id: string | null;
  last_played_at: string | null;
  play_count: number;
  last_practiced_at: string | null;
  generated: boolean;
}

export function toRow(s: Song): SongRow {
  return {
    id: s.id,
    title: s.title,
    composer: s.composer,
    file_name: s.fileName,
    file_size: s.fileSize,
    storage_path: s.storagePath ?? null,
    added_at: s.addedAt,
    duration_sec: s.durationSec,
    bpm: s.bpm,
    tempo_changes: s.tempoChanges,
    time_sig_num: s.timeSignature[0],
    time_sig_den: s.timeSignature[1],
    key_tonic: s.key.tonic,
    key_mode: s.key.mode,
    key_declared: s.key.declared,
    note_count: s.noteCount,
    pitch_low: s.pitchLow,
    pitch_high: s.pitchHigh,
    hands: s.hands,
    level_score: s.difficulty.score,
    level_label: s.difficulty.label,
    fingerprint: s.fingerprint,
    roll: s.roll,
    notes: s.notes,
    favorite: s.favorite,
    folder_id: s.folderId ?? null,
    last_played_at: s.lastPlayedAt ?? null,
    play_count: s.playCount ?? 0,
    last_practiced_at: s.lastPracticedAt,
    generated: s.generated ?? false,
  };
}

export function fromRow(r: SongRow): Song {
  return {
    id: r.id,
    title: r.title,
    composer: r.composer,
    fileName: r.file_name,
    fileSize: r.file_size,
    storagePath: r.storage_path ?? undefined,
    addedAt: r.added_at,
    durationSec: r.duration_sec,
    bpm: r.bpm,
    tempoChanges: r.tempo_changes,
    timeSignature: [r.time_sig_num, r.time_sig_den],
    key: { tonic: r.key_tonic, mode: r.key_mode, label: `${r.key_tonic} ${r.key_mode}`, declared: r.key_declared },
    noteCount: r.note_count,
    pitchLow: r.pitch_low,
    pitchHigh: r.pitch_high,
    hands: r.hands,
    difficulty: { score: r.level_score, label: r.level_label },
    roll: r.roll,
    notes: r.notes,
    fingerprint: r.fingerprint,
    favorite: r.favorite,
    folderId: r.folder_id,
    lastPlayedAt: r.last_played_at,
    playCount: r.play_count,
    lastPracticedAt: r.last_practiced_at,
    generated: r.generated,
  };
}

/* Queries used by the catalogue. Everything the UI needs is one round trip. */
export const db = {
  async loadAll(): Promise<{ songs: Song[]; folders: Folder[] } | null> {
    const c = supabase();
    if (!c) return null;
    const [s, f] = await Promise.all([
      c.from("songs").select("*").order("added_at", { ascending: false }),
      c.from("folders").select("id,name,created_at").order("created_at"),
    ]);
    if (s.error || f.error) throw s.error ?? f.error;
    return {
      songs: (s.data as SongRow[]).map(fromRow),
      folders: (f.data as Array<{ id: string; name: string; created_at: string }>).map((r) => ({ id: r.id, name: r.name, createdAt: r.created_at })),
    };
  },

  async upsertSongs(list: Song[]) {
    const c = supabase();
    if (!c || list.length === 0) return;
    /* Chunked so a 300-song seed stays under the request size limit. */
    for (let i = 0; i < list.length; i += 100) {
      const { error } = await c.from("songs").upsert(list.slice(i, i + 100).map(toRow), { onConflict: "id" });
      if (error) throw error;
    }
  },

  async deleteSongs(ids: string[]) {
    const c = supabase();
    if (!c || ids.length === 0) return;
    /* The ids travel in the URL, and a few hundred of them is more than the
       gateway accepts, so they go in batches. */
    for (let i = 0; i < ids.length; i += 40) {
      const { error } = await c.from("songs").delete().in("id", ids.slice(i, i + 40));
      if (error) throw error;
    }
  },

  /** Every generated song at once, by its flag: one small request however many there are. */
  async deleteGenerated() {
    const c = supabase();
    if (!c) return;
    const { error } = await c.from("songs").delete().eq("generated", true);
    if (error) throw error;
  },

  async deleteAllSongs() {
    const c = supabase();
    if (!c) return;
    const { error } = await c.from("songs").delete().not("id", "is", null);
    if (error) throw error;
  },

  async patchSong(id: string, patch: Partial<SongRow>) {
    const c = supabase();
    if (!c) return;
    const { error } = await c.from("songs").update(patch).eq("id", id);
    if (error) throw error;
  },

  async clearLastPlayed(ids: string[]) {
    const c = supabase();
    if (!c) return;
    for (let i = 0; i < ids.length; i += 40) {
      const { error } = await c.from("songs").update({ last_played_at: null }).in("id", ids.slice(i, i + 40));
      if (error) throw error;
    }
  },

  async upsertFolder(f: Folder) {
    const c = supabase();
    if (!c) return;
    const { error } = await c.from("folders").upsert({ id: f.id, name: f.name, created_at: f.createdAt });
    if (error) throw error;
  },

  async deleteFolder(id: string) {
    const c = supabase();
    if (!c) return;
    const { error } = await c.from("folders").delete().eq("id", id);
    if (error) throw error;
  },

  /** Keeps the original file so a future practice surface can re-read it. */
  async uploadMidi(id: string, file: File): Promise<string | null> {
    const c = supabase();
    if (!c) return null;
    const path = `${id}/${file.name.replace(/[^a-zA-Z0-9._-]+/g, "_")}`;
    const { error } = await c.storage.from("midi").upload(path, file, { contentType: "audio/midi", upsert: true });
    if (error) throw error;
    return path;
  },

  async deleteMidi(path: string | null | undefined) {
    const c = supabase();
    if (!c || !path) return;
    await c.storage.from("midi").remove([path]);
  },
};
