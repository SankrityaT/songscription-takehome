"use client";

import { useCallback, useRef, useState } from "react";
import { MidiError, looksLikeMidi, parseMidi } from "@/lib/midi/parse";
import { analyze, spriteFromCompact, titleFromFile, type RollNote, type SongAnalysis } from "@/lib/midi/analyze";
import { addSong, findByFingerprint, newId } from "@/lib/library/store";
import type { Song } from "@/lib/library/types";
import { buildSong } from "@/lib/library/fromFile";

export type Stage = "queued" | "reading" | "notes" | "key" | "roll" | "done" | "failed";
export type FailureKind = "type" | "size" | "empty" | "corrupt" | "duplicate";

export interface UploadItem {
  id: string;
  file: File;
  name: string;
  /** provisional title, from the file name, until the file says better */
  title: string;
  size: number;
  stage: Stage;
  error: string | null;
  failure: FailureKind | null;
  song: Song | null;
  /** fills in as stages complete so a row can show what is known so far */
  found: {
    sprite: RollNote[];
    analysis: SongAnalysis;
    title: string;
    composer: string;
  } | null;
  duplicateOf: Song | null;
}

export const STAGE_LABEL: Record<Stage, string> = {
  queued: "Waiting its turn",
  reading: "Reading the file",
  notes: "Finding the notes",
  key: "Listening for the key",
  roll: "Sizing it up",
  done: "Added",
  failed: "Could not add",
};

const STAGE_ORDER: Stage[] = ["reading", "notes", "key", "roll"];
export const MAX_BYTES = 5 * 1024 * 1024;

/* Each stage is real work. The minimum dwell only exists so the words are
   readable; the sample files parse in under a millisecond and cells that
   all appear in the same frame read as a glitch, not as speed. */
const MIN_STAGE_MS = 720;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withDwell<T>(fn: () => T | Promise<T>): Promise<T> {
  const started = performance.now();
  const result = await fn();
  const remaining = MIN_STAGE_MS - (performance.now() - started);
  if (remaining > 0) await wait(remaining);
  return result;
}

export function stageIndex(stage: Stage) {
  if (stage === "done") return STAGE_ORDER.length;
  return STAGE_ORDER.indexOf(stage);
}

class Failure extends MidiError {
  constructor(
    public kind: FailureKind,
    message: string,
  ) {
    super(message);
  }
}

function extensionOf(name: string) {
  const m = name.match(/\.([a-z0-9]+)$/i);
  return m ? `.${m[1].toLowerCase()}` : "no extension";
}

function prettyBytes(n: number) {
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;
}

export function useUploadQueue() {
  const [items, setItems] = useState<UploadItem[]>([]);
  const running = useRef(false);
  const queue = useRef<string[]>([]);
  const files = useRef(new Map<string, File>());

  const patch = useCallback((id: string, next: Partial<UploadItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...next } : it)));
  }, []);

  const process = useCallback(
    async (id: string) => {
      const file = files.current.get(id);
      if (!file) return;
      try {
        if (file.size > MAX_BYTES) {
          throw new Failure("size", `${prettyBytes(file.size)} is larger than the 5 MB limit. MIDI files are usually a few kilobytes.`);
        }
        patch(id, { stage: "reading", error: null, failure: null });
        const buffer = await withDwell(() => file.arrayBuffer());
        if (!looksLikeMidi(new Uint8Array(buffer))) {
          const ext = extensionOf(file.name);
          throw new Failure("type", `This is ${ext === "no extension" ? "a file with no extension" : `a ${ext} file`}, not MIDI. Export a .mid from your transcription and drop that.`);
        }
        patch(id, { stage: "notes" });
        let parsed;
        try {
          parsed = await withDwell(() => parseMidi(buffer));
        } catch (e) {
          throw new Failure("corrupt", e instanceof MidiError ? `${e.message}. The file may be truncated.` : "We could not read this file.");
        }
        if (parsed.notes.length === 0) throw new Failure("empty", "The file has no notes in it, so there is nothing to practice.");
        const analysis = analyze(parsed);
        const { title, composer } = titleFromFile(file.name, parsed.trackNames);
        patch(id, {
          stage: "key",
          found: { sprite: spriteFromCompact(analysis.notes, analysis.durationSec), analysis, title, composer },
        });
        await wait(MIN_STAGE_MS);
        const existing = findByFingerprint(analysis.fingerprint);
        if (existing) {
          throw Object.assign(new Failure("duplicate", `Same notes as “${existing.title}”, already in your library.`), { existing });
        }
        patch(id, { stage: "roll" });
        await wait(MIN_STAGE_MS);
        const song = buildSong(file, analysis, title, composer);
        addSong(song, file);
        patch(id, { stage: "done", song });
        window.setTimeout(() => setItems((prev) => prev.filter((it) => it.id !== id)), 1400);
      } catch (err) {
        if (err instanceof Failure) {
          patch(id, { stage: "failed", failure: err.kind, error: err.message, duplicateOf: (err as { existing?: Song }).existing ?? null });
        } else {
          patch(id, { stage: "failed", failure: "corrupt", error: "Something went wrong reading this file." });
        }
      }
    },
    [patch],
  );

  const drain = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    while (queue.current.length) {
      const id = queue.current.shift()!;
      await process(id);
    }
    running.current = false;
  }, [process]);

  const enqueue = useCallback(
    (incoming: File[]) => {
      const fresh: UploadItem[] = incoming.map((file) => {
        const id = newId();
        files.current.set(id, file);
        return {
          id,
          file,
          name: file.name,
          title: titleFromFile(file.name, []).title,
          size: file.size,
          stage: "queued",
          error: null,
          failure: null,
          song: null,
          found: null,
          duplicateOf: null,
        };
      });
      if (!fresh.length) return;
      setItems((prev) => [...fresh, ...prev]);
      queue.current.push(...fresh.map((f) => f.id));
      void drain();
    },
    [drain],
  );

  const retry = useCallback(
    (id: string) => {
      patch(id, { stage: "queued", error: null, failure: null, duplicateOf: null, found: null });
      queue.current.push(id);
      void drain();
    },
    [drain, patch],
  );

  /** Swap the file behind a failed row and run it again. */
  const replace = useCallback(
    (id: string, file: File) => {
      files.current.set(id, file);
      patch(id, { name: file.name, title: titleFromFile(file.name, []).title, size: file.size, stage: "queued", error: null, failure: null, duplicateOf: null, found: null });
      queue.current.push(id);
      void drain();
    },
    [drain, patch],
  );

  const dismiss = useCallback((id: string) => {
    files.current.delete(id);
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const pending = items.filter((it) => it.stage !== "done");
  const busy = items.some((it) => it.stage !== "done" && it.stage !== "failed");
  const failedCount = items.filter((it) => it.stage === "failed").length;
  const current = items.find((it) => it.stage !== "done" && it.stage !== "failed" && it.stage !== "queued") ?? null;
  const total = items.length;
  const settled = items.filter((it) => it.stage === "done" || it.stage === "failed").length;

  return { items, pending, enqueue, retry, replace, dismiss, busy, failedCount, current, total, settled };
}
