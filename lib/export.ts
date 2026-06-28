import { buildSwatches, slug, type Ramp } from "./ramp";
import { round } from "./oklch";

export type ExportFormat = "theme" | "root" | "dtcg";

export const FORMAT_LABELS: Record<ExportFormat, string> = {
  theme: "Tailwind @theme",
  root: "CSS :root",
  dtcg: "DTCG JSON",
};

function lines(ramps: Ramp[], wrap: (name: string, label: number, css: string) => string) {
  const out: string[] = [];
  ramps.forEach((ramp, i) => {
    if (i > 0) out.push("");
    const name = slug(ramp.name);
    out.push(`  /* ${ramp.name} */`);
    for (const s of buildSwatches(ramp.params)) {
      out.push(wrap(name, s.label, s.css));
    }
  });
  return out.join("\n");
}

/** Tailwind v4: register primitives in @theme so they generate utilities (bg-{name}-{label}). */
export function toTheme(ramps: Ramp[]): string {
  const body = lines(
    ramps,
    (name, label, css) => `  --color-${name}-${label}: ${css};`,
  );
  return `@theme {\n${body}\n}`;
}

/** Plain custom properties under :root. */
export function toRoot(ramps: Ramp[]): string {
  const body = lines(
    ramps,
    (name, label, css) => `  --${name}-${label}: ${css};`,
  );
  return `:root {\n${body}\n}`;
}

/** W3C Design Tokens (DTCG) format — one group per ramp. */
export function toDtcg(ramps: Ramp[]): string {
  const root: Record<string, unknown> = {};
  for (const ramp of ramps) {
    const group: Record<string, unknown> = {
      $type: "color",
    };
    for (const s of buildSwatches(ramp.params)) {
      group[String(s.label)] = {
        $value: s.css,
        ...(s.inGamut ? {} : { $description: "out of sRGB gamut (clipped)" }),
        $extensions: {
          "com.oklch": { l: round(s.l, 4), c: round(s.c, 4), h: round(s.h, 2) },
        },
      };
    }
    root[slug(ramp.name)] = group;
  }
  return JSON.stringify(root, null, 2);
}

export function exportRamps(format: ExportFormat, ramps: Ramp[]): string {
  if (ramps.length === 0) return "";
  switch (format) {
    case "theme":
      return toTheme(ramps);
    case "root":
      return toRoot(ramps);
    case "dtcg":
      return toDtcg(ramps);
  }
}

export function exportFilename(format: ExportFormat, single?: string): string {
  const base = single ? slug(single) : "ramps";
  return format === "dtcg" ? `${base}.tokens.json` : `${base}.css`;
}
