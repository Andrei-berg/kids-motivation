// lib/stats/tv-extras.ts
// Extra TV-board data on top of family-stats: today's trainings, this month's
// spend per child, and this week's boost progress. Spend uses buildSpend so the
// TV shows the same number as the kid banner; boost uses computeWeeklyBoost so
// it can't disagree with what the award route actually credits. Service-role;
// caller must have authorised `familyId`.

import { buildSpend } from '@/lib/spend/summary'
import { boostSettings, computeWeeklyBoost, type WeeklyGradeStats, type WeeklyConsistencyStats } from '@/lib/kid/boost-rules'
import { GRADE_SCALE_VALUES, defaultGradeCoinMap, type GradeScale } from '@/lib/presets'

export type TvTraining = { childId: string; title: string; start: string | null; end: string | null; location: string | null }
export type TvSpend = { childId: string; total: number; categories: { key: string; name: string; icon: string | null; amount: number }[] }
export type TvBoost = { childId: string; total: number; max: number; nextLabel: string }
export type TvExtras = { today: string; trainings: TvTraining[]; spend: TvSpend[]; boost: TvBoost[] }

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null)
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

/** Monday..Sunday range (YYYY-MM-DD, inclusive) containing `today` — mirrors
 * lib/spend/summary.ts's weekRangeOf without importing it (different domain). */
function weekRangeOf(today: string): { start: string; end: string } {
  const [y, m, d] = today.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const dow = (dt.getDay() + 6) % 7 // Mon=0
  const s = new Date(y, m - 1, d - dow)
  const pad = (n: number) => String(n).padStart(2, '0')
  const f = (x: Date) => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`
  return { start: f(s), end: f(new Date(y, m - 1, d - dow + 6)) }
}

export async function loadTvExtras(admin: any, familyId: string, childIds: string[], today: string): Promise<TvExtras> {
  if (!childIds.length) return { today, trainings: [], spend: [], boost: [] }
  const isoDow = ((new Date(today + 'T00:00:00Z').getUTCDay() + 6) % 7) + 1 // Mon=1..Sun=7
  const dayKey = DAY_KEYS[isoDow - 1]
  const week = weekRangeOf(today)

  const [sections, expenses, changes, settingsRow, weekGradesRes, weekDaysRes, streaksRes] = await Promise.all([
    admin.from('sections').select('id, child_id, name, cost, start_date, end_date, is_active, created_at, schedule_days, schedule_time, address')
      .eq('family_id', familyId).in('child_id', childIds),
    admin.from('expenses').select('id, child_id, title, amount, date, section_id, period, category:expense_categories(id, name, icon)')
      .eq('family_id', familyId).in('child_id', childIds).gte('date', today.slice(0, 7) + '-01'),
    admin.from('section_price_changes').select('child_id, section_id, effective_period, old_cost, new_cost').eq('family_id', familyId).in('child_id', childIds),
    admin.from('wallet_settings').select('*').eq('family_id', familyId).maybeSingle(),
    admin.from('subject_grades').select('child_id, date, grade').in('child_id', childIds).gte('date', week.start).lte('date', week.end),
    admin.from('days').select('child_id, date').in('child_id', childIds).gte('date', week.start).lte('date', week.end),
    admin.from('streaks').select('child_id, streak_type, current_count').in('child_id', childIds),
  ])

  // ── Today's trainings — sections whose schedule_days includes today, not
  // archived (end_date in the past). Same source the parent edits in Settings
  // → Секции; this used to (wrongly) query the school-subject `schedule`
  // table, which has no title/time/location columns at all, so it always
  // silently came back empty. ──
  const trainings: TvTraining[] = (sections.data ?? [])
    .filter((s: any) => s.is_active && (s.schedule_days ?? []).includes(dayKey) && !(s.end_date && s.end_date < today))
    .map((s: any) => ({ childId: s.child_id, title: s.name, start: hhmm(s.schedule_time), end: null, location: s.address ?? null }))
    .sort((a: TvTraining, b: TvTraining) => (a.start ?? '99').localeCompare(b.start ?? '99'))

  const spend: TvSpend[] = childIds.map(childId => {
    const s = buildSpend({
      sections: (sections.data ?? []).filter((x: any) => x.child_id === childId),
      expenses: (expenses.data ?? []).filter((e: any) => e.child_id === childId).map((e: any) => ({
        ...e, amount: Number(e.amount), category: Array.isArray(e.category) ? e.category[0] ?? null : e.category,
      })),
      priceChanges: changes.error ? [] : (changes.data ?? []).filter((c: any) => c.child_id === childId),
      today, range: 'month',
    })
    return { childId, total: s.total, categories: s.categories.slice(0, 4).map((c: any) => ({ key: c.key, name: c.name, icon: c.icon ?? null, amount: c.amount })) }
  })

  // ── This week's boost — same maths as the kid's own boost meter
  // (lib/kid/boost.ts's getBoostProgress), just fed with admin-fetched rows
  // instead of the RLS browser client. ──
  const bs = boostSettings(settingsRow.data as Record<string, unknown> | null)
  const scale = (settingsRow.data?.grade_scale ?? 'five_point') as GradeScale
  const coinMap: Record<string, number> = settingsRow.data?.grade_coin_map ?? defaultGradeCoinMap(scale)
  const topGrade = (GRADE_SCALE_VALUES[scale] ?? GRADE_SCALE_VALUES.five_point)[0]

  const boost: TvBoost[] = childIds.map(childId => {
    const weekGrades = (weekGradesRes.data ?? []).filter((g: any) => g.child_id === childId)
    let goodGradeCount = 0, topGradeCount = 0, hasPenaltyGrade = false
    const gradedDates = new Set<string>()
    for (const g of weekGrades) {
      const coinVal = coinMap[String(g.grade)] ?? 0
      if (coinVal > 0) goodGradeCount++
      if (coinVal < 0) hasPenaltyGrade = true
      if (String(g.grade) === String(topGrade)) topGradeCount++
      gradedDates.add(String(g.date).slice(0, 10))
    }
    const g: WeeklyGradeStats = { goodGradeCount, topGradeCount, hasPenaltyGrade, gradedDays: gradedDates.size }

    const filledDates = new Set((weekDaysRes.data ?? []).filter((d: any) => d.child_id === childId).map((d: any) => String(d.date).slice(0, 10)))
    const childStreaks = (streaksRes.data ?? []).filter((s: any) => s.child_id === childId)
    const streaksAtThreshold = childStreaks.filter((s: any) => s.current_count >= 3).length
    const c: WeeklyConsistencyStats = { filledDays: filledDates.size, streaksAtThreshold }

    const result = computeWeeklyBoost(bs, g, c)
    return { childId, total: result.total, max: result.max, nextLabel: result.nextLabel }
  })

  return { today, trainings, spend, boost }
}
