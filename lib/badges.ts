// lib/badges.ts — thin re-export wrapper
// Implementations live in lib/services/badges.service.ts.
// This file preserves all existing import paths for backward compat.

export {
  checkAndAwardBadges,
  checkGoalBadge,
  checkPerfectWeek,
  getChildBadges,
  getAvailableBadges,
} from './services/badges.service'
