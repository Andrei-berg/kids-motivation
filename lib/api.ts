// lib/api.ts — thin re-export wrapper
// Implementations live in lib/repositories/ and lib/services/.
// This file preserves all existing import paths for backward compat.

export type {
  Child,
  DayData,
  SubjectGrade,
  HomeSport,
  SportsSection,
  SectionAttendance,
  Goal,
  Week,
} from './models/child.types'

export {
  getChildren,
  getChild,
  getSettings,
  saveDay,
  getDay,
  saveHomeSport,
  getHomeSportForDate,
  getSections,
  saveSectionAttendance,
  getGoals,
  createGoal,
  setActiveGoal,
  archiveGoal,
  getGoalProgress,
  getWeekData,
  finalizeWeek,
  getStreaks,
} from './repositories/children.repo'

export {
  saveSubjectGrade,
  addSubjectGrade,
  getSubjectGradesForDate,
  deleteSubjectGrade,
  getSubjectSuggestions,
} from './repositories/grades.repo'

export { getWeekScore } from './services/coins.service'

// ============================================================================
// api namespace object — preserved for backward compat
// ============================================================================

import {
  getChildren,
  getChild,
  getSettings,
  saveDay,
  getDay,
  saveHomeSport,
  getHomeSportForDate,
  getSections,
  saveSectionAttendance,
  getGoals,
  createGoal,
  setActiveGoal,
  archiveGoal,
  getGoalProgress,
  getWeekData,
  finalizeWeek,
  getStreaks,
} from './repositories/children.repo'

import {
  saveSubjectGrade,
  addSubjectGrade,
  getSubjectGradesForDate,
  deleteSubjectGrade,
  getSubjectSuggestions,
} from './repositories/grades.repo'

import { getWeekScore } from './services/coins.service'

export const api = {
  // Children
  getChildren,
  getChild,

  // Settings
  getSettings,

  // Days
  saveDay,
  getDay,

  // Grades
  saveSubjectGrade,
  addSubjectGrade,
  getSubjectGradesForDate,
  deleteSubjectGrade,
  getSubjectSuggestions,

  // Sport
  saveHomeSport,
  getHomeSportForDate,
  getSections,
  saveSectionAttendance,

  // Goals
  getGoals,
  createGoal,
  setActiveGoal,
  archiveGoal,
  getGoalProgress,

  // Weeks
  getWeekData,
  getWeekScore,
  finalizeWeek,

  // Streaks
  getStreaks,
}
