# Progress & Boost Visualization (Weekly Boost)

## Design Decisions

Today's `BoostMeter` (`components/kid/design/atoms.tsx`) is one mango progress bar + one hint
line ("До буста: ещё 3 пятёрки → +300"). The real formula in `lib/kid/boost-rules.ts` has two
independent components — a **grades tier** (best tier wins, not summed, disqualified by any
penalty grade) and a **consistency bonus** (full-week completion + streak-threshold) — plus 4
one-time milestone tiers shown separately on `/kid/achievements`. The owner wanted the "why"
visible, not just a single sentence.

**Decision: no single winner**, same resolution as day-fill-interaction — ship all three as a
**selectable per-child boost-detail style**. Practical split: the **inline `BoostMeter` on the
Day hero stays slim and unchanged in shape** regardless of style (there isn't room next to a
6-row fill form) — the chosen style is what renders in a detail view opened by **tapping** the
inline meter.

**The three styles:**

1. **A — Раздельные полосы (segmented dual bar).** Most literal mapping of the real formula:
   inside the mango hero card, two independent sub-bars — "📚 Оценки" (tier progress, e.g.
   "Тир 2 из 3") and "🔥 Стабильность" (bonus progress, e.g. "2 из 2 бонусов") — each with its
   own hint line. Best choice if you want the UI to directly teach "these are separate, the
   grade tier doesn't add up, it's best-tier-wins."
2. **B — Квест-чеклист (Duolingo daily quests).** Every condition is its own checklist row
   with its own checkmark/mini-progress and its own reward amount (e.g. "✓ 3 пятёрки за
   неделю +150", "2/5 — 5 пятёрок за неделю +300"), feeding one combined total + bar at the
   bottom. Most legible per-condition, most vertical space, closest to a familiar
   gamified-app pattern — but a flat list risks reading as *additive* even though tiers
   aren't summed, so pair it with a "лучший тир засчитывается" note if this style is used.
3. **C — Кольцо + бейджи тиров (ring + tappable tier badges).** One big ring for the current
   total; bronze/silver/gold circular badges below show tier status (reached = filled/colored,
   not-yet = grey), tapping one opens a small popover with the concrete requirement ("7
   пятёрок — ещё 2 → +500"). Plus a 7-dot week strip for the consistency bonus. Most compact
   at rest (detail is progressive, tap-to-reveal), most "trophy case" feeling.

## CSS Patterns

```css
/* A: segmented bar inside the boost hero card */
.seg-track { height: 10px; background: rgba(255,255,255,0.28); border-radius: 999px; overflow: hidden; }
.seg-fill { height: 100%; background: #fff; border-radius: 999px; transition: width .8s cubic-bezier(.2,.9,.3,1.1); }

/* B: quest checklist row */
.quest-check {
  width: 28px; height: 28px; border-radius: 50%; border: 2px solid var(--color-border);
  display: flex; align-items: center; justify-content: center;
}
.quest-item.done .quest-check { background: var(--mint); border-color: var(--mint); color: #fff; }
.quest-item.done .t1 { text-decoration: line-through; text-decoration-color: var(--mint); }

/* C: big ring + tappable tier badge with popover */
.ring-big { width: 160px; height: 160px; border-radius: 50%; } /* background = conic-gradient(var(--mango) Ndeg, var(--color-border) 0deg) */
.tier-badge .circ {
  width: 46px; height: 46px; border-radius: 50%; border: 2.5px solid var(--color-border);
  background: var(--color-border-soft); transition: all .15s;
}
.tier-badge.reached .circ { border-color: var(--mango); background: var(--mango-soft); }
.tier-pop {
  position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%) scale(0.9);
  opacity: 0; pointer-events: none; background: var(--color-text); color: #fff;
  border-radius: 10px; padding: 8px 12px; transition: opacity .15s, transform .15s;
}
.tier-badge.open .tier-pop { opacity: 1; transform: translateX(-50%) scale(1); pointer-events: auto; }
```

## HTML Structures

See `sources/003-weekly-boost/index.html` — `#variant-a`, `#variant-b`, `#variant-c`. Note the
placeholder numbers (tier thresholds, coin amounts) throughout are illustrative — wire real
values from `lib/kid/boost-rules.ts` when implementing, don't hardcode the sketch's numbers.

## What to Avoid

- Don't let any of these three replace the inline `BoostMeter` shape on the Day hero — all
  three are for the **tap-to-open detail view**, not the always-visible summary.
- In variant B, don't present the checklist without the "best tier, not summed" clarification —
  tested language alone (a flat list of rewards) invites the wrong mental model.
- Don't hardcode the illustrative tier numbers from the sketch (150/300/500, 3/5/7 grades) into
  real code — pull from `lib/kid/boost-rules.ts`.

## Origin
Synthesized from sketch: 003 (all three variants kept)
Source file available in: `sources/003-weekly-boost/index.html`
