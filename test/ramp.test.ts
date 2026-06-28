import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildSwatches,
  nearestStopToLightness,
  peakStopLabel,
  DEFAULT_PARAMS,
  type Swatch,
} from "../lib/ramp";

const L = (sw: Swatch[], label: number) => sw.find((s) => s.label === label)!.l;
const C = (sw: Swatch[], label: number) => sw.find((s) => s.label === label)!.c;

test("ladder is fixed and independent of lPeak", () => {
  const base = buildSwatches(DEFAULT_PARAMS);
  const moved = buildSwatches({ ...DEFAULT_PARAMS, lPeak: 0.85 });
  base.forEach((s) =>
    assert.ok(Math.abs(L(base, s.label) - L(moved, s.label)) < 1e-9),
  );
});

test("lightness ladder spans lTop..lBottom, monotonic", () => {
  const sw = buildSwatches(DEFAULT_PARAMS);
  assert.ok(Math.abs(sw[0].l - DEFAULT_PARAMS.lTop) < 1e-9);
  assert.ok(Math.abs(sw[sw.length - 1].l - DEFAULT_PARAMS.lBottom) < 1e-9);
  for (let i = 1; i < sw.length; i++) {
    assert.ok(sw[i].l <= sw[i - 1].l + 1e-9);
  }
});

test("lightness is rank-based, not label-proportional (even steps)", () => {
  // Same stop COUNT, different middle label → identical middle lightness, because
  // lightness comes from rank, not the label value. This is how Tailwind/ColorBox work.
  const a = buildSwatches({ ...DEFAULT_PARAMS, stops: [0, 100, 1000] });
  const b = buildSwatches({ ...DEFAULT_PARAMS, stops: [0, 900, 1000] });
  assert.ok(Math.abs(a[1].l - b[1].l) < 1e-9);

  // With a linear curve, clustered light labels step as evenly as any other pair.
  const sw = buildSwatches({ ...DEFAULT_PARAMS, lCurve: 1, stops: [0, 10, 25, 1000] });
  const d01 = sw[0].l - sw[1].l;
  const d12 = sw[1].l - sw[2].l;
  const d23 = sw[2].l - sw[3].l;
  assert.ok(Math.abs(d01 - d12) < 1e-9 && Math.abs(d12 - d23) < 1e-9);
});

test("chroma peaks at the vivid point; a light brand peaks light", () => {
  const lime = buildSwatches({ ...DEFAULT_PARAMS, lPeak: 0.85 });
  const peak = peakStopLabel({ ...DEFAULT_PARAMS, lPeak: 0.85 })!;
  assert.ok(C(lime, peak) >= Math.max(...lime.map((s) => s.c)) - 1e-9);
  assert.ok(C(lime, 300) > C(lime, 500));
  assert.notEqual(peak, 500);
});

test("adding a stop re-distributes the ladder (ordinal), endpoints fixed", () => {
  const base = buildSwatches(DEFAULT_PARAMS);
  const extra = buildSwatches({
    ...DEFAULT_PARAMS,
    stops: [...DEFAULT_PARAMS.stops, 925],
  });
  // Endpoints stay pinned to lTop/lBottom...
  assert.ok(Math.abs(base[0].l - extra[0].l) < 1e-9);
  assert.ok(
    Math.abs(base[base.length - 1].l - extra[extra.length - 1].l) < 1e-9,
  );
  // ...but interior stops shift, since a new rank re-spaces the slots, and the
  // ordering around the inserted label is correct.
  assert.notEqual(L(base, 900), L(extra, 900));
  assert.ok(L(extra, 900) > L(extra, 925) && L(extra, 925) > L(extra, 950));
});

test("pin overrides exactly and flags the stop", () => {
  const near = nearestStopToLightness(DEFAULT_PARAMS, 0.77)!;
  const pinned = buildSwatches({
    ...DEFAULT_PARAMS,
    pin: { label: near, l: 0.77, c: 0.2, h: 131 },
  });
  const ps = pinned.find((s) => s.label === near)!;
  assert.equal(ps.pinned, true);
  assert.ok(Math.abs(ps.l - 0.77) < 1e-9 && Math.abs(ps.c - 0.2) < 1e-9);
});
