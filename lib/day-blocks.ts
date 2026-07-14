// lib/day-blocks.ts
// Shared, pure block-assembly contract for the family-configurable day-blocks
// model (Phase 5.6). BOTH day-fill forms (KidDayFillForm, DailyModal) and the
// server-side award route (/api/wallet/award) must call these functions so
// "visible today" and "earnable today" can never drift (D-06 parity guarantee).
//
// No Supabase imports here — pure functions only, safe to import from both the
// browser and the server.

import type { DayBlock, DayBlockLegacyKey } from './models/day-block.types'

/**
 * Returns the blocks visible on a given day, filtered and ordered:
 *  - only is_active blocks are considered;
 *  - day_types: an empty array OR an array containing 'always' shows the
 *    block on every day type; otherwise the block shows only when day_types
 *    includes the resolved dayType. (Verbatim semantics of
 *    getActivitiesForDay, lib/repositories/expenses.repo.ts:584-609.)
 *  - days_of_week: an empty array shows the block on every weekday;
 *    otherwise the block shows only when the date's system weekday
 *    (jsDay===0?6:jsDay-1, i.e. 0=Mon..6=Sun) is included. (Verbatim
 *    semantics of getSectionsForDate's schedule_days matching,
 *    lib/repositories/expenses.repo.ts:529-557, translated from named
 *    weekday keys to the 0=Mon..6=Sun numeric convention already used by
 *    getActivitiesForDay's days_of_week filter.)
 *  - the result is sorted by sort_order ascending.
 *
 * `dayType` is the already-resolved getDayType(...).type string — this
 * function does not re-derive day type, it only filters on the given string.
 */
export function assembleDayBlocks(blocks: DayBlock[], dayType: string, date: string): DayBlock[] {
  // Use noon to prevent DST timezone shifts from flipping the day (same
  // convention as lib/day-type.ts and getActivitiesForDay).
  const jsDay = new Date(date + 'T12:00:00').getDay()
  const dayIndex = jsDay === 0 ? 6 : jsDay - 1 // 0=Mon..6=Sun

  return blocks
    .filter(b => b.is_active)
    .filter(b => {
      const dayTypes = b.day_types || []
      if (dayTypes.length > 0 && !dayTypes.includes('always') && !dayTypes.includes(dayType)) return false
      const dow = b.days_of_week || []
      if (dow.length > 0 && !dow.includes(dayIndex)) return false
      return true
    })
    .sort((a, b) => a.sort_order - b.sort_order)
}

// Maps a legacy_key to the wallet_settings key that provides its flat-price
// fallback (mirrors app/api/wallet/_lib.ts SETTINGS_DEFAULTS). grade/sport/
// activity are intentionally absent: those source types have per-row pricing
// (grade value, coach rating, per-activity coins) computed by the existing
// award logic, not a single flat price — resolveBlockPrice signals this by
// returning null so the caller falls back to its existing per-row computation.
const LEGACY_PRICE_SETTINGS_KEY: Partial<Record<DayBlockLegacyKey, string>> = {
  room: 'coins_per_room_task',
  behavior: 'coins_per_good_behavior',
  book: 'coins_per_book',
  exercise: 'coins_per_exercise',
}

/**
 * Resolves the coin price for a block:
 *  - an explicit non-null block.price always wins;
 *  - else, for legacy_keys with a flat per-family fallback (room/behavior/
 *    book/exercise), returns the matching wallet_settings value;
 *  - else (grade/sport/activity, or a custom block with no price and no
 *    legacy_key mapping) returns null — the caller must use its existing
 *    per-row computation (e.g. gradeCoins, coach rating) instead of a flat
 *    price.
 */
export function resolveBlockPrice(block: DayBlock, settings: Record<string, number>): number | null {
  if (block.price !== null && block.price !== undefined) return block.price
  const settingsKey = block.legacy_key ? LEGACY_PRICE_SETTINGS_KEY[block.legacy_key] : undefined
  if (settingsKey && settings[settingsKey] !== undefined) return settings[settingsKey]
  return null
}

/**
 * Resolves the day-type multiplier for a block: block.multipliers[dayType]
 * when present and > 0, else 1 (no multiplier).
 */
export function resolveMultiplier(block: DayBlock, dayType: string): number {
  const m = block.multipliers?.[dayType]
  return m && m > 0 ? m : 1
}
