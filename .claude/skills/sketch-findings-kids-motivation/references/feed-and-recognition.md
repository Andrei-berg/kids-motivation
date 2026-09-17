# Feed & Recognition (Family Feed)

## Design Decisions

The Family Feed (`components/feed/FamilyFeed.tsx`) is reframed from an activity log into a
"motivational social network" — recognition and hype for the whole family, never a ledger.

**Winning structure (sketch 001, variant D — synthesis of A/B/C):**

1. **Story reel up top** (borrowed from the Instagram-Stories-style variant C) — one bubble per
   kid showing today's single biggest highlight. Tap opens a full-bleed celebratory moment
   (big number/emoji + caption). Unseen highlight = colorful conic-gradient ring around the
   avatar; seen = flat border color.
2. **Day-grouped card feed below** (borrowed from the Duolingo-path variant A for grouping, but
   using the Strava-style variant B's compact hero-stat block instead of a small path node):
   each card = avatar/name/time header + an icon-in-rounded-square + one bold headline line +
   one muted sub-line (e.g. "🚀 +420 🪙 недельный буст" / "4 пятёрки и стрик без пропусков").
3. **Left color rail per card** replaces variant A's connecting vertical line. This is the key
   synthesis insight: **reuse the real `CollapsibleRow` status-rail pattern already in the kid
   app** (`components/kid/design/atoms.tsx`) instead of inventing a new "path" visual device.
   Rail color maps to event category:
   - `--mango` = boost
   - `--berry` = medal
   - `--mint` = day completed
   - `--grape` = reading
   - `--sky` = purchase
   - `--color-border` (neutral) = parent note

**Content rules validated in the mockup (from the earlier product discussion this sketch
grounds):**
- **No money amounts, ever.** Purchases show the reward name, never a price/coin cost
  ("Адам взял час приставки", not "−150 🪙").
- **No penalties, corrections, or behavior-tag negatives in the feed.** Those stay in the
  private Wallet/audit trail. Only positive event kinds appear: day completed, streak,
  boost, badge, medal (including medals sent kid→kid), reading approved, reward
  purchased, parent free-text note.
- **Reactions** (🔥 💪 ❤️ 👏 📚 🎮 etc.) are simple emoji-count chips, toggleable, with a pop
  animation on state change.
- **"Подколоть" (tease) mechanic** — a distinct sibling-rivalry feature: a button reveals a
  tray of preset lighthearted phrases ("Я быстрее наберу 😏", "Красавчик 🔥", "Ну погоди 😤").
  Picking one posts a small reply bubble under the card. This is deliberately playful, not
  mocking — keep presets pre-written by the app, not freeform text input, to keep the tone
  controlled.

## CSS Patterns

```css
/* Story reel */
.story-ring {
  width: 62px; height: 62px; border-radius: 50%; padding: 3px;
  background: conic-gradient(from 180deg, var(--mango), var(--berry), var(--grape), var(--mango));
}
.story-ring.seen { background: var(--color-border); }

/* Card with color rail (mirrors CollapsibleRow's status rail) */
.synth-card {
  display: flex; border-radius: 18px; background: var(--color-surface);
  border: 1.5px solid var(--color-border); overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.synth-rail { width: 5px; flex-shrink: 0; } /* background = category color */
.synth-body { flex: 1; padding: 12px 14px; }
.synth-hero { display: flex; align-items: center; gap: 10px; margin-top: 9px; }
.synth-hero .ic { width: 38px; height: 38px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }

/* Reaction chip with pop feedback */
.reaction-chip {
  border: 1.5px solid var(--color-border); background: #fff; border-radius: 999px;
  padding: 5px 10px; font-weight: 700; cursor: pointer; transition: transform .12s;
}
.reaction-chip.lit { border-color: var(--mango); background: var(--mango-soft); color: var(--mango-deep); }
.reaction-chip.pop { animation: pop .35s ease; }
@keyframes pop { 40% { transform: scale(1.28); } }
```

## HTML Structures

See `sources/001-family-feed/index.html`, variant D (`#variant-d`), for the complete validated
markup: story reel → day-label → sequence of `.synth-card` blocks, each with `.synth-rail` +
`.synth-top` (avatar/name/time) + `.synth-hero` (icon + headline + sub-line) + `.reaction-row`
+ optional `.tease-tray`.

## What to Avoid

- **Variant A (pure Duolingo path)** — the persistent vertical connecting line reads as a
  literal "skill tree," which doesn't scale well once a busy week produces many events across
  multiple kids; the line becomes a long uninterrupted rail with no visual rhythm.
- **Variant B (pure Strava kudos)** — full-size hero blocks per card (`.kudos-hero`, ~60px+
  tall) take too much vertical space for a feed that needs to hold a whole week of family
  activity; fine for a single-event detail view, not for the scrolling list.
- Don't show raw wallet transaction amounts or category totals in the feed — that belongs in
  the Wallet screen, not here.

## Origin
Synthesized from sketch: 001 (variant D)
Source file available in: `sources/001-family-feed/index.html`
