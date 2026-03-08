// lib/services/coins.service.ts
// Business logic for calculating week scores from raw data.
// Sourced from lib/api.ts getWeekScore.

import { supabase } from '../supabase'
import { getWeekRange } from '@/utils/helpers'

/**
 * Calculates week score directly from raw data (days + grades tables).
 * Does NOT require week finalization.
 */
export async function getWeekScore(childId: string, weekStart: string): Promise<{
  coinsFromGrades: number
  coinsFromRoom: number
  coinsFromBehavior: number
  total: number
  gradedDays: number
  roomOkDays: number
  filledDays: number
}> {
  const week = getWeekRange(weekStart)

  const [{ data: days }, { data: grades }] = await Promise.all([
    supabase.from('days').select('*').eq('child_id', childId).gte('date', week.start).lte('date', week.end),
    supabase.from('subject_grades').select('grade,date').eq('child_id', childId).gte('date', week.start).lte('date', week.end)
  ])

  const GRADE_COINS: Record<number, number> = { 5: 5, 4: 3, 3: -3, 2: -5, 1: -10 }

  const coinsFromGrades = (grades || []).reduce((sum, g) => sum + (GRADE_COINS[g.grade] ?? 0), 0)
  const roomOkDays = (days || []).filter(d => d.room_ok).length
  const coinsFromRoom = roomOkDays * 3
  const behaviorDays = (days || []).filter(d => d.good_behavior).length
  const coinsFromBehavior = behaviorDays * 5

  return {
    coinsFromGrades,
    coinsFromRoom,
    coinsFromBehavior,
    total: coinsFromGrades + coinsFromRoom + coinsFromBehavior,
    gradedDays: Array.from(new Set((grades || []).map((g: any) => g.date))).length,
    roomOkDays,
    filledDays: (days || []).length
  }
}
