import { parseMidi } from "@/lib/midi/parse";
import { analyze, levelFrom, maxPolyphony, spriteFromCompact, type CompactNote } from "@/lib/midi/analyze";
import type { Song } from "./types";
import { newId } from "./store";

/* A library of three hundred, for seeing how the catalogue holds up at
   size. Everything here is built from the three real sample files: notes
   are transposed, tempos and lengths vary, hands may be dropped. Titles
   and composers are real piano repertoire so the rows read like a real
   library, and every generated song is flagged so it can be removed in one
   go. The flag is honest: this is scale-test data, not a user's music. */

const REPERTOIRE: Array<[string, string]> = [
  ["Clair de lune", "Debussy"], ["Gymnopédie No. 1", "Satie"], ["Nocturne in E-flat, Op. 9 No. 2", "Chopin"], ["Moonlight Sonata, 1st mvt", "Beethoven"],
  ["Prelude in C, BWV 846", "Bach"], ["River Flows in You", "Yiruma"], ["Comptine d'un autre été", "Tiersen"], ["Arabesque No. 1", "Debussy"],
  ["Waltz in A minor, B. 150", "Chopin"], ["Für Elise", "Beethoven"], ["Canon in D", "Pachelbel"], ["Rêverie", "Debussy"],
  ["Prelude in E minor, Op. 28 No. 4", "Chopin"], ["Minuet in G", "Petzold"], ["Ave Maria", "Schubert"], ["The Entertainer", "Joplin"],
  ["Maple Leaf Rag", "Joplin"], ["Nuvole Bianche", "Einaudi"], ["Una Mattina", "Einaudi"], ["Experience", "Einaudi"],
  ["Liebesträume No. 3", "Liszt"], ["Consolation No. 3", "Liszt"], ["Träumerei", "Schumann"], ["Of Foreign Lands and Peoples", "Schumann"],
  ["Sonata in C, K. 545, 1st mvt", "Mozart"], ["Rondo alla Turca", "Mozart"], ["Fantaisie-Impromptu", "Chopin"], ["Raindrop Prelude", "Chopin"],
  ["Pathétique, 2nd mvt", "Beethoven"], ["Ode to Joy", "Beethoven"], ["Solfeggietto", "C.P.E. Bach"], ["Invention No. 1", "Bach"],
  ["Invention No. 8", "Bach"], ["Prelude in C minor, BWV 847", "Bach"], ["Jesu, Joy of Man's Desiring", "Bach"], ["Air on the G String", "Bach"],
  ["Gnossienne No. 1", "Satie"], ["Je te veux", "Satie"], ["Golliwog's Cakewalk", "Debussy"], ["The Girl with the Flaxen Hair", "Debussy"],
  ["To a Wild Rose", "MacDowell"], ["Elegie", "Rachmaninoff"], ["Prelude in C-sharp minor", "Rachmaninoff"], ["Vocalise", "Rachmaninoff"],
  ["Pavane pour une infante défunte", "Ravel"], ["Merry-Go-Round of Life", "Hisaishi"], ["Summer", "Hisaishi"], ["One Summer's Day", "Hisaishi"],
  ["Kiss the Rain", "Yiruma"], ["May Be", "Yiruma"], ["Interstellar Main Theme", "Zimmer"], ["Time", "Zimmer"],
  ["Cornfield Chase", "Zimmer"], ["A Thousand Years", "Perri"], ["All of Me", "Legend"], ["Someone Like You", "Adele"],
  ["Let It Be", "The Beatles"], ["Imagine", "Lennon"], ["Yesterday", "The Beatles"], ["Hallelujah", "Cohen"],
  ["Bohemian Rhapsody", "Queen"], ["Your Song", "John"], ["Piano Man", "Joel"], ["Clocks", "Coldplay"],
  ["The Scientist", "Coldplay"], ["Married Life", "Giacchino"], ["He's a Pirate", "Zimmer"], ["Hedwig's Theme", "Williams"],
  ["Concerning Hobbits", "Shore"], ["Game of Thrones Theme", "Djawadi"], ["Light of the Seven", "Djawadi"], ["Sadness and Sorrow", "Masuda"],
  ["Sweden", "C418"], ["Wet Hands", "C418"], ["Dearly Beloved", "Shimomura"], ["To Zanarkand", "Uematsu"],
  ["Aerith's Theme", "Uematsu"], ["Song of Storms", "Kondo"], ["Zelda's Lullaby", "Kondo"], ["Gerudo Valley", "Kondo"],
  ["Waltz of the Flowers", "Tchaikovsky"], ["Swan Lake Theme", "Tchaikovsky"], ["Dance of the Sugar Plum Fairy", "Tchaikovsky"], ["October", "Tchaikovsky"],
  ["Morning Mood", "Grieg"], ["In the Hall of the Mountain King", "Grieg"], ["Arietta", "Grieg"], ["Solveig's Song", "Grieg"],
  ["Spring Waltz", "Chopin"], ["Minute Waltz", "Chopin"], ["Ballade No. 1", "Chopin"], ["Étude Op. 10 No. 3", "Chopin"],
  ["Prelude in D-flat", "Chopin"], ["Mazurka in A minor", "Chopin"], ["Berceuse", "Chopin"], ["Barcarolle", "Chopin"],
  ["Hungarian Rhapsody No. 2", "Liszt"], ["La Campanella", "Liszt"], ["Un sospiro", "Liszt"], ["Nuages gris", "Liszt"],
];

const VARIANTS = ["", " (simplified)", " (right hand)", " (left hand)", " (slow practice)", " (in G)", " (in F)", " (excerpt)"];

function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PITCH_CLASS: Record<string, number> = { C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11, Cb: 11 };
const TONICS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
/* Sections of a longer piece: the phrase comes back up a fourth, a fifth, home. */
const SECTION_SHIFT = [0, 5, 7, 0, -5, 0];

export async function generateSongs(count: number, folderId: string | null): Promise<Song[]> {
  const names = ["beethoven-fur-elise.mid", "twinkle-twinkle.mid", "c-major-scale.mid"];
  const bases = await Promise.all(
    names.map(async (n) => {
      const res = await fetch(`/samples/${n}`);
      if (!res.ok) throw new Error(`Could not read the sample ${n}`);
      return analyze(parseMidi(await res.arrayBuffer()));
    }),
  );
  const rnd = mulberry(20260916);
  /* Fingerprints are unique in the database (that is how a duplicate upload
     is caught), so a second batch of generated songs needs its own. */
  const batch = newId().slice(0, 8);
  const out: Song[] = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const base = bases[i % bases.length];
    const [title, composer] = REPERTOIRE[i % REPERTOIRE.length];
    /* Interleaved so all eight variants show up in the first hundred, while
       a title's second and third appearances still get a different one. */
    const variant = VARIANTS[(i + Math.floor(i / REPERTOIRE.length) * 3) % VARIANTS.length];
    const shift = Math.round((rnd() - 0.5) * 14);
    /* A variant that says it is easier has to be easier: slower, so thinner. */
    const eased = variant.includes("simplified") || variant.includes("slow");
    const stretch = eased ? 1.25 + rnd() * 0.45 : 0.75 + rnd() * 0.7;
    const keepHand = variant.includes("right") ? 1 : variant.includes("left") ? 0 : null;
    const cut = variant.includes("excerpt") ? 0.5 : 1;
    /* Short phrases repeat into a piece, so lengths run from a few bars to
       a couple of minutes instead of every song lasting eight seconds. */
    const sections = base.noteCount > 60 ? 1 + Math.floor(rnd() * 2) : 2 + Math.floor(rnd() * 7);
    const sectionMs = Math.round(base.durationSec * 1000 * stretch);
    const clamp = (m: number) => Math.max(21, Math.min(108, m));
    /* Two of the three samples are a single line. About half the time they
       get a plain left hand (root and fifth under every other note) so the
       hands and level filters have something to separate. */
    const oneLine = new Set(base.notes.map((n) => n[3])).size === 1;
    const accompany = oneLine && (keepHand === 0 || (keepHand === null && rnd() < 0.55));
    const full: CompactNote[] = accompany
      ? base.notes.flatMap((n, j): CompactNote[] => (j % 2 === 0 ? [n, [n[0] - (j % 4 === 0 ? 12 : 17), n[1], n[2] * 2, 0]] : [n]))
      : base.notes;
    const phrase = keepHand !== null && full.some((n) => n[3] === keepHand) ? full.filter((n) => n[3] === keepHand) : full;
    let notes: CompactNote[] = [];
    for (let k = 0; k < sections; k++) {
      const up = SECTION_SHIFT[k % SECTION_SHIFT.length];
      for (const [m, s, d, h] of phrase) notes.push([clamp(m + shift + up), k * sectionMs + Math.round(s * stretch), Math.round(d * stretch), h]);
    }
    const fullDur = (sections * sectionMs) / 1000;
    if (cut < 1) notes = notes.filter(([, s]) => s < fullDur * cut * 1000);
    const durationSec = notes.reduce((mx, [, s, d]) => Math.max(mx, (s + d) / 1000), 0);
    const bpm = Math.round(base.bpm / stretch);
    const low = Math.min(...notes.map((n) => n[0]));
    const high = Math.max(...notes.map((n) => n[0]));
    const handSet = new Set(notes.map((n) => n[3]));
    const hands = handSet.size === 2 ? "both" : handSet.has(0) ? "left" : "right";
    const poly = maxPolyphony(notes.map(([, s, d]) => [s, s + d]));
    const { score, label } = levelFrom({ noteCount: notes.length, durationSec, bpm, low, high, poly, hands });
    const tonic = TONICS[((PITCH_CLASS[base.key.tonic] ?? 0) + shift + 120) % 12];
    const playedAgo = rnd() < 0.45 ? Math.floor(rnd() * 60) : null;
    out.push({
      id: newId(),
      title: `${title}${variant}`,
      composer,
      fileName: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.mid`,
      fileSize: 800 + Math.floor(rnd() * 6000),
      addedAt: new Date(now - Math.floor(rnd() * 120) * 86400000).toISOString(),
      durationSec,
      bpm,
      tempoChanges: rnd() < 0.15 ? 1 : 0,
      timeSignature: rnd() < 0.2 ? [3, 4] : [4, 4],
      key: { tonic, mode: base.key.mode, label: `${tonic} ${base.key.mode}`, declared: rnd() < 0.5 },
      noteCount: notes.length,
      pitchLow: low,
      pitchHigh: high,
      hands,
      difficulty: { score, label },
      roll: spriteFromCompact(notes, durationSec),
      notes,
      fingerprint: `gen:${batch}:${i}`,
      favorite: rnd() < 0.08,
      folderId,
      lastPlayedAt: playedAgo === null ? null : new Date(now - playedAgo * 86400000).toISOString(),
      playCount: playedAgo === null ? 0 : 1 + Math.floor(rnd() * 12),
      lastPracticedAt: null,
      generated: true,
    });
  }
  return out;
}
