// lib/flexible-api.ts — thin re-export wrapper
// Implementations live in lib/repositories/schedule.repo.ts.
// This file preserves all existing import paths for backward compat.

export type {
  Subject,
  ScheduleLesson,
  ExerciseType,
  HomeExercise,
} from './models/flexible.types'

export {
  getSubjects,
  getActiveSubjects,
  createSubject,
  updateSubject,
  toggleSubjectActive,
  archiveSubject,
  deleteSubject,
  getSchedule,
  getScheduleForDay,
  addScheduleLesson,
  updateScheduleLesson,
  deleteScheduleLesson,
  clearSchedule,
  getExerciseTypes,
  createExerciseType,
  updateExerciseType,
  deleteExerciseType,
  getHomeExercises,
  saveHomeExercise,
  deleteHomeExercise,
} from './repositories/schedule.repo'

// ============================================================================
// flexibleApi namespace object — preserved for backward compat
// ============================================================================

import {
  getSubjects,
  getActiveSubjects,
  createSubject,
  updateSubject,
  toggleSubjectActive,
  archiveSubject,
  deleteSubject,
  getSchedule,
  getScheduleForDay,
  addScheduleLesson,
  updateScheduleLesson,
  deleteScheduleLesson,
  clearSchedule,
  getExerciseTypes,
  createExerciseType,
  updateExerciseType,
  deleteExerciseType,
  getHomeExercises,
  saveHomeExercise,
  deleteHomeExercise,
} from './repositories/schedule.repo'

export const flexibleApi = {
  getSubjects,
  getActiveSubjects,
  createSubject,
  updateSubject,
  toggleSubjectActive,
  archiveSubject,
  deleteSubject,
  getSchedule,
  getScheduleForDay,
  addScheduleLesson,
  updateScheduleLesson,
  deleteScheduleLesson,
  clearSchedule,
  getExerciseTypes,
  createExerciseType,
  updateExerciseType,
  deleteExerciseType,
  getHomeExercises,
  saveHomeExercise,
  deleteHomeExercise,
}
