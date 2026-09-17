// lib/kid/feed-highlights.ts
// Pure "biggest highlight" picker + rail-color lookup for the Family Feed
// story reel (Phase 9.1). No I/O, no Supabase, no React — operates on
// FeedEvent[] already fetched by components/feed/FamilyFeed.tsx.

import type { FeedEvent, FeedEventKind } from '@/lib/models/feed.types'
import { K } from '@/components/kid/design/kidTheme'

// Highest wins. Achievement-type events outrank the routine `day_filled`
// event (D-04 in .planning/phases/09.1-feed-recognition/09.1-CONTEXT.md).
// `kind === 'boost'` is treated as a single tier — the DB and every emitter
// write `kind: 'boost'` for both weekly_boost and boost_milestone; the two
// are only distinguishable via a `ref_id` substring, and this ranking
// deliberately does not parse `ref_id` (Pitfall 2 in 09.1-RESEARCH.md).
export const RANK_ORDER: FeedEventKind[] = [
  'badge', 'medal', 'boost', 'streak',
  'reading_approved', 'reward_approved', 'purchase', 'day_filled',
]

// Resolves a kind's rank index. A kind absent from RANK_ORDER (e.g. `note`,
// `level_up`, or any unranked kind) must sort LAST, not first — a bare
// `RANK_ORDER.indexOf(...)` returns -1 for unranked kinds, which would sort
// them ahead of `badge`. This helper maps that case to `RANK_ORDER.length`
// instead.
function rankIndex(kind: FeedEventKind): number {
  const idx = RANK_ORDER.indexOf(kind)
  return idx === -1 ? RANK_ORDER.length : idx
}

/**
 * Returns the single highest-ranked event from a set of events (e.g. one
 * child's events for today), or null when the set is empty. Sorts a copy —
 * never mutates the caller's array (same discipline as `rankChildren` in
 * `lib/kid/rating-rank.ts`) — ascending by rank index, tiebreaking on newest
 * `created_at` when two events share a rank tier.
 */
export function pickHighlight(events: FeedEvent[]): FeedEvent | null {
  if (events.length === 0) return null
  const sorted = [...events].sort((a, b) => {
    const ra = rankIndex(a.kind)
    const rb = rankIndex(b.kind)
    if (ra !== rb) return ra - rb // lower index = higher rank
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime() // tiebreak: newest wins
  })
  return sorted[0]
}

// D-08 rail color map — locked mapping, see 09.1-UI-SPEC.md "Rail Color Map".
// Sourced directly from K (kidTheme.ts), NOT the FamilyFeed `palette(variant)`
// function — rail colors are variant-independent (Pitfall 3, 09.1-RESEARCH.md).
// `coins_earned` / `coins_spent` are deliberately omitted — zero emitters
// exist for either kind. No penalty/correction kind may ever be added here
// (FEED-04 / D-03) — this map only ever grows non-punitive entries.
export const RAIL_COLOR_MAP: Partial<Record<FeedEventKind, string>> = {
  boost: K.mango,
  streak: K.mango,
  medal: K.berry,
  badge: K.berry,
  day_filled: K.mint,
  reading_approved: K.grape,
  level_up: K.grape,
  purchase: K.sky,
  reward_approved: K.sky,
  note: K.line,
}
