"use client";

import { useEffect, useRef, useState } from "react";
import { player, usePlayer } from "@/lib/audio/player";
import { getPrefs, useKeysRequest } from "@/lib/ui-store";
import { useLibrary } from "@/lib/library/store";
import { RollThumb } from "@/components/roll/RollThumb";
import { Playhead } from "@/components/roll/Playhead";
import { IconChevronDown, IconClose, IconKeys, IconPause, IconPlay, IconRetry } from "@/components/ui/Icons";
import { formatDuration } from "@/lib/midi/analyze";
import { FallingRoll } from "./FallingRoll";
import { Portal } from "@/components/ui/Portal";

const RATES = [0.5, 0.75, 1];

function VolumeIcon({ level }: { level: number }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2.5 6.2v3.6h2.4L8.5 13V3L4.9 6.2z" fill="currentColor" stroke="none" />
      {level > 0.05 ? <path d="M10.6 6a2.8 2.8 0 0 1 0 4" /> : null}
      {level > 0.5 ? <path d="M12.4 4.2a5.4 5.4 0 0 1 0 7.6" /> : null}
    </svg>
  );
}

/* The player: a floating glass pill under the library. Left is what is
   playing, with the facts a learner cares about; the middle is the transport
   and the timeline; the right is speed, volume and the keys. When the keys
   are up, the bar joins the sheet into one carved shape. Progress and time
   are written straight to the DOM from the player's clock. On a phone it is
   two rows: the song with close beside it, then the transport. */
export function NowPlayingBar() {
  const { song, playing, rate, volume } = usePlayer();
  const [open, setOpen] = useState(false);
  const keysRequest = useKeysRequest();
  const fill = useRef<HTMLDivElement>(null);
  const time = useRef<HTMLSpanElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    player.restoreVolume();
    player.setRate(getPrefs().rate);
  }, []);

  useEffect(() => {
    if (keysRequest > 0) setOpen(true);
  }, [keysRequest]);

  useEffect(() => {
    if (!song) return;
    let raf = 0;
    const tick = () => {
      const p = player.position;
      const pct = Math.min(100, (p / Math.max(0.001, song.durationSec)) * 100);
      if (fill.current) fill.current.style.width = `${pct}%`;
      if (time.current) time.current.textContent = formatDuration(p);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [song]);

  useEffect(() => {
    if (!song) setOpen(false);
  }, [song]);

  /* Toasts and the detail panel clear the bar by its measured height, so a
     taller bar never ends up underneath them. */
  const [barEl, setBarEl] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    const root = document.documentElement;
    const el = barEl;
    if (!el) {
      root.style.setProperty("--np-h", "0px");
      return;
    }
    const measure = () => root.style.setProperty("--np-h", `${Math.max(0, Math.round(window.innerHeight - el.getBoundingClientRect().top))}px`);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      root.style.setProperty("--np-h", "0px");
    };
  }, [barEl, open]);

  /* A song that leaves the library stops playing. Starter previews are never
     in the library, so only a song that was in it counts. */
  const library = useLibrary();
  const fromLibrary = useRef<string | null>(null);
  useEffect(() => {
    const inLibrary = !!song && library.some((s) => s.id === song.id);
    if (song && fromLibrary.current === song.id && !inLibrary) player.stop();
    fromLibrary.current = inLibrary && song ? song.id : null;
  }, [library, song]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!song) return null;

  const seekAt = (clientX: number) => {
    const r = track.current?.getBoundingClientRect();
    if (!r) return;
    player.seek(((clientX - r.left) / r.width) * song.durationSec);
  };

  return (
    <Portal>
      <div className="fixed inset-x-0 bottom-0 z-40 md:bottom-2.5 md:left-[var(--rail-w)] md:right-2.5" role="region" aria-label="Now playing">
        {/* keyboard sheet */}
        <div
          className="mx-3 overflow-hidden rounded-t-[22px] border border-b-0 border-white/10 shadow-[0_-20px_60px_rgba(20,19,15,0.25)] transition-[height] duration-300 ease-out md:mx-5"
          style={{ height: open ? "min(62vh, 560px)" : 0 }}
          aria-hidden={!open}
        >
          <div className="flex h-full flex-col bg-roll">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5 text-[12px] text-white/60">
              <span className="font-mono uppercase tracking-[0.08em]">Piano roll · notes land on the keys as they sound</span>
              <span className="hidden sm:inline">Practice mode listens to you play in the app. Here you can follow along.</span>
            </div>
            <div className="min-h-0 flex-1">{open ? <FallingRoll song={song} /> : null}</div>
          </div>
        </div>

        {/* bar */}
        <div ref={setBarEl} className={`glass-panel relative mx-3 md:mx-5 ${open ? "rounded-b-[22px] border-t-0" : "mb-3 rounded-[22px] md:mb-5"}`}>
          <div className="relative z-[1] grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-4">
            {/* what is playing */}
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-label={open ? "Hide the keys" : "Show the keys"}
                className="ring-focus press relative shrink-0 overflow-hidden rounded-[10px] shadow-card"
              >
                <RollThumb roll={song.roll} width={72} height={42} radius={10} />
                <Playhead active={playing} />
              </button>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-ink">{song.title}</p>
                <p className="truncate text-[12.5px] text-ink-dim">{song.subtitle}</p>
                <p className="tnum mt-0.5 flex items-center gap-1.5 overflow-hidden whitespace-nowrap text-[11.5px] text-ink-soft">
                  <span className="inline-flex items-center gap-1">
                    <span className={`size-1.5 rounded-full ${song.keyLabel.endsWith("minor") ? "bg-hand-l" : "bg-teal"}`} aria-hidden />
                    {song.keyLabel}
                  </span>
                  <span aria-hidden>·</span>
                  <span>{song.bpm} bpm</span>
                  <span aria-hidden>·</span>
                  <span>{formatDuration(song.durationSec)}</span>
                </p>
              </div>
            </div>

            {/* transport + timeline */}
            <div className="order-last col-span-2 flex w-full flex-col items-center gap-1.5 md:order-none md:col-span-1 md:w-[420px]">
              <div className="flex items-center gap-2">
                <button type="button" aria-label="Restart" title="Restart" onClick={() => player.seek(0)} className="press ring-focus grid size-9 place-items-center rounded-full text-ink-soft hover:bg-ink/[0.06] hover:text-ink">
                  <IconRetry size={16} />
                </button>
                <button
                  type="button"
                  aria-label={playing ? "Pause" : "Play"}
                  title={playing ? "Pause (Space)" : "Play (Space)"}
                  onClick={() => (playing ? player.pause() : player.resume())}
                  className="press ring-focus grid size-11 place-items-center rounded-full bg-ink text-paper shadow-[0_1px_0_rgba(255,255,255,0.15)_inset,0_8px_18px_rgba(20,19,15,0.25)] hover:bg-black"
                >
                  {playing ? <IconPause size={18} /> : <IconPlay size={18} className="translate-x-px" />}
                </button>
                <button
                  type="button"
                  aria-label={open ? "Hide the keys" : "Show the keys"}
                  title={open ? "Hide the keys" : "Show the keys"}
                  aria-expanded={open}
                  onClick={() => setOpen((v) => !v)}
                  className={`press ring-focus grid size-9 place-items-center rounded-full transition-colors ${open ? "bg-teal text-white" : "text-ink-soft hover:bg-ink/[0.06] hover:text-ink"}`}
                >
                  <IconKeys size={16} />
                </button>
              </div>
              <div className="flex w-full items-center gap-2.5">
                <span ref={time} className="tnum w-9 text-right font-mono text-[11px] text-ink-dim">
                  0:00
                </span>
                <div
                  ref={track}
                  role="slider"
                  aria-label="Position"
                  aria-valuemin={0}
                  aria-valuemax={Math.round(song.durationSec)}
                  aria-valuenow={0}
                  tabIndex={0}
                  onClick={(e) => seekAt(e.clientX)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowRight") player.seek(player.position + 2);
                    if (e.key === "ArrowLeft") player.seek(player.position - 2);
                  }}
                  className="group h-5 flex-1 cursor-pointer py-2"
                >
                  <div className="relative h-1 overflow-hidden rounded-full bg-ink/[0.1] transition-[height] group-hover:h-1.5">
                    <div ref={fill} className="h-full rounded-full bg-sun-ink/85" style={{ width: 0 }} />
                  </div>
                </div>
                <span className="tnum w-9 font-mono text-[11px] text-ink-dim">{formatDuration(song.durationSec)}</span>
              </div>
            </div>

            {/* speed, volume, close */}
            <div className="flex items-center justify-end gap-2">
              <div className="hidden items-center rounded-[9px] border border-line bg-paper-deep/80 p-0.5 lg:flex" role="radiogroup" aria-label="Speed" title="Playback speed">
                {RATES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    role="radio"
                    aria-checked={rate === r}
                    onClick={() => player.setRate(r)}
                    className={`ring-focus tnum h-7 rounded-[7px] px-2 text-[11.5px] font-medium transition-colors ${rate === r ? "bg-card text-ink shadow-card" : "text-ink-dim hover:text-ink"}`}
                  >
                    {r}×
                  </button>
                ))}
              </div>
              <div className="hidden items-center gap-2 sm:flex" title="Volume">
                <button
                  type="button"
                  aria-label={volume > 0 ? "Mute" : "Unmute"}
                  onClick={() => player.setVolume(volume > 0 ? 0 : 0.8)}
                  className="press ring-focus grid size-8 place-items-center rounded-[8px] text-ink-soft hover:bg-ink/[0.06] hover:text-ink"
                >
                  <VolumeIcon level={volume} />
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.02}
                  value={volume}
                  onChange={(e) => player.setVolume(parseFloat(e.target.value))}
                  aria-label="Volume"
                  className="vol h-1 w-[88px] cursor-pointer"
                  style={{ ["--pct" as string]: `${volume * 100}%` }}
                />
              </div>
              <button type="button" aria-label="Close player" title="Close" onClick={() => player.stop()} className="press ring-focus grid size-10 place-items-center md:size-8 rounded-[8px] text-ink-dim hover:bg-ink/[0.06] hover:text-ink">
                <IconClose size={14} />
              </button>
            </div>
          </div>
          {open ? (
            <button
              type="button"
              aria-label="Hide the keys"
              onClick={() => setOpen(false)}
              className="absolute -top-3 left-1/2 z-[2] grid h-6 w-12 -translate-x-1/2 place-items-center rounded-full border border-line bg-card text-ink-dim shadow-card hover:text-ink"
            >
              <IconChevronDown size={14} />
            </button>
          ) : null}
        </div>
      </div>
    </Portal>
  );
}
