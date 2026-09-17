---
sketch: 001
name: family-feed
question: "What layout/hierarchy makes the Feed feel like a motivational social network, not an activity log?"
winner: "D"
tags: [feed, layout, reactions]
---

# Sketch 001: Family Feed

## Design Question
Right now `FamilyFeed` reads like a flat activity log. The owner wants it to feel like the
core of a "motivational social network" for the family — recognition and hype, not a ledger.
No money amounts, no penalties/corrections (those stay private per the earlier discussion).
Also explores a sibling "подколоть" (tease) mechanic — playful rivalry, not mockery.

## How to View
```
open .planning/sketches/001-family-feed/index.html
```

## Variants
- **A: Путь (Duolingo)** — vertical achievement path with a connecting rail, day-grouped, each
  event is a node + compact card. Streak pill up top. Reads like a skill-tree progress trail.
- **B: Kudos-карточки (Strava)** — each event is its own bigger "activity post" card with an
  avatar header and a hero stat block, kudos-style reaction button front and center.
- **C: Сторис + чат (Instagram + Discord)** — horizontal story reel of today's highlights up
  top (tap opens a full-bleed stat moment), full history below as a two-sided chat thread with
  inline emoji reactions — closest to "everyone's here right now."
- **D: Синтез** — C's story reel for today's highlights (tap → full-bleed moment) sits on top of
  A's day-grouped card list, but each card borrows B's compact hero-stat block (icon + big line +
  sub-line) instead of A's small node. The left color rail replaces A's connecting line — same
  signal ("what kind of event"), lighter weight, and it reuses the real `CollapsibleRow` status-rail
  pattern already in the kid app instead of inventing a new device.

## What to Look For
- Does it read as *celebration* or as a *record*? (the whole point of the redesign)
- How well does the "подколоть" (tease) interaction fit each layout — does it feel playful or
  does it clutter the card?
- Which structure scales best to a busy week (10+ events/day across 2-3 kids) without becoming
  a wall of noise?
- The story-reel in C is the most novel piece — does "today's highlight, tap to open" earn its
  place, or is it a gimmick on a feed that's already fast to scroll?
