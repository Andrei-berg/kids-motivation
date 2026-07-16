// lib/kid/awardResult.ts
// Pure parse of the /api/wallet/award success response, used by the client
// to decide whether to fire a stamp/confetti celebration. Server-authoritative:
// only reads fields the award route actually returns, never coinsPreview.
// No I/O, no Supabase, no React.

export interface AwardResult {
  creditedCoins: number
  hasStreak: boolean
}

/**
 * Defensively parses an award-route response into { creditedCoins, hasStreak }.
 * Never throws — any missing/malformed shape (undefined, null, {}) resolves
 * to the safe default of no coins credited and no streak.
 */
export function detectAward(res: any): AwardResult {
  const creditedCoins = res?.creditedCoins ?? 0
  const hasStreak = Array.isArray(res?.appliedSources) && res.appliedSources.includes('streak')
  return { creditedCoins, hasStreak }
}
