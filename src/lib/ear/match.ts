import type { Song } from "@/lib/library/types";

/* Melody matching. A song's melody line is the highest note sounding at
   each moment. The query is whatever was hummed or tapped. Both become
   interval sequences, so the key you hum in does not matter, and they are
   aligned locally (Smith-Waterman), so you can hum any part of the song,
   miss a note, or hold one too long. */

export function melodyOf(song: Song): number[] {
  const notes = [...song.notes].sort((a, b) => a[1] - b[1]);
  const line: number[] = [];
  let i = 0;
  while (i < notes.length) {
    const t = notes[i][1];
    let top = notes[i][0];
    let j = i;
    while (j < notes.length && notes[j][1] - t <= 45) {
      if (notes[j][0] > top) top = notes[j][0];
      j++;
    }
    line.push(top);
    i = j;
  }
  return line;
}

export function intervals(seq: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < seq.length; i++) out.push(seq[i] - seq[i - 1]);
  return out;
}

function sim(a: number, b: number) {
  const d = Math.abs(a - b);
  if (d === 0) return 3;
  if (d === 1) return 1.5;
  if (d === 2) return 0;
  return -2;
}

/** 0..1 confidence that the query melody appears somewhere in the song. */
export function matchScore(query: number[], melody: number[]): number {
  const q = intervals(query);
  const m = intervals(melody);
  if (q.length < 2 || m.length < 2) return 0;
  /* Skipping a repeated note is cheap: a hum holds a note where the score
     restates it, and a tap may add one. Skipping a real move is not. */
  const gapFor = (interval: number) => (interval === 0 ? -0.4 : -1.5);
  const rows = q.length + 1;
  const cols = m.length + 1;
  let best = 0;
  let prev = new Float32Array(cols);
  let cur = new Float32Array(cols);
  for (let i = 1; i < rows; i++) {
    cur[0] = 0;
    for (let j = 1; j < cols; j++) {
      const diag = prev[j - 1] + sim(q[i - 1], m[j - 1]);
      const up = prev[j] + gapFor(q[i - 1]);
      const left = cur[j - 1] + gapFor(m[j - 1]);
      const v = Math.max(0, diag, up, left);
      cur[j] = v;
      if (v > best) best = v;
    }
    const t = prev;
    prev = cur;
    cur = t;
  }
  return Math.max(0, Math.min(1, best / (q.length * 3)));
}

export interface EarMatch {
  id: string;
  score: number;
}

export function rankByEar(songs: Song[], query: number[]): EarMatch[] {
  if (query.length < 3) return [];
  return songs
    .map((s) => ({ id: s.id, score: matchScore(query, melodyOf(s)) }))
    .sort((a, b) => b.score - a.score);
}

const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export function noteLabel(midi: number) {
  return `${NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}
