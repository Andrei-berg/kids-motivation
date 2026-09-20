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

/**
 * Mirrors consistencyBoost()'s boost_streaks_3 branch — the top streak
 * consistency threshold, needed independently of STREAK_BONUS_THRESHOLD so
 * the quest-checklist / ring-badges bodies (Phase 9.6) can show streak×2 and
 * streak×3 as two separate reached-booleans instead of one collapsed chip.
 */
const STREAK_BONUS_TOP_THRESHOLD = 3

export interface BoostWeekDetail {
  settings: BoostSettings
  grades: WeeklyGradeStats
  consistency: WeeklyConsistencyStats
  /** Per-day filled flags for the current week, Monday first (index 0 = Monday,
   * index 6 = Sunday). Optional so existing callers/tests keep compiling;
   * buildBoostDetail normalises this to exactly 7 booleans either way. */
  filledDayFlags?: boolean[]
}

/** One independent (non-collapsed) grade-tier reached state, used by the
 * quest-checklist and ring-badges bodies (Phase 9.6) alongside the existing
 * sequential best-tier-wins `tierReached` field the segmented-bar body uses. */
export interface BoostGradeTier {
  index: 1 | 2 | 3
  coins: number
  reached: boolean
  threshold: number
  unit: 'top-grades' | 'graded-days'
  current: number
  remaining: number
  pct: number
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
    /** Independent per-tier reached state (Phase 9.6) — does NOT collapse
     * into a single best-tier-wins value like `tierReached` above. */
    tiers: [BoostGradeTier, BoostGradeTier, BoostGradeTier]
    /** Lowest-index tier not yet reached, or null when all three are reached. */
    nextTierIndex: 1 | 2 | 3 | null
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
    /** Settings-derived coin amount for a full 7-day filled week. */
    fullWeekCoins: number
    /** Independent streak×2 / streak×3 reached-booleans (Phase 9.6). */
    streak2Done: boolean
    streak3Done: boolean
    streak2Coins: number
    streak3Coins: number
    /** 7-entry Monday-first per-day filled flags for the week-dot strip. */
    filledDayFlags: boolean[]
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

  let gradesView: Omit<BoostDetailView['grades'], 'tiers' | 'nextTierIndex'>
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

  // ── Independent per-tier grade state (Phase 9.6) ─────────────────────────
  // Computed independently (not as an else-if chain) so a tier badge or quest
  // row can be checked without the sequential best-tier-wins collapse the
  // segmented-bar body's tierReached/pct fields use above.
  const notPenalized = !grades.hasPenaltyGrade
  const tier1: BoostGradeTier = (() => {
    const threshold = settings.boost_grades_t1_count
    const current = grades.topGradeCount
    return {
      index: 1,
      coins: settings.boost_grades_t1,
      reached: notPenalized && current >= threshold,
      threshold,
      unit: 'top-grades',
      current,
      remaining: Math.max(0, threshold - current),
      pct: clampPct((current / threshold) * 100),
    }
  })()
  const tier2: BoostGradeTier = (() => {
    const threshold = settings.boost_grades_t2_count
    const current = grades.topGradeCount
    return {
      index: 2,
      coins: settings.boost_grades_t2,
      reached: notPenalized && current >= threshold,
      threshold,
      unit: 'top-grades',
      current,
      remaining: Math.max(0, threshold - current),
      pct: clampPct((current / threshold) * 100),
    }
  })()
  const tier3: BoostGradeTier = (() => {
    const threshold = settings.boost_grades_perfect_days
    const current = grades.gradedDays
    return {
      index: 3,
      coins: settings.boost_grades_t3,
      // Mirrors gradesBoost()'s exact perfect condition (boost-rules.ts) —
      // reused, not re-invented.
      reached: notPenalized && grades.goodGradeCount === grades.topGradeCount && current >= threshold,
      threshold,
      unit: 'graded-days',
      current,
      remaining: Math.max(0, threshold - current),
      pct: clampPct((current / threshold) * 100),
    }
  })()
  const tiers: [BoostGradeTier, BoostGradeTier, BoostGradeTier] = [tier1, tier2, tier3]
  const nextTierIndex = (tiers.find((t) => !t.reached)?.index ?? null) as 1 | 2 | 3 | null

  // ── Independent streak×2 / streak×3 state (Phase 9.6) ────────────────────
  const streak2Done = consistency.streaksAtThreshold >= STREAK_BONUS_THRESHOLD
  const streak3Done = consistency.streaksAtThreshold >= STREAK_BONUS_TOP_THRESHOLD

  // ── Per-day filled flags for the week-dot strip (Phase 9.6) ──────────────
  const filledDayFlags = Array.from({ length: 7 }, (_, i) => detail.filledDayFlags?.[i] === true)

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
    fullWeekCoins: settings.boost_full_week,
    streak2Done,
    streak3Done,
    streak2Coins: settings.boost_streaks_2,
    streak3Coins: settings.boost_streaks_3,
    filledDayFlags,
  }

  return {
    grades: { ...gradesView, tiers, nextTierIndex },
    consistency: consistencyView,
    total: week.total,
  }
}
