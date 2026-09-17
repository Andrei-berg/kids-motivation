---
sketch: 002
name: day-fill-form
question: "How do we make the day-fill form feel fast AND transparent instead of hidden behind an arrow?"
winner: "A, B, C — kept as selectable fill styles, not a single winner"
tags: [day, form, interaction]
---

# Sketch 002: Day-fill Form

## Design Question
Today's `KidDayFillForm` is a single-open accordion across 6-8 sections (`CollapsibleRow`):
everything collapsed by default, only a live coin-preview strip and the save button always
visible. The owner named this exactly — "spряtano за стрелку" — and picked **both** speed
(fill everything in 15-20s, minimal taps) and visible progress transparency (see what's done,
what isn't, and how it affects coins/boost as you go) as the priority, rather than choosing one.

Categories modeled: Комната, Поведение (binary), Оценки (multi-subject grade picker), Тренировка,
Чтение (binary-ish), Настроение (emoji pick) — a representative slice of the real 6-8 sections.

## How to View
```
open .planning/sketches/002-day-fill-form/index.html
```

## Variants
- **A: Плитки + шторка (tile grid + bottom sheet)** — the whole day is a 2-column grid of status
  tiles (glance = transparency), tapping one opens a focused bottom sheet just for that category
  (fast, no page reflow, no accordion pushing other rows around).
- **B: Сторис-степпер (story stepper)** — one category full-screen at a time with a dot-progress
  track up top (à la Instagram Stories); answering a question auto-advances to the next one.
  Fastest possible per-category flow, but the "whole day at a glance" view is gone mid-fill.
- **C: Сводка + быстрые строки (sticky summary + inline rows)** — a sticky ring + live coin
  total always on screen; binary categories (Комната, Поведение) are a single tap directly on
  the row, no sheet/accordion at all; only multi-value categories (Оценки, Тренировка, Чтение,
  Настроение) expand a small inline panel in place.

## Decision
Owner's call: don't force one winner — each style has a genuinely different feel (methodical
grid vs. game-like ritual vs. fastest-for-binaries hybrid), and different kids may prefer
different ones. Ship all three as a **selectable fill style**, picked per child (profile/settings,
changeable anytime), rather than a single fixed redesign. Default candidate: **C** (closest to
today's real behavior + fastest for the two binary categories), but this should be confirmed with
the actual kids before locking a default.

## What to Look For
- Which one actually feels faster for the 2 one-tap categories (Комната/Поведение) — C removes
  the "open something" step entirely for those; does that matter enough to complicate the layout?
- Does B's forced linear order feel like a fun ritual or an annoying gate when you just want to
  fix one thing (e.g., only log today's grade)?
- A's grid gives full transparency at rest (every tile visible) without ever showing an open
  panel alongside others — does that read as more organized, or does the extra tap-to-open cost
  outweigh it?
- All three show live coin math per action (floating "+20", ticking total) — confirm that reads
  as rewarding rather than distracting once you fill 5-6 categories in a row.
