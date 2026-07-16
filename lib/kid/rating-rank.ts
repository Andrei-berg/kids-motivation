// lib/kid/rating-rank.ts
// Pure N-children podium/list ranking for the leaderboard. Replaces the
// hardcoded 2-child `.find()` anti-pattern in app/kid/leaderboard/page.tsx —
// this module handles 1/2/3+ children uniformly with no special-casing.
// No I/O, no Supabase, no React.

export interface RankEntry {
  id: string
  name: string
  coinsWeek: number
  avatarUrl?: string | null
  [key: string]: unknown
}

export interface RankResult<T extends RankEntry> {
  podium: T[]
  list: T[]
}

/**
 * Sorts entries descending by coinsWeek (stable tiebreak on id ascending so
 * output is deterministic across calls), then splits the top 3 into
 * `podium` and the remainder into `list`.
 *
 * - 1 entry  -> podium.length === 1, list is empty (caller renders solo view)
 * - 2 entries -> podium.length === 2, list is empty
 * - 3 entries -> podium.length === 3, list is empty
 * - 4+ entries -> podium.length === 3, list holds the rest
 */
export function rankChildren<T extends RankEntry>(entries: T[]): RankResult<T> {
  const sorted = [...entries].sort((a, b) => {
    if (b.coinsWeek !== a.coinsWeek) return b.coinsWeek - a.coinsWeek
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })
  return {
    podium: sorted.slice(0, 3),
    list: sorted.slice(3),
  }
}
