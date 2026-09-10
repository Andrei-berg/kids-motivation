// Client-side display helper for the weekly boost meter + achievements "Бусты"
// block. Pure reads — the award route (app/api/wallet/award/route.ts, block 7)
// is authoritative for what actually credits. Both call lib/kid/boost-rules.ts
// so the "до буста" copy can't drift from the real payout.

import { supabase } from '@/lib/supabase'
import { localDateString, getWeekRange, addDays } from '@/utils/helpers'
import { getWalletSettings } from '@/lib/repositories/wallet.repo'
import { GRADE_SCALE_VALUES, defaultGradeCoinMap, type GradeScale } from '@/lib/presets'
import {
  boostSettings,
  computeWeeklyBoost,
  MILESTONE_TIERS,
  type WeeklyGradeStats,
  type WeeklyConsistencyStats,
  type MilestoneStats,
  type WeeklyBoostResult,
} from './boost-rules'

export interface BoostProgress {
  week: WeeklyBoostResult
  milestones: Array<{
    key: string
    coins: number
    reached: boolean
    claimed: boolean
    current: number
    target: number
    labelKey: string
  }>
}

/** Distinct-date count from a list of { date } rows. */
function distinctDates(rows: Array<{ date: string }> | null | undefined): Set<string> {
  const s = new Set<string>()
  for (const r of rows ?? []) s.add(String(r.date).slice(0, 10))
  return s
}

/** Longest run of consecutive filled days ending on `today` or `yesterday`. */
function consecutiveRun(filled: Set<string>, today: string): number {
  let run = 0
  let cursor = filled.has(today) ? today : addDays(today, -1)
  if (!filled.has(cursor)) return 0
  while (filled.has(cursor)) {
    run++
    cursor = addDays(cursor, -1)
  }
  return run
}

export async function getBoostProgress(childId: string): Promise<BoostProgress> {
  const today = localDateString()
  const week = getWeekRange(today)

  const settingsRow = await getWalletSettings().catch(() => null)
  const s = boostSettings(settingsRow as Record<string, unknown> | null)
  const scale = (settingsRow?.grade_scale ?? 'five_point') as GradeScale
  const coinMap = settingsRow?.grade_coin_map ?? defaultGradeCoinMap(scale)
  const topGrade = (GRADE_SCALE_VALUES[scale] ?? GRADE_SCALE_VALUES.five_point)[0]

  const [weekGradesRes, weekDaysRes, allDaysRes, streaksRes, claimedRes] = await Promise.all([
    supabase.from('subject_grades').select('date, grade').eq('child_id', childId).gte('date', week.start).lte('date', week.end),
    supabase.from('days').select('date').eq('child_id', childId).gte('date', week.start).lte('date', week.end),
    supabase.from('days').select('date').eq('child_id', childId).order('date', { ascending: true }),
    supabase.from('streaks').select('streak_type, current_count, best_count').eq('child_id', childId),
    supabase.from('wallet_transactions').select('source_id').eq('child_id', childId).eq('source_type', 'boost_milestone'),
  ])

  // ── Weekly grade stats ──────────────────────────────────────────────────
  const weekGrades = weekGradesRes.data ?? []
  let goodGradeCount = 0
  let topGradeCount = 0
  let hasPenaltyGrade = false
  for (const g of weekGrades) {
    const v = String(g.grade)
    const coins = coinMap[v] ?? 0
    if (coins > 0) goodGradeCount++
    if (coins < 0) hasPenaltyGrade = true
    if (v === topGrade) topGradeCount++
  }
  const gradeStats: WeeklyGradeStats = {
    goodGradeCount,
    topGradeCount,
    hasPenaltyGrade,
    gradedDays: distinctDates(weekGrades).size,
  }

  // ── Weekly consistency stats ────────────────────────────────────────────
  const filledThisWeek = distinctDates(weekDaysRes.data)
  const streaks = streaksRes.data ?? []
  const thr: Record<string, number> = {
    room: (settingsRow?.streak_room_days as number) ?? 7,
    study: (settingsRow?.streak_study_days as number) ?? 14,
    sport: (settingsRow?.streak_sport_days as number) ?? 7,
  }
  const streaksAtThreshold = streaks.filter(
    (st) => thr[st.streak_type] != null && (st.current_count ?? 0) >= thr[st.streak_type],
  ).length
  const consistencyStats: WeeklyConsistencyStats = {
    filledDays: filledThisWeek.size,
    streaksAtThreshold,
  }

  const weekResult = computeWeeklyBoost(s, gradeStats, consistencyStats)

  // ── Milestone tiers ────────────────────────────────────────────────────
  const allFilled = distinctDates(allDaysRes.data)
  const milestoneStats: MilestoneStats = {
    daysFilledTotal: allFilled.size,
    daysFilledStreak: consecutiveRun(allFilled, today),
    bestAnyStreak: streaks.reduce((m, st) => Math.max(m, st.best_count ?? 0), 0),
  }
  const claimedKeys = new Set((claimedRes.data ?? []).map((r) => String(r.source_id)))
  const milestones = MILESTONE_TIERS.map((tier) => {
    const p = tier.progress(milestoneStats)
    return {
      key: tier.key,
      coins: tier.coins(s),
      reached: tier.reached(milestoneStats),
      claimed: claimedKeys.has(tier.key),
      current: p.current,
      target: p.target,
      labelKey: tier.labelKey,
    }
  })

  return { week: weekResult, milestones }
}
