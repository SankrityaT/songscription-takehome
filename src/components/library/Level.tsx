/* Difficulty as five pips plus the word. Shape and count carry it, colour
   only tints it, so it survives greyscale and colour blindness. With
   `animate`, the pips fill one after another, the "sizing it up" moment. */
export function Level({ score, label, compact = false, animate = false }: { score: 1 | 2 | 3 | 4 | 5; label: string; compact?: boolean; animate?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2" title={`${label}, ${score} of 5`}>
      <span className="inline-flex items-end gap-[3px]" aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <span
            key={i}
            className={`w-[4px] rounded-[1.5px] ${i < score ? (score >= 4 ? "bg-sun-ink" : "bg-teal") : "bg-ink/[0.12]"} ${animate && i < score ? "pip-in" : ""}`}
            style={{ height: 5 + i * 2, ...(animate && i < score ? { animationDelay: `${i * 90}ms` } : {}) }}
          />
        ))}
      </span>
      {compact ? null : <span className={`text-[13px] text-ink-soft ${animate ? "cell-in" : ""}`} style={animate ? { animationDelay: `${score * 90}ms` } : undefined}>{label}</span>}
    </span>
  );
}
