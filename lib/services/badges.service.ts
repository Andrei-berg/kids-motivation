// lib/services/badges.service.ts
// Badge/achievement business logic.
// Sourced from lib/badges.ts — this is the authoritative implementation.

import { supabase } from '../supabase'
import { getWeekRange, addDays, localDateString } from '@/utils/helpers'
import { getCompletedGoalCount } from '@/lib/repositories/children.repo'

interface Badge {
  key: string
  title: string       // keep for backward compat (Russian fallback)
  description: string // keep for backward compat
  titleKey: string    // translation key for title
  descKey: string     // translation key for description
  icon: string
  xp: number
}

const BADGES: Badge[] = [
  {
    key: 'week_excellent',
    title: 'Неделя отличника',
    description: '7 дней подряд только пятёрки',
    titleKey: 'badges.week_excellent_title',
    descKey: 'badges.week_excellent_desc',
    icon: '🌟',
    xp: 500
  },
  {
    key: 'clean_master',
    title: 'Мастер чистоты',
    description: 'Комната убрана 30 дней подряд',
    titleKey: 'badges.clean_master_title',
    descKey: 'badges.clean_master_desc',
    icon: '🧹',
    xp: 800
  },
  {
    key: 'sportsman',
    title: 'Спортсмен',
    description: '14 дней спорта за месяц',
    titleKey: 'badges.sportsman_title',
    descKey: 'badges.sportsman_desc',
    icon: '💪',
    xp: 600
  },
  {
    key: 'goal_achiever',
    title: 'Целеустремлённый',
    description: 'Достиг первой цели',
    titleKey: 'badges.goal_achiever_title',
    descKey: 'badges.goal_achiever_desc',
    icon: '🎯',
    xp: 1000
  },
  {
    key: 'goals_3',
    title: 'Три мечты',
    description: 'Достиг 3 целей',
    titleKey: 'badges.goals_3_title',
    descKey: 'badges.goals_3_desc',
    icon: '🏅',
    xp: 500
  },
  {
    key: 'goals_5',
    title: 'Коллекционер мечт',
    description: 'Достиг 5 целей',
    titleKey: 'badges.goals_5_title',
    descKey: 'badges.goals_5_desc',
    icon: '🏆',
    xp: 800
  },
  {
    key: 'perfect_week',
    title: 'Идеальная неделя',
    description: 'Неделя без штрафов',
    titleKey: 'badges.perfect_week_title',
    descKey: 'badges.perfect_week_desc',
    icon: '👑',
    xp: 400
  },
  {
    key: 'study_lover',
    title: 'Любитель учёбы',
    description: 'Оценки 14 дней подряд',
    titleKey: 'badges.study_lover_title',
    descKey: 'badges.study_lover_desc',
    icon: '📚',
    xp: 400
  },
  {
    key: 'coin_saver',
    title: 'Копилка',
    description: 'Накопи 500 монет, не тратя',
    titleKey: 'badges.coin_saver_title',
    descKey: 'badges.coin_saver_desc',
    icon: '💰',
    xp: 300
  },
  {
    key: 'first_purchase',
    title: 'Первая покупка',
    description: 'Первая покупка в магазине',
    titleKey: 'badges.first_purchase_title',
    descKey: 'badges.first_purchase_desc',
    icon: '🛒',
    xp: 200
  },
  {
    key: 'streak_30',
    title: 'Серия 30 дней',
    description: 'Любая серия достигла 30 дней подряд',
    titleKey: 'badges.streak_30_title',
    descKey: 'badges.streak_30_desc',
    icon: '🔥',
    xp: 700
  },
  {
    key: 'full_week_grades',
    title: 'Отличный дневник',
    description: 'Оценки получены каждый день учебной недели',
    titleKey: 'badges.full_week_grades_title',
    descKey: 'badges.full_week_grades_desc',
    icon: '📋',
    xp: 350
  }
]

export async function checkAndAwardBadges(childId: string, date: string) {
  const badges: string[] = []

  if (await checkWeekExcellent(childId, date)) badges.push('week_excellent')
  if (await checkCleanMaster(childId, date)) badges.push('clean_master')
  if (await checkSportsman(childId, date)) badges.push('sportsman')
  if (await checkStudyLover(childId, date)) badges.push('study_lover')
  if (await checkCoinSaver(childId)) badges.push('coin_saver')
  if (await checkFirstPurchase(childId)) badges.push('first_purchase')
  if (await checkStreak30(childId)) badges.push('streak_30')
  if (await checkFullWeekGrades(childId, date)) badges.push('full_week_grades')
  if (await checkPerfectWeekAuto(childId, date)) badges.push('perfect_week')

  for (const key of badges) {
    await awardBadge(childId, key)
  }

  return badges
}

/**
 * Auto-evaluated «Идеальная неделя»: the current week has at least one grade and
 * none of them is a penalty grade (1 or 2). Penalty grades are the negative-coin
 * events in the wallet model, so "no штрафов" = no 1s/2s. Requiring grades to exist
 * keeps an empty week (e.g. summer) from awarding it for free.
 *
 * Wires up perfect_week, which previously had a checker (checkPerfectWeek) that was
 * never called — making the badge impossible to earn.
 */
async function checkPerfectWeekAuto(childId: string, date: string): Promise<boolean> {
  const week = getWeekRange(date)
  const { data: grades } = await supabase
    .from('subject_grades')
    .select('grade')
    .eq('child_id', childId)
    .gte('date', week.start)
    .lte('date', week.end)

  if (!grades || grades.length === 0) return false
  if (grades.some(g => g.grade != null && g.grade <= 2)) return false

  const { data: existing } = await supabase
    .from('badges')
    .select('id')
    .eq('child_id', childId)
    .eq('badge_key', 'perfect_week')
    .maybeSingle()

  return !existing
}

/**
 * Awards the goal-count badges from how many goals the child has completed:
 * goal_achiever (≥1), goals_3 (≥3), goals_5 (≥5). Idempotent — awardBadge dedups.
 * Called after a goal is completed on the wallet screen.
 */
export async function checkGoalBadges(childId: string) {
  const n = await getCompletedGoalCount(childId)
  const earned: string[] = []
  if (n >= 1) earned.push('goal_achiever')
  if (n >= 3) earned.push('goals_3')
  if (n >= 5) earned.push('goals_5')
  for (const key of earned) await awardBadge(childId, key)
  return earned
}

export async function checkGoalBadge(childId: string, goalId: string) {
  const { data: existing } = await supabase
    .from('badges')
    .select('*')
    .eq('child_id', childId)
    .eq('badge_key', 'goal_achiever')
    .maybeSingle()

  if (!existing) {
    await awardBadge(childId, 'goal_achiever')
    return true
  }

  return false
}

export async function checkPerfectWeek(childId: string, weekStart: string, penalties: number) {
  if (penalties === 0) {
    await awardBadge(childId, 'perfect_week')
    return true
  }
  return false
}

async function checkWeekExcellent(childId: string, date: string): Promise<boolean> {
  const week = getWeekRange(date)

  const { data: grades } = await supabase
    .from('subject_grades')
    .select('grade')
    .eq('child_id', childId)
    .gte('date', week.start)
    .lte('date', week.end)

  if (!grades || grades.length === 0) return false

  const allFives = grades.every(g => g.grade === 5)

  if (allFives && grades.length >= 5) {
    const { data: existing } = await supabase
      .from('badges')
      .select('*')
      .eq('child_id', childId)
      .eq('badge_key', 'week_excellent')
      .maybeSingle()

    return !existing
  }

  return false
}

async function checkCleanMaster(childId: string, date: string): Promise<boolean> {
  const startDate = addDays(date, -29)

  const { data: days } = await supabase
    .from('days')
    .select('date, room_ok')
    .eq('child_id', childId)
    .gte('date', startDate)
    .lte('date', date)
    .order('date')

  if (!days || days.length < 30) return false

  const allClean = days.every(d => d.room_ok)

  if (allClean) {
    const { data: existing } = await supabase
      .from('badges')
      .select('*')
      .eq('child_id', childId)
      .eq('badge_key', 'clean_master')
      .maybeSingle()

    return !existing
  }

  return false
}

// Number of sport-active days required for the «Спортсмен» badge, and the rolling
// window they must fall within. Sport doesn't happen every single day (rest days,
// sections scheduled only some weekdays), so this rewards consistency over a month
// rather than an unrealistic unbroken streak.
const SPORTSMAN_DAYS = 14
const SPORTSMAN_WINDOW = 30

/**
 * Set of dates (YYYY-MM-DD) in [startDate, endDate] on which the child did any
 * sport. A day counts if EITHER source has activity:
 *   - a home exercise logged with quantity > 0 (`home_exercises`), OR
 *   - an attended training session (`section_visits.attended`).
 *
 * Replaces the legacy `home_sports` table, which the current kid form no longer
 * writes to. This is the single source of truth for sport-day counting — used by
 * both the badge check and the achievements progress bar.
 */
export async function getSportActiveDays(
  childId: string,
  startDate: string,
  endDate: string,
  client: typeof supabase = supabase
): Promise<Set<string>> {
  // section_visits references section_id (not child_id) — resolve the child's sections first.
  const { data: childSections } = await client
    .from('sections')
    .select('id')
    .eq('child_id', childId)
  const sectionIds = (childSections ?? []).map(s => s.id)

  const [{ data: exercises }, { data: visits }] = await Promise.all([
    client
      .from('home_exercises')
      .select('date')
      .eq('child_id', childId)
      .gt('quantity', 0)
      .gte('date', startDate)
      .lte('date', endDate),
    sectionIds.length > 0
      ? client
          .from('section_visits')
          .select('date')
          .in('section_id', sectionIds)
          .eq('attended', true)
          .gte('date', startDate)
          .lte('date', endDate)
      : Promise.resolve({ data: [] as { date: string }[] }),
  ])

  const days = new Set<string>()
  ;(exercises ?? []).forEach(e => days.add(e.date))
  ;(visits ?? []).forEach(v => days.add(v.date))
  return days
}

/** Count of sport-active days in the trailing SPORTSMAN_WINDOW ending today — used for the progress bar. */
export async function getSportActiveDayCount(childId: string): Promise<number> {
  const end = localDateString()
  const start = addDays(end, -(SPORTSMAN_WINDOW - 1))
  const days = await getSportActiveDays(childId, start, end)
  return days.size
}

export interface BadgeProgress { current: number; target: number }

/**
 * Progress (current / target) toward each count-based badge — the data behind the
 * grid bars and the "Ближе всего" coach card. One round-trip per metric.
 *
 * Binary / event badges (first_purchase, goal_achiever, perfect_week) are omitted on
 * purpose: "almost there" has no meaning for a one-shot goal, so they never become the
 * spotlighted badge. Same shape is reusable server-side for a future nudge.
 */
export async function getBadgeProgress(childId: string): Promise<Record<string, BadgeProgress>> {
  const today = localDateString()
  const week = getWeekRange(today)
  const last14 = addDays(today, -13)

  const [
    { data: streaks },
    sportDays,
    { count: grade5Week },
    { data: gradeDays14 },
    { data: gradeDaysWeek },
    { data: wallet },
    completedGoals,
  ] = await Promise.all([
    supabase.from('streaks').select('streak_type, current_count, best_count').eq('child_id', childId),
    getSportActiveDayCount(childId),
    supabase.from('subject_grades').select('*', { count: 'exact', head: true })
      .eq('child_id', childId).eq('grade', 5).gte('date', week.start).lte('date', week.end),
    supabase.from('subject_grades').select('date').eq('child_id', childId).gte('date', last14).lte('date', today),
    supabase.from('subject_grades').select('date').eq('child_id', childId).gte('date', week.start).lte('date', week.end),
    supabase.from('wallet').select('total_earned_coins, total_spent_coins').eq('child_id', childId).maybeSingle(),
    getCompletedGoalCount(childId),
  ])

  const roomStreak = (streaks ?? []).find(s => s.streak_type === 'room')?.current_count ?? 0
  const bestStreak = (streaks ?? []).reduce((m, s) => Math.max(m, s.best_count ?? 0), 0)
  const uniqueGradeDays14 = new Set((gradeDays14 ?? []).map(g => g.date)).size
  const uniqueGradeDaysWeek = new Set((gradeDaysWeek ?? []).map(g => g.date)).size
  const netSaved = wallet ? Math.max(0, (wallet.total_earned_coins ?? 0) - (wallet.total_spent_coins ?? 0)) : 0

  return {
    clean_master:     { current: roomStreak,           target: 30 },
    sportsman:        { current: sportDays,            target: SPORTSMAN_DAYS },
    study_lover:      { current: uniqueGradeDays14,    target: 14 },
    week_excellent:   { current: grade5Week ?? 0,      target: 5 },
    full_week_grades: { current: uniqueGradeDaysWeek,  target: 5 },
    coin_saver:       { current: netSaved,             target: 500 },
    streak_30:        { current: bestStreak,           target: 30 },
    goals_3:          { current: completedGoals,       target: 3 },
    goals_5:          { current: completedGoals,       target: 5 },
  }
}

export interface ClosestBadge {
  key: string
  icon: string
  titleKey: string
  xp: number
  current: number
  target: number
  ratio: number
}

/**
 * The single unearned badge the child is closest to (highest progress under 100%).
 * One source of truth for the "Ближе всего" spotlight and the Sunday-evening nudge.
 * Returns null if nothing is in progress or everything is earned.
 */
export async function getClosestBadge(childId: string): Promise<ClosestBadge | null> {
  const [progress, earned] = await Promise.all([getBadgeProgress(childId), getChildBadges(childId)])
  const earnedKeys = new Set(earned.map((b: any) => b.badge_key))

  let best: ClosestBadge | null = null
  for (const badge of BADGES) {
    if (earnedKeys.has(badge.key)) continue
    const p = progress[badge.key]
    if (!p || p.target <= 0) continue
    const ratio = Math.min(1, p.current / p.target)
    if (ratio <= 0 || ratio >= 1) continue
    if (!best || ratio > best.ratio) {
      best = { key: badge.key, icon: badge.icon, titleKey: badge.titleKey, xp: badge.xp, current: p.current, target: p.target, ratio }
    }
  }
  return best
}

async function checkSportsman(childId: string, date: string): Promise<boolean> {
  const startDate = addDays(date, -(SPORTSMAN_WINDOW - 1))
  const activeDays = await getSportActiveDays(childId, startDate, date)

  if (activeDays.size < SPORTSMAN_DAYS) return false

  const { data: existing } = await supabase
    .from('badges')
    .select('id')
    .eq('child_id', childId)
    .eq('badge_key', 'sportsman')
    .maybeSingle()

  return !existing
}

async function checkStudyLover(childId: string, date: string): Promise<boolean> {
  const startDate = addDays(date, -13)

  const { data: grades } = await supabase
    .from('subject_grades')
    .select('date')
    .eq('child_id', childId)
    .gte('date', startDate)
    .lte('date', date)

  if (!grades) return false

  const uniqueDays = new Set(grades.map(g => g.date))

  if (uniqueDays.size >= 14) {
    const { data: existing } = await supabase
      .from('badges')
      .select('*')
      .eq('child_id', childId)
      .eq('badge_key', 'study_lover')
      .maybeSingle()

    return !existing
  }

  return false
}

async function checkCoinSaver(childId: string): Promise<boolean> {
  const { data: wallet } = await supabase
    .from('wallet')
    .select('coins, total_earned_coins, total_spent_coins')
    .eq('child_id', childId)
    .maybeSingle()
  if (!wallet) return false
  const netSaved = wallet.total_earned_coins - wallet.total_spent_coins
  if (netSaved < 500) return false
  const { data: existing } = await supabase
    .from('badges')
    .select('id')
    .eq('child_id', childId)
    .eq('badge_key', 'coin_saver')
    .maybeSingle()
  return !existing
}

async function checkFirstPurchase(childId: string): Promise<boolean> {
  const { data: purchases } = await supabase
    .from('reward_purchases')
    .select('id')
    .eq('child_id', childId)
    .limit(1)
  if (!purchases || purchases.length === 0) return false
  const { data: existing } = await supabase
    .from('badges')
    .select('id')
    .eq('child_id', childId)
    .eq('badge_key', 'first_purchase')
    .maybeSingle()
  return !existing
}

async function checkStreak30(childId: string): Promise<boolean> {
  const { data: streaks } = await supabase
    .from('streaks')
    .select('current_count')
    .eq('child_id', childId)
  if (!streaks) return false
  const hasStreak30 = streaks.some(s => s.current_count >= 30)
  if (!hasStreak30) return false
  const { data: existing } = await supabase
    .from('badges')
    .select('id')
    .eq('child_id', childId)
    .eq('badge_key', 'streak_30')
    .maybeSingle()
  return !existing
}

async function checkFullWeekGrades(childId: string, date: string): Promise<boolean> {
  const week = getWeekRange(date)
  const { data: grades } = await supabase
    .from('subject_grades')
    .select('date')
    .eq('child_id', childId)
    .gte('date', week.start)
    .lte('date', week.end)
  if (!grades) return false
  // Need at least 5 unique days with grades
  const uniqueDays = new Set(grades.map(g => g.date))
  if (uniqueDays.size < 5) return false
  const { data: existing } = await supabase
    .from('badges')
    .select('id')
    .eq('child_id', childId)
    .eq('badge_key', 'full_week_grades')
    .maybeSingle()
  return !existing
}

async function awardBadge(childId: string, badgeKey: string) {
  const badge = BADGES.find(b => b.key === badgeKey)
  if (!badge) return

  // Fetch child first — family_id is required by RLS WITH CHECK on badges insert
  const { data: child } = await supabase
    .from('children')
    .select('xp, level, family_id, name')
    .eq('id', childId)
    .single()

  if (!child) return

  const { data: existing } = await supabase
    .from('badges')
    .select('id')
    .eq('child_id', childId)
    .eq('badge_key', badgeKey)
    .maybeSingle()

  if (existing) return

  const { error: insertError } = await supabase
    .from('badges')
    .insert({
      child_id: childId,
      badge_key: badgeKey,
      title: badge.title,
      description: badge.description,
      icon: badge.icon,
      xp_reward: badge.xp,
      family_id: child.family_id,
    })

  if (insertError) {
    console.warn('[awardBadge] insert failed:', insertError.message)
    return
  }

  const newXP = child.xp + badge.xp
  const newLevel = Math.floor(newXP / 1000) + 1

  await supabase
    .from('children')
    .update({ xp: newXP, level: newLevel })
    .eq('id', childId)

  try {
    const { notifyChild } = await import('@/app/actions/push-notifications')
    await notifyChild(
      childId,
      `Новый значок: ${badge.icon} ${badge.title}`,
      badge.description,
      '/kid/achievements'
    )
  } catch (e) {
    console.warn('[awardBadge] push failed:', e)
  }

  try {
    if (child.family_id) {
      const { postSystemMessage } = await import('@/lib/repositories/chat.repo')
      await postSystemMessage({
        familyId: child.family_id,
        content: `${badge.icon} ${child.name} получил значок «${badge.title}»!`,
      })
    }
  } catch (e) {
    console.warn('[awardBadge] chat post failed:', e)
  }
}

export async function getChildBadges(childId: string) {
  const { data } = await supabase
    .from('badges')
    .select('*')
    .eq('child_id', childId)
    .order('earned_at', { ascending: false })

  return data || []
}

export function getAvailableBadges() {
  return BADGES
}
