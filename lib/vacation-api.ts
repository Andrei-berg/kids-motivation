// lib/vacation-api.ts
// CRUD for vacation periods, reading log, and extra lessons.

import { supabase } from './supabase'
import { normalizeDate } from '@/utils/helpers'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VacationPeriod {
  id: string
  family_id: string
  name: string
  start_date: string
  end_date: string
  emoji: string
  child_filter: string // 'all' | child_id
  created_at: string
}

export interface ReadingLog {
  id?: string
  child_id: string
  date: string
  book_title: string
  pages_read: number
  minutes_read: number
  book_finished: boolean
  note: string
}

export interface ExtraLesson {
  id: string
  child_id: string
  date: string
  lesson_type: 'subject' | 'course'
  name: string
  done: boolean
  note: string
}

// ─── Vacation Periods ─────────────────────────────────────────────────────────

export async function getVacationPeriods(familyId: string): Promise<VacationPeriod[]> {
  const { data } = await supabase
    .from('vacation_periods')
    .select('*')
    .eq('family_id', familyId)
    .order('start_date', { ascending: false })
  return data || []
}

export async function createVacationPeriod(
  period: Omit<VacationPeriod, 'id' | 'created_at'>
): Promise<VacationPeriod> {
  const { data, error } = await supabase
    .from('vacation_periods')
    .insert(period)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteVacationPeriod(id: string): Promise<void> {
  const { error } = await supabase.from('vacation_periods').delete().eq('id', id)
  if (error) throw error
}

// ─── Reading Log ──────────────────────────────────────────────────────────────

export async function getReadingLog(childId: string, date: string): Promise<ReadingLog | null> {
  const { data } = await supabase
    .from('reading_log')
    .select('*')
    .eq('child_id', childId)
    .eq('date', normalizeDate(date))
    .maybeSingle()
  return data
}

export async function saveReadingLog(log: Omit<ReadingLog, 'id'>): Promise<void> {
  const { error } = await supabase
    .from('reading_log')
    .upsert({ ...log, date: normalizeDate(log.date) }, { onConflict: 'child_id,date' })
  if (error) throw error
}

// ─── Extra Lessons ────────────────────────────────────────────────────────────

export async function getExtraLessons(childId: string, date: string): Promise<ExtraLesson[]> {
  const { data } = await supabase
    .from('extra_lessons')
    .select('*')
    .eq('child_id', childId)
    .eq('date', normalizeDate(date))
    .order('created_at')
  return data || []
}

export async function saveExtraLessons(
  childId: string,
  date: string,
  lessons: Omit<ExtraLesson, 'id'>[]
): Promise<void> {
  const normalDate = normalizeDate(date)
  // Delete existing for this day and re-insert
  await supabase.from('extra_lessons').delete().eq('child_id', childId).eq('date', normalDate)
  if (lessons.length > 0) {
    const { error } = await supabase.from('extra_lessons').insert(
      lessons.map(l => ({ ...l, date: normalDate }))
    )
    if (error) throw error
  }
}
