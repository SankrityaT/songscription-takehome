/* A small Standard MIDI File reader. Written here rather than pulled in as a
   dependency because the library only needs notes, tempo, meter and key, and
   because every byte of a learner's song should be inspectable in one file.

   Reads format 0 and 1 files with a full tempo map, so note times are real
   seconds even when the tempo changes mid-piece. */

export class MidiError extends Error {}

export interface MidiNote {
  midi: number;
  /** seconds from the start of the file */
  time: number;
  /** seconds */
  duration: number;
  velocity: number;
  track: number;
  channel: number;
}

export interface ParsedMidi {
  format: number;
  ppq: number;
  trackNames: string[];
  notes: MidiNote[];
  /** first tempo in the file, beats per minute */
  bpm: number;
  tempoChanges: number;
  timeSignature: [number, number];
  keySignature: { sharpsFlats: number; minor: boolean } | null;
  /** seconds, end of the last note */
  duration: number;
}

class Reader {
  pos = 0;
  constructor(private readonly view: DataView) {}
  get eof() {
    return this.pos >= this.view.byteLength;
  }
  u8() {
    if (this.pos >= this.view.byteLength) throw new MidiError("File ended early");
    return this.view.getUint8(this.pos++);
  }
  i8() {
    const v = this.u8();
    return v > 127 ? v - 256 : v;
  }
  u16() {
    const v = this.view.getUint16(this.pos);
    this.pos += 2;
    return v;
  }
  u32() {
    const v = this.view.getUint32(this.pos);
    this.pos += 4;
    return v;
  }
  ascii(n: number) {
    let s = "";
    for (let i = 0; i < n; i++) s += String.fromCharCode(this.u8());
    return s;
  }
  text(n: number) {
    const bytes = new Uint8Array(this.view.buffer, this.view.byteOffset + this.pos, n);
    this.pos += n;
    try {
      return new TextDecoder("utf-8", { fatal: false }).decode(bytes).replace(/\0/g, "").trim();
    } catch {
      return "";
    }
  }
  vlq() {
    let value = 0;
    for (let i = 0; i < 4; i++) {
      const b = this.u8();
      value = (value << 7) | (b & 0x7f);
      if ((b & 0x80) === 0) return value;
    }
    throw new MidiError("Bad variable-length value");
  }
  skip(n: number) {
    this.pos += n;
  }
}

interface RawNote {
  midi: number;
  startTick: number;
  endTick: number;
  velocity: number;
  track: number;
  channel: number;
}

interface TempoEvent {
  tick: number;
  usPerQuarter: number;
}

export function parseMidi(buffer: ArrayBuffer): ParsedMidi {
  const r = new Reader(new DataView(buffer));
  if (buffer.byteLength < 14 || r.ascii(4) !== "MThd") {
    throw new MidiError("This is not a MIDI file");
  }
  const headerLength = r.u32();
  const format = r.u16();
  const trackCount = r.u16();
  const division = r.u16();
  r.pos = 8 + headerLength;

  const smpte = (division & 0x8000) !== 0;
  let ticksPerSecondSmpte = 0;
  let ppq = division;
  if (smpte) {
    const fps = 256 - (division >> 8);
    const ticksPerFrame = division & 0xff;
    ticksPerSecondSmpte = fps * ticksPerFrame;
    ppq = 480;
  }

  const tempos: TempoEvent[] = [];
  const rawNotes: RawNote[] = [];
  const trackNames: string[] = [];
  let timeSignature: [number, number] = [4, 4];
  let timeSigSeen = false;
  let keySignature: ParsedMidi["keySignature"] = null;

  for (let t = 0; t < trackCount && !r.eof; t++) {
    const chunk = r.ascii(4);
    const length = r.u32();
    const end = r.pos + length;
    if (chunk !== "MTrk") {
      r.pos = end;
      continue;
    }
    let tick = 0;
    let running = 0;
    const open = new Map<number, { tick: number; velocity: number }>();
    let name = "";

    const closeNote = (channel: number, midi: number, atTick: number) => {
      const key = (channel << 8) | midi;
      const start = open.get(key);
      if (!start) return;
      open.delete(key);
      if (atTick > start.tick) {
        rawNotes.push({ midi, startTick: start.tick, endTick: atTick, velocity: start.velocity, track: t, channel });
      }
    };

    while (r.pos < end) {
      tick += r.vlq();
      let status = r.u8();
      if (status < 0x80) {
        r.pos -= 1;
        status = running;
        if (status === 0) throw new MidiError("Corrupt track data");
      } else if (status < 0xf0) {
        running = status;
      }

      if (status === 0xff) {
        const type = r.u8();
        const len = r.vlq();
        const next = r.pos + len;
        if (type === 0x51 && len === 3) {
          const us = (r.u8() << 16) | (r.u8() << 8) | r.u8();
          tempos.push({ tick, usPerQuarter: us });
        } else if (type === 0x58 && len >= 2 && !timeSigSeen) {
          const nn = r.u8();
          const dd = r.u8();
          timeSignature = [nn, 2 ** dd];
          timeSigSeen = true;
        } else if (type === 0x59 && len >= 2 && !keySignature) {
          const sf = r.i8();
          const mi = r.u8();
          keySignature = { sharpsFlats: sf, minor: mi === 1 };
        } else if (type === 0x03 && !name) {
          name = r.text(len);
        }
        r.pos = next;
        if (type === 0x2f) break;
        continue;
      }
      if (status === 0xf0 || status === 0xf7) {
        r.skip(r.vlq());
        continue;
      }

      const hi = status & 0xf0;
      const channel = status & 0x0f;
      if (hi === 0x90) {
        const midi = r.u8();
        const velocity = r.u8();
        if (velocity > 0) {
          closeNote(channel, midi, tick);
          open.set((channel << 8) | midi, { tick, velocity });
        } else {
          closeNote(channel, midi, tick);
        }
      } else if (hi === 0x80) {
        const midi = r.u8();
        r.u8();
        closeNote(channel, midi, tick);
      } else if (hi === 0xc0 || hi === 0xd0) {
        r.skip(1);
      } else {
        r.skip(2);
      }
    }
    for (const [key, start] of open) {
      const midi = key & 0xff;
      const channel = key >> 8;
      if (tick > start.tick) {
        rawNotes.push({ midi, startTick: start.tick, endTick: tick, velocity: start.velocity, track: t, channel });
      }
    }
    trackNames.push(name);
    r.pos = end;
  }

  if (tempos.length === 0) tempos.push({ tick: 0, usPerQuarter: 500_000 });
  tempos.sort((a, b) => a.tick - b.tick);
  if (tempos[0].tick > 0) tempos.unshift({ tick: 0, usPerQuarter: tempos[0].usPerQuarter });

  const segments = tempos.map((tempo) => ({ ...tempo, seconds: 0 }));
  for (let i = 1; i < segments.length; i++) {
    const prev = segments[i - 1];
    segments[i].seconds = prev.seconds + ((segments[i].tick - prev.tick) * prev.usPerQuarter) / ppq / 1e6;
  }
  const toSeconds = (tick: number) => {
    if (smpte) return tick / ticksPerSecondSmpte;
    let seg = segments[0];
    for (let i = segments.length - 1; i >= 0; i--) {
      if (segments[i].tick <= tick) {
        seg = segments[i];
        break;
      }
    }
    return seg.seconds + ((tick - seg.tick) * seg.usPerQuarter) / ppq / 1e6;
  };

  const notes: MidiNote[] = rawNotes
    .map((n) => {
      const time = toSeconds(n.startTick);
      return {
        midi: n.midi,
        time,
        duration: Math.max(0.02, toSeconds(n.endTick) - time),
        velocity: n.velocity / 127,
        track: n.track,
        channel: n.channel,
      };
    })
    .sort((a, b) => a.time - b.time || a.midi - b.midi);

  const duration = notes.reduce((max, n) => Math.max(max, n.time + n.duration), 0);
  const distinctTempos = new Set(tempos.map((t) => t.usPerQuarter)).size;

  return {
    format,
    ppq,
    trackNames,
    notes,
    bpm: Math.round(60_000_000 / tempos[0].usPerQuarter),
    tempoChanges: Math.max(0, distinctTempos - 1),
    timeSignature,
    keySignature,
    duration,
  };
}

export function looksLikeMidi(bytes: Uint8Array) {
  return bytes.length >= 4 && bytes[0] === 0x4d && bytes[1] === 0x54 && bytes[2] === 0x68 && bytes[3] === 0x64;
}
