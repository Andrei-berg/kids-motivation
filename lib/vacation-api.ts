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
  preset_id?: string | null // set when materialized from a bundled preset (Phase 5.5 D-02); null/absent = manual entry
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

export async function updateVacationPeriod(
  id: string,
  fields: Partial<Pick<VacationPeriod, 'name' | 'start_date' | 'end_date' | 'emoji' | 'child_filter' | 'preset_id'>>
): Promise<void> {
  const { error } = await supabase.from('vacation_periods').update(fields).eq('id', id)
  if (error) throw error
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

export interface PendingReadingCheck {
  id: string
  child_id: string
  date: string
  book_title: string
  pages_read: number
  minutes_read: number
}

/**
 * Finished-book claims awaiting parent confirmation: book_finished with no verdict
 * yet (verified IS NULL). Pass the family's child ids that have require_reading_check
 * on — a trusted child (check off) auto-credits, so its rows aren't "pending".
 */
export async function getPendingReadingChecks(childIds: string[]): Promise<PendingReadingCheck[]> {
  if (childIds.length === 0) return []
  // A trusted child (require_reading_check off) auto-credits, so exclude them.
  const { data: kids } = await supabase
    .from('children')
    .select('id, require_reading_check')
    .in('id', childIds)
  const checkIds = (kids ?? []).filter((k: any) => k.require_reading_check !== false).map((k: any) => k.id)
  if (checkIds.length === 0) return []
  const { data } = await supabase
    .from('reading_log')
    .select('id, child_id, date, book_title, pages_read, minutes_read')
    .in('child_id', checkIds)
    .eq('book_finished', true)
    .is('verified', null)
    .order('date', { ascending: false })
  return data || []
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
