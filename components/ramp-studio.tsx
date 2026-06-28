"use client";

import { useEffect, useMemo, useState } from "react";
import { Moon, Plus, Save, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RampPreview } from "@/components/ramp-preview";
import { ColorMatch } from "@/components/color-match";
import { ChromaCurve } from "@/components/chroma-curve";
import { ExportPanel } from "@/components/export-panel";
import { SavedRamps } from "@/components/saved-ramps";
import { ProjectBar } from "@/components/project-bar";
import {
  buildSwatches,
  normalizeParams,
  peakStopLabel,
  slug,
  DEFAULT_PARAMS,
  DEFAULT_STOPS,
  DEFAULT_L_CURVE,
  type Project,
  type Ramp,
  type RampParams,
} from "@/lib/ramp";

/** Fresh-ramp defaults for the UI — like DEFAULT_PARAMS but with gamut-fit on,
 *  so a new ramp never shows clipped (⚠) stops out of the box. */
const INITIAL_PARAMS: RampParams = {
  ...DEFAULT_PARAMS,
  fitGamut: true,
  lCurve: DEFAULT_L_CURVE,
};

const PROJECTS_KEY = "oklch-ramp:projects:v1";
const LEGACY_SAVED_KEY = "oklch-ramp:saved";
const DRAFT_KEY = "oklch-ramp:draft";
const PREFS_KEY = "oklch-ramp:prefs";

function parseStops(text: string): number[] {
  const nums = text
    .split(/[\s,]+/)
    .map((t) => parseInt(t, 10))
    .filter((n) => Number.isFinite(n) && n >= 0);
  return Array.from(new Set(nums)).sort((a, b) => a - b);
}

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

function makeProject(name: string, ramps: Ramp[] = []): Project {
  return { id: uid(), name, ramps, createdAt: Date.now() };
}

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

export function RampStudio() {
  const [name, setName] = useState("Brand");
  const [params, setParams] = useState<RampParams>(INITIAL_PARAMS);
  const [stopsText, setStopsText] = useState(DEFAULT_STOPS.join(", "));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>("");

  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [lightBg, setLightBg] = useState("#ffffff");
  const [darkBg, setDarkBg] = useState("#0a0a0a");

  // Load persisted state once (with migration from the old flat ramp list).
  useEffect(() => {
    try {
      const prefs = localStorage.getItem(PREFS_KEY);
      if (prefs) {
        const p = JSON.parse(prefs) as {
          theme?: "light" | "dark";
          lightBg?: string;
          darkBg?: string;
        };
        if (p.theme) setTheme(p.theme);
        if (p.lightBg) setLightBg(p.lightBg);
        if (p.darkBg) setDarkBg(p.darkBg);
      }

      let loaded: Project[] = [];
      let active = "";
      const raw = localStorage.getItem(PROJECTS_KEY);
      if (raw) {
        const data = JSON.parse(raw) as {
          projects: Project[];
          activeProjectId: string;
        };
        loaded = data.projects ?? [];
        active = data.activeProjectId ?? "";
      } else {
        const legacy = localStorage.getItem(LEGACY_SAVED_KEY);
        const ramps: Ramp[] = legacy ? JSON.parse(legacy) : [];
        loaded = [makeProject("Invisible", ramps)];
      }
      if (loaded.length === 0) loaded = [makeProject("Invisible")];
      if (!loaded.some((p) => p.id === active)) active = loaded[0].id;
      setProjects(loaded);
      setActiveProjectId(active);

      const d = localStorage.getItem(DRAFT_KEY);
      if (d) {
        const draft = JSON.parse(d) as {
          name: string;
          params: RampParams;
          activeId: string | null;
        };
        const np = normalizeParams(draft.params);
        setName(draft.name);
        setParams(np);
        setStopsText(np.stops.join(", "));
        const proj = loaded.find((p) => p.id === active);
        const stillThere = proj?.ramps.some((r) => r.id === draft.activeId);
        setActiveId(stillThere ? draft.activeId : null);
      }
    } catch {
      setProjects([makeProject("Invisible")]);
    }
    setHydrated(true);
  }, []);

  // Persist projects.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        PROJECTS_KEY,
        JSON.stringify({ projects, activeProjectId }),
      );
    } catch {
      /* ignore */
    }
  }, [projects, activeProjectId, hydrated]);

  // Persist working draft.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ name, params, activeId }),
      );
    } catch {
      /* ignore */
    }
  }, [name, params, activeId, hydrated]);

  // Reflect theme on <html> and persist app preferences.
  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ theme, lightBg, darkBg }));
    } catch {
      /* ignore */
    }
  }, [theme, lightBg, darkBg, hydrated]);

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId),
    [projects, activeProjectId],
  );
  const savedRamps = activeProject?.ramps ?? [];

  const swatches = useMemo(() => buildSwatches(params), [params]);
  const oog = swatches.filter((s) => !s.inGamut).length;
  const peakLabel = peakStopLabel(params);
  const surface = theme === "dark" ? darkBg : lightBg;
  const current: Ramp = { id: activeId ?? "draft", name, params };

  const patch = (p: Partial<RampParams>) =>
    setParams((prev) => ({ ...prev, ...p }));

  const onStopsText = (text: string) => {
    setStopsText(text);
    const stops = parseStops(text);
    if (stops.length > 0) patch({ stops });
  };

  // --- ramp actions (scoped to the active project) ---
  const updateActiveRamps = (fn: (ramps: Ramp[]) => Ramp[]) =>
    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProjectId ? { ...p, ramps: fn(p.ramps) } : p,
      ),
    );

  const save = () => {
    updateActiveRamps((ramps) => {
      const existing = activeId && ramps.find((r) => r.id === activeId);
      if (existing) {
        return ramps.map((r) =>
          r.id === activeId ? { ...r, name, params } : r,
        );
      }
      const id = uid();
      setActiveId(id);
      return [...ramps, { id, name, params }];
    });
  };

  const load = (r: Ramp) => {
    const np = normalizeParams(r.params);
    setName(r.name);
    setParams(np);
    setStopsText(np.stops.join(", "));
    setActiveId(r.id);
  };

  const del = (id: string) => {
    updateActiveRamps((ramps) => ramps.filter((r) => r.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const resetDraft = () => {
    setName("Untitled");
    setParams(INITIAL_PARAMS);
    setStopsText(DEFAULT_STOPS.join(", "));
    setActiveId(null);
  };

  // --- project actions ---
  const switchProject = (id: string) => {
    setActiveProjectId(id);
    setActiveId(null);
  };

  const createProject = (projName: string) => {
    const proj = makeProject(projName);
    setProjects((prev) => [...prev, proj]);
    setActiveProjectId(proj.id);
    resetDraft();
  };

  const renameProject = (id: string, projName: string) =>
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name: projName } : p)),
    );

  const deleteProject = (id: string) =>
    setProjects((prev) => {
      let next = prev.filter((p) => p.id !== id);
      if (next.length === 0) next = [makeProject("Invisible")];
      if (id === activeProjectId) {
        setActiveProjectId(next[0].id);
        setActiveId(null);
      }
      return next;
    });

  return (
    <div className="grid min-h-screen w-full grid-cols-[minmax(1.5rem,1fr)_minmax(0,1560px)_minmax(1.5rem,1fr)]">
      <div aria-hidden className="page-gutter border-r border-border" />
      <main className="min-w-0">
      <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">
            OKLCH Ramp Studio
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Perceptual primitive ramps with bell-curve chroma. One ramp feeds
            both light and dark — dense at both ends, no muddiness at the
            extremes. Export to Tailwind{" "}
            <code className="text-foreground/80">@theme</code>, CSS variables, or
            DTCG.
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label={theme === "dark" ? "Switch to light" : "Switch to dark"}
          title={theme === "dark" ? "Light mode" : "Dark mode"}
        >
          {theme === "dark" ? <Sun /> : <Moon />}
        </Button>
      </header>

      {activeProjectId && (
        <div className="border-b border-border px-6 py-4">
          <ProjectBar
            projects={projects.map((p) => ({
              id: p.id,
              name: p.name,
              rampCount: p.ramps.length,
            }))}
            activeId={activeProjectId}
            onSwitch={switchProject}
            onCreate={createProject}
            onRename={renameProject}
            onDelete={deleteProject}
          />
        </div>
      )}

      {/* Hero — the palette is the centerpiece */}
      <Card className="gap-5 border-b border-border py-6">
        <CardHeader className="flex-col items-stretch gap-4 px-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-2 sm:w-96">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="ramp-name" className="text-xs text-muted-foreground">
                Ramp name
              </Label>
              <Input
                id="ramp-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 font-mono text-base"
              />
            </div>
            <Button onClick={save} className="h-10 gap-1.5">
              <Save />
              {activeId && savedRamps.some((r) => r.id === activeId)
                ? "Update"
                : "Save"}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-10"
              onClick={resetDraft}
              aria-label="New ramp"
            >
              <Plus />
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-2.5 py-1.5">
              <span className="text-[10px] text-muted-foreground">surface</span>
              <label
                className="flex items-center gap-1"
                title={`Light background ${lightBg}`}
              >
                <span className="text-[10px] text-muted-foreground">L</span>
                <input
                  type="color"
                  value={lightBg}
                  onChange={(e) => setLightBg(e.target.value)}
                  aria-label="Light mode background"
                  className="size-5 cursor-pointer rounded border-0 bg-transparent p-0"
                />
              </label>
              <label
                className="flex items-center gap-1"
                title={`Dark background ${darkBg}`}
              >
                <span className="text-[10px] text-muted-foreground">D</span>
                <input
                  type="color"
                  value={darkBg}
                  onChange={(e) => setDarkBg(e.target.value)}
                  aria-label="Dark mode background"
                  className="size-5 cursor-pointer rounded border-0 bg-transparent p-0"
                />
              </label>
            </div>
            <label
              className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-muted/60 px-2.5 py-1.5 text-[11px] text-muted-foreground"
              title="Pull each stop's chroma into the sRGB gamut so nothing clips (⚠)"
            >
              <input
                type="checkbox"
                checked={!!params.fitGamut}
                onChange={(e) => patch({ fitGamut: e.target.checked })}
                className="size-3 accent-foreground"
              />
              fit gamut
            </label>
            <span className="text-xs text-muted-foreground tabular-nums">
              {swatches.length} stops
              {oog > 0 && <span className="text-destructive"> · {oog} oog</span>}
            </span>
          </div>
        </CardHeader>
        <CardContent className="px-6">
          {hydrated ? (
            <RampPreview swatches={swatches} surface={surface} />
          ) : (
            <div className="h-56 w-full animate-pulse rounded-2xl bg-muted/30" />
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* Controls */}
        <Card className="h-fit min-w-0 py-6">
          <CardContent className="flex flex-col gap-5 px-6">
            <p className="text-[11px] text-muted-foreground">
              variable prefix:{" "}
              <span className="font-mono text-foreground/80">--{slug(name)}-*</span>
            </p>
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
              label="Hue shift across ramp"
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
              label="Lightness — lightest stop"
              value={params.lTop.toFixed(3)}
              min={0.8}
              max={1}
              step={0.001}
              current={params.lTop}
              onChange={(v) => patch({ lTop: v })}
            />
            <SliderField
              label="Lightness — darkest stop"
              value={params.lBottom.toFixed(3)}
              hint="Keep above ~0.13; pure black smears on dark surfaces."
              min={0.08}
              max={0.4}
              step={0.001}
              current={params.lBottom}
              onChange={(v) => patch({ lBottom: v })}
            />
            <SliderField
              label="Lightness curve"
              value={(params.lCurve ?? 1).toFixed(2)}
              hint="1.0 = even steps. Below 1 packs tone toward the dark end — deeper, denser darks for dark-mode surface layering — while keeping the light steps dramatic. Above 1 lifts the mid-tones lighter (Tailwind-like) but spreads the darks."
              min={0.5}
              max={2}
              step={0.05}
              current={params.lCurve ?? 1}
              onChange={(v) => patch({ lCurve: v })}
            />

            <Separator />

            <SliderField
              label="Most vivid lightness"
              value={params.lPeak.toFixed(3)}
              hint={
                `Where colour peaks — independent of the ladder.` +
                (peakLabel !== null ? ` Currently near stop ${peakLabel}.` : "") +
                ` Raise it for a light brand (e.g. lime); the steps stay even.`
              }
              min={0.3}
              max={0.92}
              step={0.001}
              current={params.lPeak}
              onChange={(v) => patch({ lPeak: v })}
            />
            <SliderField
              label="Max chroma (at vivid point)"
              value={params.cMax.toFixed(3)}
              min={0}
              max={0.37}
              step={0.001}
              current={params.cMax}
              onChange={(v) => patch({ cMax: v })}
            />
            <SliderField
              label="Chroma falloff (bell width)"
              value={params.sigma.toFixed(2)}
              hint="Smaller = chroma drops faster toward white and black (less wash, less mud)."
              min={0.06}
              max={0.5}
              step={0.01}
              current={params.sigma}
              onChange={(v) => patch({ sigma: v })}
            />

            <Separator />

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="stops" className="text-xs text-muted-foreground">
                Stops
              </Label>
              <Input
                id="stops"
                value={stopsText}
                onChange={(e) => onStopsText(e.target.value)}
                className="font-mono text-xs"
                spellCheck={false}
              />
              <p className="text-[10px] text-muted-foreground/70">
                Labels are just names — lightness is spread evenly across them, so
                adding a step re-spaces the ladder.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Secondary — curve + export + saved set */}
        <div className="flex min-w-0 flex-col gap-6">
          <Card className="gap-4 py-6">
            <CardHeader className="px-6">
              <CardTitle className="text-sm font-medium">
                Lightness &amp; chroma
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6">
              {hydrated ? (
                <ChromaCurve swatches={swatches} cMax={params.cMax} />
              ) : (
                <div className="h-56 w-full animate-pulse rounded-xl bg-muted/20" />
              )}
            </CardContent>
          </Card>

          <Card className="gap-4 py-6">
            <CardHeader className="px-6">
              <CardTitle className="text-sm font-medium">Export</CardTitle>
            </CardHeader>
            <CardContent className="px-6">
              <ExportPanel current={current} saved={savedRamps} />
            </CardContent>
          </Card>

          <Card className="gap-4 py-6">
            <CardHeader className="px-6">
              <CardTitle className="text-sm font-medium">
                Ramps in {activeProject?.name ?? "project"}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6">
              <SavedRamps
                saved={savedRamps}
                activeId={activeId}
                onLoad={load}
                onDelete={del}
              />
            </CardContent>
          </Card>
        </div>
      </div>
      </main>
      <div aria-hidden className="page-gutter border-l border-border" />
    </div>
  );
}
