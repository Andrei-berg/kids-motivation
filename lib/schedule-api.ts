// lib/schedule-api.ts — thin re-export wrapper
// Implementations live in lib/repositories/schedule.repo.ts.
// This file preserves all existing import paths for backward compat.

export type { ScheduleItem } from './models/schedule.types'

export {
  getScheduleItems,
  createScheduleItem,
  updateScheduleItem,
  deleteScheduleItem,
} from './repositories/schedule.repo'
