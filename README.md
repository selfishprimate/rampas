# OKLCH Ramp Studio

A perceptual primitive-ramp generator for design-system token work. Built with
Next.js (App Router), Tailwind v4, and shadcn/ui — the same stack the ramps are
meant to feed.

One ramp drives **both light and dark** modes, so it stays dense at both ends
and never goes muddy at the extremes. The chroma follows a Gaussian bell
centered on the anchor: it peaks where your accent lives and eases to near-zero
toward white and black, which is what keeps the lightest stops from washing out
and the darkest from turning to mud.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
```

`npm run build && npm start` for a production build. `npm test` runs the colour-maths
suite (`node:test`). Continuing in Claude Code? Start with **CLAUDE.md**.

## Projects

Ramps live inside **projects**. Create a project (e.g. `Invisible`), add as many
ramps to it as you like, and switch between projects from the bar under the
header. Rename and delete are there too. Save / Update / New and the export
"all in project" scope all operate on the active project. Everything persists in
`localStorage`; an older flat ramp list is migrated into a first project
automatically.

## How it works

Two independent axes — this is the key idea:

**Lightness ladder (rank-based).** A stop's lightness comes from its **rank** in
the sorted list, not its label value — so every adjacent pair steps evenly and
clustered light labels (`0,10,25`) don't bunch up. This is how Tailwind, Material,
IBM Carbon and Lyft ColorBox work: the labels are just names for evenly-spaced
slots. (Trade-off: adding/removing a stop re-spaces the others; only the endpoints
stay pinned.) The lightest stop is a faint tint (`lTop` 0.97), not pure white —
pure white is a separate `base.white` alias, the way Tailwind / Material / uicolors
keep it out of the scale. A **lightness curve** (`lCurve`, default 0.8) controls
the distribution: below 1 packs tone toward the dark end — deeper, denser darks for
dark-mode surface layering — while keeping the light steps dramatic; above 1 lifts
the mid-tones lighter (Tailwind-like) but spreads the darks.

**Chroma (the bell).** Chroma follows a Gaussian centered on `lPeak` — the
"most vivid lightness":

```
C(L) = cMax · exp( −(L − lPeak)² / (2·σ²) )
```

`lPeak` is separate from the ladder. A light brand colour (e.g. lime) just means
you raise `lPeak`; the vivid band shifts up to the light stops while the steps
stay perfectly even. Lower `σ` drops chroma faster toward the extremes (less
wash near white, less mud near black). Pure neutrals fall out as `cMax → 0`.

**Gamut.** Each stop is converted OKLCH → linear sRGB → sRGB. Colors outside the
sRGB gamut are flagged (⚠ on the swatch, a count in the header) and clipped on
output. This is expected near white at high chroma — lower `cMax` or `σ` to pull
them in, or leave them if the clip is negligible.

Pure white/black are intentionally **not** in the ramp. Feed `onColor` tokens
from a separate `base.white` / `base.black` alias at the semantic layer.

## Light / dark theme

A switch in the header flips the whole instrument between light and dark. The
swatches sit directly on the framed page so every stop is judged on the actual
surface. Theme persists in `localStorage`.

## Match a brand colour

Paste a colour as **HEX** (default), **HSL**, or **OKLCH**. The tool reads it,
sets the ramp's hue and vivid point to match, and shows which stop it lands on by
lightness — alongside the colour the ramp generates there, so you can see the
delta.

- **Snap** — builds the ramp around the colour; the brand sits near a generated
  stop (close, but the ramp's value, not necessarily your exact hex).
- **Pin exact** — forces the nearest stop to render your exact colour; the rest
  of the ramp is generated around it. Use this when the brand hex must be
  preserved verbatim (it usually must). Pinned stops are marked in the preview.

A brand colour does **not** need to be stop 500 — a light brand (lime) naturally
lands around 300, and the semantic layer aliases `primary` to wherever it sits.

## Export

Three formats, single ramp or the whole saved set:

- **Tailwind `@theme`** — registers primitives so utilities like
  `bg-brand-500` generate automatically (Tailwind v4).
- **CSS `:root`** — plain custom properties.
- **DTCG JSON** — W3C Design Tokens, with the precise OKLCH values preserved
  under `$extensions` for round-tripping into Style Dictionary / Figma.

Saved ramps and the working draft persist in `localStorage`.

## Structure

```
lib/oklch.ts      OKLCH → sRGB conversion, gamut detection
lib/ramp.ts       ramp generation (lightness distribution + chroma bell)
lib/export.ts     @theme / :root / DTCG generators
components/        ramp-studio (orchestrator), preview, chroma-curve, export, saved
app/globals.css   shadcn neutral tokens (OKLCH) + @theme inline bridge
```

The UI chrome is deliberately neutral so generated colors are judged truthfully.

## Next step in the pipeline

These are **primitive** ramps. The next layer maps them to semantic tokens
(`surface-0..3`, `border-subtle/default/strong`, `primary`, `onColor`, …) via
DTCG aliases — that's the source of truth the shadcn `registry:base` /
`cssVars` output is compiled from.
