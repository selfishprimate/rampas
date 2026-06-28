// OKLCH color math — conversion to sRGB and gamut detection.
// Based on Björn Ottosson's Oklab/Oklch reference transforms.

export interface Oklch {
  l: number; // lightness 0..1
  c: number; // chroma (unbounded, practically ~0..0.4)
  h: number; // hue 0..360
}

function oklchToLinearSrgb(L: number, C: number, H: number): [number, number, number] {
  const hr = (H * Math.PI) / 180;
  const a = C * Math.cos(hr);
  const b = C * Math.sin(hr);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const gammaEncode = (x: number): number =>
  x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

export const round = (x: number, p = 3): number => {
  const f = 10 ** p;
  return Math.round(x * f) / f;
};

export interface RgbResult {
  hex: string;
  inGamut: boolean;
  rgb: [number, number, number];
}

/**
 * Convert an OKLCH triplet to an sRGB hex string.
 * `inGamut` is false when the color falls outside the sRGB gamut and was clipped.
 */
export function oklchToHex(L: number, C: number, H: number): RgbResult {
  const linear = oklchToLinearSrgb(L, C, H);
  const inGamut = linear.every((v) => v >= -1e-4 && v <= 1 + 1e-4);
  const rgb = linear.map((v) => Math.round(clamp01(gammaEncode(v)) * 255)) as [
    number,
    number,
    number,
  ];
  const hex =
    "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("");
  return { hex, inGamut, rgb };
}

/**
 * The largest chroma ≤ targetC that keeps (L, ·, H) inside the sRGB gamut.
 * Binary search; L and H are preserved so only saturation is pulled in
 * (perceptual gamut mapping — no hue twist, no lightness shift). Returns
 * targetC unchanged when the colour is already in gamut.
 */
export function maxChromaInGamut(L: number, H: number, targetC: number): number {
  if (targetC <= 0) return 0;
  if (oklchToHex(L, targetC, H).inGamut) return targetC;
  let lo = 0;
  let hi = targetC;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (oklchToHex(L, mid, H).inGamut) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** Format an OKLCH triplet as a CSS oklch() string. */
export function oklchCss(L: number, C: number, H: number): string {
  return `oklch(${round(L, 4)} ${round(C, 4)} ${round(H, 2)})`;
}

/** Pick a readable text color (black or white) for a swatch of lightness L. */
export function readableOn(L: number): string {
  return L > 0.62 ? "#000000" : "#ffffff";
}

/* ----------------------------------------------------------------------------
 * Reverse path: parse a user-entered colour (hex / HSL / OKLCH) into OKLCH.
 * -------------------------------------------------------------------------- */

export type ColorFormat = "hex" | "hsl" | "oklch";

export function hexToRgb(input: string): [number, number, number] | null {
  let s = input.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(s)) s = s.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
  const n = parseInt(s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hue2rgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((((h % 360) + 360) % 360) / 360);
  s = Math.min(1, Math.max(0, s));
  l = Math.min(1, Math.max(0, l));
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

export function srgbToOklch(r: number, g: number, b: number): Oklch {
  const lin = (v: number) => {
    const x = v / 255;
    return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  const R = lin(r), G = lin(g), B = lin(b);

  const l = 0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B;
  const m = 0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B;
  const s = 0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B;

  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const C = Math.sqrt(a * a + bb * bb);
  let H = (Math.atan2(bb, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { l: L, c: C, h: H };
}

function extractNumbers(s: string): number[] {
  return (s.match(/-?\d*\.?\d+/g) || []).map(Number);
}

/** Parse a colour string in the given format to OKLCH, or null if invalid. */
export function parseColor(input: string, format: ColorFormat): Oklch | null {
  const s = input.trim();
  if (!s) return null;

  if (format === "hex") {
    const rgb = hexToRgb(s);
    return rgb ? srgbToOklch(rgb[0], rgb[1], rgb[2]) : null;
  }

  if (format === "hsl") {
    const n = extractNumbers(s);
    if (n.length < 3) return null;
    const rgb = hslToRgb(n[0], n[1] / 100, n[2] / 100);
    return srgbToOklch(rgb[0], rgb[1], rgb[2]);
  }

  // oklch
  const n = extractNumbers(s);
  if (n.length < 3) return null;
  let [L] = n;
  if (L > 1) L = L / 100; // accept "62%" style lightness
  return { l: L, c: n[1], h: n[2] };
}
