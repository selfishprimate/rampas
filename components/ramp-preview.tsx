"use client";

import { useState } from "react";
import { AlertTriangle, Check, Copy, Pin } from "lucide-react";
import { readableOn } from "@/lib/oklch";
import type { Swatch } from "@/lib/ramp";

interface Props {
  swatches: Swatch[];
  showInfo?: boolean;
}

export function RampPreview({ swatches, showInfo = true }: Props) {
  const [copied, setCopied] = useState<number | null>(null);

  const copy = async (s: Swatch) => {
    try {
      await navigator.clipboard.writeText(s.hex);
      setCopied(s.label);
      setTimeout(() => setCopied((c) => (c === s.label ? null : c)), 1100);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="flex w-full gap-px">
        {swatches.map((s) => {
          const fg = readableOn(s.l);
          const isCopied = copied === s.label;
          return (
            <button
              key={s.label}
              onClick={() => copy(s)}
              title={`${s.css} — click to copy ${s.hex}`}
              className="group relative flex h-28 min-w-0 flex-1 flex-col justify-between gap-2 overflow-hidden p-1.5 text-left outline-none transition-transform first:rounded-l-2xl last:rounded-r-2xl focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:h-44 sm:p-2.5"
              style={{ backgroundColor: s.hex, color: fg }}
            >
              <div className="flex items-start justify-between">
                {showInfo && (
                  <span className="text-xs font-semibold tabular-nums sm:text-sm">
                    {s.label}
                  </span>
                )}
                <span className="ml-auto flex items-center gap-1">
                  {s.pinned && (
                    <Pin className="size-3.5" aria-label="Pinned exact colour" />
                  )}
                  {!s.inGamut && (
                    <AlertTriangle
                      className="size-3.5"
                      aria-label="Out of sRGB gamut"
                    />
                  )}
                </span>
              </div>

              {showInfo && (
                <div className="hidden flex-col gap-0.5 sm:flex">
                  <span className="font-mono text-[11px] uppercase tabular-nums opacity-90">
                    {s.hex}
                  </span>
                  <span className="font-mono text-[10px] tabular-nums opacity-60">
                    L {s.l.toFixed(2)}
                  </span>
                  <span className="font-mono text-[10px] tabular-nums opacity-60">
                    C {s.c.toFixed(3)}
                  </span>
                  <span className="font-mono text-[10px] tabular-nums opacity-60">
                    H {Math.round(s.h)}
                  </span>
                </div>
              )}

              <span
                className={
                  "absolute inset-0 flex items-center justify-center gap-1 text-xs font-medium transition-opacity group-hover:opacity-100 " +
                  (isCopied ? "opacity-100" : "opacity-0")
                }
                aria-hidden
              >
                {isCopied ? (
                  <>
                    <Check className="size-4" /> Copied
                  </>
                ) : (
                  <Copy className="size-4 opacity-70" />
                )}
              </span>
            </button>
          );
        })}
    </div>
  );
}
