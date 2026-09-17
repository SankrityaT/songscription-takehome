import type { RollNote } from "@/lib/midi/analyze";

/** [midi, start ms, duration ms, hand] where hand 0 = left, 1 = right */
export type CompactNote = [number, number, number, 0 | 1];

export interface Folder {
  id: string;
  name: string;
  createdAt: string;
}

export interface Song {
  id: string;
  title: string;
  composer: string;
  fileName: string;
  fileSize: number;
  /** path of the original .mid in the storage bucket, when a backend is on */
  storagePath?: string;
  addedAt: string;
  durationSec: number;
  bpm: number;
  tempoChanges: number;
  timeSignature: [number, number];
  key: { tonic: string; mode: "major" | "minor"; label: string; declared: boolean };
  noteCount: number;
  pitchLow: number;
  pitchHigh: number;
  hands: "both" | "right" | "left";
  difficulty: { score: 1 | 2 | 3 | 4 | 5; label: string };
  /** normalized sprite for thumbnails */
  roll: RollNote[];
  /** real notes for the stage roll and playback, capped */
  notes: CompactNote[];
  fingerprint: string;
  favorite: boolean;
  folderId?: string | null;
  /** set by the in-app player, so "recently played" is real */
  lastPlayedAt?: string | null;
  playCount?: number;
  lastPracticedAt: string | null;
  /** built from the sample files for scale testing, removable in one go */
  generated?: boolean;
}
