// lib/services/streaks.service.ts
// Streak calculation business logic.
// Sourced from lib/streaks.ts — this is the authoritative implementation.

import { supabase } from '../supabase'
import { normalizeDate, addDays } from '@/utils/helpers'

export interface StreakEvent {
  type: 'room' | 'study' | 'sport'
  event: 'broken' | 'record'
  previousCount: number
  newCount: number
}

export interface StreakEvents {
  broken: StreakEvent[]
  records: StreakEvent[]
}

export async function updateStreaks(childId: string, date: string): Promise<StreakEvents> {
  const today = normalizeDate(date)
  const startDate = addDays(today, -30)

  const { data: days } = await supabase
    .from('days')
    .select('*')
    .eq('child_id', childId)
    .gte('date', startDate)
    .lte('date', today)
    .order('date')

  if (!days) return { broken: [], records: [] }

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

  const roomStreak = calculateRoomStreak(days, today)
  const studyStreak = calculateStudyStreak(grades || [], today)
  const sportStreak = calculateSportStreak(sports || [], today)

  const { data: child } = await supabase
    .from('children')
    .select('family_id')
    .eq('id', childId)
    .maybeSingle()
  const familyId = child?.family_id ?? null

  const [roomEvent, studyEvent, sportEvent] = await Promise.all([
    updateStreak(childId, 'room', roomStreak.current, roomStreak.best, familyId),
    updateStreak(childId, 'study', studyStreak.current, studyStreak.best, familyId),
    updateStreak(childId, 'sport', sportStreak.current, sportStreak.best, familyId),
  ])

  const events: StreakEvents = {
    broken: [roomEvent, studyEvent, sportEvent].filter((e): e is StreakEvent => e?.event === 'broken'),
    records: [roomEvent, studyEvent, sportEvent].filter((e): e is StreakEvent => e?.event === 'record'),
  }
  return events
}

export function calculateRoomStreak(days: any[], today: string) {
  let current = 0
  let best = 0
  let streak = 0

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

export function calculateStudyStreak(grades: any[], today: string) {
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

export function calculateSportStreak(sports: any[], today: string) {
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

async function updateStreak(
  childId: string,
  type: 'room' | 'study' | 'sport',
  current: number,
  best: number,
  familyId?: string | null
): Promise<StreakEvent | null> {
  const { data: existing } = await supabase
    .from('streaks')
    .select('*')
    .eq('child_id', childId)
    .eq('streak_type', type)
    .maybeSingle()

  let event: StreakEvent | null = null

  if (existing) {
    if (existing.current_count > 0 && current === 0) {
      event = { type, event: 'broken', previousCount: existing.current_count, newCount: 0 }
    } else if (current > existing.best_count) {
      event = { type, event: 'record', previousCount: existing.best_count, newCount: current }
    }

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
    if (current > 0) {
      event = { type, event: 'record', previousCount: 0, newCount: current }
    }

    await supabase
      .from('streaks')
      .insert({
        child_id: childId,
        streak_type: type,
        current_count: current,
        best_count: best,
        last_updated: normalizeDate(new Date()),
        active: current > 0,
        ...(familyId ? { family_id: familyId } : {}),
      })
  }

  if (event?.event === 'record' && familyId && [7, 14, 30].includes(current)) {
    try {
      const typeLabel = type === 'room' ? 'Комната' : type === 'study' ? 'Учёба' : 'Спорт'
      const { data: childRow } = await supabase
        .from('children')
        .select('name')
        .eq('id', childId)
        .maybeSingle()
      const childName = childRow?.name ?? childId
      const { postSystemMessage } = await import('@/lib/repositories/chat.repo')
      await postSystemMessage({
        familyId,
        content: `🔥 ${childName} держит серию ${current} дней (${typeLabel})!`,
      })
    } catch (e) {
      console.warn('[updateStreak] chat post failed:', e)
    }
  }

  return event
}

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
