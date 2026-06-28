import { oklchToHex, oklchCss, maxChromaInGamut, type RgbResult } from "./oklch";

export interface RampParams {
  /** Base hue in degrees (0..360). */
  hue: number;
  /** Optional hue drift across the ramp, relative to the vivid point. 0 keeps hue constant. */
  hueShift: number;
  /** Lightness of the lightest stop. */
  lTop: number;
  /** Lightness of the darkest stop. */
  lBottom: number;
  /** Lightness at which chroma peaks. Independent of the lightness ladder. */
  lPeak: number;
  /** Maximum chroma, reached at lPeak. */
  cMax: number;
  /** Bell-curve width (in lightness units). Smaller = chroma falls off faster toward the extremes. */
  sigma: number;
  /**
   * When true, chroma is held constant at `cMax` for every stop instead of following
   * the Gaussian bell (lPeak/sigma are ignored). `fitGamut` still pulls each stop into
   * the sRGB gamut, so the extremes dip rather than clip. The simpler "only L changes"
   * look — duller mid-tones than the bell, but flat saturation.
   */
  constantChroma?: boolean;
  /**
   * Lightness-ladder curve (1 = linear). >1 lifts the mid-tones lighter — matching
   * how Tailwind / IBM Carbon distribute lightness — via a mid-weighted gamma that
   * leaves the lightest steps (0,10,20) unwashed. Endpoints (lTop/lBottom) unchanged.
   */
  lCurve?: number;
  /** Stop labels, e.g. [0,10,20,50,100,...,1000]. Order-independent. */
  stops: number[];

  /**
   * When true, each generated stop's chroma is pulled down to the sRGB gamut
   * boundary (preserving its lightness and hue) so no stop is ever out of gamut.
   * Off keeps the raw chroma bell and flags clipped stops (⚠). Pins are never
   * gamut-mapped — they stay verbatim.
   */
  fitGamut?: boolean;

  /** Optional exact-colour override: forces one stop to render a specific OKLCH value. */
  pin?: { label: number; l: number; c: number; h: number } | null;

  /** @deprecated kept only so older saved ramps still load. */
  anchor?: number;
  /** @deprecated superseded by lPeak; used as a fallback when loading old data. */
  lAnchor?: number;
}

export interface Swatch {
  label: number;
  l: number;
  c: number;
  h: number;
  hex: string;
  inGamut: boolean;
  css: string;
  pinned?: boolean;
}

export interface Ramp {
  id: string;
  name: string;
  params: RampParams;
}

export interface Project {
  id: string;
  name: string;
  ramps: Ramp[];
  createdAt: number;
}

export const DEFAULT_STOPS = [
  0, 10, 25, 50, 100, 200, 300, 400, 500, 600, 700, 800, 850, 900, 925, 950, 975,
  1000,
];

export const DEFAULT_PARAMS: RampParams = {
  hue: 264,
  hueShift: 0,
  lTop: 0.97,
  lBottom: 0.14,
  lPeak: 0.62,
  cMax: 0.15,
  sigma: 0.45,
  stops: DEFAULT_STOPS,
};

/** Default lightness-curve strength for the UI. 1 = even (linear) steps; >1 bends
 *  the ladder into an S-curve — gentle, close steps at BOTH ends (subtle pale tints
 *  up top, dense deep tones at the bottom for dark-mode surfaces) with a steeper,
 *  more vivid middle. ~1.3 mirrors how Tailwind distributes lightness. */
export const DEFAULT_L_CURVE = 1.3;

/**
 * Lightness at a normalised position `t` (0 = lightest stop, 1 = darkest).
 *
 * IMPORTANT: `t` is the stop's *rank* among the sorted stops (index / (count−1)),
 * NOT its label value. This is how Tailwind, Material, IBM Carbon and Lyft ColorBox
 * all work — the stop labels (10, 25, 500…) are just names for evenly-spaced slots;
 * lightness is distributed across the slots, not proportionally to the number. A
 * label-proportional ladder crushes clustered light labels (0,10,25 sit in the top
 * 2–3 % of the range) into near-identical tones; rank spacing gives every adjacent
 * pair an even, dramatic step.
 *
 * `lCurve` shapes the descent as an **S-curve** (logistic-style),
 * `tᵏ / (tᵏ + (1−t)ᵏ)` with `k = lCurve`:
 *   - `lCurve = 1`: even (linear) steps.
 *   - `lCurve > 1`: gentle, close steps at BOTH ends — subtle pale tints up top
 *     (the 50→100-style accelerating light cluster Tailwind uses) AND dense deep
 *     tones at the bottom (for dark-mode surface layering) — with a steeper,
 *     more vivid middle. This is the default (~1.3).
 * lTop/lBottom (the endpoints) are unchanged; only the in-between shape bends.
 */
function lightnessAt(
  t: number,
  lTop: number,
  lBottom: number,
  lCurve = 1,
): number {
  let shaped = t;
  if (lCurve !== 1 && t > 0 && t < 1) {
    const a = Math.pow(t, lCurve);
    const b = Math.pow(1 - t, lCurve);
    shaped = a / (a + b);
  }
  return lTop + (lBottom - lTop) * shaped;
}

/**
 * Generate swatches for a ramp.
 *
 * Two independent axes:
 *  - Lightness ladder: rank-based — each stop's lightness comes from its position
 *    in the sorted list (see lightnessAt), so adjacent stops always step evenly
 *    regardless of how close their labels are.
 *  - Chroma: a Gaussian bell centered on lPeak — peaks where the colour is most
 *    vivid and eases to ~0 toward white and black, so the lightest stops don't
 *    wash out and the darkest don't go muddy. Moving the vivid point (e.g. up high
 *    for a light brand like lime) does NOT distort the ladder.
 */
export function buildSwatches(p: RampParams): Swatch[] {
  const sorted = Array.from(new Set(p.stops)).sort((a, b) => a - b);
  if (sorted.length === 0) return [];

  const n = sorted.length;
  const lPeak = p.lPeak ?? p.lAnchor ?? DEFAULT_PARAMS.lPeak;
  const span = p.lTop - p.lBottom || 1;
  const posPeak = (p.lTop - lPeak) / span;

  return sorted.map((label, i) => {
    const t = n > 1 ? i / (n - 1) : 0; // rank position, not label value
    let l = lightnessAt(t, p.lTop, p.lBottom, p.lCurve);
    const pos = (p.lTop - l) / span;
    let h = p.hue + p.hueShift * (pos - posPeak);
    let c = p.constantChroma
      ? p.cMax
      : p.cMax * Math.exp(-((l - lPeak) ** 2) / (2 * p.sigma * p.sigma));
    // Optionally pull chroma into the sRGB gamut (keeps L & H), so no stop clips.
    if (p.fitGamut) c = maxChromaInGamut(l, h, c);

    let pinned = false;
    if (p.pin && label === p.pin.label) {
      l = p.pin.l;
      c = p.pin.c;
      h = p.pin.h;
      pinned = true;
    }

    const { hex, inGamut }: RgbResult = oklchToHex(l, c, h);
    return { label, l, c, h, hex, inGamut, css: oklchCss(l, c, h), pinned };
  });
}

/** The stop whose lightness is closest to the vivid point — for UI feedback. */
export function peakStopLabel(p: RampParams): number | null {
  const sorted = Array.from(new Set(p.stops)).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const n = sorted.length;
  const lPeak = p.lPeak ?? p.lAnchor ?? DEFAULT_PARAMS.lPeak;
  let best = sorted[0];
  let bestD = Infinity;
  sorted.forEach((label, i) => {
    const t = n > 1 ? i / (n - 1) : 0;
    const l = lightnessAt(t, p.lTop, p.lBottom, p.lCurve);
    const d = Math.abs(l - lPeak);
    if (d < bestD) {
      bestD = d;
      best = label;
    }
  });
  return best;
}

/** The stop whose generated lightness is closest to a target — for colour matching. */
export function nearestStopToLightness(
  p: RampParams,
  targetL: number,
): number | null {
  const sw = buildSwatches({ ...p, pin: null });
  if (sw.length === 0) return null;
  let best = sw[0].label;
  let bestD = Infinity;
  for (const s of sw) {
    const d = Math.abs(s.l - targetL);
    if (d < bestD) {
      bestD = d;
      best = s.label;
    }
  }
  return best;
}

/** Fill in defaults and derive lPeak from older saved data. */
export function normalizeParams(p: Partial<RampParams>): RampParams {
  const lPeak = p.lPeak ?? p.lAnchor ?? DEFAULT_PARAMS.lPeak;
  return {
    ...DEFAULT_PARAMS,
    ...p,
    lPeak,
    fitGamut: p.fitGamut ?? true,
    lCurve: p.lCurve ?? DEFAULT_L_CURVE,
    stops: p.stops && p.stops.length ? p.stops : DEFAULT_PARAMS.stops,
  };
}

/** Slugify a ramp name for use in CSS variable / token keys. */
export function slug(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "ramp"
  );
}
