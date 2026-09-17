import type { Song } from "@/lib/library/types";

/* Search that understands music. "easy in a minor under 2 min left hand"
   becomes a level, a key, a length limit and a hand, and the leftover words
   match title and composer. Every recognised part is returned as a chip so
   the interpretation is visible, never a black box. */

export interface ParsedQuery {
  text: string;
  /** inclusive range of levels, e.g. "easy" is 1 to 2 */
  level: [number, number] | null;
  key: { tonic: string; mode: "major" | "minor" | null } | null;
  hands: "left" | "right" | "both" | null;
  maxSec: number | null;
  minSec: number | null;
  tempo: "slow" | "fast" | null;
  favorite: boolean;
  chips: Array<{ label: string; value: string }>;
}

/* Level words are ranges, the way people mean them: "easy" includes
   beginner pieces, "hard" includes expert ones. */
const LEVELS: Record<string, [number, number]> = {
  beginner: [1, 1],
  beginners: [1, 1],
  easy: [1, 2],
  simple: [1, 2],
  intermediate: [3, 3],
  medium: [3, 3],
  advanced: [4, 5],
  hard: [4, 5],
  difficult: [4, 5],
  expert: [5, 5],
};

const TONICS = ["c", "c#", "db", "d", "d#", "eb", "e", "f", "f#", "gb", "g", "g#", "ab", "a", "a#", "bb", "b"];

function normalizeTonic(t: string) {
  const map: Record<string, string> = { "c#": "C#", db: "Db", "d#": "D#", eb: "Eb", "f#": "F#", gb: "Gb", "g#": "G#", ab: "Ab", "a#": "A#", bb: "Bb" };
  return map[t] ?? t.toUpperCase();
}

function seconds(n: number, unit: string) {
  return /^(m|min|mins|minute|minutes)$/.test(unit) ? n * 60 : n;
}

export function parseQuery(raw: string): ParsedQuery {
  let q = ` ${raw.trim().toLowerCase().replace(/\s+/g, " ")} `;
  const out: ParsedQuery = { text: "", level: null, key: null, hands: null, maxSec: null, minSec: null, tempo: null, favorite: false, chips: [] };
  const take = (re: RegExp, fn: (m: RegExpMatchArray) => void) => {
    const m = q.match(re);
    if (m) {
      fn(m);
      q = q.replace(re, " ");
    }
  };

  take(/ (?:under|below|less than|<|shorter than) ?(\d+(?:\.\d+)?) ?(s|sec|secs|seconds|m|min|mins|minute|minutes) /, (m) => {
    out.maxSec = seconds(parseFloat(m[1]), m[2]);
    out.chips.push({ label: "Length", value: `under ${m[1]} ${m[2].startsWith("m") ? "min" : "sec"}` });
  });
  take(/ (?:over|above|more than|>|longer than) ?(\d+(?:\.\d+)?) ?(s|sec|secs|seconds|m|min|mins|minute|minutes) /, (m) => {
    out.minSec = seconds(parseFloat(m[1]), m[2]);
    out.chips.push({ label: "Length", value: `over ${m[1]} ${m[2].startsWith("m") ? "min" : "sec"}` });
  });
  take(/ (\d):(\d\d) /, (m) => {
    out.maxSec = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    out.chips.push({ label: "Length", value: `under ${m[1]}:${m[2]}` });
  });
  take(/ (left|right|both) ?(?:hand|hands)? /, (m) => {
    out.hands = m[1] as ParsedQuery["hands"];
    out.chips.push({ label: "Hands", value: m[1] === "both" ? "Both" : `${m[1][0].toUpperCase()}${m[1].slice(1)} hand` });
  });
  take(/ (?:in )?([a-g](?:#|b)?) ?(major|minor|maj|min) /, (m) => {
    const mode = m[2].startsWith("maj") ? "major" : "minor";
    out.key = { tonic: normalizeTonic(m[1]), mode };
    out.chips.push({ label: "Key", value: `${normalizeTonic(m[1])} ${mode}` });
  });
  take(/ in ([a-g](?:#|b)?) /, (m) => {
    if (TONICS.includes(m[1])) {
      out.key = { tonic: normalizeTonic(m[1]), mode: null };
      out.chips.push({ label: "Key", value: normalizeTonic(m[1]) });
    }
  });
  take(/ (minor|major) /, (m) => {
    out.key = { tonic: out.key?.tonic ?? "", mode: m[1] as "major" | "minor" };
    out.chips.push({ label: "Key", value: m[1] });
  });
  for (const word of Object.keys(LEVELS)) {
    take(new RegExp(` ${word} `), () => {
      out.level = LEVELS[word];
      out.chips.push({ label: "Level", value: word[0].toUpperCase() + word.slice(1) });
    });
  }
  take(/ (slow|slower|gentle) /, () => {
    out.tempo = "slow";
    out.chips.push({ label: "Tempo", value: "Slow, under 90 bpm" });
  });
  take(/ (fast|faster|quick|upbeat) /, () => {
    out.tempo = "fast";
    out.chips.push({ label: "Tempo", value: "Fast, over 140 bpm" });
  });
  take(/ (favorite|favourite|favorites|favourites|starred|loved) /, () => {
    out.favorite = true;
    out.chips.push({ label: "Only", value: "Favorites" });
  });

  out.text = q.trim();
  return out;
}

export function matchesQuery(s: Song, p: ParsedQuery) {
  if (p.level && (s.difficulty.score < p.level[0] || s.difficulty.score > p.level[1])) return false;
  if (p.key) {
    if (p.key.tonic && s.key.tonic.toLowerCase() !== p.key.tonic.toLowerCase()) return false;
    if (p.key.mode && s.key.mode !== p.key.mode) return false;
  }
  if (p.hands && s.hands !== p.hands) return false;
  if (p.maxSec !== null && s.durationSec > p.maxSec) return false;
  if (p.minSec !== null && s.durationSec < p.minSec) return false;
  if (p.tempo === "slow" && s.bpm >= 90) return false;
  if (p.tempo === "fast" && s.bpm <= 140) return false;
  if (p.favorite && !s.favorite) return false;
  if (p.text) {
    const hay = `${s.title} ${s.composer} ${s.fileName}`.toLowerCase();
    return p.text.split(" ").every((w) => hay.includes(w));
  }
  return true;
}
