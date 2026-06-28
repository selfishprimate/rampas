"use client";

import { useMemo } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RampPreview } from "@/components/ramp-preview";
import { ColorMatch } from "@/components/color-match";
import { ChromaCurve } from "@/components/chroma-curve";
import { buildSwatches, peakStopLabel, slug, type RampParams } from "@/lib/ramp";

interface FieldProps {
  label: string;
  value: string;
  hint?: string;
  min: number;
  max: number;
  step: number;
  current: number;
  onChange: (v: number) => void;
}

function SliderField({
  label,
  value,
  hint,
  min,
  max,
  step,
  current,
  onChange,
}: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <span className="text-xs tabular-nums">{value}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[current]}
        onValueChange={(v) => onChange(v[0])}
      />
      {hint && <p className="text-[10px] text-muted-foreground/70">{hint}</p>}
    </div>
  );
}

interface Props {
  name: string;
  params: RampParams;
  onNameChange: (name: string) => void;
  patch: (p: Partial<RampParams>) => void;
  showInfo: boolean;
  onShowInfoChange: (v: boolean) => void;
  saveLabel: string;
  onSave: () => void;
  onReset?: () => void;
  /** Gate the colour-computed UI behind hydration to avoid SSR mismatch. */
  hydrated?: boolean;
}

export function RampEditor({
  name,
  params,
  onNameChange,
  patch,
  showInfo,
  onShowInfoChange,
  saveLabel,
  onSave,
  onReset,
  hydrated = true,
}: Props) {
  const swatches = useMemo(() => buildSwatches(params), [params]);
  const oog = swatches.filter((s) => !s.inGamut).length;
  const peakLabel = peakStopLabel(params);

  return (
    <div className="flex flex-col">
      {/* Hero — the palette is the centerpiece */}
      <Card className="gap-5 py-6">
        <CardHeader className="flex-col items-stretch gap-4 px-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-2 sm:w-96">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="ramp-name" className="text-xs text-muted-foreground">
                Ramp Name
              </Label>
              <Input
                id="ramp-name"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                className="h-10 font-mono text-base"
              />
            </div>
            <Button onClick={onSave} variant="outline" size="lg">
              {saveLabel}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <label
              className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground"
              title="Pull each stop's chroma into the sRGB gamut so nothing clips (⚠)"
            >
              <input
                type="checkbox"
                checked={!!params.fitGamut}
                onChange={(e) => patch({ fitGamut: e.target.checked })}
                className="size-4 accent-foreground"
              />
              Fit Gamut
            </label>
            <button
              type="button"
              role="switch"
              aria-checked={showInfo}
              onClick={() => onShowInfoChange(!showInfo)}
              className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground"
              title="Show or hide the labels on the swatches"
            >
              <span
                className={
                  "relative inline-flex h-4 w-7 items-center rounded-full px-0.5 transition-colors " +
                  (showInfo ? "bg-foreground" : "bg-muted-foreground/40")
                }
              >
                <span
                  className={
                    "size-3 rounded-full bg-background transition-transform " +
                    (showInfo ? "translate-x-3" : "translate-x-0")
                  }
                />
              </span>
              Labels
            </button>
            <span className="text-xs text-muted-foreground tabular-nums">
              {swatches.length} stops
              {oog > 0 && <span className="text-destructive"> · {oog} oog</span>}
            </span>
          </div>
        </CardHeader>
        <CardContent className="px-6">
          {hydrated ? (
            <RampPreview swatches={swatches} showInfo={showInfo} />
          ) : (
            <div className="h-56 w-full animate-pulse rounded-2xl bg-muted/30" />
          )}
        </CardContent>
      </Card>

      <Separator />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[340px_1px_minmax(0,1fr)] lg:gap-0">
        {/* Controls */}
        <Card className="h-fit min-w-0 py-6">
          <CardContent className="flex flex-col gap-5 px-6">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-muted-foreground">
                Variable Prefix:{" "}
                <span className="font-mono text-foreground/80">
                  --{slug(name)}-*
                </span>
              </p>
              {onReset && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onReset}
                  className="h-8 gap-1.5 text-xs"
                  title="Reset all controls to defaults"
                >
                  <RotateCcw className="size-3.5" />
                  Reset
                </Button>
              )}
            </div>
            <Separator />
            <ColorMatch
              params={params}
              pinnedLabel={params.pin?.label ?? null}
              onApply={(p) => patch(p)}
              onPin={(pin) => patch({ pin })}
            />

            <Separator />

            <SliderField
              label="Hue"
              value={`${Math.round(params.hue)}°`}
              min={0}
              max={360}
              step={1}
              current={params.hue}
              onChange={(v) => patch({ hue: v })}
            />
            <SliderField
              label="Hue Shift Across Ramp"
              value={`${params.hueShift > 0 ? "+" : ""}${Math.round(params.hueShift)}°`}
              hint="0 keeps hue constant. Slight drift can keep dark/light ends from feeling flat."
              min={-40}
              max={40}
              step={1}
              current={params.hueShift}
              onChange={(v) => patch({ hueShift: v })}
            />

            <Separator />

            <SliderField
              label="Lightness — Lightest Stop"
              value={params.lTop.toFixed(3)}
              min={0.8}
              max={1}
              step={0.001}
              current={params.lTop}
              onChange={(v) => patch({ lTop: v })}
            />
            <SliderField
              label="Lightness — Darkest Stop"
              value={params.lBottom.toFixed(3)}
              hint="Keep above ~0.13; pure black smears on dark surfaces."
              min={0.08}
              max={0.4}
              step={0.001}
              current={params.lBottom}
              onChange={(v) => patch({ lBottom: v })}
            />
            <SliderField
              label="Lightness Curve"
              value={(params.lCurve ?? 1).toFixed(2)}
              hint="1.0 = even steps. Higher bends it into an S-curve: subtle, close pale tints up top and dense deep tones at the bottom (for dark-mode surfaces), with a steeper, more vivid middle — like Tailwind. ~1.3 is balanced."
              min={1}
              max={2}
              step={0.05}
              current={params.lCurve ?? 1}
              onChange={(v) => patch({ lCurve: v })}
            />

            <Separator />

            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <Label className="text-xs text-muted-foreground">
                  Constant Chroma
                </Label>
                <p className="text-[10px] text-muted-foreground/70">
                  Flat saturation (only L changes), no bell.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={!!params.constantChroma}
                onClick={() => patch({ constantChroma: !params.constantChroma })}
                title="Toggle between the chroma bell and constant chroma"
                className={
                  "relative inline-flex h-4 w-7 shrink-0 items-center rounded-full px-0.5 transition-colors " +
                  (params.constantChroma
                    ? "bg-foreground"
                    : "bg-muted-foreground/40")
                }
              >
                <span
                  className={
                    "size-3 rounded-full bg-background transition-transform " +
                    (params.constantChroma ? "translate-x-3" : "translate-x-0")
                  }
                />
              </button>
            </div>

            {!params.constantChroma && (
              <SliderField
                label="Most Vivid Lightness"
                value={params.lPeak.toFixed(3)}
                hint={
                  `Where colour peaks — independent of the ladder.` +
                  (peakLabel !== null
                    ? ` Currently near stop ${peakLabel}.`
                    : "") +
                  ` Raise it for a light brand (e.g. lime); the steps stay even.`
                }
                min={0.3}
                max={0.92}
                step={0.001}
                current={params.lPeak}
                onChange={(v) => patch({ lPeak: v })}
              />
            )}
            <SliderField
              label={params.constantChroma ? "Chroma" : "Max Chroma (At Vivid Point)"}
              value={params.cMax.toFixed(3)}
              min={0}
              max={0.37}
              step={0.001}
              current={params.cMax}
              onChange={(v) => patch({ cMax: v })}
            />
            {!params.constantChroma && (
              <SliderField
                label="Chroma Falloff (Bell Width)"
                value={params.sigma.toFixed(2)}
                hint="Smaller = chroma drops faster toward white and black (less wash, less mud)."
                min={0.06}
                max={0.5}
                step={0.01}
                current={params.sigma}
                onChange={(v) => patch({ sigma: v })}
              />
            )}
          </CardContent>
        </Card>

        {/* vertical rule between sidebar and content */}
        <div aria-hidden className="hidden bg-border lg:block" />

        {/* Lightness & chroma curve */}
        <div className="flex min-w-0 flex-col lg:pl-4">
          <Card className="gap-4 py-6">
            <CardHeader className="px-6">
              <h2 className="font-display text-sm font-medium leading-none">
                Lightness &amp; Chroma
              </h2>
            </CardHeader>
            <CardContent className="px-6">
              {hydrated ? (
                <ChromaCurve swatches={swatches} cMax={params.cMax} />
              ) : (
                <div className="h-56 w-full animate-pulse rounded-xl bg-muted/20" />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
