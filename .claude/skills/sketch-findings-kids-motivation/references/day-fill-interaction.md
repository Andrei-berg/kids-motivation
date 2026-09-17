# Day-Fill Interaction

## Design Decisions

Today's `KidDayFillForm.tsx` is a single-open accordion across 6-8 `CollapsibleRow` sections,
all collapsed by default — the owner's exact complaint was "spряtano за стрелку" (everything
hidden behind one arrow). The priority given was **both** speed (fill everything in ~15-20s)
**and** transparency (see status/coin impact as you go), not a tradeoff between them.

**Decision: no single winner.** Sketch 002 produced three meaningfully different interaction
models that each serve a different kid's preference. Rather than replace `KidDayFillForm` with
one fixed redesign, **ship all three as a selectable per-child fill style** (a preference, not
a one-time choice — changeable anytime in the child's profile/settings). This is the same
resolution pattern used for sketch 003 (weekly-boost) — see that reference file.

**The three styles (all validated, all keep-worthy):**

1. **A — Плитки + шторка (tile grid + bottom sheet).** The whole day renders as a 2-column
   grid of status tiles (icon + title + status line, `.tile.done` turns mint). Every category's
   state is visible at rest — maximum transparency with zero panels open. Tapping a tile slides
   up a bottom sheet (`.sheet`, `transform: translateY()` transition) scoped to just that
   category; closing it updates the tile in place. No page reflow, no accordion pushing
   neighboring rows around.
2. **B — Сторис-степпер (story stepper).** One category fills the whole screen at a time, a
   dot-progress track (`.dot-track`, à la Instagram Stories) up top shows position; answering a
   question **auto-advances** to the next incomplete category after a brief "Готово! ✓" toast.
   Fastest linear flow, most game-like ritual feel, but the "whole day at a glance" view is
   unavailable while mid-fill — trade transparency for momentum.
3. **C — Сводка + быстрые строки (sticky summary + inline rows) — default candidate.** A
   sticky ring (`conic-gradient` completion %) + live ticking coin total stay on screen
   permanently. Binary categories (Комната, Поведение) are answered with **one tap directly on
   the row** — no sheet, no accordion, zero "open something" step. Only multi-value categories
   (Оценки, Тренировка, Чтение, Настроение) expand a small inline panel in place, one at a time.
   Closest to today's real behavior, and fastest for the categories that are simple yes/no.

**Architectural implication:** this needs a `fill_style` preference stored per child (not
per-family — siblings may prefer different styles), most naturally alongside the existing
`backfill_mode` field on `children`, or a new small per-child settings row. Default candidate is
**C**, but confirm with the actual kids using the app before locking that default — this was
explicitly flagged as unconfirmed.

## CSS Patterns

```css
/* A: bottom sheet */
.sheet {
  position: fixed; left: 0; right: 0; bottom: 0; border-radius: 22px 22px 0 0;
  background: var(--color-surface); transform: translateY(100%);
  transition: transform .28s cubic-bezier(.2,.9,.3,1.1);
}
.sheet.open { transform: translateY(0); }

/* B: story dot progress track */
.dot { flex: 1; height: 5px; border-radius: 999px; background: var(--color-border); overflow: hidden; }
.dot .fill { height: 100%; width: 0%; background: var(--mint); transition: width .3s; }
.dot.current .fill { background: var(--sky); }

/* C: sticky completion ring, driven by conic-gradient */
.ring {
  width: 56px; height: 56px; border-radius: 50%;
  background: conic-gradient(var(--mint) 0deg, var(--color-border) 0deg); /* set angle = pct * 3.6deg */
}
.ring .hole { position: absolute; inset: 6px; background: var(--color-bg); border-radius: 50%; }

/* C: one-tap binary row (no sheet/accordion) */
.quick-row { display: flex; align-items: center; gap: 12px; border-radius: 16px; padding: 12px 14px; cursor: pointer; }
.quick-row.done { border-color: var(--mint); }
.switch { width: 44px; height: 26px; border-radius: 999px; background: var(--color-border); position: relative; transition: background .15s; }
.switch::after { content: ''; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; transition: transform .15s; }
.quick-row.done .switch { background: var(--mint); }
.quick-row.done .switch::after { transform: translateX(18px); }
```

**Shared reward-feedback pattern (used across all three):** a floating "+20 🪙" that rises and
fades on any coin-earning action —

```css
.float-plus {
  position: absolute; font-weight: 900; color: var(--mint); pointer-events: none;
  animation: floatUp .8s ease forwards;
}
@keyframes floatUp { 0% { opacity: 0; } 20% { opacity: 1; } 100% { opacity: 0; transform: translateY(-26px); } }
```

## HTML Structures

See `sources/002-day-fill-form/index.html` — three full variants (`#variant-a`, `#variant-b`,
`#variant-c`), each self-contained with working JS interaction (tile → sheet open/close, dot
stepper auto-advance, inline row toggle + panel expand). All three should be implemented as
real, selectable components — not just one.

## What to Avoid

- Don't force a single fill style — this was tried in discussion and explicitly rejected; each
  style suits a different kid's pace/preference.
- In variant B, don't skip the "Пропустить" (skip) escape hatch — a forced linear flow with no
  way to jump ahead becomes an annoying gate if a kid only wants to fix one category.
- Don't let the sticky summary bar (C) cover more than ~70px — it competes with the fill-form
  rows below it for the limited Day-screen vertical space.

## Origin
Synthesized from sketch: 002 (all three variants kept)
Source file available in: `sources/002-day-fill-form/index.html`
