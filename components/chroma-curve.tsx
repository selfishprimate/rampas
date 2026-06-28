"use client";

import type { Swatch } from "@/lib/ramp";

interface Props {
  swatches: Swatch[];
  cMax: number;
}

/**
 * The calibration readout: plots lightness (line) and chroma (filled bell) across
 * the ramp, with each stop marked by a dot in its actual color. Makes the
 * muddiness-prevention math visible — you can see chroma ease to zero at the extremes.
 */
export function ChromaCurve({ swatches, cMax }: Props) {
  const W = 600;
  const H = 180;
  const padX = 8;
  const padY = 16;
  const n = swatches.length;
  if (n < 2) return null;

  const x = (i: number) => padX + (i / (n - 1)) * (W - padX * 2);
  const yL = (l: number) => padY + (1 - l) * (H - padY * 2);
  const yC = (c: number) =>
    padY + (1 - (cMax > 0 ? c / cMax : 0)) * (H - padY * 2);

  const lPath = swatches
    .map((s, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${yL(s.l).toFixed(1)}`)
    .join(" ");

  const cArea =
    `M ${x(0).toFixed(1)} ${(H - padY).toFixed(1)} ` +
    swatches
      .map((s, i) => `L ${x(i).toFixed(1)} ${yC(s.c).toFixed(1)}`)
      .join(" ") +
    ` L ${x(n - 1).toFixed(1)} ${(H - padY).toFixed(1)} Z`;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label="Lightness and chroma across the ramp"
      >
        {/* chroma bell, filled */}
        <path d={cArea} className="fill-muted-foreground/15" />
        {/* lightness line */}
        <path
          d={lPath}
          fill="none"
          className="stroke-muted-foreground/50"
          strokeWidth={1.25}
          strokeDasharray="3 3"
        />
        {/* chroma line + colored stop dots */}
        {swatches.map((s, i) =>
          i === 0 ? null : (
            <line
              key={`cl-${i}`}
              x1={x(i - 1)}
              y1={yC(swatches[i - 1].c)}
              x2={x(i)}
              y2={yC(s.c)}
              className="stroke-foreground/40"
              strokeWidth={1.25}
            />
          ),
        )}
        {swatches.map((s, i) => (
          <circle
            key={`dot-${i}`}
            cx={x(i)}
            cy={yC(s.c)}
            r={4}
            fill={s.hex}
            className="stroke-background"
            strokeWidth={1.5}
          />
        ))}
      </svg>
      <div className="mt-1 flex items-center gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-foreground/60" />
          chroma
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0 w-3 border-t border-dashed border-muted-foreground/60" />
          lightness
        </span>
      </div>
    </div>
  );
}
