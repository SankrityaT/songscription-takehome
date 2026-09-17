import type { Song } from "@/lib/library/types";
import type { Playable } from "./player";

export function playableFromSong(s: Song): Playable {
  return {
    id: s.id,
    title: s.title,
    subtitle: s.composer || s.fileName,
    notes: s.notes,
    durationSec: s.durationSec,
    bpm: s.bpm,
    beatsPerBar: s.timeSignature[0],
    roll: s.roll,
    keyLabel: s.key.label,
  };
}
