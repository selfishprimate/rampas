"use client";

import { useMemo, useState } from "react";
import { Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  oklchToHex,
  parseColor,
  round,
  type ColorFormat,
} from "@/lib/oklch";
import {
  buildSwatches,
  nearestStopToLightness,
  type RampParams,
} from "@/lib/ramp";

interface Props {
  params: RampParams;
  pinnedLabel: number | null;
  onApply: (patch: Partial<RampParams>) => void;
  onPin: (pin: RampParams["pin"]) => void;
}

const FORMATS: ColorFormat[] = ["hex", "hsl", "oklch"];
const PLACEHOLDER: Record<ColorFormat, string> = {
  hex: "#84cc16",
  hsl: "82 78% 44%",
  oklch: "0.86 0.2 130",
};

const clamp = (x: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, x));

function Segmented<T extends string>({
  options,
  value,
  onChange,
  labels,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  labels?: Record<string, string>;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg bg-muted p-[3px] text-xs">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={
            "rounded-md px-2.5 py-1 transition-colors " +
            (value === o
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground")
          }
        >
          {labels?.[o] ?? o}
        </button>
      ))}
    </div>
  );
}

export function ColorMatch({ params, pinnedLabel, onApply, onPin }: Props) {
  const [format, setFormat] = useState<ColorFormat>("hex");
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"snap" | "pin">("snap");

  const parsed = useMemo(() => parseColor(text, format), [text, format]);

  const view = useMemo(() => {
    if (!parsed) return null;
    const enteredHex = oklchToHex(parsed.l, parsed.c, parsed.h).hex;
    const nearest = nearestStopToLightness(params, parsed.l);
    const rampSwatch =
      nearest != null
        ? buildSwatches({ ...params, pin: null }).find((s) => s.label === nearest)
        : undefined;
    return { enteredHex, nearest, rampSwatch };
  }, [parsed, params]);

  const apply = () => {
    if (!parsed) return;
    onApply({
      hue: round(parsed.h, 2),
      lPeak: clamp(parsed.l, 0.05, 0.999),
      cMax: clamp(round(parsed.c, 4), 0, 0.37),
    });
    if (mode === "pin" && view?.nearest != null) {
      onPin({
        label: view.nearest,
        l: parsed.l,
        c: parsed.c,
        h: parsed.h,
      });
    } else {
      onPin(null);
    }
  };

  const invalid = text.trim().length > 0 && !parsed;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs text-muted-foreground">Match a colour</Label>
        <Segmented
          options={FORMATS}
          value={format}
          onChange={setFormat}
          labels={{ hex: "HEX", hsl: "HSL", oklch: "OKLCH" }}
        />
      </div>

      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={PLACEHOLDER[format]}
        spellCheck={false}
        className={
          "font-mono " + (invalid ? "border-destructive text-destructive" : "")
        }
        aria-invalid={invalid}
      />

      {invalid && (
        <p className="text-[10px] text-destructive">
          Not a valid {format.toUpperCase()} value.
        </p>
      )}

      {parsed && view && (
        <>
          <div className="flex items-center gap-3 rounded-lg border p-2">
            <div className="flex flex-col items-center gap-1">
              <span
                className="size-9 rounded-md border"
                style={{ backgroundColor: view.enteredHex }}
              />
              <span className="text-[9px] text-muted-foreground">yours</span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-[10px] text-muted-foreground">
              <span className="tabular-nums text-foreground/90">
                {view.enteredHex}
              </span>
              <span className="tabular-nums">
                oklch {parsed.l.toFixed(3)} {parsed.c.toFixed(3)}{" "}
                {Math.round(parsed.h)}
              </span>
              <span>
                nearest stop:{" "}
                <span className="text-foreground/90">{view.nearest}</span>
              </span>
            </div>
            {view.rampSwatch && (
              <div className="flex flex-col items-center gap-1">
                <span
                  className="size-9 rounded-md border"
                  style={{ backgroundColor: view.rampSwatch.hex }}
                />
                <span className="text-[9px] text-muted-foreground">
                  stop {view.nearest}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <Segmented
              options={["snap", "pin"] as const}
              value={mode}
              onChange={setMode}
              labels={{ snap: "Snap", pin: "Pin exact" }}
            />
            <Button size="sm" onClick={apply}>
              Apply
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground/70">
            {mode === "snap"
              ? "Sets hue + vivid point so the brand sits near a generated stop."
              : `Forces stop ${view.nearest} to your exact colour; the rest is generated around it.`}
          </p>
        </>
      )}

      {pinnedLabel != null && (
        <div className="flex items-center justify-between rounded-md bg-accent/40 px-2 py-1.5 text-[11px]">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Pin className="size-3" />
            Pinned to stop{" "}
            <span className="text-foreground/90">{pinnedLabel}</span>
          </span>
          <button
            onClick={() => onPin(null)}
            className="text-muted-foreground underline-offset-2 hover:underline"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
