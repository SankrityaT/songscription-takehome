import type { MidiNote, ParsedMidi } from "./parse";

export type Hand = "left" | "right";

export interface RollNote {
  /** 0..1 fraction of song duration */
  start: number;
  end: number;
  /** 0..1 fraction of pitch range, 0 = lowest */
  pitch: number;
  hand: Hand;
}

export interface KeyGuess {
  tonic: string;
  mode: "major" | "minor";
  label: string;
  /** true when read from the file rather than guessed from the notes */
  declared: boolean;
}

export interface Difficulty {
  score: 1 | 2 | 3 | 4 | 5;
  label: "Beginner" | "Easy" | "Intermediate" | "Advanced" | "Expert";
  notesPerSecond: number;
  maxPolyphony: number;
}

/** [midi, start ms, duration ms, hand] where hand 0 = left, 1 = right */
export type CompactNote = [number, number, number, 0 | 1];

export const NOTE_CAP = 4000;

export interface SongAnalysis {
  notes: CompactNote[];
  durationSec: number;
  bpm: number;
  tempoChanges: number;
  timeSignature: [number, number];
  key: KeyGuess;
  noteCount: number;
  pitchLow: number;
  pitchHigh: number;
  hands: "both" | "right" | "left";
  difficulty: Difficulty;
  roll: RollNote[];
  fingerprint: string;
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

export function noteName(midi: number, flats = false) {
  const names = flats ? FLAT_NAMES : NOTE_NAMES;
  return `${names[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

/* Krumhansl-Kessler key profiles. Pitch classes are weighted by how long
   they sound, then correlated against every major and minor rotation. */
const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

function correlate(a: number[], b: number[]) {
  const ma = a.reduce((s, v) => s + v, 0) / 12;
  const mb = b.reduce((s, v) => s + v, 0) / 12;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < 12; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return da && db ? num / Math.sqrt(da * db) : 0;
}

const MAJOR_BY_SF = ["Cb", "Gb", "Db", "Ab", "Eb", "Bb", "F", "C", "G", "D", "A", "E", "B", "F#", "C#"];
const MINOR_BY_SF = ["Ab", "Eb", "Bb", "F", "C", "G", "D", "A", "E", "B", "F#", "C#", "G#", "D#", "A#"];

export function detectKey(parsed: ParsedMidi): KeyGuess {
  if (parsed.keySignature) {
    const idx = parsed.keySignature.sharpsFlats + 7;
    if (idx >= 0 && idx < 15) {
      const minor = parsed.keySignature.minor;
      const tonic = (minor ? MINOR_BY_SF : MAJOR_BY_SF)[idx];
      return { tonic, mode: minor ? "minor" : "major", label: `${tonic} ${minor ? "minor" : "major"}`, declared: true };
    }
  }
  const weights = new Array(12).fill(0);
  for (const n of parsed.notes) weights[n.midi % 12] += n.duration;
  /* A nursery tune on four pitches gives the profiles almost nothing to
     correlate with, and the most repeated note wins (C-D-E-G heavy on E
     reads as E minor). On thin evidence a key first has to have its own
     tonic triad sounded; the profiles only rank what is left. */
  const sounded = weights.filter((w) => w > 0).length;
  const thin = sounded < 6 || parsed.notes.length < 24;
  const triad = (tonic: number, third: number) => [0, third, 7].filter((iv) => weights[(tonic + iv) % 12] > 0).length;
  let best = { score: -Infinity, tonic: 0, mode: "major" as "major" | "minor" };
  for (let tonic = 0; tonic < 12; tonic++) {
    const rotated = weights.map((_, i) => weights[(i + tonic) % 12]);
    const maj = correlate(rotated, MAJOR) + (thin ? triad(tonic, 4) : 0);
    const min = correlate(rotated, MINOR) + (thin ? triad(tonic, 3) : 0);
    if (maj > best.score) best = { score: maj, tonic, mode: "major" };
    if (min > best.score) best = { score: min, tonic, mode: "minor" };
  }
  const useFlats = [5, 10, 3, 8, 1].includes(best.tonic) && best.mode === "major";
  const tonic = (useFlats ? FLAT_NAMES : NOTE_NAMES)[best.tonic];
  return { tonic, mode: best.mode, label: `${tonic} ${best.mode}`, declared: false };
}

/** Most notes held at once. Spans are [start, end] in any one unit. */
export function maxPolyphony(spans: Array<[number, number]>) {
  const events: Array<[number, number]> = [];
  for (const [start, end] of spans) {
    events.push([start, 1]);
    events.push([end, -1]);
  }
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let cur = 0;
  let max = 0;
  for (const [, d] of events) {
    cur += d;
    if (cur > max) max = cur;
  }
  return max;
}

function assignHands(parsed: ParsedMidi): (n: MidiNote) => Hand {
  const byTrack = new Map<number, { sum: number; count: number }>();
  for (const n of parsed.notes) {
    const t = byTrack.get(n.track) ?? { sum: 0, count: 0 };
    t.sum += n.midi;
    t.count += 1;
    byTrack.set(n.track, t);
  }
  const tracks = [...byTrack.entries()].filter(([, v]) => v.count > 0);
  if (tracks.length >= 2) {
    tracks.sort((a, b) => a[1].sum / a[1].count - b[1].sum / b[1].count);
    const leftTrack = tracks[0][0];
    return (n) => (n.track === leftTrack ? "left" : "right");
  }
  return (n) => (n.midi < 60 ? "left" : "right");
}

export interface LevelStats {
  noteCount: number;
  durationSec: number;
  bpm: number;
  low: number;
  high: number;
  poly: number;
  hands: "both" | "left" | "right";
}

/** The one place a level is decided, for uploads and generated songs alike. */
export function levelFrom({ noteCount, durationSec, bpm, low, high, poly, hands }: LevelStats): Difficulty {
  const nps = noteCount / Math.max(1, durationSec);
  /* Density does most of the work. Range and polyphony can push a piece up
     one level between them, never two, so a busy but narrow piece stays
     honest and a slow but wide one does too. */
  let score = nps < 2.2 ? 1 : nps < 3.5 ? 2 : nps < 6 ? 3 : nps < 9 ? 4 : 5;
  const bonus = (high - low > 48 ? 1 : 0) + (poly >= 5 ? 1 : 0) + (bpm > 160 && nps > 4 ? 1 : 0);
  score += Math.min(1, bonus);
  /* Density alone overrates a tune. One hand playing one line is easy to
     read even when it moves, so it tops out at Easy (Intermediate if it
     really runs). And a few bars are not enough to call anything hard. */
  if (hands !== "both" && poly <= 2) score = Math.min(score, nps < 6 ? 2 : 3);
  if (noteCount < 24 || durationSec < 10) score = Math.min(score, 2);
  const clamped = Math.min(5, Math.max(1, score)) as Difficulty["score"];
  const labels: Difficulty["label"][] = ["Beginner", "Easy", "Intermediate", "Advanced", "Expert"];
  return { score: clamped, label: labels[clamped - 1], notesPerSecond: Math.round(nps * 10) / 10, maxPolyphony: poly };
}

/* Sprites are stored with every song; four decimals is finer than a pixel. */
const r4 = (v: number) => Math.round(v * 1e4) / 1e4;

export function analyze(parsed: ParsedMidi): SongAnalysis {
  const notes = parsed.notes;
  const low = notes.reduce((m, n) => Math.min(m, n.midi), 127);
  const high = notes.reduce((m, n) => Math.max(m, n.midi), 0);
  const handOf = assignHands(parsed);
  const hands = new Set(notes.map(handOf));

  const range = Math.max(1, high - low);
  const dur = Math.max(0.001, parsed.duration);
  const cap = 480;
  const step = Math.max(1, Math.ceil(notes.length / cap));
  const roll: RollNote[] = [];
  for (let i = 0; i < notes.length; i += step) {
    const n = notes[i];
    roll.push({
      start: r4(n.time / dur),
      end: r4(Math.min(1, (n.time + n.duration) / dur)),
      pitch: r4((n.midi - low) / range),
      hand: handOf(n),
    });
  }

  const head = notes
    .slice(0, 12)
    .map((n) => `${n.midi}@${Math.round(n.time * 100)}`)
    .join(",");

  const keep = Math.max(1, Math.ceil(notes.length / NOTE_CAP));
  const compact: CompactNote[] = [];
  for (let i = 0; i < notes.length; i += keep) {
    const n = notes[i];
    compact.push([n.midi, Math.round(n.time * 1000), Math.round(n.duration * 1000), handOf(n) === "right" ? 1 : 0]);
  }

  const handsLabel = hands.size === 2 ? "both" : hands.has("left") ? "left" : "right";
  const poly = maxPolyphony(notes.map((n) => [n.time, n.time + n.duration]));

  return {
    notes: compact,
    durationSec: parsed.duration,
    bpm: parsed.bpm,
    tempoChanges: parsed.tempoChanges,
    timeSignature: parsed.timeSignature,
    key: detectKey(parsed),
    noteCount: notes.length,
    pitchLow: low,
    pitchHigh: high,
    hands: handsLabel,
    difficulty: levelFrom({ noteCount: notes.length, durationSec: parsed.duration, bpm: parsed.bpm, low, high, poly, hands: handsLabel }),
    roll,
    fingerprint: `${notes.length}:${Math.round(parsed.duration * 10)}:${head}`,
  };
}

/** Thumbnail sprite from compact notes, for rows that exist before the song does. */
export function spriteFromCompact(notes: CompactNote[], durationSec: number): RollNote[] {
  if (notes.length === 0) return [];
  let low = 127;
  let high = 0;
  for (const [m] of notes) {
    if (m < low) low = m;
    if (m > high) high = m;
  }
  const range = Math.max(1, high - low);
  const dur = Math.max(1, durationSec * 1000);
  const step = Math.max(1, Math.ceil(notes.length / 480));
  const out: RollNote[] = [];
  for (let i = 0; i < notes.length; i += step) {
    const [m, s, d, hand] = notes[i];
    out.push({ start: r4(s / dur), end: r4(Math.min(1, (s + d) / dur)), pitch: r4((m - low) / range), hand: hand === 1 ? "right" : "left" });
  }
  return out;
}

export function formatDuration(seconds: number) {
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

const SAMPLE_TITLES: Record<string, { title: string; composer: string }> = {
  "beethoven-fur-elise.mid": { title: "Für Elise", composer: "Beethoven" },
  "c-major-scale.mid": { title: "C major scale", composer: "Warm-up" },
  "twinkle-twinkle.mid": { title: "Twinkle, Twinkle, Little Star", composer: "Traditional" },
};

export function titleFromFile(fileName: string, trackNames: string[]) {
  const known = SAMPLE_TITLES[fileName.toLowerCase()];
  if (known) return known;
  const named = trackNames.find((n) => n && !/^(track|untitled|piano)\s*\d*$/i.test(n));
  if (named) return { title: named, composer: "" };
  const base = fileName.replace(/\.(midi?|MIDI?)$/, "").replace(/[-_]+/g, " ").trim();
  const title = base.replace(/\b\w/g, (c) => c.toUpperCase());
  return { title: title || "Untitled song", composer: "" };
}
