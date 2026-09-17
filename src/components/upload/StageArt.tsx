"use client";

import { useEffect, useState } from "react";
import { Mark } from "@/components/shell/Wordmark";
import type { Stage } from "@/hooks/useUploadQueue";

/* Art for each stage of adding a song. If a generated image exists at
   /brand/stage-<stage>.png it is used; otherwise these authored SVG scenes
   run. Each one shows the thing that is happening, not a spinner. */

const ART: Record<string, string> = {
  reading: "/brand/stage-reading.png",
  notes: "/brand/stage-notes.png",
  key: "/brand/stage-key.png",
  roll: "/brand/stage-roll.png",
  done: "/brand/stage-done.png",
  failed: "/brand/stage-failed.png",
};

/* Which generated images exist is declared in one manifest, so the page
   never probes for files that are not there. Add a stage name to
   public/brand/stage-art.json once its PNG is in place. */
let manifest: Promise<Set<string>> | null = null;
function loadManifest() {
  if (!manifest) {
    manifest = fetch("/brand/stage-art.json")
      .then((r) => (r.ok ? r.json() : { stages: [] }))
      .then((j: { stages?: string[] }) => new Set(j.stages ?? []))
      .catch(() => new Set<string>());
  }
  return manifest;
}
function useAsset(stage: string) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    let live = true;
    loadManifest().then((set) => {
      if (live) setOk(set.has(stage));
    });
    return () => {
      live = false;
    };
  }, [stage]);
  return ok;
}

function Reading() {
  return (
    <svg viewBox="0 0 240 150" className="h-full w-full" aria-hidden>
      <rect x="70" y="18" width="100" height="120" rx="12" fill="#FFFDFB" stroke="rgba(20,19,15,0.14)" />
      <rect x="86" y="44" width="68" height="4" rx="2" fill="rgba(20,19,15,0.1)" />
      <rect x="86" y="58" width="52" height="4" rx="2" fill="rgba(20,19,15,0.1)" />
      <rect x="86" y="72" width="60" height="4" rx="2" fill="rgba(20,19,15,0.1)" />
      <rect x="86" y="86" width="44" height="4" rx="2" fill="rgba(20,19,15,0.1)" />
      <rect x="86" y="100" width="56" height="4" rx="2" fill="rgba(20,19,15,0.1)" />
      <g transform="translate(100 112) scale(0.11)">
        <g fill="#22877B">
          <Mark size={330} />
        </g>
      </g>
      <rect x="70" y="18" width="100" height="10" rx="4" fill="rgba(34,135,123,0.35)" className="scan-y" />
    </svg>
  );
}

function Notes() {
  const heads = [
    [40, 84],
    [66, 72],
    [92, 60],
    [118, 66],
    [144, 54],
    [170, 60],
    [196, 48],
  ];
  return (
    <svg viewBox="0 0 240 150" className="h-full w-full" aria-hidden>
      {[48, 60, 72, 84, 96].map((y) => (
        <line key={y} x1="24" x2="216" y1={y} y2={y} stroke="rgba(20,19,15,0.14)" />
      ))}
      {heads.map(([x, y], i) => (
        <g key={i} className="pip-in" style={{ animationDelay: `${i * 140}ms`, animationDuration: "420ms", transformOrigin: `${x}px ${y}px` }}>
          <ellipse cx={x} cy={y} rx="7" ry="5" fill={i % 3 === 1 ? "#5B8DEF" : "#3DDC97"} transform={`rotate(-18 ${x} ${y})`} />
          <line x1={x + 6} x2={x + 6} y1={y - 2} y2={y - 34} stroke="#14130F" strokeWidth="1.6" />
        </g>
      ))}
    </svg>
  );
}

function Key() {
  return (
    <svg viewBox="0 0 240 150" className="h-full w-full" aria-hidden>
      {[0, 1, 2].map((i) => (
        <circle key={i} cx="120" cy="78" r="30" fill="none" stroke="#FFC23B" strokeWidth="2" className="ring-out" style={{ animationDelay: `${i * 520}ms` }} />
      ))}
      <path d="M108 40v34a12 12 0 0 0 24 0V40" fill="none" stroke="#14130F" strokeWidth="5" strokeLinecap="round" />
      <path d="M120 86v34M110 120h20" stroke="#14130F" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

function Roll() {
  return (
    <svg viewBox="0 0 240 150" className="h-full w-full" aria-hidden>
      <rect x="40" y="88" width="160" height="44" rx="6" fill="#F4F0E8" stroke="rgba(20,19,15,0.2)" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect key={i} x={40 + i * (160 / 7)} y="88" width={160 / 7} height="44" fill="transparent" stroke="rgba(20,19,15,0.2)" />
      ))}
      {[0, 1, 3, 4, 5].map((i) => (
        <rect key={i} x={40 + (i + 1) * (160 / 7) - 6} y="88" width="12" height="26" rx="2" fill="#14130F" />
      ))}
      {[0, 2, 4, 6].map((i, k) => (
        <rect key={i} x={40 + i * (160 / 7) + 3} y="88" width={160 / 7 - 6} height="44" rx="4" fill={k % 2 ? "#5B8DEF" : "#3DDC97"} opacity="0" className="key-lit" style={{ animationDelay: `${k * 240}ms` }} />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={92 + i * 12} y={72 - i * 5} width="6" height={8 + i * 5} rx="2" fill={i < 3 ? "#22877B" : "rgba(20,19,15,0.15)"} className="pip-in" style={{ animationDelay: `${i * 120}ms`, transformOrigin: `${95 + i * 12}px 80px` }} />
      ))}
    </svg>
  );
}

function Done() {
  return (
    <svg viewBox="0 0 240 150" className="h-full w-full" aria-hidden>
      <circle cx="120" cy="76" r="38" fill="#E3F0E7" className="pop-in" />
      <path d="M100 78l13 13 27-30" fill="none" stroke="#3F8F5F" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" className="draw-in" />
    </svg>
  );
}

function Failed() {
  return (
    <svg viewBox="0 0 240 150" className="h-full w-full" aria-hidden>
      <circle cx="120" cy="76" r="38" fill="#FBE3DD" className="pop-in" />
      <path d="M120 54v28M120 96v2" stroke="#E4553A" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}

export function StageArt({ stage, className = "" }: { stage: Stage; className?: string }) {
  const key = stage === "queued" ? "reading" : stage;
  const src = ART[key];
  const has = useAsset(key);
  // eslint-disable-next-line @next/next/no-img-element -- local, optional, swapped in by hand
  if (has && src) return <img src={src} alt="" className={`h-full w-full object-contain ${className}`} />;
  return (
    <div className={className} key={key}>
      {key === "reading" ? <Reading /> : key === "notes" ? <Notes /> : key === "key" ? <Key /> : key === "roll" ? <Roll /> : key === "done" ? <Done /> : <Failed />}
    </div>
  );
}
