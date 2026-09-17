"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { detectPitch, hzToMidi } from "@/lib/ear/pitch";

export interface EarState {
  listening: boolean;
  denied: boolean;
  level: number;
  /** the note currently being held, if any */
  live: number | null;
  /** captured melody as MIDI numbers */
  notes: number[];
}

const MIN_HOLD_MS = 110;
const REST_MS = 70;

/* Turns a microphone into a melody. Every frame gets a pitch; a pitch that
   holds steady for a little over a tenth of a second becomes a note; a gap
   or a jump ends it. Tapped notes go through the same list, so humming and
   the keyboard mix freely. */
export function useEar() {
  const [state, setState] = useState<EarState>({ listening: false, denied: false, level: 0, live: null, notes: [] });
  const ctx = useRef<AudioContext | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const raf = useRef(0);
  const buf = useRef<Float32Array | null>(null);
  const cand = useRef<{ midi: number; since: number } | null>(null);
  const lastVoiced = useRef(0);
  const committed = useRef<number | null>(null);

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    analyser.current = null;
    cand.current = null;
    committed.current = null;
    setState((s) => ({ ...s, listening: false, level: 0, live: null }));
  }, []);

  const start = useCallback(async () => {
    try {
      const ms = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      stream.current = ms;
      const ac = ctx.current ?? new AudioContext();
      ctx.current = ac;
      await ac.resume();
      const src = ac.createMediaStreamSource(ms);
      const an = ac.createAnalyser();
      an.fftSize = 2048;
      src.connect(an);
      analyser.current = an;
      buf.current = new Float32Array(an.fftSize);
      setState((s) => ({ ...s, listening: true, denied: false }));

      const tick = () => {
        const a = analyser.current;
        const b = buf.current;
        if (!a || !b) return;
        a.getFloatTimeDomainData(b as Float32Array<ArrayBuffer>);
        let rms = 0;
        for (let i = 0; i < b.length; i++) rms += b[i] * b[i];
        rms = Math.sqrt(rms / b.length);
        const hz = detectPitch(b, ac.sampleRate);
        const now = performance.now();
        let live: number | null = null;
        if (hz > 0) {
          const midi = Math.round(hzToMidi(hz));
          lastVoiced.current = now;
          const c = cand.current;
          if (c && Math.abs(c.midi - midi) <= 0) {
            if (now - c.since >= MIN_HOLD_MS && committed.current !== midi) {
              committed.current = midi;
              setState((s) => ({ ...s, notes: [...s.notes, midi] }));
            }
          } else {
            cand.current = { midi, since: now };
          }
          live = committed.current === midi ? midi : null;
        } else if (now - lastVoiced.current > REST_MS) {
          cand.current = null;
          committed.current = null;
        }
        setState((s) => (s.level === rms && s.live === live ? s : { ...s, level: Math.min(1, rms * 6), live }));
        raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    } catch {
      setState((s) => ({ ...s, listening: false, denied: true }));
    }
  }, []);

  const tap = useCallback((midi: number) => {
    setState((s) => ({ ...s, notes: [...s.notes, midi] }));
  }, []);

  const clear = useCallback(() => {
    committed.current = null;
    cand.current = null;
    setState((s) => ({ ...s, notes: [] }));
  }, []);

  const undo = useCallback(() => {
    committed.current = null;
    setState((s) => ({ ...s, notes: s.notes.slice(0, -1) }));
  }, []);

  useEffect(() => stop, [stop]);

  return { ...state, start, stop, tap, clear, undo };
}
