import type { ReactNode } from "react";

type Tone = "neutral" | "teal" | "sun" | "coral" | "sage";

const TONE: Record<Tone, string> = {
  neutral: "bg-paper-deep text-ink-soft",
  teal: "bg-teal-soft text-teal-deep",
  sun: "bg-sun-soft text-sun-ink",
  coral: "bg-coral-soft text-coral",
  sage: "bg-sage-soft text-sage",
};

export function Chip({
  tone = "neutral",
  children,
  mono = false,
  className = "",
}: {
  tone?: Tone;
  children: ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[12px] font-medium leading-none ${mono ? "font-mono tracking-wide" : ""} ${TONE[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
