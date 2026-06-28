"use client";

import { useMemo, useState } from "react";
import { Pin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  oklchToHex,
  parseColor,
  round,
  type ColorFormat,
  type Oklch,
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

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

/** Format the ramp's vivid point (lPeak/cMax/hue) as a value string in the given format. */
function formatColor(
  l: number,
  c: number,
  h: number,
  format: ColorFormat,
): string {
  if (format === "oklch") {
    return `${round(l, 3)} ${round(c, 3)} ${Math.round(h)}`;
  }
  const { hex, rgb } = oklchToHex(l, c, h);
  if (format === "hex") return hex;
  const [hh, ss, ll] = rgbToHsl(rgb[0], rgb[1], rgb[2]);
  return `${hh} ${ss}% ${ll}%`;
}

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
              ? "bg-background text-foreground"
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
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<"snap" | "pin">("snap");

  // The input mirrors the ramp's vivid point — so changing hue/chroma/lPeak
  // from the sliders keeps it filled and in sync. While the user is typing,
  // their draft takes over instead.
  const derived = useMemo(
    () => formatColor(params.lPeak, params.cMax, params.hue, format),
    [params.lPeak, params.cMax, params.hue, format],
  );
  const value = editing ? draft : derived;

  const parsed = useMemo(() => parseColor(value, format), [value, format]);

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

  const applyPin = (p: Oklch, m: "snap" | "pin") => {
    const nearest = nearestStopToLightness(params, p.l);
    if (m === "pin" && nearest != null) {
      onPin({ label: nearest, l: p.l, c: p.c, h: p.h });
    } else {
      onPin(null);
    }
  };

  // Apply as the user types.
  const onChange = (text: string) => {
    setEditing(true);
    setDraft(text);
    const p = parseColor(text, format);
    if (!p) return;
    onApply({
      hue: round(p.h, 2),
      lPeak: clamp(p.l, 0.05, 0.999),
      cMax: clamp(round(p.c, 4), 0, 0.37),
    });
    applyPin(p, mode);
  };

  const onModeChange = (m: "snap" | "pin") => {
    setMode(m);
    if (parsed) applyPin(parsed, m);
  };

  const invalid = editing && draft.trim().length > 0 && !parsed;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs text-muted-foreground">Match A Colour</Label>
        <Segmented
          options={FORMATS}
          value={format}
          onChange={(f) => {
            setEditing(false);
            setFormat(f);
          }}
          labels={{ hex: "HEX", hsl: "HSL", oklch: "OKLCH" }}
        />
      </div>

      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          setDraft(value);
          setEditing(true);
        }}
        onBlur={() => setEditing(false)}
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

          <Segmented
            options={["snap", "pin"] as const}
            value={mode}
            onChange={onModeChange}
            labels={{ snap: "Snap", pin: "Pin Exact" }}
          />
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
