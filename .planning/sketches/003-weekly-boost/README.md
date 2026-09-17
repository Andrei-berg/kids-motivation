---
sketch: 003
name: weekly-boost
question: "How should the weekly boost show *why* it's filling, not just that it is?"
winner: "A, B, C — kept as selectable boost-detail style, not a single winner"
tags: [boost, progress]
---

# Sketch 003: Weekly Boost

## Design Question
Today's `BoostMeter` is one mango bar + one hint line ("До буста: ещё 3 пятёрки → +300").
The real formula (`lib/kid/boost-rules.ts`) is two independent components — a **grades tier**
(best tier wins, not summed, disqualified by any penalty grade) and a **consistency bonus**
(full-week + streak-threshold) — plus 4 one-time milestone tiers shown elsewhere on
`/kid/achievements`. The owner wants the "why" visible on the Day screen itself, not just a
single sentence. Numbers here (tier thresholds, coin amounts) are illustrative placeholders —
real integration reads exact values from `lib/kid/boost-rules.ts`.

## How to View
```
open .planning/sketches/003-weekly-boost/index.html
```

## Variants
- **A: Раздельные полосы (segmented dual bar)** — mirrors the real formula shape exactly: one
  sub-bar for the grades tier, one for consistency, each with its own hint, inside the mango
  hero card. Most literal/accurate mapping of "how it's computed."
- **B: Квест-чеклист (Duolingo daily quests)** — every condition is its own checklist line with
  its own reward and progress, feeding one combined total + bar at the bottom. Most legible
  per-condition, most vertical space.
- **C: Кольцо + бейджи тиров (ring + tier badges)** — one big ring for the total, tappable
  bronze/silver/gold badges below show tier status (reached / next / what's needed) as a popover,
  plus a 7-dot week strip for the consistency bonus. Most "trophy case" feeling, detail is
  progressive (tap to reveal) rather than always-on.

## Decision
Same call as sketch 002: don't force a single winner, let each kid pick their style in Settings
(changeable anytime), consistent with the day-fill-form preference. Practical implication for
the real screen: the compact `BoostMeter` that lives inline on the Day hero stays slim regardless
of style (space next to a 6-row fill form is tight) — the chosen style (A/B/C) is what renders
when the kid *taps* the meter to see the full breakdown, not the always-on inline card.

## What to Look For
- A and B both put everything on screen at once (max transparency, more space used) vs. C's
  tap-to-reveal (more compact, less immediately legible) — which fits the Day screen's limited
  real estate better given it already has 6+ fill-form rows below it?
- Does splitting grades vs. consistency into two visibly separate tracks (A, C's ring+dots) help
  a kid understand "best tier, not summed" better than B's flat checklist, which could read as
  additive even though it isn't?
- B's checklist format is the closest visual language to Duolingo daily quests — check whether
  that reads as motivating or as "another to-do list" stacked on top of the day-fill form itself.
