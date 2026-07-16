// lib/kid/level.ts
// Pure level-crossing helpers, mirroring the XP→level formula used
// server-side in lib/services/badges.service.ts:582 (Math.floor(xp/1000)+1).
// No I/O, no Supabase, no React — safe to import from client or server.

/**
 * Returns the level for a given XP total. Level 1 starts at 0 XP; every
 * 1000 XP crosses one level (levelForXp(1000) === 2).
 */
export function levelForXp(xp: number): number {
  return Math.floor(xp / 1000) + 1
}

/**
 * Returns true only when newXp's level is strictly greater than prevXp's
 * level — i.e. the child crossed upward into a new level. Never true for
 * a same-level change or a downward change (coins/xp never decrease in
 * practice, but the check is defensive).
 */
export function computeLevelUp(prevXp: number, newXp: number): boolean {
  return levelForXp(newXp) > levelForXp(prevXp)
}
