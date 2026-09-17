# Sketch Manifest

## Design Direction

Game energy, Duolingo/Strava/Discord/Instagram-Stories DNA — bright, warm, family-friendly,
not enterprise. Two screens under exploration: the Family Feed (reframed as the family's
"motivational social network" — achievements and recognition, never money, never penalties)
and the kid Day-fill form (needs to feel both fast *and* transparent about what's happening
and why — the two priorities the owner picked together).

Grounded in the real kid palette `components/kid/design/kidTheme.ts` (`K`) and the existing
component vocabulary in `components/kid/design/atoms.tsx` (CollapsibleRow, KMButton, BoostMeter,
XPBar, CoinPill, StreakFlame, ProgressRing, Confetti) — sketches reuse those visual signatures
(18px card radius, pressed-shadow buttons, mango boost bar, mint = done) rather than inventing
a new language from scratch.

## Reference Points

- **Duolingo** — playful gamification, streaks, mascot energy, achievement cards
- **Strava** — progress rings, activity cards, lightweight "kudos" reactions
- **Discord** — live chat-like feed, emoji reactions, "everyone's here right now" feel
- **Instagram Stories** — story-reel highlights, card-based moments over dense lists

## Sketches

| # | Name | Design Question | Winner | Tags |
|---|------|----------------|--------|------|
| 001 | family-feed | What layout/hierarchy makes the Feed feel like a *motivational* social network, not a log? | D — story reel + hero-stat rail cards | feed, layout, reactions |
| 002 | day-fill-form | How do we make the day-fill form feel fast AND transparent instead of "hidden behind an arrow"? | TBD | day, form, interaction |
| 003 | weekly-boost | How should the weekly boost show *why* it's filling, not just that it is? | TBD | boost, progress |
