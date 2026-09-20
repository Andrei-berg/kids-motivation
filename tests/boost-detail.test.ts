import { describe, it, expect } from 'vitest'

import { buildBoostDetail, PENALTY_FILL_PCT } from '@/lib/kid/boost-detail'
import {
  DEFAULT_BOOST_SETTINGS,
  type BoostSettings,
  type WeeklyGradeStats,
  type WeeklyConsistencyStats,
  type WeeklyBoostResult,
} from '@/lib/kid/boost-rules'

function makeGrades(overrides: Partial<WeeklyGradeStats> = {}): WeeklyGradeStats {
  return { goodGradeCount: 0, topGradeCount: 0, hasPenaltyGrade: false, gradedDays: 0, ...overrides }
}

function makeConsistency(overrides: Partial<WeeklyConsistencyStats> = {}): WeeklyConsistencyStats {
  return { filledDays: 0, streaksAtThreshold: 0, ...overrides }
}

function makeWeek(overrides: Partial<WeeklyBoostResult> = {}): WeeklyBoostResult {
  return { grades: 0, consistency: 0, total: 0, max: 950, nextLabel: '', gradesNext: null, ...overrides }
}

const settings: BoostSettings = { ...DEFAULT_BOOST_SETTINGS }

describe('buildBoostDetail — grades sub-bar (D-04, D-05, BOOST-06)', () => {
  it('Test 1: 0 top grades, no penalty -> tierReached 0, pct 0, nextThreshold 5 top-grades', () => {
    const view = buildBoostDetail(
      { settings, grades: makeGrades({ topGradeCount: 0 }), consistency: makeConsistency() },
      makeWeek(),
    )
    expect(view.grades.tierReached).toBe(0)
    expect(view.grades.pct).toBe(0)
    expect(view.grades.nextThreshold).toBe(5)
    expect(view.grades.nextThresholdUnit).toBe('top-grades')
    expect(view.grades.penalized).toBe(false)
  })

  it('Test 2: 2 top grades, no penalty -> tierReached 0, pct 40 (2/5), nextThreshold 5', () => {
    const view = buildBoostDetail(
      { settings, grades: makeGrades({ topGradeCount: 2 }), consistency: makeConsistency() },
      makeWeek(),
    )
    expect(view.grades.tierReached).toBe(0)
    expect(view.grades.pct).toBe(40)
    expect(view.grades.nextThreshold).toBe(5)
  })

  it('Test 3: 5 top grades, no penalty -> tierReached 1, pct 50 (5/10), nextThreshold 10', () => {
    const view = buildBoostDetail(
      { settings, grades: makeGrades({ topGradeCount: 5 }), consistency: makeConsistency() },
      makeWeek(),
    )
    expect(view.grades.tierReached).toBe(1)
    expect(view.grades.pct).toBe(50)
    expect(view.grades.nextThreshold).toBe(10)
    expect(view.grades.nextThresholdUnit).toBe('top-grades')
  })

  it('Test 4 (D-04): 7 top grades, no penalty -> tierReached 1, pct 70 (7/10) — fractional not stepped', () => {
    const view = buildBoostDetail(
      { settings, grades: makeGrades({ topGradeCount: 7 }), consistency: makeConsistency() },
      makeWeek(),
    )
    expect(view.grades.tierReached).toBe(1)
    expect(view.grades.pct).toBe(70)
  })

  it('Test 5: 10 top grades, goodGradeCount 12, gradedDays 2 -> tierReached 2, graded-days, nextThreshold 4, pct 50 (2/4)', () => {
    const view = buildBoostDetail(
      {
        settings,
        grades: makeGrades({ topGradeCount: 10, goodGradeCount: 12, gradedDays: 2 }),
        consistency: makeConsistency(),
      },
      makeWeek(),
    )
    expect(view.grades.tierReached).toBe(2)
    expect(view.grades.nextThresholdUnit).toBe('graded-days')
    expect(view.grades.nextThreshold).toBe(4)
    expect(view.grades.pct).toBe(50)
  })

  it('Test 6: goodGradeCount === topGradeCount === 10, gradedDays 5 (perfect) -> tierReached 3, pct 100, nextThreshold null', () => {
    const view = buildBoostDetail(
      {
        settings,
        grades: makeGrades({ topGradeCount: 10, goodGradeCount: 10, gradedDays: 5 }),
        consistency: makeConsistency(),
      },
      makeWeek(),
    )
    expect(view.grades.tierReached).toBe(3)
    expect(view.grades.pct).toBe(100)
    expect(view.grades.nextThreshold).toBeNull()
    expect(view.grades.nextThresholdUnit).toBeNull()
  })

  it('Test 7 (D-05): hasPenaltyGrade true with 9 top grades -> penalized true, pct PENALTY_FILL_PCT (never 0), tierReached 0', () => {
    const view = buildBoostDetail(
      { settings, grades: makeGrades({ topGradeCount: 9, hasPenaltyGrade: true }), consistency: makeConsistency() },
      makeWeek(),
    )
    expect(view.grades.penalized).toBe(true)
    expect(view.grades.pct).toBe(PENALTY_FILL_PCT)
    expect(view.grades.pct).not.toBe(0)
    expect(view.grades.tierReached).toBe(0)
  })

  it('Test 8 (BOOST-06): custom boost_grades_t1_count 3 with 3 top grades -> tierReached 1, nextThreshold reads settings.boost_grades_t2_count', () => {
    const customSettings: BoostSettings = { ...DEFAULT_BOOST_SETTINGS, boost_grades_t1_count: 3 }
    const view = buildBoostDetail(
      { settings: customSettings, grades: makeGrades({ topGradeCount: 3 }), consistency: makeConsistency() },
      makeWeek(),
    )
    expect(view.grades.tierReached).toBe(1)
    expect(view.grades.nextThreshold).toBe(customSettings.boost_grades_t2_count)
  })
})

describe('buildBoostDetail — consistency sub-bar (D-06)', () => {
  it('Test 9: filledDays 7 -> fullWeekDone true; filledDays 6 -> false', () => {
    const done = buildBoostDetail({ settings, grades: makeGrades(), consistency: makeConsistency({ filledDays: 7 }) }, makeWeek())
    const notDone = buildBoostDetail({ settings, grades: makeGrades(), consistency: makeConsistency({ filledDays: 6 }) }, makeWeek())
    expect(done.consistency.fullWeekDone).toBe(true)
    expect(notDone.consistency.fullWeekDone).toBe(false)
  })

  it('Test 10: streaksAtThreshold 2 -> streakDone true; 1 -> false; 3 -> true', () => {
    const at2 = buildBoostDetail({ settings, grades: makeGrades(), consistency: makeConsistency({ streaksAtThreshold: 2 }) }, makeWeek())
    const at1 = buildBoostDetail({ settings, grades: makeGrades(), consistency: makeConsistency({ streaksAtThreshold: 1 }) }, makeWeek())
    const at3 = buildBoostDetail({ settings, grades: makeGrades(), consistency: makeConsistency({ streaksAtThreshold: 3 }) }, makeWeek())
    expect(at2.consistency.streakDone).toBe(true)
    expect(at1.consistency.streakDone).toBe(false)
    expect(at3.consistency.streakDone).toBe(true)
  })

  it('Test 11: bonusesEarned combines both independent zones (D-06 — never summed into one percentage)', () => {
    const both = buildBoostDetail(
      { settings, grades: makeGrades(), consistency: makeConsistency({ filledDays: 7, streaksAtThreshold: 2 }) },
      makeWeek(),
    )
    const onlyFullWeek = buildBoostDetail(
      { settings, grades: makeGrades(), consistency: makeConsistency({ filledDays: 7, streaksAtThreshold: 0 }) },
      makeWeek(),
    )
    const neither = buildBoostDetail(
      { settings, grades: makeGrades(), consistency: makeConsistency({ filledDays: 3, streaksAtThreshold: 0 }) },
      makeWeek(),
    )
    expect(both.consistency.bonusesEarned).toBe(2)
    expect(onlyFullWeek.consistency.bonusesEarned).toBe(1)
    expect(neither.consistency.bonusesEarned).toBe(0)
  })
})

describe('buildBoostDetail — total/coins never recomputed (D-07)', () => {
  it('Test 12: view.total, view.grades.coins, view.consistency.coins equal the passed WeeklyBoostResult fields verbatim', () => {
    const week = makeWeek({ grades: 150, consistency: 100, total: 250 })
    const view = buildBoostDetail(
      { settings, grades: makeGrades({ topGradeCount: 5 }), consistency: makeConsistency({ filledDays: 7 }) },
      week,
    )
    expect(view.total).toBe(week.total)
    expect(view.grades.coins).toBe(week.grades)
    expect(view.consistency.coins).toBe(week.consistency)
  })
})
