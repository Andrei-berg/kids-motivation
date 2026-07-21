// lib/weekly-summary.ts
// Pure, UI-independent helpers for the Parent Center Weekly Summary card
// (Phase 5.8). No Supabase imports — callers pass in already-fetched rows.
//
// D-08 fact-1 fix: the coins-earned figure MUST be computed from
// wallet_transactions rows (via getTransactions), summing only positive
// coins_change — NOT from getWeekScore's `.total`, which mixes in negative
// debits/penalties and undercounts what the child actually earned this week.

/** Sums only positive coins_change entries — what was actually earned this week. */
export function sumWeeklyCoins(txs: { coins_change: number }[]): number {
  return txs
    .filter(t => t.coins_change > 0)
    .reduce((sum, t) => sum + t.coins_change, 0)
}

/**
 * Maps a completion percentage to a Pill tone, matching Analytics.tsx's
 * existing children-overview Pill thresholds (>=80 success / >=50 warning / else danger).
 */
export function completionTone(pct: number): 'success' | 'warning' | 'danger' {
  if (pct >= 80) return 'success'
  if (pct >= 50) return 'warning'
  return 'danger'
}

/**
 * Returns the child with the highest current_count streak that meets or
 * exceeds `threshold`, or null if nobody qualifies.
 */
export function topStreak(
  entries: { name: string; current_count: number }[],
  threshold = 5
): { name: string; days: number } | null {
  const qualifying = entries.filter(e => e.current_count >= threshold)
  if (qualifying.length === 0) return null

  const best = qualifying.reduce((max, e) => (e.current_count > max.current_count ? e : max))
  return { name: best.name, days: best.current_count }
}
