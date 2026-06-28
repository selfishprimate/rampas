# CLAUDE.md — OKLCH Ramp Studio

Working brief for continuing this project in Claude Code. Read this first.
For the full decision history and the reasoning behind each choice (OKLCH vs HSL,
the chroma bell, the lime fix, etc.), see `docs/PROJECT_LOG.md`.

## What this is

A perceptual **primitive colour-ramp generator** for design-system token work,
built to feed an Invisible design system on a shadcn / Tailwind v4 stack. It
generates OKLCH ramps (0–1000 stops), matches brand colours, previews on
light/dark surfaces, organises ramps into projects, and exports to Tailwind
`@theme`, CSS `:root`, or DTCG JSON. Everything is local (no backend yet);
state persists in `localStorage`.

This is the **primitive** layer of a three-layer token model
(primitive → semantic → component). The semantic layer is not built yet — see
Roadmap.

## Stack & commands

- Next.js 15 (App Router) · React 19 · TypeScript · Tailwind v4 (CSS-first) ·
  shadcn/ui (new-york). Node 22.
- `npm install` · `npm run dev` · `npm run build` · `npm test`
- Tests use `node:test` + `tsx`. **Run `npm test` after touching anything in
  `lib/` — the colour maths is covered and must stay green.**
- Tailwind v4 has no `tailwind.config`; tokens live in `app/globals.css` via
  `@theme inline` over shadcn neutral OKLCH variables. This is a normal Tailwind
  v4 project (arbitrary utility values are fine).

## The core idea (don't break this)

Two **independent** axes. Conflating them was the main bug we fixed; keep them
separate.

1. **Lightness ladder — rank-based.** A stop's lightness comes from its **rank**
   (index in the sorted stop list), NOT its label value — `lightnessAt(t, …)` in
   `lib/ramp.ts` with `t = index / (count − 1)`. The map is
   `lTop + (lBottom−lTop)·t^(1+(lCurve−1)·t)`; `lCurve` (default **0.8** in the UI,
   1 = even steps) is a *mid-weighted* gamma: **<1 packs tone toward the dark end**
   (deeper, denser darks for dark-mode surface layering) while keeping light steps
   dramatic; **>1 lifts the mid-tones lighter** (Tailwind-like) but spreads the
   darks. This is how **Tailwind, Material, IBM Carbon and Lyft
   ColorBox** all work: labels (10, 25, 500…) are just *names for evenly-spaced
   slots*; lightness is spread across the slots, not proportional to the number.
   Consequences, all intended and test-locked:
   - **Every adjacent pair steps evenly** (≈0.04–0.07 L). The old label-proportional
     ladder crushed clustered light labels (0,10,25 sit in the top ~2–3 % of the
     range) into near-identical tones; rank spacing fixes that — 0→10→25→50 now
     step as dramatically as 800→850→900. `lTop` is 0.97 so the lightest stop is a
     faint tint (≈ Tailwind-50 / Carbon-10), not pure white — pure white is a
     separate `base.white` alias, the way uicolors/Tailwind/Material keep it out
     of the scale.
   - **Trade-off:** because lightness is rank-based, adding/removing a stop
     **re-spaces** the others (only the lTop/lBottom endpoints stay pinned). This
     replaces the old "adding a stop never moves the others" property — given up
     deliberately so clustered labels can't bunch up. Label values are now nominal.
2. **Chroma — a Gaussian bell on `lPeak`.** `C(L) = cMax·exp(−(L−lPeak)²/2σ²)`.
   `lPeak` ("most vivid lightness") is separate from the ladder. Peaks where the
   colour is most vivid, eases to ~0 toward white/black (prevents wash near
   white and mud near black).

Why OKLCH not HSL: OKLCH `L` is true perceptual lightness, so a shared ladder
gives every hue the same lightness at the same stop ⇒ predictable contrast. HSL
lightness is fake (RGB mid-range), so same-`L` hues differ wildly in brightness.

## Locked decisions

- **16-stop default**:
  `0,10,25,50,100,200,300,400,500,600,700,800,850,900,950,1000`. With the rank-based
  ladder these are 16 evenly-stepped slots; the labels are nominal names (a `200`
  token, not "20 % down the scale"). One ramp feeds both light and dark.
- **Stop 0 is a faint tint, NOT pure white** (`lTop = 0.97`). Tried pure-white-0
  (`lTop = 1.0`) but then any label sitting ~1% from white (10, 20…) was forced to
  near-white mush — geometric, no curve fixes it. Researching uicolors.app /
  Tailwind / Material / Carbon confirmed mature tools never put pure white (or a
  sub-50 step) in the scale: their lightest is a real ~0.95–0.97 tint. So pure
  white is a separate `base.white` alias at the semantic layer, not stop 0.
- **Brand colour need not be stop 500.** A light brand (Invisible's lime,
  ≈ oklch 0.77 0.20 131) naturally lands near **300**; the semantic layer will
  alias `primary` to wherever it sits.
- **White/black are NOT in ramps.** They're separate `base.white` / `base.black`
  aliases fed to `onColor` tokens at the semantic layer. The generator's stop 0 /
  1000 are a near-white tint / near-black, not pure.
- **Darkest stop stays ≳ 0.13 lightness** — pure black smears on dark surfaces.
- **Snap vs Pin** (colour match): Snap sets hue+lPeak+cMax so the brand sits
  near a generated stop; Pin forces the nearest stop to the exact entered colour
  (stored in `params.pin`, overrides that stop's L/C/H). Designers usually want
  Pin to preserve the brand hex verbatim.
- **UI chrome is deliberately neutral (gray).** A colour tool must not introduce
  competing hues, so colours are judged truthfully. Typography is a modern sans
  (system stack) with mono reserved for values/code — restyled after uicolors.app:
  the palette is a full-width hero of large rounded swatches, wide centred layout.
- **Gamut**: `fitGamut` (RampParams, **default on** via UI; toggle in the preview
  header) pulls each generated stop's chroma down to the sRGB boundary —
  preserving its L and H — so nothing clips (`maxChromaInGamut` in `lib/oklch.ts`).
  Pins are never gamut-mapped (verbatim). With it **off**, the raw chroma bell is
  shown and out-of-sRGB stops are flagged (⚠) and clipped — expected near white at
  high chroma; lower `cMax` or `σ` to pull them in. Gamut-fit is opt-in in the lib
  (`DEFAULT_PARAMS` leaves it unset) so the chroma-bell invariants stay
  test-locked; `normalizeParams` and the UI's `INITIAL_PARAMS` default it on.

## Data model

```
Project { id, name, ramps: Ramp[], createdAt }
Ramp    { id, name, params: RampParams }
RampParams { hue, hueShift, lTop, lBottom, lPeak, cMax, sigma, stops[], pin?, fitGamut?, lCurve?, /* lAnchor?, anchor? = deprecated */ }
```

`localStorage` keys:
- `oklch-ramp:projects:v1` → `{ projects, activeProjectId }`
- `oklch-ramp:draft` → working ramp `{ name, params, activeId }`
- `oklch-ramp:prefs` → `{ theme, lightBg, darkBg }`
- `oklch-ramp:saved` → **legacy** flat ramp list; auto-migrated into a first
  project on load. `normalizeParams()` derives `lPeak` from old `lAnchor`.

## File map

```
lib/oklch.ts     OKLCH⇄sRGB, gamut, readableOn, parseColor (hex/hsl/oklch), round
lib/ramp.ts      RampParams/Swatch/Ramp/Project types, buildSwatches (the two axes),
                 lightnessAt (rank-based), peakStopLabel, nearestStopToLightness, normalizeParams, slug
lib/export.ts    toTheme / toRoot / toDtcg + filenames
components/ramp-studio.tsx   orchestrator: all state, persistence, project + ramp actions
components/project-bar.tsx   switch / create / rename / delete projects
components/color-match.tsx   hex/HSL/OKLCH input, nearest-stop readout, snap/pin
components/ramp-preview.tsx  swatch strip on the chosen surface, gamut/pin markers, copy
components/chroma-curve.tsx  SVG: lightness line + chroma bell, dots in true colour
components/export-panel.tsx  format tabs + scope (this ramp / all in project) + copy/download
components/saved-ramps.tsx   ramps in the active project (load/delete)
components/ui/*              shadcn primitives (button, card, input, label, slider, tabs, separator)
app/globals.css  Tailwind v4 + shadcn neutral OKLCH tokens + @theme inline bridge
app/layout.tsx   no-FOUC theme script (reads oklch-ramp:prefs)
test/*.test.ts   node:test coverage for oklch / ramp / export
```

## Conventions

- shadcn new-york components, `data-slot` attributes, no `forwardRef` (React 19).
- Sans-forward, neutral UI (mono only for hex/numeric values). Native `<select>` / `<input type=color>` where a
  shadcn primitive wasn't worth pulling in.
- Pure logic lives in `lib/` and is unit-tested; components stay thin.
- Verify after changes: `npm test` (logic) **and** `npm run build` (types).

## Roadmap (in order of intended next steps)

1. **Per-swatch contrast readouts** against the chosen light/dark surfaces
   (WCAG 2 ratio + APCA Lc). Note: WCAG contrast ≠ OKLCH L — compute from the
   actual hex. Especially needed for light fills like lime (black text on lime).
2. **Semantic mapping layer** — a per-mode role→stop table
   (`surface-0..3`, `border-subtle/default/strong`, `primary`, `primary-text`,
   `on-primary`, …) emitted as **DTCG aliases**. Light maps to darker stops,
   dark to lighter (e.g. `primary` light=600 / dark=400), validated by contrast,
   not by arithmetic. `on-primary` for a light brand = `base.black`.
3. **Per-project surfaces** (currently global app prefs).
4. **Productization** (musing, not started): auth, cloud persistence/multi-device,
   shareable project links, and publishing each project as a shadcn
   `registry:base` endpoint so teams can `npx shadcn add`. The data model is
   already project→ramp, so this is an additive backend layer.

## Gotchas

- Don't reintroduce a single "anchor" that drives both lightness and chroma — it
  reintroduces the lopsided-ladder bug. Keep `lPeak` independent of the ladder.
- `next build` type-checks `test/*.test.ts` too (they're in tsconfig). Keep them
  type-clean.
- `nearestStopToLightness` builds swatches with `pin: null` so the nominal ladder
  is used for matching.
