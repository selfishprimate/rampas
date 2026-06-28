import { test } from "node:test";
import assert from "node:assert/strict";
import { oklchToHex, parseColor, hexToRgb } from "../lib/oklch";

test("white and black anchors", () => {
  assert.equal(oklchToHex(1, 0, 0).hex, "#ffffff");
  assert.equal(oklchToHex(0, 0, 0).hex, "#000000");
});

test("flags out-of-gamut colours", () => {
  assert.equal(oklchToHex(0.6, 0.9, 30).inGamut, false);
  assert.equal(oklchToHex(0.62, 0.12, 264).inGamut, true);
});

test("hex round-trips within 1/255 per channel", () => {
  for (const hex of ["#84cc16", "#5782e0", "#e11d48", "#ffffff", "#000000"]) {
    const o = parseColor(hex, "hex")!;
    const back = oklchToHex(o.l, o.c, o.h).hex;
    const a = hexToRgb(hex)!;
    const b = hexToRgb(back)!;
    a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) <= 1, `${hex} -> ${back}`));
  }
});

test("parses hsl and oklch inputs", () => {
  const hslH = parseColor("82 78% 44%", "hsl")!.h;
  const hexH = parseColor("#84cc16", "hex")!.h;
  assert.ok(Math.abs(hslH - hexH) < 8);

  const o = parseColor("0.86 0.2 130", "oklch")!;
  assert.equal(o.l, 0.86);
  assert.equal(o.c, 0.2);
  assert.equal(o.h, 130);

  assert.equal(parseColor("62% 0.15 264", "oklch")!.l, 0.62);
  assert.equal(parseColor("nope", "hex"), null);
});
