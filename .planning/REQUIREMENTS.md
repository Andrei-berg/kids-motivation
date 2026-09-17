# Requirements — Milestone v9.0: Kid Experience Redesign

**Gathered:** 2026-09-17
**Status:** Ready for roadmap
**Source:** `/gsd:new-milestone`, grounded in `.claude/skills/sketch-findings-kids-motivation/`
(validated design decisions from the 2026-09-17 sketch session — sketches 001-003)

---

## v1 Requirements

### Family Feed (FEED)

- [ ] **FEED-01**: Kid and parent can see a story-reel of each child's single biggest highlight
  for today at the top of the Feed screen; tapping it opens a full celebratory moment view.
- [ ] **FEED-02**: Feed shows a day-grouped list of event cards (day completed, streak, boost,
  badge, medal, reading approved, reward purchased, parent free-text note) with a color-coded
  left status rail indicating event type — reusing the existing `CollapsibleRow` rail pattern.
- [ ] **FEED-03**: Feed never displays money amounts or coin costs for reward purchases — only
  the reward name (e.g. "Адам взял час приставки", never a price/coin figure).
- [ ] **FEED-04**: Feed never displays penalties, corrections, or negative behavior-tag events —
  those remain visible only in the private Wallet/audit trail.
- [ ] **FEED-05**: Any family member can react to a feed event with a fixed emoji set
  (toggleable per user, with visible count).
- [ ] **FEED-06**: A child can send a sibling a "подколоть" (tease) reply chosen from a fixed set
  of pre-written playful phrases (not freeform text); it posts inline under the event card.
- [ ] **FEED-07**: A medal sent kid→kid posts to the feed as its own recognized event type.

### Day-fill Form Styles (DAYFORM)

- [ ] **DAYFORM-01**: Each child has a `fill_style` preference (`tile-sheet` / `story-stepper` /
  `sticky-summary`) that is settable and changeable anytime from the child's profile/settings.
- [ ] **DAYFORM-02**: `tile-sheet` style — the whole day renders as a grid of per-category status
  tiles; tapping a tile opens a bottom sheet scoped to that category only.
- [ ] **DAYFORM-03**: `story-stepper` style — one category fills the screen at a time with a
  dot-progress track; completing a category auto-advances to the next incomplete one, with an
  explicit skip control.
- [ ] **DAYFORM-04**: `sticky-summary` style — a persistent completion ring + live coin total
  stays on screen; binary categories are answered with one tap directly on their row (no
  sheet/accordion); multi-value categories expand a small inline panel in place.
- [ ] **DAYFORM-05**: All three fill styles show live coin-earning feedback (a floating amount
  and a ticking running total) on every category filled.
- [ ] **DAYFORM-06**: Default `fill_style` for a child with no explicit preference is
  `sticky-summary` (closest to current behavior).

### Weekly Boost Detail Styles (BOOST)

- [ ] **BOOST-01**: Each child has a `boost_style` preference (`segmented-bar` /
  `quest-checklist` / `ring-badges`) that is settable and changeable anytime from the child's
  profile/settings.
- [ ] **BOOST-02**: Tapping the existing inline `BoostMeter` on the Day hero opens the chosen
  `boost_style` detail view; the inline meter itself stays visually unchanged.
- [ ] **BOOST-03**: `segmented-bar` style shows the grades-tier progress and the
  consistency-bonus progress as two independent sub-bars with their own hint text.
- [ ] **BOOST-04**: `quest-checklist` style lists each boost condition (grade-tier thresholds,
  full-week completion, streak-threshold) as its own row with its own reward amount and
  progress, plus one combined total at the bottom.
- [ ] **BOOST-05**: `ring-badges` style shows one ring for the current total plus tappable tier
  badges (reached / next) that open a popover explaining what's needed for the next tier.
- [ ] **BOOST-06**: All three boost-detail styles read real tier thresholds and coin amounts from
  `lib/kid/boost-rules.ts` — no hardcoded illustrative values from the sketches.

---

## Future Requirements (deferred)

- Confirming the actual default `fill_style`/`boost_style` with the real kids using the app
  (human UAT, post-build) — not a blocker for building the mechanism itself.
- Final icon/illustration assets (sketches use emoji placeholders).

---

## Out of Scope (this milestone)

- **Parent Center bug-fix backlog** (Dashboard child-card ring calculation bug, Chat loading
  hang on unhydrated `familyId`, fake `Math.random()` Analytics chart, mock/non-functional Tasks
  screen, Shop money-reward creation exposure, Journal/Feed consolidation) — a distinct,
  separately-discussed body of work, not yet scheduled into any milestone.
- Statistics/Analytics full rebuild (real grades/homework/sport data) — separate future work.
- TV/wallboard screen revival — separate future work.
- "Spent on you" transparency banner on the kid screen — separate future work.
- v6.0 Monetization, v7.0 Social, v8.0 Native Apps — unchanged, unstarted, reserved for later.

---

## Traceability

_Filled by the roadmap step._
