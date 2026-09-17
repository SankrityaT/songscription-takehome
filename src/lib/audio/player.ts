"use client";

import { useSyncExternalStore } from "react";
import type { CompactNote } from "@/lib/library/types";
import type { RollNote } from "@/lib/midi/analyze";

/* One player for the whole library, so pressing play on a second song stops
   the first. A triangle oscillator with a short envelope is enough to make
   out a melody; it is a preview, not a piano. Speed is a real playback rate:
   notes are rescheduled, not resampled, so pitch never changes. */

const MASTER = 0.16;
const VOLUME_KEY = "songscription.volume";

function midiToHz(midi: number) {
  return 440 * 2 ** ((midi - 69) / 12);
}

export interface Playable {
  id: string;
  title: string;
  subtitle: string;
  notes: CompactNote[];
  durationSec: number;
  bpm: number;
  beatsPerBar: number;
  roll: RollNote[];
  keyLabel: string;
}

export interface PlayerState {
  song: Playable | null;
  playing: boolean;
  rate: number;
  /** 0..1 */
  volume: number;
}

type Listener = () => void;

class Player {
  private ctx: AudioContext | null = null;
  private nodes: Array<{ osc: OscillatorNode; gain: GainNode }> = [];
  private listeners = new Set<Listener>();
  private state: PlayerState = { song: null, playing: false, rate: 1, volume: 0.8 };
  private master: GainNode | null = null;
  private startedAt = 0;
  private offset = 0;
  private timer = 0;

  /** seconds into the song, in song time, read on demand */
  get position() {
    const s = this.state;
    if (!s.song) return 0;
    if (!s.playing || !this.ctx) return this.offset;
    return Math.max(0, Math.min(s.song.durationSec, this.offset + (this.ctx.currentTime - this.startedAt) * s.rate));
  }

  snapshot = () => this.state;

  subscribe = (cb: Listener) => {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  };

  private set(next: Partial<PlayerState>) {
    this.state = { ...this.state, ...next };
    this.listeners.forEach((l) => l());
  }

  setVolume(v: number) {
    const volume = Math.max(0, Math.min(1, v));
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(MASTER * volume, this.ctx.currentTime, 0.02);
    try {
      window.localStorage.setItem(VOLUME_KEY, String(volume));
    } catch {
      /* fine */
    }
    this.set({ volume });
  }

  restoreVolume() {
    try {
      const v = window.localStorage.getItem(VOLUME_KEY);
      if (v !== null) this.state = { ...this.state, volume: Math.max(0, Math.min(1, parseFloat(v))) };
    } catch {
      /* fine */
    }
  }

  toggle(song: Playable) {
    if (this.state.song?.id === song.id && this.state.playing) this.pause();
    else if (this.state.song?.id === song.id) this.resume();
    else this.play(song);
  }

  play(song: Playable, from = 0) {
    this.silence();
    this.offset = from;
    this.set({ song, playing: true });
    this.schedule();
  }

  pause() {
    if (!this.state.playing) return;
    this.offset = this.position;
    this.silence();
    this.set({ playing: false });
  }

  resume() {
    if (!this.state.song || this.state.playing) return;
    if (this.offset >= this.state.song.durationSec - 0.05) this.offset = 0;
    this.set({ playing: true });
    this.schedule();
  }

  seek(seconds: number) {
    const song = this.state.song;
    if (!song) return;
    const was = this.state.playing;
    this.silence();
    this.offset = Math.max(0, Math.min(song.durationSec, seconds));
    if (was) this.schedule();
    else this.set({});
  }

  setRate(rate: number) {
    const was = this.state.playing;
    if (was) this.offset = this.position;
    this.silence();
    this.set({ rate });
    if (was) this.schedule();
  }

  stop() {
    this.silence();
    this.offset = 0;
    this.set({ song: null, playing: false });
  }

  private schedule() {
    const song = this.state.song;
    if (!song) return;
    const ctx = this.ctx ?? new AudioContext();
    this.ctx = ctx;
    void ctx.resume();
    const rate = this.state.rate;

    const master = ctx.createGain();
    master.gain.value = MASTER * this.state.volume;
    this.master = master;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2600;
    master.connect(filter).connect(ctx.destination);

    const t0 = ctx.currentTime + 0.05;
    this.startedAt = t0;
    for (const [midi, startMs, durMs] of song.notes) {
      const songStart = startMs / 1000;
      if (songStart + durMs / 1000 < this.offset) continue;
      const start = t0 + Math.max(0, songStart - this.offset) / rate;
      const dur = Math.max(0.05, Math.min(durMs / 1000, 2.5)) / rate;
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = midiToHz(midi);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(1, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.35, start + Math.min(0.18, dur));
      gain.gain.setTargetAtTime(0.0001, start + dur, 0.04);
      osc.connect(gain).connect(master);
      osc.start(start);
      osc.stop(start + dur + 0.3);
      this.nodes.push({ osc, gain });
    }
    const remaining = (song.durationSec - this.offset) / rate;
    this.timer = window.setTimeout(() => {
      this.silence();
      this.offset = song.durationSec;
      this.set({ playing: false });
    }, (remaining + 0.4) * 1000);
  }

  private silence() {
    window.clearTimeout(this.timer);
    const ctx = this.ctx;
    for (const { osc, gain } of this.nodes) {
      try {
        if (ctx) {
          gain.gain.cancelScheduledValues(ctx.currentTime);
          gain.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
          osc.stop(ctx.currentTime + 0.1);
        } else {
          osc.stop();
        }
      } catch {
        /* already stopped */
      }
    }
    this.nodes = [];
  }
}

export const player = new Player();

const SERVER: PlayerState = { song: null, playing: false, rate: 1, volume: 0.8 };

export function usePlayer(): PlayerState {
  return useSyncExternalStore(player.subscribe, player.snapshot, () => SERVER);
}

export function useNowPlayingId(): string | null {
  const s = usePlayer();
  return s.playing && s.song ? s.song.id : null;
}
