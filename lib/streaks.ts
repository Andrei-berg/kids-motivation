import { supabase } from './supabase'
import { normalizeDate, addDays, getDatesInRange } from '@/utils/helpers'

// Обновить стрики для ребенка
export async function updateStreaks(childId: string, date: string) {
  const today = normalizeDate(date)
  
  // Получить данные за последние 30 дней
  const startDate = addDays(today, -30)
  
  const { data: days } = await supabase
    .from('days')
    .select('*')
    .eq('child_id', childId)
    .gte('date', startDate)
    .lte('date', today)
    .order('date')
  
  if (!days) return

  const { data: grades } = await supabase
    .from('subject_grades')
    .select('date')
    .eq('child_id', childId)
    .gte('date', startDate)
    .lte('date', today)
  
  const { data: sports } = await supabase
    .from('home_sports')
    .select('date, running, exercises, outdoor_games, stretching')
    .eq('child_id', childId)
    .gte('date', startDate)
    .lte('date', today)
  
  // Рассчитать стрики
  const roomStreak = calculateRoomStreak(days, today)
  const studyStreak = calculateStudyStreak(grades || [], today)
  const sportStreak = calculateSportStreak(sports || [], today)
  
  // Обновить в БД
  await updateStreak(childId, 'room', roomStreak.current, roomStreak.best)
  await updateStreak(childId, 'study', studyStreak.current, studyStreak.best)
  await updateStreak(childId, 'sport', sportStreak.current, sportStreak.best)
}

function calculateRoomStreak(days: any[], today: string) {
  let current = 0
  let best = 0
  let streak = 0
  
  // Идём с сегодня назад
  let checkDate = today
  for (let i = 0; i < 30; i++) {
    const day = days.find(d => d.date === checkDate)
    
    if (day && day.room_ok) {
      streak++
      if (checkDate === today) current = streak
    } else {
      if (streak > best) best = streak
      if (checkDate === today) current = 0
      streak = 0
    }
    
    checkDate = addDays(checkDate, -1)
  }
  
  if (streak > best) best = streak
  
  return { current, best }
}

function calculateStudyStreak(grades: any[], today: string) {
  // Группируем оценки по дням
  const daysWithGrades = new Set(grades.map(g => g.date))
  
  let current = 0
  let best = 0
  let streak = 0
  
  let checkDate = today
  for (let i = 0; i < 30; i++) {
    if (daysWithGrades.has(checkDate)) {
      streak++
      if (checkDate === today) current = streak
    } else {
      if (streak > best) best = streak
      if (checkDate === today) current = 0
      streak = 0
    }
    
    checkDate = addDays(checkDate, -1)
  }
  
  if (streak > best) best = streak
  
  return { current, best }
}

function calculateSportStreak(sports: any[], today: string) {
  let current = 0
  let best = 0
  let streak = 0
  
  let checkDate = today
  for (let i = 0; i < 30; i++) {
    const sport = sports.find(s => s.date === checkDate)
    const hasSport = sport && (sport.running || sport.exercises || sport.outdoor_games || sport.stretching)
    
    if (hasSport) {
      streak++
      if (checkDate === today) current = streak
    } else {
      if (streak > best) best = streak
      if (checkDate === today) current = 0
      streak = 0
    }
    
    checkDate = addDays(checkDate, -1)
  }
  
  if (streak > best) best = streak
  
  return { current, best }
}

async function updateStreak(childId: string, type: string, current: number, best: number) {
  const { data: existing } = await supabase
    .from('streaks')
    .select('*')
    .eq('child_id', childId)
    .eq('streak_type', type)
    .maybeSingle()
  
  if (existing) {
    await supabase
      .from('streaks')
      .update({
        current_count: current,
        best_count: Math.max(best, existing.best_count),
        last_updated: normalizeDate(new Date()),
        active: current > 0
      })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('streaks')
      .insert({
        child_id: childId,
        streak_type: type,
        current_count: current,
        best_count: best,
        last_updated: normalizeDate(new Date()),
        active: current > 0
      })
  }
}

// Получить бонусы за стрики
export async function getStreakBonuses(childId: string) {
  const { data: streaks } = await supabase
    .from('streaks')
    .select('*')
    .eq('child_id', childId)
  
  if (!streaks) return 0
  
  const { data: settings } = await supabase
    .from('settings')
    .select('*')
  
  const settingsMap: any = {}
  settings?.forEach(s => {
    const val = s.value
    settingsMap[s.key] = !isNaN(Number(val)) ? Number(val) : val
  })
  
  let bonus = 0
  
  streaks.forEach(s => {
    if (s.streak_type === 'room' && s.current_count >= 7) {
      bonus += settingsMap.roomStreak7 || 100
    }
    if (s.streak_type === 'study' && s.current_count >= 14) {
      bonus += settingsMap.studyStreak14 || 100
    }
    if (s.streak_type === 'sport' && s.current_count >= 7) {
      bonus += settingsMap.sportStreak7 || 100
    }
  })
  
  return bonus
}
