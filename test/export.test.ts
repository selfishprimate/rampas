import { test } from "node:test";
import assert from "node:assert/strict";
import { toTheme, toRoot, toDtcg } from "../lib/export";
import { DEFAULT_PARAMS, type Ramp } from "../lib/ramp";

const ramps: Ramp[] = [{ id: "1", name: "Brand", params: DEFAULT_PARAMS }];

test("tailwind @theme export", () => {
  const css = toTheme(ramps);
  assert.match(css, /@theme \{/);
  assert.match(css, /--color-brand-500: oklch\(/);
});

test("css :root export", () => {
  assert.match(toRoot(ramps), /--brand-500: oklch\(/);
});

test("dtcg export", () => {
  const json = JSON.parse(toDtcg(ramps));
  assert.equal(json.brand.$type, "color");
  assert.ok(String(json.brand["500"].$value).startsWith("oklch("));
});
