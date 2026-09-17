import type { Song } from "./types";

/* "Pick for me" answers the learner who does not know what to practice
   tonight. It uses only real signals: what has never been played, what has
   waited longest, what is favourited, and the level spread. It always says
   why, so the pick is a suggestion, not an oracle. */
export function pickForMe(songs: Song[]): { song: Song; reason: string } | null {
  if (songs.length === 0) return null;
  const never = songs.filter((s) => !s.lastPlayedAt);
  const favNever = never.filter((s) => s.favorite);
  if (favNever.length) {
    const s = favNever.sort((a, b) => a.difficulty.score - b.difficulty.score)[0];
    return { song: s, reason: "a favorite you have not played yet" };
  }
  if (never.length) {
    const s = [...never].sort((a, b) => a.difficulty.score - b.difficulty.score || a.durationSec - b.durationSec)[0];
    return { song: s, reason: never.length === songs.length ? "the easiest place to start" : "you have not played it yet" };
  }
  const oldest = [...songs].sort((a, b) => new Date(a.lastPlayedAt!).getTime() - new Date(b.lastPlayedAt!).getTime())[0];
  const days = Math.round((Date.now() - new Date(oldest.lastPlayedAt!).getTime()) / 86400000);
  return { song: oldest, reason: days >= 1 ? `it has waited ${days} ${days === 1 ? "day" : "days"}` : "it has waited the longest" };
}
