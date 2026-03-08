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
  }
]

export async function checkAndAwardBadges(childId: string, date: string) {
  const badges: string[] = []

  if (await checkWeekExcellent(childId, date)) badges.push('week_excellent')
  if (await checkCleanMaster(childId, date)) badges.push('clean_master')
  if (await checkSportsman(childId, date)) badges.push('sportsman')
  if (await checkStudyLover(childId, date)) badges.push('study_lover')

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
