---
name: sketch-findings-kids-motivation
description: Validated design decisions, CSS patterns, and visual direction from sketch experiments on the Family Feed, Day-fill form, and Weekly Boost. Auto-loaded during UI implementation on kids-motivation.
---

<context>
## Project: kids-motivation

Game energy — Duolingo / Strava / Discord / Instagram-Stories DNA — bright, warm,
family-friendly, explicitly **not** enterprise-feeling. Explored on the kid side of the app:
the Family Feed (reframed as the family's "motivational social network" — recognition and hype,
never money, never penalties) and the kid Day-fill screen (the form itself, plus the weekly
boost meter), which needed to feel both fast *and* transparent about what's happening and why.

Grounded throughout in the real kid palette `components/kid/design/kidTheme.ts` (`K`) and the
existing component vocabulary in `components/kid/design/atoms.tsx` (`CollapsibleRow`,
`KMButton`, `BoostMeter`, `XPBar`, `CoinPill`, `StreakFlame`, `ProgressRing`, `Confetti`) —
sketches reuse those visual signatures (18px card radius, pressed-shadow buttons, mango boost
bar, mint = done, the `CollapsibleRow` status-rail) rather than inventing a new language.

Sketch session wrapped: 2026-09-17
</context>

<design_direction>
## Overall Direction

- **Palette:** exactly `K` from `kidTheme.ts` — sky (primary), grape (level/XP/achievement),
  mint (done/earned), mango (coins/streak/boost), berry (celebration), on a cream ground.
- **Type:** Rubik (display/headings/numbers) + Nunito (body).
- **Shape:** 18px card radius, pill (999px) buttons/badges, `KMButton`'s pressed-shadow
  (`translateY(3px)` + shadow collapse on press).
- **Layout:** mobile-first, 420px stage, single column, sticky elements used sparingly (only
  where transparency genuinely requires always-on state — e.g. the day-fill summary ring).
- **Interaction principle validated across all three sketches:** live, immediate feedback for
  every action (floating "+N 🪙", pop/scale animations, instant toggle state) — the reward loop
  should be felt at the moment of the tap, not just at save time.
- **Recurring resolution pattern:** where multiple interaction styles each validated well for
  different use cases (day-fill-form, weekly-boost), the answer was **ship all as a per-child
  selectable style** rather than force one winner — see the two relevant reference files for the
  architectural implication (a `fill_style` / `boost_style` preference per child).
</design_direction>

<findings_index>
## Design Areas

| Area | Reference | Key Decision |
|------|-----------|--------------|
| Feed & Recognition | references/feed-and-recognition.md | Story reel (today's highlights) + day-grouped hero-stat cards with a `CollapsibleRow`-style color rail; no money, no penalties; "подколоть" sibling-tease mechanic |
| Day-Fill Interaction | references/day-fill-interaction.md | No single winner — 3 fill styles (tile+sheet / story-stepper / sticky-summary+inline-rows) shipped as a per-child preference, default candidate C |
| Progress & Boost | references/progress-and-boost.md | No single winner — 3 boost-detail styles (segmented bar / quest checklist / ring+tier badges) shipped as a per-child preference, opened by tapping the inline `BoostMeter` |

## Theme

The winning theme file is at `sources/themes/default.css` — CSS custom properties mirroring
`components/kid/design/kidTheme.ts` (`K`) exactly. When implementing for real, prefer importing
`K` from the actual TS file over hardcoding these CSS variables; the sketch theme exists so the
throwaway HTML mockups had a consistent, on-brand palette.

## Source Files

Original sketch HTML files (all variants, fully interactive) are preserved in `sources/` for
complete reference:
- `sources/001-family-feed/index.html` (variants A, B, C, D — D is the synthesis winner)
- `sources/002-day-fill-form/index.html` (variants A, B, C — all three kept)
- `sources/003-weekly-boost/index.html` (variants A, B, C — all three kept)
</findings_index>

<metadata>
## Processed Sketches

- 001-family-feed
- 002-day-fill-form
- 003-weekly-boost
</metadata>
