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

describe('buildBoostDetail — independent grade tiers (D-01, D-06, BOOST-06)', () => {
  it('Test 13: 0 top grades, no penalty -> tiers[0] not reached, threshold/current/remaining/pct/coins all settings-derived; nextTierIndex 1', () => {
    const view = buildBoostDetail(
      { settings, grades: makeGrades({ topGradeCount: 0 }), consistency: makeConsistency() },
      makeWeek(),
    )
    expect(view.grades.tiers[0].reached).toBe(false)
    expect(view.grades.tiers[0].threshold).toBe(5)
    expect(view.grades.tiers[0].current).toBe(0)
    expect(view.grades.tiers[0].remaining).toBe(5)
    expect(view.grades.tiers[0].pct).toBe(0)
    expect(view.grades.tiers[0].coins).toBe(150)
    expect(view.grades.nextTierIndex).toBe(1)
  })

  it('Test 14 (D-01, independent not collapsed): 7 top grades, no penalty -> tiers[0] reached true AND tiers[1] reached false', () => {
    const view = buildBoostDetail(
      { settings, grades: makeGrades({ topGradeCount: 7 }), consistency: makeConsistency() },
      makeWeek(),
    )
    expect(view.grades.tiers[0].reached).toBe(true)
    expect(view.grades.tiers[1].reached).toBe(false)
    expect(view.grades.tiers[1].current).toBe(7)
    expect(view.grades.tiers[1].remaining).toBe(3)
    expect(view.grades.tiers[1].pct).toBe(70)
    expect(view.grades.tiers[1].coins).toBe(300)
    expect(view.grades.nextTierIndex).toBe(2)
  })

  it('Test 15: 12 top grades, goodGradeCount 12, gradedDays 5 -> all three tiers reached, nextTierIndex null, tiers[2].coins 500', () => {
    const view = buildBoostDetail(
      {
        settings,
        grades: makeGrades({ topGradeCount: 12, goodGradeCount: 12, gradedDays: 5 }),
        consistency: makeConsistency(),
      },
      makeWeek(),
    )
    expect(view.grades.tiers.every((t) => t.reached)).toBe(true)
    expect(view.grades.nextTierIndex).toBeNull()
    expect(view.grades.tiers[2].coins).toBe(500)
  })

  it('Test 16: 12 top grades but goodGradeCount 14 (non-top good grades) -> tiers 0/1 reached, tier 2 (perfect) not reached', () => {
    const view = buildBoostDetail(
      {
        settings,
        grades: makeGrades({ topGradeCount: 12, goodGradeCount: 14, gradedDays: 5 }),
        consistency: makeConsistency(),
      },
      makeWeek(),
    )
    expect(view.grades.tiers[0].reached).toBe(true)
    expect(view.grades.tiers[1].reached).toBe(true)
    expect(view.grades.tiers[2].reached).toBe(false)
  })

  it('Test 17 (D-03 superseded): 12 top grades leaves both lower tiers reached true while the pre-existing tierReached still reports a single best tier', () => {
    const view = buildBoostDetail(
      {
        settings,
        grades: makeGrades({ topGradeCount: 12, goodGradeCount: 12, gradedDays: 5 }),
        consistency: makeConsistency(),
      },
      makeWeek(),
    )
    expect(view.grades.tiers[0].reached).toBe(true)
    expect(view.grades.tiers[1].reached).toBe(true)
    expect(view.grades.tierReached).toBe(3)
  })

  it('Test 18 (D-15): hasPenaltyGrade true with 12 top grades -> every tiers[i].reached false, grades.penalized true, grades.pct stays PENALTY_FILL_PCT', () => {
    const view = buildBoostDetail(
      {
        settings,
        grades: makeGrades({ topGradeCount: 12, goodGradeCount: 12, gradedDays: 5, hasPenaltyGrade: true }),
        consistency: makeConsistency(),
      },
      makeWeek(),
    )
    expect(view.grades.tiers.every((t) => t.reached === false)).toBe(true)
    expect(view.grades.penalized).toBe(true)
    expect(view.grades.pct).toBe(PENALTY_FILL_PCT)
  })

  it('Test 19 (BOOST-06 guard): non-default settings drive thresholds/coins accordingly', () => {
    const customSettings: BoostSettings = {
      ...DEFAULT_BOOST_SETTINGS,
      boost_grades_t1_count: 2,
      boost_grades_t2_count: 4,
      boost_grades_t3: 999,
    }
    const view = buildBoostDetail(
      { settings: customSettings, grades: makeGrades({ topGradeCount: 2 }), consistency: makeConsistency() },
      makeWeek(),
    )
    expect(view.grades.tiers[0].reached).toBe(true)
    expect(view.grades.tiers[0].threshold).toBe(2)
    expect(view.grades.tiers[1].threshold).toBe(4)
    expect(view.grades.tiers[2].coins).toBe(999)
  })
})

describe('buildBoostDetail — streak-tier booleans and coin amounts (D-02)', () => {
  it('Test 20: streaksAtThreshold 0 -> streak2Done false, streak3Done false', () => {
    const view = buildBoostDetail(
      { settings, grades: makeGrades(), consistency: makeConsistency({ streaksAtThreshold: 0 }) },
      makeWeek(),
    )
    expect(view.consistency.streak2Done).toBe(false)
    expect(view.consistency.streak3Done).toBe(false)
  })

  it('Test 21: streaksAtThreshold 2 -> streak2Done true, streak3Done false', () => {
    const view = buildBoostDetail(
      { settings, grades: makeGrades(), consistency: makeConsistency({ streaksAtThreshold: 2 }) },
      makeWeek(),
    )
    expect(view.consistency.streak2Done).toBe(true)
    expect(view.consistency.streak3Done).toBe(false)
  })

  it('Test 22: streaksAtThreshold 3 -> streak2Done true, streak3Done true', () => {
    const view = buildBoostDetail(
      { settings, grades: makeGrades(), consistency: makeConsistency({ streaksAtThreshold: 3 }) },
      makeWeek(),
    )
    expect(view.consistency.streak2Done).toBe(true)
    expect(view.consistency.streak3Done).toBe(true)
  })

  it('Test 23: fullWeekCoins/streak2Coins/streak3Coins read from settings, not literals', () => {
    const view = buildBoostDetail(
      { settings, grades: makeGrades(), consistency: makeConsistency() },
      makeWeek(),
    )
    expect(view.consistency.fullWeekCoins).toBe(settings.boost_full_week)
    expect(view.consistency.streak2Coins).toBe(settings.boost_streaks_2)
    expect(view.consistency.streak3Coins).toBe(settings.boost_streaks_3)
  })
})

describe('buildBoostDetail — per-day filled flags (D-07)', () => {
  it('Test 24: filledDayFlags absent from input -> consistency.filledDayFlags is 7 false entries', () => {
    const view = buildBoostDetail(
      { settings, grades: makeGrades(), consistency: makeConsistency() },
      makeWeek(),
    )
    expect(view.consistency.filledDayFlags).toEqual([false, false, false, false, false, false, false])
  })

  it('Test 25: filledDayFlags supplied -> passed through unchanged with length 7', () => {
    const flags = [true, true, false, false, false, false, false]
    const view = buildBoostDetail(
      { settings, grades: makeGrades(), consistency: makeConsistency(), filledDayFlags: flags },
      makeWeek(),
    )
    expect(view.consistency.filledDayFlags).toEqual(flags)
    expect(view.consistency.filledDayFlags.length).toBe(7)
  })
})
