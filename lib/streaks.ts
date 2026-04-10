// lib/streaks.ts — thin re-export wrapper
// Implementations live in lib/services/streaks.service.ts.
// This file preserves all existing import paths for backward compat.

export { updateStreaks, getStreakBonuses } from './services/streaks.service'
export type { StreakEvent, StreakEvents } from './services/streaks.service'
