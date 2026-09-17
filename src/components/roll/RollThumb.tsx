import type { RollNote } from "@/lib/midi/analyze";

/* Every song draws its own portrait: its notes over time, right hand green,
   left hand blue, on the same near-black the practice roll uses. No two
   songs look alike, which is the whole reason thumbnails exist. */
export function RollThumb({
  roll,
  width = 160,
  height = 90,
  radius = 12,
  className = "",
  title,
}: {
  roll: RollNote[];
  width?: number;
  height?: number;
  radius?: number;
  className?: string;
  title?: string;
}) {
  const padX = 6;
  const padY = 6;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const laneH = Math.max(2, Math.min(6, innerH / 18));
  const bars = 8;
  /* A 60px thumbnail cannot show 480 notes; drawing them all only costs paint.
     Sample evenly down to what the width can carry. */
  const cap = Math.max(40, Math.round(width * 1.6));
  const drawn = roll.length > cap ? roll.filter((_, i) => i % Math.ceil(roll.length / cap) === 0) : roll;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role={title ? "img" : "presentation"}
      aria-label={title}
      data-roll=""
      className={className}
      style={{ display: "block" }}
    >
      <rect width={width} height={height} rx={radius} fill="#0E0F10" />
      {Array.from({ length: bars - 1 }, (_, i) => (
        <line
          key={i}
          x1={padX + ((i + 1) * innerW) / bars}
          x2={padX + ((i + 1) * innerW) / bars}
          y1={padY}
          y2={height - padY}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={1}
        />
      ))}
      {drawn.map((n, i) => {
        const x = padX + n.start * innerW;
        const w = Math.max(2, (n.end - n.start) * innerW);
        const y = padY + (1 - n.pitch) * (innerH - laneH);
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={w}
            height={laneH}
            rx={laneH / 2}
            fill={n.hand === "right" ? "#3DDC97" : "#5B8DEF"}
            opacity={0.92}
          />
        );
      })}
    </svg>
  );
}

export function RollSkeleton({ width = 160, height = 90, radius = 12, className = "" }: { width?: number; height?: number; radius?: number; className?: string }) {
  return (
    <div
      className={`animate-breathe bg-roll ${className}`}
      style={{ width, height, borderRadius: radius }}
      aria-hidden
    />
  );
}
