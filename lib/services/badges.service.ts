// lib/services/badges.service.ts
// Badge/achievement business logic.
// Sourced from lib/badges.ts — this is the authoritative implementation.

import { supabase } from '../supabase'
import { getWeekRange, addDays } from '@/utils/helpers'

interface Badge {
  key: string
  title: string
  description: string
  icon: string
  xp: number
}

const BADGES: Badge[] = [
  {
    key: 'week_excellent',
    title: 'Неделя отличника',
    description: '7 дней подряд только пятёрки',
    icon: '🌟',
    xp: 500
  },
  {
    key: 'clean_master',
    title: 'Мастер чистоты',
    description: 'Комната убрана 30 дней подряд',
    icon: '🧹',
    xp: 800
  },
  {
    key: 'sportsman',
    title: 'Спортсмен',
    description: 'Спорт 14 дней подряд',
    icon: '💪',
    xp: 600
  },
  {
    key: 'goal_achiever',
    title: 'Целеустремлённый',
    description: 'Достиг первой цели',
    icon: '🎯',
    xp: 1000
  },
  {
    key: 'perfect_week',
    title: 'Идеальная неделя',
    description: 'Неделя без штрафов',
    icon: '👑',
    xp: 400
  },
  {
    key: 'study_lover',
    title: 'Любитель учёбы',
    description: 'Оценки 14 дней подряд',
    icon: '📚',
    xp: 400
  },
  {
    key: 'coin_saver',
    title: 'Копилка',
    description: 'Накопи 500 монет, не тратя',
    icon: '💰',
    xp: 300
  },
  {
    key: 'first_purchase',
    title: 'Первая покупка',
    description: 'Первая покупка в магазине',
    icon: '🛒',
    xp: 200
  },
  {
    key: 'streak_30',
    title: 'Серия 30 дней',
    description: 'Любая серия достигла 30 дней подряд',
    icon: '🔥',
    xp: 700
  },
  {
    key: 'full_week_grades',
    title: 'Отличный дневник',
    description: 'Оценки получены каждый день учебной недели',
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

  for (const key of badges) {
    await awardBadge(childId, key)
  }

  return badges
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

async function checkSportsman(childId: string, date: string): Promise<boolean> {
  const startDate = addDays(date, -13)

  const { data: sports } = await supabase
    .from('home_sports')
    .select('*')
    .eq('child_id', childId)
    .gte('date', startDate)
    .lte('date', date)
    .order('date')

  if (!sports || sports.length < 14) return false

  const allSport = sports.every(s => s.running || s.exercises || s.outdoor_games || s.stretching)

  if (allSport) {
    const { data: existing } = await supabase
      .from('badges')
      .select('*')
      .eq('child_id', childId)
      .eq('badge_key', 'sportsman')
      .maybeSingle()

    return !existing
  }

  return false
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

  const { data: existing } = await supabase
    .from('badges')
    .select('*')
    .eq('child_id', childId)
    .eq('badge_key', badgeKey)
    .maybeSingle()

  if (existing) return

  await supabase
    .from('badges')
    .insert({
      child_id: childId,
      badge_key: badgeKey,
      title: badge.title,
      description: badge.description,
      icon: badge.icon,
      xp_reward: badge.xp
    })

  const { data: child } = await supabase
    .from('children')
    .select('xp, level')
    .eq('id', childId)
    .single()

  if (child) {
    const newXP = child.xp + badge.xp
    const newLevel = Math.floor(newXP / 1000) + 1

    await supabase
      .from('children')
      .update({ xp: newXP, level: newLevel })
      .eq('id', childId)
  }

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
