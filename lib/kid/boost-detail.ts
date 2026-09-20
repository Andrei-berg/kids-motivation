// Pure view-model builder for the segmented-bar weekly boost detail sheet
// (Phase 9.5). Turns the raw settings/grade/consistency inputs already
// computed by lib/kid/boost.ts's getBoostProgress into fractional fills, a
// distinct penalty state, and two independent consistency zone booleans.
//
// No React, no @/lib/supabase import, no i18n — must be importable by a unit
// test without pulling in the Supabase browser client, which is why this
// logic does NOT live in lib/kid/boost.ts. Every threshold/amount is read
// from the BoostSettings argument, never hardcoded here (BOOST-06).

import type { BoostSettings, WeeklyGradeStats, WeeklyConsistencyStats, WeeklyBoostResult } from './boost-rules'

/**
 * Fixed fill percentage for a penalty-disqualified grades week. Never 0 — a
 * bare 0% would read as "no good grades yet" instead of "a penalty zeroed
 * the bonus" (D-05).
 */
export const PENALTY_FILL_PCT = 40

/**
 * Mirrors consistencyBoost()'s boost_streaks_2 branch — the first point at
 * which a streak bonus actually pays, so the chip never claims an earned
 * bonus that credits nothing.
 */
const STREAK_BONUS_THRESHOLD = 2

export interface BoostWeekDetail {
  settings: BoostSettings
  grades: WeeklyGradeStats
  consistency: WeeklyConsistencyStats
}

export interface BoostDetailView {
  grades: {
    penalized: boolean
    pct: number
    tierReached: 0 | 1 | 2 | 3
    tierTotal: 3
    nextThreshold: number | null
    nextThresholdUnit: 'top-grades' | 'graded-days' | null
    topGradeCount: number
    coins: number
  }
  consistency: {
    fullWeekDone: boolean
    filledDays: number
    fullWeekTarget: 7
    streakDone: boolean
    streaksAtThreshold: number
    streakTarget: number
    bonusesEarned: 0 | 1 | 2
    bonusesTotal: 2
    coins: number
  }
  total: number
}

/** Returns 0 for a non-finite result (guards a misconfigured 0 threshold). */
function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

export function buildBoostDetail(detail: BoostWeekDetail, week: WeeklyBoostResult): BoostDetailView {
  const { settings, grades, consistency } = detail

  let gradesView: BoostDetailView['grades']
  if (grades.hasPenaltyGrade) {
    gradesView = {
      penalized: true,
      pct: PENALTY_FILL_PCT,
      tierReached: 0,
      tierTotal: 3,
      nextThreshold: settings.boost_grades_t1_count,
      nextThresholdUnit: 'top-grades',
      topGradeCount: grades.topGradeCount,
      coins: week.grades,
    }
  } else if (grades.goodGradeCount === grades.topGradeCount && grades.gradedDays >= settings.boost_grades_perfect_days) {
    gradesView = {
      penalized: false,
      pct: 100,
      tierReached: 3,
      tierTotal: 3,
      nextThreshold: null,
      nextThresholdUnit: null,
      topGradeCount: grades.topGradeCount,
      coins: week.grades,
    }
  } else if (grades.topGradeCount >= settings.boost_grades_t2_count) {
    gradesView = {
      penalized: false,
      pct: clampPct((grades.gradedDays / settings.boost_grades_perfect_days) * 100),
      tierReached: 2,
      tierTotal: 3,
      nextThreshold: settings.boost_grades_perfect_days,
      nextThresholdUnit: 'graded-days',
      topGradeCount: grades.topGradeCount,
      coins: week.grades,
    }
  } else if (grades.topGradeCount >= settings.boost_grades_t1_count) {
    gradesView = {
      penalized: false,
      pct: clampPct((grades.topGradeCount / settings.boost_grades_t2_count) * 100),
      tierReached: 1,
      tierTotal: 3,
      nextThreshold: settings.boost_grades_t2_count,
      nextThresholdUnit: 'top-grades',
      topGradeCount: grades.topGradeCount,
      coins: week.grades,
    }
  } else {
    gradesView = {
      penalized: false,
      pct: clampPct((grades.topGradeCount / settings.boost_grades_t1_count) * 100),
      tierReached: 0,
      tierTotal: 3,
      nextThreshold: settings.boost_grades_t1_count,
      nextThresholdUnit: 'top-grades',
      topGradeCount: grades.topGradeCount,
      coins: week.grades,
    }
  }

  const fullWeekDone = consistency.filledDays >= 7
  const streakDone = consistency.streaksAtThreshold >= STREAK_BONUS_THRESHOLD
  const bonusesEarned = ((fullWeekDone ? 1 : 0) + (streakDone ? 1 : 0)) as 0 | 1 | 2

  const consistencyView: BoostDetailView['consistency'] = {
    fullWeekDone,
    filledDays: consistency.filledDays,
    fullWeekTarget: 7,
    streakDone,
    streaksAtThreshold: consistency.streaksAtThreshold,
    streakTarget: STREAK_BONUS_THRESHOLD,
    bonusesEarned,
    bonusesTotal: 2,
    coins: week.consistency,
  }

  return {
    grades: gradesView,
    consistency: consistencyView,
    total: week.total,
  }
}
