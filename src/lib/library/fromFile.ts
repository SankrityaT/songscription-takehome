import { parseMidi } from "@/lib/midi/parse";
import { analyze, titleFromFile, type SongAnalysis } from "@/lib/midi/analyze";
import type { Song } from "./types";
import { newId } from "./store";

/** The one shape a new song takes, whether it came through the upload queue or a shortcut. */
export function buildSong(file: File, analysis: SongAnalysis, title: string, composer: string): Song {
  return {
    id: newId(),
    title,
    composer,
    fileName: file.name,
    fileSize: file.size,
    addedAt: new Date().toISOString(),
    durationSec: analysis.durationSec,
    bpm: analysis.bpm,
    tempoChanges: analysis.tempoChanges,
    timeSignature: analysis.timeSignature,
    key: analysis.key,
    noteCount: analysis.noteCount,
    pitchLow: analysis.pitchLow,
    pitchHigh: analysis.pitchHigh,
    hands: analysis.hands,
    difficulty: { score: analysis.difficulty.score, label: analysis.difficulty.label },
    roll: analysis.roll,
    notes: analysis.notes,
    fingerprint: analysis.fingerprint,
    favorite: false,
    folderId: null,
    lastPlayedAt: null,
    playCount: 0,
    lastPracticedAt: null,
  };
}

/** Read a .mid straight into a song, without the staged upload. */
export async function songFromFile(file: File): Promise<Song> {
  const parsed = parseMidi(await file.arrayBuffer());
  const { title, composer } = titleFromFile(file.name, parsed.trackNames);
  return buildSong(file, analyze(parsed), title, composer);
}
