import { supabase } from './supabase'
import { normalizeDate, getWeekRange, addDays } from '@/utils/helpers'

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

// Проверить и выдать бейджи после сохранения дня
export async function checkAndAwardBadges(childId: string, date: string) {
  const badges: string[] = []
  
  // Проверить каждый тип бейджа
  if (await checkWeekExcellent(childId, date)) badges.push('week_excellent')
  if (await checkCleanMaster(childId, date)) badges.push('clean_master')
  if (await checkSportsman(childId, date)) badges.push('sportsman')
  if (await checkStudyLover(childId, date)) badges.push('study_lover')
  
  // Выдать бейджи
  for (const key of badges) {
    await awardBadge(childId, key)
  }
  
  return badges
}

// Проверить бейдж при достижении цели
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

// Проверить бейдж при финализации недели
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
  
  // Все оценки должны быть 5
  const allFives = grades.every(g => g.grade === 5)
  
  // Должно быть минимум 5 оценок за неделю
  if (allFives && grades.length >= 5) {
    // Проверить что уже не получал
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
  // Проверить последние 30 дней
  const startDate = addDays(date, -29)
  
  const { data: days } = await supabase
    .from('days')
    .select('date, room_ok')
    .eq('child_id', childId)
    .gte('date', startDate)
    .lte('date', date)
    .order('date')
  
  if (!days || days.length < 30) return false
  
  // Все 30 дней комната убрана
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
  
  // Все 14 дней спорт
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
  
  // Проверить что были оценки каждый день
  const { data: grades } = await supabase
    .from('subject_grades')
    .select('date')
    .eq('child_id', childId)
    .gte('date', startDate)
    .lte('date', date)
  
  if (!grades) return false
  
  // Группируем по дням
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
  
  // Проверить что ещё не получал
  const { data: existing } = await supabase
    .from('badges')
    .select('*')
    .eq('child_id', childId)
    .eq('badge_key', badgeKey)
    .maybeSingle()
  
  if (existing) return
  
  // Выдать бейдж
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
  
  // Добавить XP ребёнку
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
      .update({
        xp: newXP,
        level: newLevel
      })
      .eq('id', childId)
  }
}

// Получить все бейджи ребёнка
export async function getChildBadges(childId: string) {
  const { data } = await supabase
    .from('badges')
    .select('*')
    .eq('child_id', childId)
    .order('earned_at', { ascending: false })
  
  return data || []
}

// Получить доступные бейджи (ещё не получены)
export function getAvailableBadges() {
  return BADGES
}
